import {
  ModalDetection,
  ModalHealthResponse,
  ModalImagePredictResponse,
  ModalVideoPredictResponse,
  ModalWsConfigResponse,
  SignalClassInfo,
} from "../Data_Types/Referee_Types";
import { IFAB_SIGNAL_CLASSES } from "./Ifab_Rules_Catalog";

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

export function findRuleByLabel(label: string): SignalClassInfo | undefined {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return undefined;
  return IFAB_SIGNAL_CLASSES.find((r) => r.name.toLowerCase() === normalized);
}
