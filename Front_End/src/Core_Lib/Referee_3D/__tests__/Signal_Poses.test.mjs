import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { JOINT_NAMES } from "../Pose_Types.ts";
import {
  NEUTRAL_REFEREE_POSE,
  SIGNAL_ANIMATION_CLIPS,
  getSignalAnimationClip,
  mirrorPose,
  sampleSignalPose,
  blendPoses,
} from "../Signal_Poses.ts";

const IFAB_SIGNALS = JSON.parse(
  fs.readFileSync(
    new URL("../../../Data_Sources/Ifab_Signals.json", import.meta.url),
    "utf8"
  )
);

const PAIRED_JOINT_SWAPS = [
  ["leftShoulder", "rightShoulder"],
  ["leftElbow", "rightElbow"],
  ["leftWrist", "rightWrist"],
  ["leftHip", "rightHip"],
  ["leftKnee", "rightKnee"],
  ["leftAnkle", "rightAnkle"],
];

const CENTER_JOINTS = ["hips", "spine", "chest", "neck", "head"];

function assertFiniteResolvedPose(pose, contextLabel) {
  assert.equal(typeof pose.rootOffsetY, "number", `${contextLabel}: rootOffsetY type`);
  assert.ok(
    Number.isFinite(pose.rootOffsetY),
    `${contextLabel}: rootOffsetY must be finite`
  );
  assert.equal(typeof pose.cardVisible, "boolean", `${contextLabel}: cardVisible type`);
  assert.equal(
    typeof pose.whistleActive,
    "boolean",
    `${contextLabel}: whistleActive type`
  );

  for (const joint of JOINT_NAMES) {
    const tuple = pose.joints[joint];
    assert.ok(Array.isArray(tuple), `${contextLabel}: missing joint ${joint}`);
    assert.equal(tuple.length, 3, `${contextLabel}: joint ${joint} must have 3 angles`);
    for (let i = 0; i < 3; i += 1) {
      assert.equal(typeof tuple[i], "number", `${contextLabel}: ${joint}[${i}] type`);
      assert.ok(
        Number.isFinite(tuple[i]),
        `${contextLabel}: ${joint}[${i}] must be finite`
      );
    }
  }
}

function assertPosesClose(actual, expected, epsilon = 1e-6, label = "pose") {
  assert.ok(
    Math.abs(actual.rootOffsetY - expected.rootOffsetY) <= epsilon,
    `${label}: rootOffsetY ${actual.rootOffsetY} !== ${expected.rootOffsetY}`
  );
  assert.equal(actual.cardVisible, expected.cardVisible, `${label}: cardVisible`);
  assert.equal(actual.whistleActive, expected.whistleActive, `${label}: whistleActive`);
  for (const joint of JOINT_NAMES) {
    for (let i = 0; i < 3; i += 1) {
      const diff = Math.abs(actual.joints[joint][i] - expected.joints[joint][i]);
      assert.ok(
        diff <= epsilon,
        `${label}: ${joint}[${i}] diff=${diff} (${actual.joints[joint][i]} vs ${expected.joints[joint][i]})`
      );
    }
  }
}

test("pure library files contain zero DOM, React, or Three.js imports", () => {
  const poseTypesSrc = fs.readFileSync(
    new URL("../Pose_Types.ts", import.meta.url),
    "utf8"
  );
  const signalPosesSrc = fs.readFileSync(
    new URL("../Signal_Poses.ts", import.meta.url),
    "utf8"
  );

  for (const [name, src] of [
    ["Pose_Types.ts", poseTypesSrc],
    ["Signal_Poses.ts", signalPosesSrc],
  ]) {
    assert.doesNotMatch(
      src,
      /\bfrom\s+["'](?:three|react|react-dom)["']|\b(?:window|document)\b/,
      `${name} must remain pure TypeScript with zero Three.js/React/DOM references`
    );
  }
});

test("NEUTRAL_REFEREE_POSE defines all 17 finite joints and athletic stance", () => {
  assertFiniteResolvedPose(NEUTRAL_REFEREE_POSE, "NEUTRAL_REFEREE_POSE");
  assert.equal(NEUTRAL_REFEREE_POSE.cardVisible, false);
  assert.equal(NEUTRAL_REFEREE_POSE.whistleActive, false);
  assert.equal(NEUTRAL_REFEREE_POSE.rootOffsetY, 0);
  assert.ok(
    NEUTRAL_REFEREE_POSE.joints.leftShoulder[2] > 0 &&
      NEUTRAL_REFEREE_POSE.joints.rightShoulder[2] < 0,
    "neutral shoulders should relax slightly outward from torso"
  );
  assert.ok(
    NEUTRAL_REFEREE_POSE.joints.leftKnee[0] > 0 &&
      NEUTRAL_REFEREE_POSE.joints.rightKnee[0] > 0,
    "neutral knees should have slight athletic bend"
  );
});

test("SIGNAL_ANIMATION_CLIPS covers all 20 IFAB signals matching Ifab_Signals.json 1:1", () => {
  assert.equal(IFAB_SIGNALS.length, 20);
  assert.equal(Object.keys(SIGNAL_ANIMATION_CLIPS).length, 20);

  for (const entry of IFAB_SIGNALS) {
    const clip = SIGNAL_ANIMATION_CLIPS[entry.id];
    assert.ok(clip, `missing clip for id ${entry.id} (${entry.name})`);
    assert.equal(clip.signalId, entry.id);
    assert.equal(clip.name, entry.name);
    assert.ok(clip.durationSec > 0, `clip ${entry.id}: durationSec must be > 0`);
    assert.ok(
      clip.peakT >= 0 && clip.peakT <= 1,
      `clip ${entry.id}: peakT must be within [0, 1]`
    );
    assert.ok(
      clip.keyframes.length >= 2,
      `clip ${entry.id}: must have at least 2 keyframes`
    );
    assert.equal(clip.keyframes[0].t, 0, `clip ${entry.id}: first keyframe t must be 0`);
    assert.equal(
      clip.keyframes[clip.keyframes.length - 1].t,
      1,
      `clip ${entry.id}: last keyframe t must be 1`
    );
    for (let i = 1; i < clip.keyframes.length; i += 1) {
      assert.ok(
        clip.keyframes[i].t >= clip.keyframes[i - 1].t,
        `clip ${entry.id}: keyframe t must be non-decreasing`
      );
    }
  }
});

test("sampleSignalPose returns finite 17-joint poses across [0, 1] and loops cleanly to neutral", () => {
  const samplePoints = [0, 0.25, 0.5, 0.75, 1];

  for (const entry of IFAB_SIGNALS) {
    const clip = getSignalAnimationClip(entry.id);
    for (const t of samplePoints) {
      const pose = sampleSignalPose(entry.id, t);
      assertFiniteResolvedPose(pose, `signal ${entry.id} (${entry.name}) t=${t}`);
    }

    const peakPose = sampleSignalPose(entry.id, clip.peakT);
    assertFiniteResolvedPose(peakPose, `signal ${entry.id} peakT=${clip.peakT}`);

    const startPose = sampleSignalPose(entry.id, 0);
    const endPose = sampleSignalPose(entry.id, 1);
    assertPosesClose(startPose, NEUTRAL_REFEREE_POSE, 1e-6, `signal ${entry.id} start`);
    assertPosesClose(endPose, NEUTRAL_REFEREE_POSE, 1e-6, `signal ${entry.id} end`);

    // Out-of-range and NaN normalizedTime must stay bounded and finite
    for (const edgeT of [-0.25, 1.25, Number.NaN]) {
      assertFiniteResolvedPose(
        sampleSignalPose(entry.id, edgeT),
        `signal ${entry.id} edge t=${edgeT}`
      );
    }
  }
});

test("mirrorPose satisfies swap + [rx, -ry, -rz] symmetry and involution mirror(mirror(p)) == p", () => {
  for (const entry of IFAB_SIGNALS) {
    const clip = getSignalAnimationClip(entry.id);
    const original = sampleSignalPose(entry.id, clip.peakT, false);
    const snapshot = structuredClone(original);
    const mirrored = mirrorPose(original);

    // Non-mutating check
    assert.deepEqual(original, snapshot, `mirrorPose must not mutate input (${entry.name})`);

    // Paired swaps + ry/rz negation
    for (const [leftJoint, rightJoint] of PAIRED_JOINT_SWAPS) {
      const origLeft = original.joints[leftJoint];
      const origRight = original.joints[rightJoint];
      const mirLeft = mirrored.joints[leftJoint];
      const mirRight = mirrored.joints[rightJoint];

      assertPosesVecClose(mirLeft, [origRight[0], -origRight[1], -origRight[2]], `${entry.name}.${leftJoint}`);
      assertPosesVecClose(mirRight, [origLeft[0], -origLeft[1], -origLeft[2]], `${entry.name}.${rightJoint}`);
    }

    // Center joints keep rx and negate ry, rz
    for (const centerJoint of CENTER_JOINTS) {
      const orig = original.joints[centerJoint];
      const mir = mirrored.joints[centerJoint];
      assertPosesVecClose(mir, [orig[0], -orig[1], -orig[2]], `${entry.name}.${centerJoint}`);
    }

    // Involution: mirror(mirror(p)) === p
    const roundTrip = mirrorPose(mirrored);
    assertPosesClose(roundTrip, original, 1e-6, `${entry.name} mirror involution`);

    // sampleSignalPose(..., true) matches mirrorPose(sampleSignalPose(..., false))
    const sampledMirrored = sampleSignalPose(entry.id, clip.peakT, true);
    assertPosesClose(sampledMirrored, mirrored, 1e-6, `${entry.name} sampleSignalPose mirrored`);
  }
});

function assertPosesVecClose(actual, expected, label, epsilon = 1e-6) {
  for (let i = 0; i < 3; i += 1) {
    assert.ok(
      Math.abs(actual[i] - expected[i]) <= epsilon,
      `${label}[${i}]: ${actual[i]} !== ${expected[i]}`
    );
  }
}

test("blendPoses handles boundaries, clamping, linear interpolation, and boolean switching at alpha >= 0.5", () => {
  const from = sampleSignalPose(0, 0);
  const to = sampleSignalPose(3, getSignalAnimationClip(3).peakT); // Card peak has cardVisible = true
  const fromClone = structuredClone(from);
  const toClone = structuredClone(to);

  assertPosesClose(blendPoses(from, to, 0), from, 1e-6, "blend alpha=0");
  assertPosesClose(blendPoses(from, to, -0.5), from, 1e-6, "blend alpha=-0.5 clamps to 0");
  assertPosesClose(blendPoses(from, to, 1), to, 1e-6, "blend alpha=1");
  assertPosesClose(blendPoses(from, to, 1.5), to, 1e-6, "blend alpha=1.5 clamps to 1");

  const mid = blendPoses(from, to, 0.5);
  assert.equal(mid.cardVisible, to.cardVisible, "alpha=0.5 should switch booleans to target");
  assert.equal(
    mid.rootOffsetY,
    (from.rootOffsetY + to.rootOffsetY) / 2,
    "alpha=0.5 rootOffsetY midpoint"
  );
  for (const joint of JOINT_NAMES) {
    for (let i = 0; i < 3; i += 1) {
      const expected = (from.joints[joint][i] + to.joints[joint][i]) / 2;
      assert.ok(
        Math.abs(mid.joints[joint][i] - expected) <= 1e-6,
        `alpha=0.5 midpoint ${joint}[${i}]`
      );
    }
  }

  const justBeforeHalf = blendPoses(from, to, 0.49);
  assert.equal(
    justBeforeHalf.cardVisible,
    from.cardVisible,
    "alpha=0.49 should retain source booleans"
  );

  // Non-mutating check
  assert.deepEqual(from, fromClone);
  assert.deepEqual(to, toClone);
});

test("invalid signalId falls back safely to clip 0 (Referee)", () => {
  const neutralClip = getSignalAnimationClip(0);
  for (const invalidId of [-1, 20, 999, 1.5, Number.NaN, Infinity]) {
    assert.deepEqual(getSignalAnimationClip(invalidId), neutralClip);
    assertPosesClose(
      sampleSignalPose(invalidId, 0.25),
      sampleSignalPose(0, 0.25),
      1e-6,
      `fallback sample for ${invalidId}`
    );
  }
});

test("Card signal (id 3) enables supportsCardToggle and exposes cardVisible=true at peakT", () => {
  const cardClip = getSignalAnimationClip(3);
  assert.equal(cardClip.name, "Card");
  assert.equal(cardClip.supportsCardToggle, true);
  assert.equal(cardClip.supportsMirror, true);
  assert.equal(cardClip.highlightArms, "right");

  const startPose = sampleSignalPose(3, 0);
  const peakPose = sampleSignalPose(3, cardClip.peakT);
  const endPose = sampleSignalPose(3, 1);

  assert.equal(startPose.cardVisible, false);
  assert.equal(peakPose.cardVisible, true);
  assert.equal(endPose.cardVisible, false);
});

test("whistle-cued signals expose whistleActive=true during active signal", () => {
  for (const id of [6, 9, 10]) {
    const clip = getSignalAnimationClip(id);
    const peakPose = sampleSignalPose(id, clip.peakT);
    assert.equal(
      peakPose.whistleActive,
      true,
      `signal ${id} (${clip.name}) should have whistleActive=true at peakT=${clip.peakT}`
    );
  }
});

test("anatomical invariants: elbows never hyperextend (rx <= 0) and active signals differ from neutral at peakT", () => {
  for (const entry of IFAB_SIGNALS) {
    const clip = getSignalAnimationClip(entry.id);
    for (const t of [0, 0.25, 0.5, 0.75, 1, clip.peakT]) {
      const pose = sampleSignalPose(entry.id, t);
      assert.ok(
        pose.joints.leftElbow[0] <= 1e-6 && pose.joints.rightElbow[0] <= 1e-6,
        `${entry.name} at t=${t}: elbow rx must be <= 0 (left=${pose.joints.leftElbow[0]}, right=${pose.joints.rightElbow[0]})`
      );
    }

    if (entry.id !== 0) {
      const peakPose = sampleSignalPose(entry.id, clip.peakT);
      const maxDelta = JOINT_NAMES.reduce((best, joint) => {
        for (let i = 0; i < 3; i += 1) {
          best = Math.max(
            best,
            Math.abs(peakPose.joints[joint][i] - NEUTRAL_REFEREE_POSE.joints[joint][i])
          );
        }
        return best;
      }, Math.abs(peakPose.rootOffsetY - NEUTRAL_REFEREE_POSE.rootOffsetY));
      assert.ok(
        maxDelta > 0.1,
        `signal ${entry.id} (${entry.name}) peakT pose must visibly animate from neutral`
      );
    }
  }
});
