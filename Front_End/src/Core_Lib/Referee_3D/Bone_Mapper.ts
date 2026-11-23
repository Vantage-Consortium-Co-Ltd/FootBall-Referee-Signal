/**
 * Pure TypeScript Humanoid Skeleton Bone Mapper.
 * Maps MakeHuman / MPFB2, Mixamo / RPM / VRM, KayKit, Khronos CesiumMan,
 * and generic humanoid bone names onto our canonical 17-joint IFAB rig.
 * Zero Three.js or DOM dependencies so Node test runners execute directly.
 */

import type { JointName } from "./Pose_Types";

export type RigConvention = "makehuman" | "mixamo" | "kaykit" | "cesium" | "generic";

export interface BoneMapResult {
  convention: RigConvention;
  mapping: Partial<Record<JointName, string>>;
  mappedCount: number;
}

type ConventionTable = Partial<Record<JointName, readonly string[]>>;
type SpecificConvention = Exclude<RigConvention, "generic">;

const JOINT_ORDER: readonly JointName[] = [
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
];

const CONVENTION_TABLES: Record<SpecificConvention, ConventionTable> = {
  cesium: {
    hips: ["skeleton_torso_joint_1"],
    spine: ["skeleton_torso_joint_2"],
    chest: ["torso_joint_3"],
    neck: ["skeleton_neck_joint_1"],
    head: ["skeleton_neck_joint_2"],
    leftShoulder: ["skeleton_arm_joint_l__4_"],
    leftElbow: ["skeleton_arm_joint_l__3_"],
    leftWrist: ["skeleton_arm_joint_l__2_"],
    rightShoulder: ["skeleton_arm_joint_r"],
    rightElbow: ["skeleton_arm_joint_r__2_"],
    rightWrist: ["skeleton_arm_joint_r__3_"],
    leftHip: ["leg_joint_l_1"],
    leftKnee: ["leg_joint_l_2"],
    leftAnkle: ["leg_joint_l_3"],
    rightHip: ["leg_joint_r_1"],
    rightKnee: ["leg_joint_r_2"],
    rightAnkle: ["leg_joint_r_3"],
  },
  makehuman: {
    hips: ["pelvis", "root_hips"],
    spine: ["spine_01", "spine01"],
    chest: ["spine_03", "spine_02", "chest"],
    neck: ["neck_01", "neck01"],
    head: ["head"],
    leftShoulder: ["upperarm_l", "upperarm01_l"],
    leftElbow: ["lowerarm_l", "lowerarm01_l"],
    leftWrist: ["hand_l", "wrist_l"],
    rightShoulder: ["upperarm_r", "upperarm01_r"],
    rightElbow: ["lowerarm_r", "lowerarm01_r"],
    rightWrist: ["hand_r", "wrist_r"],
    leftHip: ["thigh_l", "upperleg01_l"],
    leftKnee: ["calf_l", "lowerleg01_l"],
    leftAnkle: ["foot_l"],
    rightHip: ["thigh_r", "upperleg01_r"],
    rightKnee: ["calf_r", "lowerleg01_r"],
    rightAnkle: ["foot_r"],
  },
  mixamo: {
    hips: ["hips"],
    spine: ["spine"],
    chest: ["spine2", "spine1", "chest"],
    neck: ["neck"],
    head: ["head"],
    leftShoulder: ["leftarm", "leftupperarm"],
    leftElbow: ["leftforearm", "leftlowerarm"],
    leftWrist: ["lefthand"],
    rightShoulder: ["rightarm", "rightupperarm"],
    rightElbow: ["rightforearm", "rightlowerarm"],
    rightWrist: ["righthand"],
    leftHip: ["leftupleg", "leftupperleg"],
    leftKnee: ["leftleg", "leftlowerleg"],
    leftAnkle: ["leftfoot"],
    rightHip: ["rightupleg", "rightupperleg"],
    rightKnee: ["rightleg", "rightlowerleg"],
    rightAnkle: ["rightfoot"],
  },
  kaykit: {
    hips: ["hips"],
    spine: ["spine"],
    chest: ["chest"],
    neck: ["neck"],
    head: ["head"],
    leftShoulder: ["upperarm.l"],
    leftElbow: ["lowerarm.l"],
    leftWrist: ["wrist.l", "hand.l"],
    rightShoulder: ["upperarm.r"],
    rightElbow: ["lowerarm.r"],
    rightWrist: ["wrist.r", "hand.r"],
    leftHip: ["upperleg.l"],
    leftKnee: ["lowerleg.l"],
    leftAnkle: ["foot.l"],
    rightHip: ["upperleg.r"],
    rightKnee: ["lowerleg.r"],
    rightAnkle: ["foot.r"],
  },
};

const GENERIC_TABLE: ConventionTable = {
  hips: ["hips", "pelvis", "root_hips", "hip"],
  spine: ["spine", "spine_01", "spine01", "spine1"],
  chest: ["chest", "spine_03", "spine_02", "spine2", "upper_chest", "upperchest"],
  neck: ["neck", "neck_01", "neck01"],
  head: ["head"],
  leftShoulder: [
    "left_shoulder",
    "leftshoulder",
    "left_upper_arm",
    "leftupperarm",
    "upper_arm_l",
    "upperarm_l",
    "upperarm.l",
    "leftarm",
    "l_upperarm",
  ],
  leftElbow: [
    "left_elbow",
    "leftelbow",
    "left_forearm",
    "leftforearm",
    "left_lower_arm",
    "leftlowerarm",
    "lowerarm_l",
    "lowerarm.l",
    "forearm_l",
    "l_forearm",
  ],
  leftWrist: ["left_wrist", "leftwrist", "left_hand", "lefthand", "hand_l", "wrist_l", "wrist.l", "hand.l"],
  rightShoulder: [
    "right_shoulder",
    "rightshoulder",
    "right_upper_arm",
    "rightupperarm",
    "upper_arm_r",
    "upperarm_r",
    "upperarm.r",
    "rightarm",
    "r_upperarm",
  ],
  rightElbow: [
    "right_elbow",
    "rightelbow",
    "right_forearm",
    "rightforearm",
    "right_lower_arm",
    "rightlowerarm",
    "lowerarm_r",
    "lowerarm.r",
    "forearm_r",
    "r_forearm",
  ],
  rightWrist: ["right_wrist", "rightwrist", "right_hand", "righthand", "hand_r", "wrist_r", "wrist.r", "hand.r"],
  leftHip: ["left_hip", "lefthip", "left_thigh", "leftthigh", "left_upper_leg", "leftupperleg", "leftupleg", "thigh_l", "upperleg.l"],
  leftKnee: ["left_knee", "leftknee", "left_calf", "left_shin", "left_lower_leg", "leftlowerleg", "leftleg", "calf_l", "lowerleg.l"],
  leftAnkle: ["left_ankle", "leftankle", "left_foot", "leftfoot", "foot_l", "foot.l"],
  rightHip: ["right_hip", "righthip", "right_thigh", "rightthigh", "right_upper_leg", "rightupperleg", "rightupleg", "thigh_r", "upperleg.r"],
  rightKnee: ["right_knee", "rightknee", "right_calf", "right_shin", "right_lower_leg", "rightlowerleg", "rightleg", "calf_r", "lowerleg.r"],
  rightAnkle: ["right_ankle", "rightankle", "right_foot", "rightfoot", "foot_r", "foot.r"],
};

const SIGNATURE_MARKERS: Record<SpecificConvention, readonly string[]> = {
  cesium: [
    "skeleton_torso_joint_1",
    "skeleton_torso_joint_2",
    "torso_joint_3",
    "skeleton_arm_joint_l__4_",
    "skeleton_arm_joint_r",
    "leg_joint_l_1",
    "leg_joint_r_1",
  ],
  makehuman: [
    "pelvis",
    "root_hips",
    "spine_01",
    "spine01",
    "upperarm_l",
    "upperarm01_l",
    "upperarm_r",
    "upperarm01_r",
    "thigh_l",
    "upperleg01_l",
    "calf_l",
    "lowerleg01_l",
  ],
  mixamo: [
    "spine2",
    "leftarm",
    "leftupperarm",
    "leftforearm",
    "leftlowerarm",
    "leftupleg",
    "leftupperleg",
    "rightarm",
    "rightupperarm",
    "rightforearm",
    "rightupleg",
  ],
  kaykit: [
    "upperarm.l",
    "lowerarm.l",
    "wrist.l",
    "hand.l",
    "upperarm.r",
    "lowerarm.r",
    "wrist.r",
    "hand.r",
    "upperleg.l",
    "lowerleg.l",
    "foot.l",
  ],
};

const MIXAMO_PREFIX_RE = /^mixamorig\d*[:_]?/i;

function normalizeBoneName(raw: string): {
  exact: string;
  stripped: string;
  hasMixamoPrefix: boolean;
} {
  const trimmed = raw.trim();
  const slashIdx = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("|"));
  const leaf = slashIdx >= 0 ? trimmed.slice(slashIdx + 1) : trimmed;
  const exact = leaf.toLowerCase();
  const hasMixamoPrefix = MIXAMO_PREFIX_RE.test(leaf);
  const withoutMixamo = hasMixamoPrefix ? leaf.replace(MIXAMO_PREFIX_RE, "") : leaf;
  const colonIdx = withoutMixamo.lastIndexOf(":");
  const stripped = (colonIdx >= 0 ? withoutMixamo.slice(colonIdx + 1) : withoutMixamo).toLowerCase();
  return { exact, stripped, hasMixamoPrefix };
}

function detectConvention(
  tokens: ReadonlySet<string>,
  hasMixamoPrefix: boolean
): RigConvention {
  let bestConvention: RigConvention = "generic";
  let bestScore = 0;

  const order: readonly SpecificConvention[] = ["cesium", "makehuman", "mixamo", "kaykit"];
  for (const convention of order) {
    let score = convention === "mixamo" && hasMixamoPrefix ? 4 : 0;
    for (const marker of SIGNATURE_MARKERS[convention]) {
      if (tokens.has(marker)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestConvention = convention;
    }
  }

  return bestScore > 0 ? bestConvention : "generic";
}

function applyCandidateTable(
  table: ConventionTable,
  lookup: ReadonlyMap<string, string>,
  usedOriginalBones: Set<string>,
  mapping: Partial<Record<JointName, string>>
): void {
  for (const joint of JOINT_ORDER) {
    if (mapping[joint] !== undefined) continue;
    const candidates = table[joint];
    if (!candidates) continue;

    for (const token of candidates) {
      const original = lookup.get(token);
      if (original !== undefined && !usedOriginalBones.has(original)) {
        mapping[joint] = original;
        usedOriginalBones.add(original);
        break;
      }
    }
  }
}

/**
 * Maps raw GLB bone node names to our canonical 17 IFAB joints.
 * Detects MakeHuman/MPFB2, Mixamo/RPM/VRM, KayKit, Khronos CesiumMan, or generic rigs
 * using exact normalized token lookup so suffix-numbered joints never collide.
 */
export function mapBoneNamesToJoints(boneNames: readonly string[]): BoneMapResult {
  const exactLookup = new Map<string, string>();
  const strippedLookup = new Map<string, string>();
  const allTokens = new Set<string>();
  let hasMixamoPrefix = false;

  for (const rawName of boneNames) {
    if (typeof rawName !== "string") continue;
    const trimmed = rawName.trim();
    if (!trimmed) continue;

    const norm = normalizeBoneName(trimmed);
    if (norm.hasMixamoPrefix) {
      hasMixamoPrefix = true;
    }
    if (norm.exact && !exactLookup.has(norm.exact)) {
      exactLookup.set(norm.exact, rawName);
    }
    if (norm.stripped && !strippedLookup.has(norm.stripped)) {
      strippedLookup.set(norm.stripped, rawName);
    }
    if (norm.exact) allTokens.add(norm.exact);
    if (norm.stripped) allTokens.add(norm.stripped);
  }

  // Prefer exact leaf matches first, falling back to namespace/mixamorig-stripped matches
  const lookup = new Map<string, string>(strippedLookup);
  for (const [k, v] of exactLookup) {
    lookup.set(k, v);
  }

  const convention = detectConvention(allTokens, hasMixamoPrefix);
  const mapping: Partial<Record<JointName, string>> = {};
  const usedOriginalBones = new Set<string>();

  if (convention !== "generic") {
    applyCandidateTable(CONVENTION_TABLES[convention], lookup, usedOriginalBones, mapping);
  } else {
    applyCandidateTable(GENERIC_TABLE, lookup, usedOriginalBones, mapping);
  }

  return {
    convention,
    mapping,
    mappedCount: Object.keys(mapping).length,
  };
}
