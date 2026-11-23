/**
 * Pure TypeScript Pose Math Engine & 20 IFAB Referee Signal Animation Clips.
 * Zero Three.js or DOM imports — uses type-only imports from ./Pose_Types
 * so Node 26 native TypeScript stripping and tsc bundler resolution both work cleanly.
 */

import type {
  EasingMode,
  JointName,
  PoseKeyframe,
  RefereePose,
  ResolvedPose,
  SignalAnimationClip,
  Vec3Tuple,
} from "./Pose_Types";

const deg = (degrees: number): number => (degrees * Math.PI) / 180;

const JOINT_KEY_GUARD: Record<JointName, true> = {
  hips: true,
  spine: true,
  chest: true,
  neck: true,
  head: true,
  leftShoulder: true,
  leftElbow: true,
  leftWrist: true,
  rightShoulder: true,
  rightElbow: true,
  rightWrist: true,
  leftHip: true,
  leftKnee: true,
  leftAnkle: true,
  rightHip: true,
  rightKnee: true,
  rightAnkle: true,
};

const ALL_JOINTS = Object.keys(JOINT_KEY_GUARD) as JointName[];

const PAIRED_JOINT_SWAPS: ReadonlyArray<readonly [JointName, JointName]> = [
  ["leftShoulder", "rightShoulder"],
  ["leftElbow", "rightElbow"],
  ["leftWrist", "rightWrist"],
  ["leftHip", "rightHip"],
  ["leftKnee", "rightKnee"],
  ["leftAnkle", "rightAnkle"],
];

const CENTER_JOINTS: readonly JointName[] = [
  "hips",
  "spine",
  "chest",
  "neck",
  "head",
];

/** Athletic ready stance: relaxed arms ~13 deg from torso, slight knee bend, feet flat. */
export const NEUTRAL_REFEREE_POSE: ResolvedPose = {
  rootOffsetY: 0,
  cardVisible: false,
  whistleActive: false,
  joints: {
    hips: [0, 0, 0],
    spine: [deg(2), 0, 0],
    chest: [deg(2), 0, 0],
    neck: [deg(-2), 0, 0],
    head: [0, 0, 0],
    leftShoulder: [deg(-4), 0, deg(13)],
    leftElbow: [deg(-14), 0, 0],
    leftWrist: [0, 0, 0],
    rightShoulder: [deg(-4), 0, deg(-13)],
    rightElbow: [deg(-14), 0, 0],
    rightWrist: [0, 0, 0],
    leftHip: [deg(-4), deg(3), deg(3)],
    leftKnee: [deg(8), 0, 0],
    leftAnkle: [deg(-4), 0, 0],
    rightHip: [deg(-4), deg(-3), deg(-3)],
    rightKnee: [deg(8), 0, 0],
    rightAnkle: [deg(-4), 0, 0],
  },
};

function cloneVec3(v: Vec3Tuple): Vec3Tuple {
  return [v[0], v[1], v[2]];
}

function cleanZero(n: number): number {
  return n === 0 ? 0 : n;
}

function negateYZ(v: Vec3Tuple): Vec3Tuple {
  return [v[0], cleanZero(-v[1]), cleanZero(-v[2])];
}

function cloneResolvedPose(pose: ResolvedPose): ResolvedPose {
  const joints = {} as Record<JointName, Vec3Tuple>;
  for (const joint of ALL_JOINTS) {
    joints[joint] = cloneVec3(pose.joints[joint]);
  }
  return {
    rootOffsetY: pose.rootOffsetY,
    joints,
    cardVisible: pose.cardVisible,
    whistleActive: pose.whistleActive,
  };
}

function resolvePose(partial: RefereePose): ResolvedPose {
  const joints = {} as Record<JointName, Vec3Tuple>;
  for (const joint of ALL_JOINTS) {
    const override = partial.joints[joint];
    joints[joint] = cloneVec3(override ?? NEUTRAL_REFEREE_POSE.joints[joint]);
  }
  return {
    rootOffsetY: partial.rootOffsetY ?? NEUTRAL_REFEREE_POSE.rootOffsetY,
    joints,
    cardVisible: partial.cardVisible ?? false,
    whistleActive: partial.whistleActive ?? false,
  };
}

function kf(
  t: number,
  joints: Partial<Record<JointName, Vec3Tuple>>,
  ease: EasingMode = "easeInOut",
  options?: { rootOffsetY?: number; cardVisible?: boolean; whistleActive?: boolean }
): PoseKeyframe {
  return {
    t,
    ease,
    pose: {
      joints,
      ...(options?.rootOffsetY !== undefined
        ? { rootOffsetY: options.rootOffsetY }
        : {}),
      ...(options?.cardVisible !== undefined
        ? { cardVisible: options.cardVisible }
        : {}),
      ...(options?.whistleActive !== undefined
        ? { whistleActive: options.whistleActive }
        : {}),
    },
  };
}

const NEUTRAL_KF_START = (ease: EasingMode = "easeInOut"): PoseKeyframe => ({
  t: 0,
  ease,
  pose: { joints: {} },
});

const NEUTRAL_KF_END = (ease: EasingMode = "easeInOut"): PoseKeyframe => ({
  t: 1,
  ease,
  pose: { joints: {} },
});

function applyEasing(u: number, mode: EasingMode): number {
  if (mode === "linear") return u;
  if (mode === "easeOut") return 1 - Math.pow(1 - u, 3);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

function normalizeUnitTime(normalizedTime: number): number {
  if (!Number.isFinite(normalizedTime)) return 0;
  if (normalizedTime >= 0 && normalizedTime <= 1) {
    return normalizedTime === 0 ? 0 : normalizedTime;
  }
  const wrapped = ((normalizedTime % 1) + 1) % 1;
  return wrapped === 0 ? 0 : wrapped;
}

/**
 * Reflection across the YZ plane (+X <-> -X) under XYZ Euler order:
 * swap paired L/R joints and negate ry, rz on all 17 joints while preserving rx.
 */
export function mirrorPose(pose: ResolvedPose): ResolvedPose {
  const joints = {} as Record<JointName, Vec3Tuple>;

  for (const center of CENTER_JOINTS) {
    joints[center] = negateYZ(pose.joints[center]);
  }
  for (const [leftJoint, rightJoint] of PAIRED_JOINT_SWAPS) {
    joints[leftJoint] = negateYZ(pose.joints[rightJoint]);
    joints[rightJoint] = negateYZ(pose.joints[leftJoint]);
  }

  return {
    rootOffsetY: pose.rootOffsetY,
    joints,
    cardVisible: pose.cardVisible,
    whistleActive: pose.whistleActive,
  };
}

/** Linearly blend all 17 joints and rootOffsetY; switch booleans at alpha >= 0.5. */
export function blendPoses(
  from: ResolvedPose,
  to: ResolvedPose,
  alpha: number
): ResolvedPose {
  const clamped = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 0;
  if (clamped === 0) return cloneResolvedPose(from);
  if (clamped === 1) return cloneResolvedPose(to);

  const joints = {} as Record<JointName, Vec3Tuple>;
  for (const joint of ALL_JOINTS) {
    const a = from.joints[joint];
    const b = to.joints[joint];
    joints[joint] = [
      a[0] + (b[0] - a[0]) * clamped,
      a[1] + (b[1] - a[1]) * clamped,
      a[2] + (b[2] - a[2]) * clamped,
    ];
  }

  return {
    rootOffsetY:
      from.rootOffsetY + (to.rootOffsetY - from.rootOffsetY) * clamped,
    joints,
    cardVisible: clamped >= 0.5 ? to.cardVisible : from.cardVisible,
    whistleActive: clamped >= 0.5 ? to.whistleActive : from.whistleActive,
  };
}

export const SIGNAL_ANIMATION_CLIPS: Record<number, SignalAnimationClip> = {
  0: {
    signalId: 0,
    name: "Referee",
    durationSec: 3.2,
    peakT: 0.5,
    supportsMirror: false,
    supportsCardToggle: false,
    highlightArms: "none",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(0.25, {
        chest: [deg(-1.5), 0, 0],
        head: [deg(1), deg(10), 0],
        leftShoulder: [deg(-5), 0, deg(15)],
        rightShoulder: [deg(-5), 0, deg(-15)],
      }),
      kf(0.5, {
        chest: [deg(-1), 0, 0],
        head: [0, 0, 0],
        leftShoulder: [deg(-5), 0, deg(14.5)],
        rightShoulder: [deg(-5), 0, deg(-14.5)],
      }),
      kf(0.75, {
        chest: [deg(1.5), 0, 0],
        head: [deg(1), deg(-10), 0],
        leftShoulder: [deg(-4), 0, deg(14)],
        rightShoulder: [deg(-4), 0, deg(-14)],
      }),
      NEUTRAL_KF_END(),
    ],
  },

  1: {
    signalId: 1,
    name: "Indirect_Free_Kick",
    durationSec: 2.6,
    peakT: 0.5,
    supportsMirror: true,
    supportsCardToggle: false,
    highlightArms: "right",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.2,
        {
          spine: [deg(-2), 0, deg(3)],
          head: [deg(-4), 0, 0],
          rightShoulder: [deg(6), 0, deg(-175)],
          rightElbow: [deg(-4), 0, 0],
          rightWrist: [0, deg(-15), 0],
        },
        "easeOut"
      ),
      kf(
        0.75,
        {
          spine: [deg(-2), 0, deg(3)],
          head: [deg(-4), 0, 0],
          rightShoulder: [deg(6), 0, deg(-175)],
          rightElbow: [deg(-4), 0, 0],
          rightWrist: [0, deg(-15), 0],
        },
        "linear"
      ),
      NEUTRAL_KF_END(),
    ],
  },

  2: {
    signalId: 2,
    name: "Direct_Free_Kick",
    durationSec: 2.4,
    peakT: 0.5,
    supportsMirror: true,
    supportsCardToggle: false,
    highlightArms: "right",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.2,
        {
          chest: [0, deg(-5), 0],
          head: [0, deg(-18), 0],
          rightShoulder: [0, deg(6), deg(-90)],
          rightElbow: [deg(-6), 0, 0],
          rightWrist: [0, 0, deg(-4)],
        },
        "easeOut"
      ),
      kf(
        0.74,
        {
          chest: [0, deg(-5), 0],
          head: [0, deg(-18), 0],
          rightShoulder: [0, deg(6), deg(-90)],
          rightElbow: [deg(-6), 0, 0],
          rightWrist: [0, 0, deg(-4)],
        },
        "linear"
      ),
      NEUTRAL_KF_END(),
    ],
  },

  3: {
    signalId: 3,
    name: "Card",
    durationSec: 3.0,
    peakT: 0.55,
    supportsMirror: true,
    supportsCardToggle: true,
    highlightArms: "right",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.16,
        {
          spine: [deg(4), 0, 0],
          head: [deg(6), 0, 0],
          rightShoulder: [deg(-65), 0, deg(32)],
          rightElbow: [deg(-105), 0, 0],
        },
        "easeInOut",
        { cardVisible: false }
      ),
      kf(
        0.25,
        {
          spine: [deg(4), 0, 0],
          rightShoulder: [deg(-95), 0, deg(-65)],
          rightElbow: [deg(-55), 0, 0],
        },
        "easeOut",
        { cardVisible: true }
      ),
      kf(
        0.4,
        {
          spine: [deg(5), 0, 0],
          chest: [deg(4), 0, 0],
          head: [deg(-2), 0, 0],
          rightShoulder: [deg(12), 0, deg(-168)],
          rightElbow: [deg(-8), 0, 0],
          rightWrist: [0, deg(-10), 0],
        },
        "easeOut",
        { cardVisible: true }
      ),
      kf(
        0.76,
        {
          spine: [deg(5), 0, 0],
          chest: [deg(4), 0, 0],
          head: [deg(-2), 0, 0],
          rightShoulder: [deg(12), 0, deg(-168)],
          rightElbow: [deg(-8), 0, 0],
          rightWrist: [0, deg(-10), 0],
        },
        "linear",
        { cardVisible: true }
      ),
      kf(
        0.88,
        {
          spine: [deg(2), 0, 0],
          rightShoulder: [deg(-45), 0, deg(-40)],
          rightElbow: [deg(-35), 0, 0],
        },
        "easeInOut",
        { cardVisible: false }
      ),
      NEUTRAL_KF_END(),
    ],
  },

  4: {
    signalId: 4,
    name: "Play_On",
    durationSec: 2.6,
    peakT: 0.48,
    supportsMirror: false,
    supportsCardToggle: false,
    highlightArms: "both",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.22,
        {
          spine: [deg(6), 0, 0],
          chest: [deg(4), 0, 0],
          leftShoulder: [deg(-75), 0, deg(22)],
          leftElbow: [deg(-14), 0, 0],
          rightShoulder: [deg(-75), 0, deg(-22)],
          rightElbow: [deg(-14), 0, 0],
        },
        "easeOut"
      ),
      kf(
        0.48,
        {
          spine: [deg(6), 0, 0],
          chest: [deg(4), 0, 0],
          leftShoulder: [deg(-90), 0, deg(40)],
          leftElbow: [deg(-10), 0, 0],
          rightShoulder: [deg(-90), 0, deg(-40)],
          rightElbow: [deg(-10), 0, 0],
        },
        "easeInOut"
      ),
      kf(
        0.72,
        {
          spine: [deg(5), 0, 0],
          chest: [deg(3), 0, 0],
          leftShoulder: [deg(-82), 0, deg(36)],
          leftElbow: [deg(-12), 0, 0],
          rightShoulder: [deg(-82), 0, deg(-36)],
          rightElbow: [deg(-12), 0, 0],
        },
        "easeInOut"
      ),
      NEUTRAL_KF_END(),
    ],
  },

  5: {
    signalId: 5,
    name: "Penalty_Kick",
    durationSec: 2.5,
    peakT: 0.5,
    supportsMirror: true,
    supportsCardToggle: false,
    highlightArms: "right",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.22,
        {
          spine: [deg(4), 0, 0],
          head: [deg(8), deg(-8), 0],
          rightShoulder: [deg(-35), 0, deg(-30)],
          rightElbow: [deg(-5), 0, 0],
        },
        "easeOut"
      ),
      kf(
        0.75,
        {
          spine: [deg(4), 0, 0],
          head: [deg(8), deg(-8), 0],
          rightShoulder: [deg(-35), 0, deg(-30)],
          rightElbow: [deg(-5), 0, 0],
        },
        "linear"
      ),
      NEUTRAL_KF_END(),
    ],
  },

  6: {
    signalId: 6,
    name: "Offside",
    durationSec: 2.5,
    peakT: 0.45,
    supportsMirror: true,
    supportsCardToggle: false,
    highlightArms: "right",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.14,
        {
          spine: [deg(-1), 0, deg(3)],
          head: [deg(-3), 0, 0],
          rightShoulder: [deg(10), 0, deg(-170)],
          rightElbow: [deg(-4), 0, 0],
        },
        "easeOut",
        { whistleActive: true }
      ),
      kf(
        0.72,
        {
          spine: [deg(-1), 0, deg(3)],
          head: [deg(-3), 0, 0],
          rightShoulder: [deg(10), 0, deg(-170)],
          rightElbow: [deg(-4), 0, 0],
        },
        "linear",
        { whistleActive: true }
      ),
      NEUTRAL_KF_END(),
    ],
  },

  7: {
    signalId: 7,
    name: "Offside_Location",
    durationSec: 2.8,
    peakT: 0.5,
    supportsMirror: true,
    supportsCardToggle: false,
    highlightArms: "right",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.22,
        {
          chest: [deg(3), deg(4), 0],
          head: [deg(4), deg(-5), 0],
          rightShoulder: [0, deg(70), deg(-90)],
          rightElbow: [deg(-8), 0, 0],
        },
        "easeOut"
      ),
      kf(
        0.5,
        {
          chest: [deg(2), deg(-4), 0],
          head: [deg(2), deg(-15), 0],
          rightShoulder: [0, deg(40), deg(-90)],
          rightElbow: [deg(-8), 0, 0],
        },
        "easeInOut"
      ),
      kf(
        0.74,
        {
          chest: [0, deg(-10), 0],
          head: [0, deg(-25), 0],
          rightShoulder: [0, deg(5), deg(-90)],
          rightElbow: [deg(-8), 0, 0],
        },
        "easeInOut"
      ),
      NEUTRAL_KF_END(),
    ],
  },

  8: {
    signalId: 8,
    name: "Substitution",
    durationSec: 3.0,
    peakT: 0.5,
    supportsMirror: false,
    supportsCardToggle: false,
    highlightArms: "both",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.2,
        {
          head: [deg(-4), 0, 0],
          leftShoulder: [deg(-130), 0, deg(14)],
          leftElbow: [deg(-65), 0, 0],
          rightShoulder: [deg(-115), 0, deg(-14)],
          rightElbow: [deg(-45), 0, 0],
        },
        "easeOut"
      ),
      kf(
        0.38,
        {
          head: [deg(-4), 0, 0],
          leftShoulder: [deg(-112), 0, deg(22)],
          leftElbow: [deg(-40), 0, 0],
          rightShoulder: [deg(-134), 0, deg(-12)],
          rightElbow: [deg(-72), 0, 0],
        },
        "easeInOut"
      ),
      kf(
        0.56,
        {
          head: [deg(-4), 0, 0],
          leftShoulder: [deg(-134), 0, deg(12)],
          leftElbow: [deg(-72), 0, 0],
          rightShoulder: [deg(-112), 0, deg(-22)],
          rightElbow: [deg(-40), 0, 0],
        },
        "easeInOut"
      ),
      kf(
        0.76,
        {
          head: [deg(-4), 0, 0],
          leftShoulder: [deg(-116), 0, deg(18)],
          leftElbow: [deg(-45), 0, 0],
          rightShoulder: [deg(-132), 0, deg(-14)],
          rightElbow: [deg(-68), 0, 0],
        },
        "easeInOut"
      ),
      NEUTRAL_KF_END(),
    ],
  },

  9: {
    signalId: 9,
    name: "Goal",
    durationSec: 2.8,
    peakT: 0.5,
    supportsMirror: true,
    supportsCardToggle: false,
    highlightArms: "right",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.16,
        {
          spine: [deg(4), 0, 0],
          head: [0, deg(-4), 0],
          rightShoulder: [deg(-75), 0, deg(-25)],
          rightElbow: [deg(-5), 0, 0],
        },
        "easeOut",
        { whistleActive: true }
      ),
      kf(
        0.35,
        {
          spine: [deg(4), 0, 0],
          chest: [deg(4), deg(-6), 0],
          head: [0, deg(-6), 0],
          rightShoulder: [deg(-80), 0, deg(-20)],
          rightElbow: [deg(-4), 0, 0],
        },
        "easeOut",
        { whistleActive: true }
      ),
      kf(
        0.74,
        {
          spine: [deg(4), 0, 0],
          chest: [deg(4), deg(-6), 0],
          head: [0, deg(-6), 0],
          rightShoulder: [deg(-80), 0, deg(-20)],
          rightElbow: [deg(-4), 0, 0],
        },
        "linear",
        { whistleActive: false }
      ),
      NEUTRAL_KF_END(),
    ],
  },

  10: {
    signalId: 10,
    name: "Disallowed_Goal",
    durationSec: 3.0,
    peakT: 0.5,
    supportsMirror: false,
    supportsCardToggle: false,
    highlightArms: "both",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.15,
        {
          spine: [deg(3), 0, 0],
          leftShoulder: [deg(-85), 0, deg(-34)],
          leftElbow: [deg(-18), 0, 0],
          rightShoulder: [deg(-79), 0, deg(34)],
          rightElbow: [deg(-18), 0, 0],
        },
        "easeOut",
        { whistleActive: true }
      ),
      kf(
        0.32,
        {
          spine: [deg(3), 0, 0],
          leftShoulder: [deg(-82), 0, deg(48)],
          leftElbow: [deg(-14), 0, 0],
          rightShoulder: [deg(-82), 0, deg(-48)],
          rightElbow: [deg(-14), 0, 0],
        },
        "easeInOut",
        { whistleActive: true }
      ),
      kf(
        0.5,
        {
          spine: [deg(3), 0, 0],
          leftShoulder: [deg(-85), 0, deg(-34)],
          leftElbow: [deg(-18), 0, 0],
          rightShoulder: [deg(-79), 0, deg(34)],
          rightElbow: [deg(-18), 0, 0],
        },
        "easeInOut",
        { whistleActive: true }
      ),
      kf(
        0.68,
        {
          spine: [deg(3), 0, 0],
          leftShoulder: [deg(-82), 0, deg(48)],
          leftElbow: [deg(-14), 0, 0],
          rightShoulder: [deg(-82), 0, deg(-48)],
          rightElbow: [deg(-14), 0, 0],
        },
        "easeInOut",
        { whistleActive: false }
      ),
      kf(
        0.82,
        {
          spine: [deg(2), 0, 0],
          leftShoulder: [deg(-82), 0, deg(48)],
          leftElbow: [deg(-14), 0, 0],
          rightShoulder: [deg(-82), 0, deg(-48)],
          rightElbow: [deg(-14), 0, 0],
        },
        "linear",
        { whistleActive: false }
      ),
      NEUTRAL_KF_END(),
    ],
  },

  11: {
    signalId: 11,
    name: "Time_out",
    durationSec: 2.6,
    peakT: 0.5,
    supportsMirror: true,
    supportsCardToggle: false,
    highlightArms: "both",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.22,
        {
          chest: [deg(3), 0, 0],
          head: [deg(-2), 0, 0],
          leftShoulder: [deg(-72), 0, deg(-44)],
          leftElbow: [deg(-92), 0, 0],
          leftWrist: [0, deg(10), 0],
          rightShoulder: [deg(-114), deg(84), deg(-10)],
          rightElbow: [deg(-92), 0, 0],
          rightWrist: [0, 0, deg(8)],
        },
        "easeOut"
      ),
      kf(
        0.74,
        {
          chest: [deg(3), 0, 0],
          head: [deg(-2), 0, 0],
          leftShoulder: [deg(-72), 0, deg(-44)],
          leftElbow: [deg(-92), 0, 0],
          leftWrist: [0, deg(10), 0],
          rightShoulder: [deg(-114), deg(84), deg(-10)],
          rightElbow: [deg(-92), 0, 0],
          rightWrist: [0, 0, deg(8)],
        },
        "linear"
      ),
      NEUTRAL_KF_END(),
    ],
  },

  12: {
    signalId: 12,
    name: "Corner_Kick",
    durationSec: 2.4,
    peakT: 0.5,
    supportsMirror: true,
    supportsCardToggle: false,
    highlightArms: "right",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.22,
        {
          chest: [0, deg(-4), 0],
          head: [deg(-6), deg(-15), 0],
          rightShoulder: [deg(22), 0, deg(-125)],
          rightElbow: [deg(-6), 0, 0],
        },
        "easeOut"
      ),
      kf(
        0.74,
        {
          chest: [0, deg(-4), 0],
          head: [deg(-6), deg(-15), 0],
          rightShoulder: [deg(22), 0, deg(-125)],
          rightElbow: [deg(-6), 0, 0],
        },
        "linear"
      ),
      NEUTRAL_KF_END(),
    ],
  },

  13: {
    signalId: 13,
    name: "Jumping",
    durationSec: 2.4,
    peakT: 0.48,
    supportsMirror: false,
    supportsCardToggle: false,
    highlightArms: "both",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.2,
        {
          spine: [deg(8), 0, 0],
          leftShoulder: [deg(-25), 0, deg(22)],
          leftElbow: [deg(-45), 0, 0],
          rightShoulder: [deg(-25), 0, deg(-22)],
          rightElbow: [deg(-45), 0, 0],
          leftHip: [deg(-18), deg(3), deg(4)],
          leftKnee: [deg(34), 0, 0],
          leftAnkle: [deg(-14), 0, 0],
          rightHip: [deg(-18), deg(-3), deg(-4)],
          rightKnee: [deg(34), 0, 0],
          rightAnkle: [deg(-14), 0, 0],
        },
        "easeInOut",
        { rootOffsetY: -0.05 }
      ),
      kf(
        0.48,
        {
          spine: [deg(-4), 0, 0],
          head: [deg(-6), 0, 0],
          leftShoulder: [deg(-105), 0, deg(32)],
          leftElbow: [deg(-40), 0, 0],
          rightShoulder: [deg(-105), 0, deg(-32)],
          rightElbow: [deg(-40), 0, 0],
          leftHip: [deg(-6), deg(3), deg(4)],
          leftKnee: [deg(12), 0, 0],
          leftAnkle: [deg(18), 0, 0],
          rightHip: [deg(-6), deg(-3), deg(-4)],
          rightKnee: [deg(12), 0, 0],
          rightAnkle: [deg(18), 0, 0],
        },
        "easeOut",
        { rootOffsetY: 0.14 }
      ),
      kf(
        0.76,
        {
          spine: [deg(6), 0, 0],
          leftShoulder: [deg(-30), 0, deg(18)],
          leftElbow: [deg(-35), 0, 0],
          rightShoulder: [deg(-30), 0, deg(-18)],
          rightElbow: [deg(-35), 0, 0],
          leftHip: [deg(-12), deg(3), deg(3)],
          leftKnee: [deg(22), 0, 0],
          leftAnkle: [deg(-10), 0, 0],
          rightHip: [deg(-12), deg(-3), deg(-3)],
          rightKnee: [deg(22), 0, 0],
          rightAnkle: [deg(-10), 0, 0],
        },
        "easeInOut",
        { rootOffsetY: -0.03 }
      ),
      NEUTRAL_KF_END(),
    ],
  },

  14: {
    signalId: 14,
    name: "Obstruction",
    durationSec: 2.5,
    peakT: 0.5,
    supportsMirror: false,
    supportsCardToggle: false,
    highlightArms: "both",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.22,
        {
          spine: [deg(3), 0, 0],
          leftShoulder: [deg(-12), 0, deg(88)],
          leftElbow: [deg(-42), 0, 0],
          leftWrist: [0, 0, deg(55)],
          rightShoulder: [deg(-12), 0, deg(-88)],
          rightElbow: [deg(-42), 0, 0],
          rightWrist: [0, 0, deg(-55)],
          leftHip: [deg(-6), deg(4), deg(8)],
          leftKnee: [deg(12), 0, 0],
          leftAnkle: [deg(-6), 0, 0],
          rightHip: [deg(-6), deg(-4), deg(-8)],
          rightKnee: [deg(12), 0, 0],
          rightAnkle: [deg(-6), 0, 0],
        },
        "easeOut"
      ),
      kf(
        0.74,
        {
          spine: [deg(3), 0, 0],
          leftShoulder: [deg(-12), 0, deg(88)],
          leftElbow: [deg(-42), 0, 0],
          leftWrist: [0, 0, deg(55)],
          rightShoulder: [deg(-12), 0, deg(-88)],
          rightElbow: [deg(-42), 0, 0],
          rightWrist: [0, 0, deg(-55)],
          leftHip: [deg(-6), deg(4), deg(8)],
          leftKnee: [deg(12), 0, 0],
          leftAnkle: [deg(-6), 0, 0],
          rightHip: [deg(-6), deg(-4), deg(-8)],
          rightKnee: [deg(12), 0, 0],
          rightAnkle: [deg(-6), 0, 0],
        },
        "linear"
      ),
      NEUTRAL_KF_END(),
    ],
  },

  15: {
    signalId: 15,
    name: "Pushing",
    durationSec: 2.5,
    peakT: 0.48,
    supportsMirror: false,
    supportsCardToggle: false,
    highlightArms: "both",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.22,
        {
          spine: [deg(4), 0, 0],
          leftShoulder: [deg(-35), 0, deg(18)],
          leftElbow: [deg(-95), 0, 0],
          leftWrist: [deg(-35), 0, 0],
          rightShoulder: [deg(-35), 0, deg(-18)],
          rightElbow: [deg(-95), 0, 0],
          rightWrist: [deg(-35), 0, 0],
        },
        "easeInOut"
      ),
      kf(
        0.48,
        {
          spine: [deg(8), 0, 0],
          chest: [deg(4), 0, 0],
          leftShoulder: [deg(-85), 0, deg(10)],
          leftElbow: [deg(-15), 0, 0],
          leftWrist: [deg(-45), 0, 0],
          rightShoulder: [deg(-85), 0, deg(-10)],
          rightElbow: [deg(-15), 0, 0],
          rightWrist: [deg(-45), 0, 0],
        },
        "easeOut"
      ),
      kf(
        0.7,
        {
          spine: [deg(8), 0, 0],
          chest: [deg(4), 0, 0],
          leftShoulder: [deg(-85), 0, deg(10)],
          leftElbow: [deg(-15), 0, 0],
          leftWrist: [deg(-45), 0, 0],
          rightShoulder: [deg(-85), 0, deg(-10)],
          rightElbow: [deg(-15), 0, 0],
          rightWrist: [deg(-45), 0, 0],
        },
        "linear"
      ),
      kf(
        0.86,
        {
          spine: [deg(3), 0, 0],
          leftShoulder: [deg(-45), 0, deg(14)],
          leftElbow: [deg(-65), 0, 0],
          rightShoulder: [deg(-45), 0, deg(-14)],
          rightElbow: [deg(-65), 0, 0],
        },
        "easeInOut"
      ),
      NEUTRAL_KF_END(),
    ],
  },

  16: {
    signalId: 16,
    name: "Hand_Ball",
    durationSec: 2.8,
    peakT: 0.42,
    supportsMirror: true,
    supportsCardToggle: false,
    highlightArms: "both",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.25,
        {
          spine: [deg(4), 0, 0],
          head: [deg(12), deg(6), 0],
          leftShoulder: [deg(-60), 0, deg(-26)],
          leftElbow: [deg(-55), 0, 0],
          rightShoulder: [deg(-76), 0, deg(24)],
          rightElbow: [deg(-60), 0, 0],
        },
        "easeOut"
      ),
      kf(
        0.42,
        {
          spine: [deg(4), 0, 0],
          head: [deg(12), deg(6), 0],
          leftShoulder: [deg(-60), 0, deg(-26)],
          leftElbow: [deg(-55), 0, 0],
          rightShoulder: [deg(-62), 0, deg(32)],
          rightElbow: [deg(-52), 0, 0],
          rightWrist: [deg(15), 0, 0],
        },
        "easeInOut"
      ),
      kf(
        0.58,
        {
          spine: [deg(4), 0, 0],
          head: [deg(12), deg(6), 0],
          leftShoulder: [deg(-60), 0, deg(-26)],
          leftElbow: [deg(-55), 0, 0],
          rightShoulder: [deg(-76), 0, deg(24)],
          rightElbow: [deg(-60), 0, 0],
        },
        "easeInOut"
      ),
      kf(
        0.74,
        {
          spine: [deg(4), 0, 0],
          head: [deg(12), deg(6), 0],
          leftShoulder: [deg(-60), 0, deg(-26)],
          leftElbow: [deg(-55), 0, 0],
          rightShoulder: [deg(-62), 0, deg(32)],
          rightElbow: [deg(-52), 0, 0],
          rightWrist: [deg(15), 0, 0],
        },
        "easeInOut"
      ),
      NEUTRAL_KF_END(),
    ],
  },

  17: {
    signalId: 17,
    name: "Elbowing",
    durationSec: 2.5,
    peakT: 0.5,
    supportsMirror: true,
    supportsCardToggle: false,
    highlightArms: "right",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.22,
        {
          chest: [deg(4), deg(-6), deg(4)],
          head: [0, deg(-10), 0],
          rightShoulder: [deg(-12), deg(24), deg(-85)],
          rightElbow: [deg(-115), 0, 0],
        },
        "easeOut"
      ),
      kf(
        0.5,
        {
          chest: [deg(4), deg(-12), deg(6)],
          head: [0, deg(-14), 0],
          rightShoulder: [deg(-12), deg(-6), deg(-92)],
          rightElbow: [deg(-115), 0, 0],
        },
        "easeInOut"
      ),
      kf(
        0.72,
        {
          chest: [deg(4), deg(-8), deg(4)],
          head: [0, deg(-10), 0],
          rightShoulder: [deg(-12), deg(16), deg(-88)],
          rightElbow: [deg(-115), 0, 0],
        },
        "easeInOut"
      ),
      NEUTRAL_KF_END(),
    ],
  },

  18: {
    signalId: 18,
    name: "Tripping",
    durationSec: 2.5,
    peakT: 0.5,
    supportsMirror: true,
    supportsCardToggle: false,
    highlightArms: "right",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.25,
        {
          spine: [deg(10), 0, 0],
          chest: [deg(8), deg(-6), 0],
          head: [deg(16), deg(-6), 0],
          rightShoulder: [deg(-42), 0, deg(-22)],
          rightElbow: [deg(-20), 0, 0],
        },
        "easeOut"
      ),
      kf(
        0.5,
        {
          spine: [deg(10), 0, 0],
          chest: [deg(8), deg(-3), 0],
          head: [deg(16), deg(-3), 0],
          rightShoulder: [deg(-46), 0, deg(-10)],
          rightElbow: [deg(-18), 0, 0],
        },
        "easeInOut"
      ),
      kf(
        0.72,
        {
          spine: [deg(10), 0, 0],
          chest: [deg(8), deg(-8), 0],
          head: [deg(16), deg(-8), 0],
          rightShoulder: [deg(-42), 0, deg(-26)],
          rightElbow: [deg(-20), 0, 0],
        },
        "easeInOut"
      ),
      NEUTRAL_KF_END(),
    ],
  },

  19: {
    signalId: 19,
    name: "Kicking",
    durationSec: 2.6,
    peakT: 0.5,
    supportsMirror: true,
    supportsCardToggle: false,
    highlightArms: "right",
    keyframes: [
      NEUTRAL_KF_START(),
      kf(
        0.22,
        {
          spine: [deg(4), 0, 0],
          head: [deg(14), 0, 0],
          rightShoulder: [deg(-45), 0, deg(-24)],
          rightElbow: [deg(-16), 0, 0],
          leftKnee: [deg(12), 0, 0],
          rightHip: [deg(14), 0, deg(-4)],
          rightKnee: [deg(32), 0, 0],
        },
        "easeInOut"
      ),
      kf(
        0.5,
        {
          spine: [deg(-2), 0, 0],
          head: [deg(16), 0, 0],
          leftShoulder: [deg(12), 0, deg(20)],
          leftElbow: [deg(-18), 0, 0],
          rightShoulder: [deg(-50), 0, deg(-20)],
          rightElbow: [deg(-15), 0, 0],
          leftHip: [deg(-4), deg(3), deg(4)],
          leftKnee: [deg(10), 0, 0],
          rightHip: [deg(-42), 0, deg(-4)],
          rightKnee: [deg(10), 0, 0],
          rightAnkle: [deg(22), 0, 0],
        },
        "easeOut"
      ),
      kf(
        0.76,
        {
          spine: [deg(3), 0, 0],
          head: [deg(10), 0, 0],
          rightShoulder: [deg(-35), 0, deg(-18)],
          rightElbow: [deg(-16), 0, 0],
          rightHip: [deg(-12), 0, deg(-3)],
          rightKnee: [deg(16), 0, 0],
        },
        "easeInOut"
      ),
      NEUTRAL_KF_END(),
    ],
  },
};

export function getSignalAnimationClip(signalId: number): SignalAnimationClip {
  if (
    Number.isInteger(signalId) &&
    Object.prototype.hasOwnProperty.call(SIGNAL_ANIMATION_CLIPS, signalId)
  ) {
    return SIGNAL_ANIMATION_CLIPS[signalId];
  }
  return SIGNAL_ANIMATION_CLIPS[0];
}

export function sampleSignalPose(
  signalId: number,
  normalizedTime: number,
  mirrored = false
): ResolvedPose {
  const clip = getSignalAnimationClip(signalId);
  const t = normalizeUnitTime(normalizedTime);
  const { keyframes } = clip;

  if (keyframes.length === 0) {
    return mirrored
      ? mirrorPose(NEUTRAL_REFEREE_POSE)
      : cloneResolvedPose(NEUTRAL_REFEREE_POSE);
  }

  let result: ResolvedPose;
  if (t <= keyframes[0].t) {
    result = resolvePose(keyframes[0].pose);
  } else if (t >= keyframes[keyframes.length - 1].t) {
    result = resolvePose(keyframes[keyframes.length - 1].pose);
  } else {
    let segIndex = 0;
    for (let i = 0; i < keyframes.length - 1; i += 1) {
      if (t >= keyframes[i].t && t <= keyframes[i + 1].t) {
        segIndex = i;
        break;
      }
    }
    const kfA = keyframes[segIndex];
    const kfB = keyframes[segIndex + 1];
    const dt = kfB.t - kfA.t;
    if (dt <= 0) {
      result = resolvePose(kfA.pose);
    } else {
      const localU = Math.max(0, Math.min(1, (t - kfA.t) / dt));
      const easedU = applyEasing(localU, kfB.ease ?? "easeInOut");
      result = blendPoses(resolvePose(kfA.pose), resolvePose(kfB.pose), easedU);
    }
  }

  return mirrored ? mirrorPose(result) : result;
}
