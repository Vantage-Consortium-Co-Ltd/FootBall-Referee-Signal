/**
 * Pure TypeScript pose and animation contracts for the 3D IFAB Referee rig.
 * Zero Three.js or DOM dependencies so pose math runs directly under Node test runners.
 */

export type Vec3Tuple = [number, number, number];

export const JOINT_NAMES = [
  "hips",
  "spine",
  "chest",
  "neck",
  "head",
  "leftShoulder",
  "leftElbow",
  "leftWrist",
  "rightShoulder",
  "rightElbow",
  "rightWrist",
  "leftHip",
  "leftKnee",
  "leftAnkle",
  "rightHip",
  "rightKnee",
  "rightAnkle",
] as const;

export type JointName = (typeof JOINT_NAMES)[number];

export type EasingMode = "linear" | "easeInOut" | "easeOut";

export type HighlightArms = "none" | "left" | "right" | "both";

export interface RefereePose {
  rootOffsetY?: number;
  joints: Partial<Record<JointName, Vec3Tuple>>;
  cardVisible?: boolean;
  whistleActive?: boolean;
}

export interface ResolvedPose {
  rootOffsetY: number;
  joints: Record<JointName, Vec3Tuple>;
  cardVisible: boolean;
  whistleActive: boolean;
}

export interface PoseKeyframe {
  t: number;
  pose: RefereePose;
  ease?: EasingMode;
}

export interface SignalAnimationClip {
  signalId: number;
  name: string;
  durationSec: number;
  peakT: number;
  keyframes: PoseKeyframe[];
  supportsMirror: boolean;
  supportsCardToggle: boolean;
  highlightArms: HighlightArms;
}
