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
  isF1ZeroLimited: (F1_ZERO_LIMITED_CLASSES as readonly string[]).includes(
    entry.name
  ),
}));

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
