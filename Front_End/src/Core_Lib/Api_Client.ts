import {
  FrameFeedbackPayload,
  GestureRule,
  ModalDetection,
  ModalHealthResponse,
  ModalImagePredictResponse,
  ModalVideoPredictResponse,
  ModalWsConfigResponse,
  PostureAngles,
  TaggedPerson,
} from "../Data_Types/Referee_Types";
import { IFAB_RULES } from "./Ifab_Rules_Catalog";

async function extractErrorDetail(res: Response, fallback: string): Promise<string> {
  try {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as { detail?: unknown };
      if (typeof json.detail === "string") return json.detail;
      if (json.detail !== undefined) return JSON.stringify(json.detail);
    }
    const text = await res.text();
    return text || fallback;
  } catch {
    return fallback;
  }
}

export async function checkModalHealth(): Promise<ModalHealthResponse> {
  try {
    const res = await fetch("/api/inference/health", {
      method: "GET",
      cache: "no-store",
    });
    return (await res.json()) as ModalHealthResponse;
  } catch (err: unknown) {
    return {
      status: "error",
      model: "unavailable",
      device: "cpu",
      conf: 0.25,
      imgsz: 640,
      detail: err instanceof Error ? err.message : "Network error checking health",
    };
  }
}

export async function predictImageJson(
  file: Blob,
  filename = "frame.jpg"
): Promise<ModalImagePredictResponse> {
  const form = new FormData();
  form.append("file", file, filename);

  const res = await fetch("/api/inference/image", {
    method: "POST",
    body: form,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(await extractErrorDetail(res, `HTTP ${res.status}`));
  }

  return (await res.json()) as ModalImagePredictResponse;
}

export async function predictImageAnnotatedUrl(
  file: Blob,
  filename = "frame.jpg"
): Promise<string> {
  const form = new FormData();
  form.append("file", file, filename);

  const res = await fetch("/api/inference/image?annotated=true", {
    method: "POST",
    body: form,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(await extractErrorDetail(res, `HTTP ${res.status}`));
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function predictImageBoth(
  file: Blob,
  filename = "frame.jpg"
): Promise<{ detections: ModalDetection[]; annotatedImageUrl: string }> {
  const [jsonRes, annotatedImageUrl] = await Promise.all([
    predictImageJson(file, filename),
    predictImageAnnotatedUrl(file, filename),
  ]);

  return {
    detections: Array.isArray(jsonRes.detections) ? jsonRes.detections : [],
    annotatedImageUrl,
  };
}

export async function predictVideoFile(file: File): Promise<ModalVideoPredictResponse> {
  const form = new FormData();
  form.append("file", file, file.name || "clip.mp4");

  const res = await fetch("/api/inference/video", {
    method: "POST",
    body: form,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(await extractErrorDetail(res, `HTTP ${res.status}`));
  }

  return (await res.json()) as ModalVideoPredictResponse;
}

export async function fetchWebcamWsConfig(): Promise<ModalWsConfigResponse> {
  const res = await fetch("/api/inference/ws-config", {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(await extractErrorDetail(res, `HTTP ${res.status}`));
  }

  return (await res.json()) as ModalWsConfigResponse;
}

export function captureVideoFrameAsJpeg(
  video: HTMLVideoElement,
  maxWidth = 640,
  quality = 0.82
): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (
      !video ||
      video.readyState < 2 ||
      video.videoWidth <= 0 ||
      video.videoHeight <= 0
    ) {
      resolve(null);
      return;
    }

    const scale = Math.min(1, maxWidth / video.videoWidth);
    const targetW = Math.max(1, Math.round(video.videoWidth * scale));
    const targetH = Math.max(1, Math.round(video.videoHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resolve(null);
      return;
    }

    ctx.drawImage(video, 0, 0, targetW, targetH);
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

export function findRuleByLabel(label: string): GestureRule | undefined {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return undefined;
  return IFAB_RULES.find((r) => r.name.toLowerCase() === normalized);
}

const EMPTY_ANGLES: PostureAngles = {
  rElbowAngle: 0,
  lElbowAngle: 0,
  rElevationAngle: 0,
  lElevationAngle: 0,
};

function evaluateBiomechAngles(
  angles: PostureAngles,
  targetRule: GestureRule
): { biomechScore: number; angleTip: string | null } {
  let elev = angles.rElevationAngle;
  let straight = angles.rElbowAngle;

  if (targetRule.activeArm === "left") {
    elev = angles.lElevationAngle;
    straight = angles.lElbowAngle;
  } else if (targetRule.activeArm === "either") {
    const rDiff = Math.abs(angles.rElevationAngle - targetRule.targetElevationDeg);
    const lDiff = Math.abs(angles.lElevationAngle - targetRule.targetElevationDeg);
    if (lDiff < rDiff && angles.lElevationAngle > 0) {
      elev = angles.lElevationAngle;
      straight = angles.lElbowAngle;
    }
  } else if (targetRule.activeArm === "both") {
    elev = Math.round((angles.rElevationAngle + angles.lElevationAngle) / 2);
    straight = Math.round((angles.rElbowAngle + angles.lElbowAngle) / 2);
  }

  if (elev === 0 && straight === 0) {
    return { biomechScore: 0, angleTip: null };
  }

  const elevDiff = Math.abs(elev - targetRule.targetElevationDeg);
  const straightDiff = Math.abs(straight - targetRule.targetStraightnessDeg);
  const elevScore = Math.max(0, 50 - elevDiff * 0.7);
  const straightScore = Math.max(0, 50 - straightDiff * 0.7);
  const biomechScore = Math.min(100, Math.round(elevScore + straightScore));

  let angleTip: string | null = null;
  if (elev < targetRule.minElevationDeg) {
    angleTip = `ยกแขนเพิ่มอีก ${Math.round(
      targetRule.minElevationDeg - elev
    )}° (ปัจจุบัน ${elev}°)`;
  } else if (straight > 0 && straight < targetRule.minStraightnessDeg) {
    angleTip = `เหยียดข้อศอกให้ตรงขึ้น (ปัจจุบัน ${straight}°)`;
  }

  return { biomechScore, angleTip };
}

export function evaluateRealDetections(
  detections: ModalDetection[],
  targetRule: GestureRule,
  holdDurationSeconds: number,
  realPerson?: TaggedPerson | null
): {
  feedback: FrameFeedbackPayload;
  matchedRule: GestureRule | null;
  topDetection: ModalDetection | null;
  isHoldActive: boolean;
} {
  const safeDetections = Array.isArray(detections) ? detections : [];
  const sorted = [...safeDetections].sort((a, b) => b.confidence - a.confidence);
  const topDetection = sorted[0] ?? null;

  const keypoints = realPerson?.keypoints ?? [];
  const angles = realPerson?.angles ?? EMPTY_ANGLES;
  const hasRealPose = keypoints.length >= 17;
  const { biomechScore, angleTip } = hasRealPose
    ? evaluateBiomechAngles(angles, targetRule)
    : { biomechScore: 0, angleTip: null };

  if (!topDetection) {
    if (hasRealPose) {
      return {
        feedback: {
          detected: true,
          timestamp: Date.now(),
          keypoints,
          activeArm: targetRule.activeArm,
          angles,
          score: Math.min(70, biomechScore),
          state: "DETECTED",
          holdProgress: 0,
          holdDuration: 0,
          feedbackTip: angleTip
            ? `${angleTip} · กำลังรอ Modal AI ยืนยันท่า ${targetRule.nameTh}`
            : `ตรวจพบโครงกระดูก 17 จุดจริง · กำลังรอ Modal YOLO26n-pose ยืนยันท่า ${targetRule.nameTh}`,
          gestureName: targetRule.name,
          gestureNameTh: targetRule.nameTh,
          isAcceptable: false,
        },
        matchedRule: null,
        topDetection: null,
        isHoldActive: false,
      };
    }

    return {
      feedback: {
        detected: false,
        timestamp: Date.now(),
        keypoints: [],
        activeArm: targetRule.activeArm,
        angles: EMPTY_ANGLES,
        score: 0,
        state: "WAITING",
        holdProgress: 0,
        holdDuration: 0,
        feedbackTip: "กำลังรอตรวจจับโครงกระดูกและท่าสัญญาณจากกล้อง...",
        gestureName: targetRule.name,
        gestureNameTh: targetRule.nameTh,
        isAcceptable: false,
      },
      matchedRule: null,
      topDetection: null,
      isHoldActive: false,
    };
  }

  const matchedTargetDet =
    sorted.find((d) => d.label.toLowerCase() === targetRule.name.toLowerCase()) ?? null;

  if (matchedTargetDet) {
    const confPct = Math.round(matchedTargetDet.confidence * 100);
    const combinedScore = hasRealPose
      ? Math.min(100, Math.round(confPct * 0.65 + biomechScore * 0.35))
      : confPct;
    const minHold = Math.max(0.1, targetRule.minHoldSeconds);
    const holdProgress = Math.min(1.0, holdDurationSeconds / minHold);
    const state: FrameFeedbackPayload["state"] =
      holdProgress >= 1.0 ? "COMPLETED" : "HOLDING";
    const feedbackTip =
      state === "COMPLETED"
        ? `ยอดเยี่ยม! ยืนยันท่า ${targetRule.nameTh} (Modal ${confPct}%)`
        : angleTip
        ? `ตรวจพบ ${targetRule.nameTh} (${confPct}%) · ${angleTip}`
        : `ตรวจพบท่า ${targetRule.nameTh} (${confPct}%) · ค้างท่าไว้ ${holdDurationSeconds.toFixed(1)}s / ${targetRule.minHoldSeconds.toFixed(1)}s`;

    return {
      feedback: {
        detected: true,
        timestamp: Date.now(),
        keypoints,
        activeArm: targetRule.activeArm,
        angles,
        score: combinedScore,
        state,
        holdProgress,
        holdDuration: holdDurationSeconds,
        feedbackTip,
        gestureName: targetRule.name,
        gestureNameTh: targetRule.nameTh,
        isAcceptable: true,
      },
      matchedRule: targetRule,
      topDetection,
      isHoldActive: true,
    };
  }

  const topRule = findRuleByLabel(topDetection.label) ?? null;
  const confPct = Math.round(topDetection.confidence * 100);
  const detectedNameTh = topRule?.nameTh || topDetection.label;

  return {
    feedback: {
      detected: true,
      timestamp: Date.now(),
      keypoints,
      activeArm: topRule?.activeArm ?? targetRule.activeArm,
      angles,
      score: confPct,
      state: "DETECTED",
      holdProgress: 0,
      holdDuration: 0,
      feedbackTip: `โมเดลตรวจพบท่า: ${detectedNameTh} (${confPct}%) · เป้าหมายคือ ${targetRule.nameTh}`,
      gestureName: topRule?.name ?? topDetection.label,
      gestureNameTh: detectedNameTh,
      isAcceptable: false,
    },
    matchedRule: topRule,
    topDetection,
    isHoldActive: false,
  };
}
