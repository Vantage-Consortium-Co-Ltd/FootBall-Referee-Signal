import {
  F1_ZERO_LIMITED_CLASSES,
  GestureCategory,
  SignalClassInfo,
} from "../Data_Types/Referee_Types";
import ifabSignalsData from "../Data_Sources/Ifab_Signals.json";

interface RawIfabSignalEntry {
  id: number;
  name: string;
  nameTh: string;
  ifabLaw: string;
  category: GestureCategory;
  descriptionTh: string;
  descriptionEn: string;
  coachingTips: string[];
}

export const IFAB_SIGNAL_CLASSES: SignalClassInfo[] = (
  ifabSignalsData as RawIfabSignalEntry[]
).map((entry) => ({
  id: entry.id,
  name: entry.name,
  nameTh: entry.nameTh,
  ifabLaw: entry.ifabLaw,
  category: entry.category,
  descriptionTh: entry.descriptionTh,
  descriptionEn: entry.descriptionEn,
  coachingTips: Array.isArray(entry.coachingTips) ? entry.coachingTips : [],
  isF1ZeroLimited: (F1_ZERO_LIMITED_CLASSES as readonly string[]).includes(
    entry.name
  ),
}));

/** Convert backend snake_case label into human-readable English display text. */
export function formatSignalEnglishName(label: string): string {
  return label.replace(/_/g, " ").trim();
}

export interface ConfidenceVisualMeta {
  pct: number;
  tierLabel: string;
  badgeClass: string;
  barClass: string;
  textClass: string;
}

/** Shared confidence tier mapping for consistent visual hierarchy across all modes. */
export function getConfidenceVisualMeta(confidence: number): ConfidenceVisualMeta {
  const pct = Math.max(0, Math.min(100, Math.round(confidence * 100)));
  if (pct >= 70) {
    return {
      pct,
      tierLabel: "มั่นใจสูง",
      badgeClass: "bg-emerald-500/15 border-emerald-400/40 text-emerald-300",
      barClass: "bg-emerald-400",
      textClass: "text-emerald-300",
    };
  }
  if (pct >= 40) {
    return {
      pct,
      tierLabel: "ปานกลาง",
      badgeClass: "bg-amber-500/15 border-amber-400/40 text-amber-300",
      barClass: "bg-amber-400",
      textClass: "text-amber-300",
    };
  }
  return {
    pct,
    tierLabel: "เบื้องต้น",
    badgeClass: "bg-sky-500/15 border-sky-400/40 text-sky-300",
    barClass: "bg-sky-400",
    textClass: "text-sky-300",
  };
}

/** Format timestamp seconds as mm:ss.d for video match timelines. */
export function formatTimestampSec(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const rem = safe - mins * 60;
  const wholeSecs = Math.floor(rem);
  const tenths = Math.floor((rem - wholeSecs) * 10);
  return `${String(mins).padStart(2, "0")}:${String(wholeSecs).padStart(2, "0")}.${tenths}`;
}

export const MODEL_SPEC_INFO = {
  apiVersion: "0.1.0",
  baseModel: "YOLO26n-pose (2.9M params)",
  weightsPath: "Train/model_output_version/results_c2/runs/one_stage/best_overall.pt",
  macroF1: 0.72,
  weightedF1: 0.724,
  accuracy: 0.734,
  poseMap5095: 0.858,
  testPersons: 154,
  maxUploadMb: 100,
  videoStride: 5,
  videoMaxSeconds: 30,
  wsIdleSeconds: 30,
  docsUrl: "https://kitkhachon-xx--web.us-east.modal.run/docs",
} as const;
