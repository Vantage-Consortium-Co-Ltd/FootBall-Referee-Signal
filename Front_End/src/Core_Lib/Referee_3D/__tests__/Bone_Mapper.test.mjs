import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { JOINT_NAMES } from "../Pose_Types.ts";
import { mapBoneNamesToJoints } from "../Bone_Mapper.ts";

function assertUniqueMappedBones(result, label) {
  const values = Object.values(result.mapping);
  assert.equal(result.mappedCount, values.length, `${label}: mappedCount matches mapping entries`);
  assert.equal(new Set(values).size, values.length, `${label}: no bone mapped to two joints`);
  for (const joint of Object.keys(result.mapping)) {
    assert.ok(JOINT_NAMES.includes(joint), `${label}: unknown joint key ${joint}`);
  }
}

test("Bone_Mapper.ts contains zero Three.js, React, or DOM references", () => {
  const src = fs.readFileSync(new URL("../Bone_Mapper.ts", import.meta.url), "utf8");
  assert.doesNotMatch(
    src,
    /\bfrom\s+["'](?:three|react|react-dom)["']|\b(?:window|document)\b/,
    "Bone_Mapper.ts must remain pure TypeScript"
  );
});

test("maps MakeHuman / MPFB2 Game Rig bone names cleanly without clavicle collision", () => {
  const makehumanBones = [
    "root",
    "pelvis",
    "spine_01",
    "spine_02",
    "spine_03",
    "neck_01",
    "head",
    "clavicle_l",
    "upperarm_l",
    "lowerarm_l",
    "hand_l",
    "thumb_01_l",
    "clavicle_r",
    "upperarm_r",
    "lowerarm_r",
    "hand_r",
    "index_01_r",
    "thigh_l",
    "calf_l",
    "foot_l",
    "ball_l",
    "thigh_r",
    "calf_r",
    "foot_r",
    "ball_r",
  ];

  const result = mapBoneNamesToJoints(makehumanBones);
  assert.equal(result.convention, "makehuman");
  assert.equal(result.mappedCount, 17);
  assertUniqueMappedBones(result, "MakeHuman");

  assert.deepEqual(result.mapping, {
    hips: "pelvis",
    spine: "spine_01",
    chest: "spine_03",
    neck: "neck_01",
    head: "head",
    leftShoulder: "upperarm_l",
    leftElbow: "lowerarm_l",
    leftWrist: "hand_l",
    rightShoulder: "upperarm_r",
    rightElbow: "lowerarm_r",
    rightWrist: "hand_r",
    leftHip: "thigh_l",
    leftKnee: "calf_l",
    leftAnkle: "foot_l",
    rightHip: "thigh_r",
    rightKnee: "calf_r",
    rightAnkle: "foot_r",
  });

  // Alternate MakeHuman / MPFB2 naming variant
  const altResult = mapBoneNamesToJoints([
    "root_hips",
    "spine01",
    "spine_02",
    "neck01",
    "head",
    "upperarm01_l",
    "lowerarm01_l",
    "wrist_l",
    "upperarm01_r",
    "lowerarm01_r",
    "wrist_r",
    "upperleg01_l",
    "lowerleg01_l",
    "foot_l",
    "upperleg01_r",
    "lowerleg01_r",
    "foot_r",
  ]);
  assert.equal(altResult.convention, "makehuman");
  assert.equal(altResult.mappedCount, 17);
  assert.equal(altResult.mapping.hips, "root_hips");
  assert.equal(altResult.mapping.chest, "spine_02");
  assert.equal(altResult.mapping.leftShoulder, "upperarm01_l");
  assert.equal(altResult.mapping.leftWrist, "wrist_l");
  assert.equal(altResult.mapping.rightHip, "upperleg01_r");
  assert.equal(altResult.mapping.rightKnee, "lowerleg01_r");
});

test("maps Mixamo / Ready Player Me / VRM rigs with case-insensitive mixamorig prefix", () => {
  const mixamoBones = [
    "mixamorig:Hips",
    "mixamorig:Spine",
    "mixamorig:Spine1",
    "mixamorig:Spine2",
    "mixamorig:Neck",
    "mixamorig:Head",
    "mixamorig:HeadTop_End",
    "mixamorig:LeftShoulder",
    "mixamorig:LeftArm",
    "mixamorig:LeftForeArm",
    "mixamorig:LeftHand",
    "mixamorig:RightShoulder",
    "mixamorig:RightArm",
    "mixamorig:RightForeArm",
    "mixamorig:RightHand",
    "mixamorig:LeftUpLeg",
    "mixamorig:LeftLeg",
    "mixamorig:LeftFoot",
    "mixamorig:LeftToeBase",
    "mixamorig:RightUpLeg",
    "mixamorig:RightLeg",
    "mixamorig:RightFoot",
    "mixamorig:RightToeBase",
  ];

  const result = mapBoneNamesToJoints(mixamoBones);
  assert.equal(result.convention, "mixamo");
  assert.equal(result.mappedCount, 17);
  assertUniqueMappedBones(result, "Mixamo");

  assert.deepEqual(result.mapping, {
    hips: "mixamorig:Hips",
    spine: "mixamorig:Spine",
    chest: "mixamorig:Spine2",
    neck: "mixamorig:Neck",
    head: "mixamorig:Head",
    leftShoulder: "mixamorig:LeftArm",
    leftElbow: "mixamorig:LeftForeArm",
    leftWrist: "mixamorig:LeftHand",
    rightShoulder: "mixamorig:RightArm",
    rightElbow: "mixamorig:RightForeArm",
    rightWrist: "mixamorig:RightHand",
    leftHip: "mixamorig:LeftUpLeg",
    leftKnee: "mixamorig:LeftLeg",
    leftAnkle: "mixamorig:LeftFoot",
    rightHip: "mixamorig:RightUpLeg",
    rightKnee: "mixamorig:RightLeg",
    rightAnkle: "mixamorig:RightFoot",
  });

  // Unprefixed VRM / RPM / case-insensitive mixamorig prefix without colon
  const vrmBones = [
    "MIXAMORIGhips",
    "Spine",
    "Chest",
    "Neck",
    "Head",
    "LeftUpperArm",
    "LeftLowerArm",
    "LeftHand",
    "RightUpperArm",
    "RightLowerArm",
    "RightHand",
    "LeftUpperLeg",
    "LeftLowerLeg",
    "LeftFoot",
    "RightUpperLeg",
    "RightLowerLeg",
    "RightFoot",
  ];
  const vrmResult = mapBoneNamesToJoints(vrmBones);
  assert.equal(vrmResult.convention, "mixamo");
  assert.equal(vrmResult.mappedCount, 17);
  assert.equal(vrmResult.mapping.hips, "MIXAMORIGhips");
  assert.equal(vrmResult.mapping.chest, "Chest");
  assert.equal(vrmResult.mapping.leftShoulder, "LeftUpperArm");
  assert.equal(vrmResult.mapping.rightKnee, "RightLowerLeg");
});

test("maps KayKit / Blender Rig_Medium bone names accurately", () => {
  const kaykitBones = [
    "hips",
    "spine",
    "chest",
    "head",
    "upperarm.l",
    "lowerarm.l",
    "wrist.l",
    "upperarm.r",
    "lowerarm.r",
    "wrist.r",
    "upperleg.l",
    "lowerleg.l",
    "foot.l",
    "upperleg.r",
    "lowerleg.r",
    "foot.r",
  ];

  const result = mapBoneNamesToJoints(kaykitBones);
  assert.equal(result.convention, "kaykit");
  assert.equal(result.mappedCount, 16);
  assertUniqueMappedBones(result, "KayKit");

  assert.deepEqual(result.mapping, {
    hips: "hips",
    spine: "spine",
    chest: "chest",
    head: "head",
    leftShoulder: "upperarm.l",
    leftElbow: "lowerarm.l",
    leftWrist: "wrist.l",
    rightShoulder: "upperarm.r",
    rightElbow: "lowerarm.r",
    rightWrist: "wrist.r",
    leftHip: "upperleg.l",
    leftKnee: "lowerleg.l",
    leftAnkle: "foot.l",
    rightHip: "upperleg.r",
    rightKnee: "lowerleg.r",
    rightAnkle: "foot.r",
  });

  // KayKit hand.l / hand.r fallback
  const handVariant = mapBoneNamesToJoints(
    kaykitBones.map((b) => (b === "wrist.l" ? "hand.l" : b === "wrist.r" ? "hand.r" : b))
  );
  assert.equal(handVariant.convention, "kaykit");
  assert.equal(handVariant.mapping.leftWrist, "hand.l");
  assert.equal(handVariant.mapping.rightWrist, "hand.r");
});

test("maps Khronos CesiumMan exact skeleton without L/R arm joint suffix collisions", () => {
  const cesiumBones = [
    "Skeleton_torso_joint_1",
    "Skeleton_torso_joint_2",
    "torso_joint_3",
    "Skeleton_neck_joint_1",
    "Skeleton_neck_joint_2",
    "Skeleton_arm_joint_L__4_",
    "Skeleton_arm_joint_L__3_",
    "Skeleton_arm_joint_L__2_",
    "Skeleton_arm_joint_R",
    "Skeleton_arm_joint_R__2_",
    "Skeleton_arm_joint_R__3_",
    "leg_joint_L_1",
    "leg_joint_L_2",
    "leg_joint_L_3",
    "leg_joint_L_5",
    "leg_joint_R_1",
    "leg_joint_R_2",
    "leg_joint_R_3",
    "leg_joint_R_5",
  ];

  const result = mapBoneNamesToJoints(cesiumBones);
  assert.equal(result.convention, "cesium");
  assert.equal(result.mappedCount, 17);
  assertUniqueMappedBones(result, "CesiumMan");

  assert.deepEqual(result.mapping, {
    hips: "Skeleton_torso_joint_1",
    spine: "Skeleton_torso_joint_2",
    chest: "torso_joint_3",
    neck: "Skeleton_neck_joint_1",
    head: "Skeleton_neck_joint_2",
    leftShoulder: "Skeleton_arm_joint_L__4_",
    leftElbow: "Skeleton_arm_joint_L__3_",
    leftWrist: "Skeleton_arm_joint_L__2_",
    rightShoulder: "Skeleton_arm_joint_R",
    rightElbow: "Skeleton_arm_joint_R__2_",
    rightWrist: "Skeleton_arm_joint_R__3_",
    leftHip: "leg_joint_L_1",
    leftKnee: "leg_joint_L_2",
    leftAnkle: "leg_joint_L_3",
    rightHip: "leg_joint_R_1",
    rightKnee: "leg_joint_R_2",
    rightAnkle: "leg_joint_R_3",
  });
});

test("validates exact skeleton extracted from bundled Front_End/public/models/referee.glb", () => {
  const glbPath = new URL("../../../../public/models/referee.glb", import.meta.url);
  const buf = fs.readFileSync(glbPath);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  const jointIndices = gltf.skins[0].joints;
  const boneNames = jointIndices.map((idx) => gltf.nodes[idx].name);

  const result = mapBoneNamesToJoints(boneNames);
  assert.equal(result.convention, "cesium");
  assert.equal(result.mappedCount, 17);
  assertUniqueMappedBones(result, "Bundled referee.glb");
  assert.equal(result.mapping.leftShoulder, "Skeleton_arm_joint_L__4_");
  assert.equal(result.mapping.leftElbow, "Skeleton_arm_joint_L__3_");
  assert.equal(result.mapping.leftWrist, "Skeleton_arm_joint_L__2_");
  assert.equal(result.mapping.rightShoulder, "Skeleton_arm_joint_R");
  assert.equal(result.mapping.rightElbow, "Skeleton_arm_joint_R__2_");
  assert.equal(result.mapping.rightWrist, "Skeleton_arm_joint_R__3_");
});

test("handles empty, unrecognized, and generic partial bone lists safely", () => {
  const empty = mapBoneNamesToJoints([]);
  assert.equal(empty.convention, "generic");
  assert.equal(empty.mappedCount, 0);
  assert.deepEqual(empty.mapping, {});

  const props = mapBoneNamesToJoints(["Camera", "SunLight", "PitchFloor", "Cube_001", ""]);
  assert.equal(props.convention, "generic");
  assert.equal(props.mappedCount, 0);
  assert.deepEqual(props.mapping, {});

  const generic = mapBoneNamesToJoints([
    "hips",
    "spine",
    "chest",
    "head",
    "left_shoulder",
    "left_elbow",
    "right_shoulder",
    "right_elbow",
  ]);
  assert.equal(generic.convention, "generic");
  assert.equal(generic.mappedCount, 8);
  assertUniqueMappedBones(generic, "Generic");
  assert.equal(generic.mapping.leftShoulder, "left_shoulder");
  assert.equal(generic.mapping.rightElbow, "right_elbow");
});
