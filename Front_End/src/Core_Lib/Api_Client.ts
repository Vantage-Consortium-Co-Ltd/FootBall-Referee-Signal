import {
  FrameFeedbackPayload,
  GestureRule,
  Keypoint,
  ModalDetection,
  ModalHealthResponse,
  ModalImagePredictResponse,
  ModalVideoPredictResponse,
  ModalWsConfigResponse,
  TaggedPerson,
} from "../Data_Types/Referee_Types";
import { MOCK_IFAB_RULES, generateMockKeypoints } from "./Microservices_Mock";

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
    const data = (await res.json()) as ModalHealthResponse;
    return data;
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
  return MOCK_IFAB_RULES.find((r) => r.name.toLowerCase() === normalized);
}

function buildBboxFromKeypoints(kps: Keypoint[]): [number, number, number, number] {
  const xs = kps.map((k) => k.x);
  const ys = kps.map((k) => k.y);
  const minX = Math.max(0.04, Math.min(...xs) - 0.08);
  const maxX = Math.min(0.96, Math.max(...xs) + 0.08);
  const minY = Math.max(0.04, Math.min(...ys) - 0.06);
  const maxY = Math.min(0.98, Math.max(...ys) + 0.06);
  return [minX, minY, maxX - minX, maxY - minY];
}

export function evaluateHybridPostureFromDetections(
  detections: ModalDetection[],
  targetRule: GestureRule,
  frameTick: number,
  holdDurationSeconds: number
): {
  feedback: FrameFeedbackPayload;
  matchedRule: GestureRule | null;
  topDetection: ModalDetection | null;
  persons: TaggedPerson[];
  isHoldActive: boolean;
} {
  const safeDetections = Array.isArray(detections) ? detections : [];
  const sorted = [...safeDetections].sort((a, b) => b.confidence - a.confidence);
  const topDetection = sorted[0] ?? null;

  if (!topDetection) {
    const neutralPose = generateMockKeypoints(0, frameTick);
    return {
      feedback: {
        detected: false,
        timestamp: Date.now(),
        keypoints: neutralPose.keypoints,
        activeArm: targetRule.activeArm,
        angles: neutralPose.angles,
        score: 0,
        state: "WAITING",
        holdProgress: 0,
        holdDuration: 0,
        feedbackTip: "กำลังรอตรวจจับบุคคลและท่าสัญญาณจากกล้อง (Confidence ≥ 25%)...",
        gestureName: targetRule.name,
        gestureNameTh: targetRule.nameTh,
        isAcceptable: false,
      },
      matchedRule: null,
      topDetection: null,
      persons: [],
      isHoldActive: false,
    };
  }

  const matchedTargetDet =
    sorted.find((d) => d.label.toLowerCase() === targetRule.name.toLowerCase()) ?? null;
  const primaryDet = matchedTargetDet ?? topDetection;
  const matchedRule = findRuleByLabel(primaryDet.label) ?? null;

  const isTargetMatch = Boolean(matchedTargetDet);
  const pose = generateMockKeypoints(matchedRule?.id ?? 0, frameTick);

  const persons: TaggedPerson[] = sorted.map((det, idx) => {
    const rule = findRuleByLabel(det.label) ?? null;
    const basePose = generateMockKeypoints(rule?.id ?? 0, frameTick);
    const xOffset = idx === 0 ? 0 : (idx % 2 === 1 ? 0.24 : -0.24);
    const shiftedKps = basePose.keypoints.map((kp) => ({
      ...kp,
      x: Math.min(0.95, Math.max(0.05, kp.x + xOffset)),
    }));
    const isPrimary = det === primaryDet;

    return {
      id: `person-${idx + 1}`,
      label: det.label === "Referee" ? "Referee" : "Referee",
      labelTh: `${rule?.nameTh || det.label} (#${idx + 1})`,
      bbox: buildBboxFromKeypoints(shiftedKps),
      confidence: det.confidence,
      isTagged: isPrimary,
      keypoints: shiftedKps,
      angles: basePose.angles,
    };
  });

  if (isTargetMatch && matchedTargetDet) {
    const confPct = Math.round(matchedTargetDet.confidence * 100);
    const score = Math.min(100, Math.max(75, confPct));
    const minHold = Math.max(0.1, targetRule.minHoldSeconds);
    const holdProgress = Math.min(1.0, holdDurationSeconds / minHold);
    const state: FrameFeedbackPayload["state"] =
      holdProgress >= 1.0 ? "COMPLETED" : "HOLDING";
    const feedbackTip =
      state === "COMPLETED"
        ? `ยอดเยี่ยม! โมเดล YOLO26-Pose ยืนยันท่า ${targetRule.nameTh} (${confPct}%)`
        : `ตรวจพบท่า ${targetRule.nameTh} (${confPct}%) · ค้างท่าไว้ ${holdDurationSeconds.toFixed(1)}s / ${targetRule.minHoldSeconds.toFixed(1)}s`;

    return {
      feedback: {
        detected: true,
        timestamp: Date.now(),
        keypoints: pose.keypoints,
        activeArm: targetRule.activeArm,
        angles: pose.angles,
        score,
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
      persons,
      isHoldActive: true,
    };
  }

  const confPct = Math.round(topDetection.confidence * 100);
  const score = Math.round(topDetection.confidence * 60);
  const detectedNameTh = matchedRule?.nameTh || topDetection.label;

  return {
    feedback: {
      detected: true,
      timestamp: Date.now(),
      keypoints: pose.keypoints,
      activeArm: matchedRule?.activeArm ?? targetRule.activeArm,
      angles: pose.angles,
      score,
      state: "DETECTED",
      holdProgress: 0,
      holdDuration: 0,
      feedbackTip: `โมเดลตรวจพบท่า: ${detectedNameTh} (${confPct}%) · เป้าหมายคือ ${targetRule.nameTh}`,
      gestureName: matchedRule?.name ?? topDetection.label,
      gestureNameTh: detectedNameTh,
      isAcceptable: false,
    },
    matchedRule,
    topDetection,
    persons,
    isHoldActive: false,
  };
}
