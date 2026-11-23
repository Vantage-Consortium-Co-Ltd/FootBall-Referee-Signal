/**
 * Football Referee Signal Service — API & Domain Types
 * Aligned 1:1 with Inference/app/service.py, Inference/app/predict.py, and docs/api_spce/apiSpec.md
 */

export type GestureCategory = "restarts" | "fouls" | "match_control" | "offside";

export type ActiveArm = "none" | "right" | "either" | "both";

export type CameraPreset = "front" | "side" | "three_quarter" | "free";

export type CardColor = "yellow" | "red";

export type PlaybackSpeed = 0.5 | 1;

export const F1_ZERO_LIMITED_CLASSES = ["Offside", "Goal", "Elbowing"] as const;

export interface SignalClassInfo {
  id: number;
  name: string;
  nameTh: string;
  ifabLaw: string;
  category: GestureCategory;
  activeArm: ActiveArm;
  targetElevationDeg: number;
  minElevationDeg: number;
  targetStraightnessDeg: number;
  minStraightnessDeg: number;
  minHoldSeconds: number;
  descriptionTh: string;
  descriptionEn: string;
  coachingTips: string[];
  isF1ZeroLimited: boolean;
}

export interface ModalDetection {
  label: string;
  confidence: number;
}

export interface ModalHealthResponse {
  status: "ok" | "error";
  model: string;
  device: string;
  fp16?: boolean;
  cuda?: boolean;
  conf: number;
  imgsz: number;
  latencyMs?: number;
  detail?: string;
}

export interface ModalImagePredictResponse {
  detections: ModalDetection[];
}

export interface ModalVideoFrameResult {
  frame: number;
  time: number;
  detections: ModalDetection[];
}

export interface ModalVideoPredictResponse {
  fps: number;
  frames_read: number;
  results: ModalVideoFrameResult[];
}

export interface ModalWsConfigResponse {
  wsUrl: string;
  baseUrl: string;
  hasApiKey: boolean;
}
