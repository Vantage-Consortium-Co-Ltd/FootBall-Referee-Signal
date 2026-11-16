import {
  Keypoint,
  ModalDetection,
  PostureAngles,
  TaggedPerson,
} from "../Data_Types/Referee_Types";
import { IFAB_RULES } from "./Ifab_Rules_Catalog";

const TFJS_CDN_URL =
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";
const POSE_DETECTION_CDN_URL =
  "https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js";

interface RawPoseKeypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

interface RawPoseResult {
  id?: number;
  score?: number;
  keypoints: RawPoseKeypoint[];
  box?: {
    xMin: number;
    yMin: number;
    width: number;
    height: number;
  };
}

interface PoseDetectorInstance {
  estimatePoses: (
    video: HTMLVideoElement,
    config?: { maxPoses?: number; flipHorizontal?: boolean }
  ) => Promise<RawPoseResult[]>;
}

interface WindowWithPose extends Window {
  tf?: {
    ready: () => Promise<void>;
    getBackend: () => string;
    setBackend: (name: string) => Promise<boolean>;
  };
  poseDetection?: {
    SupportedModels: { MoveNet: string };
    movenet: { modelType: { MULTIPOSE_LIGHTNING: string } };
    createDetector: (
      model: string,
      config: Record<string, unknown>
    ) => Promise<PoseDetectorInstance>;
  };
}

let detectorInstance: PoseDetectorInstance | null = null;
let loaderPromise: Promise<boolean> | null = null;

function loadExternalScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`
    );
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener(
      "error",
      () => reject(new Error(`Failed to load ${src}`)),
      { once: true }
    );
    document.head.appendChild(script);
  });
}

export async function ensurePoseDetectorLoaded(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (detectorInstance) return true;
  if (loaderPromise) return loaderPromise;

  loaderPromise = (async () => {
    try {
      const win = window as WindowWithPose;
      if (!win.tf) {
        await loadExternalScript(TFJS_CDN_URL);
      }
      if (!win.poseDetection) {
        await loadExternalScript(POSE_DETECTION_CDN_URL);
      }
      if (!win.tf || !win.poseDetection) {
        return false;
      }

      if (win.tf.getBackend() !== "webgl") {
        try {
          await win.tf.setBackend("webgl");
        } catch {
          // Fall back to default backend if WebGL is unavailable
        }
      }
      await win.tf.ready();

      detectorInstance = await win.poseDetection.createDetector(
        win.poseDetection.SupportedModels.MoveNet,
        {
          modelType: win.poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
          enableTracking: true,
        }
      );
      return true;
    } catch (err) {
      console.warn("Real-time MoveNet pose tracker failed to initialize:", err);
      loaderPromise = null;
      return false;
    }
  })();

  return loaderPromise;
}

function clamp01(val: number): number {
  return Math.max(0, Math.min(1, val));
}

function angleBetween3Points(a: Keypoint, b: Keypoint, c: Keypoint): number {
  const bax = a.x - b.x;
  const bay = a.y - b.y;
  const bcx = c.x - b.x;
  const bcy = c.y - b.y;
  const mag = Math.hypot(bax, bay) * Math.hypot(bcx, bcy);
  if (mag < 1e-6) return 0;
  const cosTheta = Math.max(-1, Math.min(1, (bax * bcx + bay * bcy) / mag));
  return Math.round((Math.acos(cosTheta) * 180) / Math.PI);
}

function angleBetweenVectors(
  vx1: number,
  vy1: number,
  vx2: number,
  vy2: number
): number {
  const mag = Math.hypot(vx1, vy1) * Math.hypot(vx2, vy2);
  if (mag < 1e-6) return 0;
  const cosTheta = Math.max(-1, Math.min(1, (vx1 * vx2 + vy1 * vy2) / mag));
  return Math.round((Math.acos(cosTheta) * 180) / Math.PI);
}

export function computeRealJointAngles(keypoints: Keypoint[]): PostureAngles {
  if (!keypoints || keypoints.length < 17) {
    return {
      rElbowAngle: 0,
      lElbowAngle: 0,
      rElevationAngle: 0,
      lElevationAngle: 0,
      armSeparationAngle: 0,
      torsoInclination: 0,
    };
  }

  const lSho = keypoints[5];
  const rSho = keypoints[6];
  const lElb = keypoints[7];
  const rElb = keypoints[8];
  const lWri = keypoints[9];
  const rWri = keypoints[10];
  const lHip = keypoints[11];
  const rHip = keypoints[12];

  const rElbowAngle =
    rSho.confidence >= 0.25 && rElb.confidence >= 0.25 && rWri.confidence >= 0.25
      ? angleBetween3Points(rSho, rElb, rWri)
      : 0;

  const lElbowAngle =
    lSho.confidence >= 0.25 && lElb.confidence >= 0.25 && lWri.confidence >= 0.25
      ? angleBetween3Points(lSho, lElb, lWri)
      : 0;

  // Use real hip if visible; otherwise project straight down from shoulder (for chest-up webcams)
  const rTorsoRef: Keypoint =
    rHip.confidence >= 0.25
      ? rHip
      : { x: rSho.x, y: rSho.y + 0.3, confidence: 1 };
  const lTorsoRef: Keypoint =
    lHip.confidence >= 0.25
      ? lHip
      : { x: lSho.x, y: lSho.y + 0.3, confidence: 1 };

  const rArmEnd = rWri.confidence >= 0.25 ? rWri : rElb;
  const lArmEnd = lWri.confidence >= 0.25 ? lWri : lElb;

  const rElevationAngle =
    rSho.confidence >= 0.25 && rArmEnd.confidence >= 0.25
      ? angleBetween3Points(rTorsoRef, rSho, rArmEnd)
      : 0;

  const lElevationAngle =
    lSho.confidence >= 0.25 && lArmEnd.confidence >= 0.25
      ? angleBetween3Points(lTorsoRef, lSho, lArmEnd)
      : 0;

  const armSeparationAngle =
    rSho.confidence >= 0.25 &&
    lSho.confidence >= 0.25 &&
    rArmEnd.confidence >= 0.25 &&
    lArmEnd.confidence >= 0.25
      ? angleBetweenVectors(
          lArmEnd.x - lSho.x,
          lArmEnd.y - lSho.y,
          rArmEnd.x - rSho.x,
          rArmEnd.y - rSho.y
        )
      : 0;

  let torsoInclination = 0;
  if (
    lSho.confidence >= 0.25 &&
    rSho.confidence >= 0.25 &&
    lHip.confidence >= 0.25 &&
    rHip.confidence >= 0.25
  ) {
    const midShoX = (lSho.x + rSho.x) / 2;
    const midShoY = (lSho.y + rSho.y) / 2;
    const midHipX = (lHip.x + rHip.x) / 2;
    const midHipY = (lHip.y + rHip.y) / 2;
    torsoInclination = angleBetweenVectors(midHipX - midShoX, midHipY - midShoY, 0, 1);
  }

  return {
    rElbowAngle,
    lElbowAngle,
    rElevationAngle,
    lElevationAngle,
    armSeparationAngle,
    torsoInclination,
  };
}

function computeNormalizedBbox(
  keypoints: Keypoint[],
  rawBox: RawPoseResult["box"],
  videoWidth: number,
  videoHeight: number
): [number, number, number, number] {
  if (rawBox && rawBox.width > 0 && rawBox.height > 0) {
    const x = clamp01(rawBox.xMin / videoWidth);
    const y = clamp01(rawBox.yMin / videoHeight);
    const w = Math.min(1 - x, clamp01(rawBox.width / videoWidth));
    const h = Math.min(1 - y, clamp01(rawBox.height / videoHeight));
    return [x, y, w, h];
  }

  const visible = keypoints.filter((k) => k.confidence >= 0.25);
  const pts = visible.length > 0 ? visible : keypoints;
  const xs = pts.map((k) => k.x);
  const ys = pts.map((k) => k.y);
  const minX = Math.max(0.02, Math.min(...xs) - 0.05);
  const maxX = Math.min(0.98, Math.max(...xs) + 0.05);
  const minY = Math.max(0.02, Math.min(...ys) - 0.05);
  const maxY = Math.min(0.98, Math.max(...ys) + 0.05);
  return [minX, minY, Math.max(0.08, maxX - minX), Math.max(0.12, maxY - minY)];
}

export async function detectRealPosesFromVideo(
  video: HTMLVideoElement,
  modalDetections: ModalDetection[],
  activePersonId: string,
  autoTagReferee: boolean
): Promise<{ persons: TaggedPerson[]; activePerson: TaggedPerson | null }> {
  if (
    !video ||
    video.readyState < 2 ||
    video.videoWidth <= 0 ||
    video.videoHeight <= 0
  ) {
    return { persons: [], activePerson: null };
  }

  const ready = await ensurePoseDetectorLoaded();
  if (!ready || !detectorInstance) {
    return { persons: [], activePerson: null };
  }

  let rawPoses: RawPoseResult[] = [];
  try {
    rawPoses = await detectorInstance.estimatePoses(video, {
      maxPoses: 4,
      flipHorizontal: false,
    });
  } catch {
    return { persons: [], activePerson: null };
  }

  const videoW = video.videoWidth;
  const videoH = video.videoHeight;
  const topModal = modalDetections[0] ?? null;
  const topModalRule = topModal
    ? IFAB_RULES.find((r) => r.name.toLowerCase() === topModal.label.toLowerCase())
    : undefined;

  const candidatePersons: TaggedPerson[] = [];

  for (let i = 0; i < rawPoses.length; i++) {
    const pose = rawPoses[i];
    if (!pose.keypoints || pose.keypoints.length < 17) continue;

    const kps: Keypoint[] = pose.keypoints.slice(0, 17).map((kp) => ({
      x: clamp01(kp.x / videoW),
      y: clamp01(kp.y / videoH),
      confidence: Math.max(0, Math.min(1, kp.score ?? 0)),
      name: kp.name,
    }));

    const visibleCount = kps.filter((k) => k.confidence >= 0.25).length;
    if (visibleCount < 3) continue;

    const avgConf =
      kps.reduce((sum, k) => sum + k.confidence, 0) / Math.max(1, kps.length);
    const personScore = pose.score ?? avgConf;
    if (personScore < 0.15) continue;

    const bbox = computeNormalizedBbox(kps, pose.box, videoW, videoH);
    const angles = computeRealJointAngles(kps);
    const personId = `person-${pose.id ?? i + 1}`;

    candidatePersons.push({
      id: personId,
      label: i === 0 ? "Referee" : "Player",
      labelTh:
        i === 0 && topModal
          ? `${topModalRule?.nameTh || topModal.label} (#${i + 1})`
          : `บุคคล #${i + 1}`,
      bbox,
      confidence: Number(personScore.toFixed(3)),
      isTagged: false,
      keypoints: kps,
      angles,
    });
  }

  if (candidatePersons.length === 0) {
    return { persons: [], activePerson: null };
  }

  // Select primary tagged person (either largest/first when autoTagReferee or user's selected id)
  let taggedIdx = 0;
  if (!autoTagReferee) {
    const manualIdx = candidatePersons.findIndex((p) => p.id === activePersonId);
    if (manualIdx !== -1) {
      taggedIdx = manualIdx;
    }
  } else {
    // Pick largest bounding box area as main subject
    let bestArea = -1;
    candidatePersons.forEach((p, idx) => {
      const area = p.bbox[2] * p.bbox[3];
      if (area > bestArea) {
        bestArea = area;
        taggedIdx = idx;
      }
    });
  }

  const persons = candidatePersons.map((p, idx) => ({
    ...p,
    isTagged: idx === taggedIdx,
    label: idx === taggedIdx ? ("Referee" as const) : p.label,
    labelTh:
      idx === taggedIdx && topModal
        ? `${topModalRule?.nameTh || topModal.label}`
        : idx === taggedIdx
        ? `ผู้ตัดสินหลัก (#${idx + 1})`
        : `บุคคล #${idx + 1}`,
  }));

  return {
    persons,
    activePerson: persons[taggedIdx] ?? persons[0],
  };
}
