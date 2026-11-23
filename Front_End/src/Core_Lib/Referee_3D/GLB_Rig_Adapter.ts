/**
 * Universal GLB Humanoid Rig Adapter for the 3D IFAB Referee Viewer.
 * Loads any standard humanoid .glb (CesiumMan, MakeHuman/MPFB2, Mixamo/RPM/VRM, KayKit),
 * normalizes scale/grounding/facing, retargets canonical 17-joint poses via world-space
 * quaternion deltas, attaches world-scaled Yellow/Red cards & whistle cue, and renders
 * real-time coaching overlays (Angle Arc Guide + 17-Keypoint AI Skeleton).
 */

import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import type { ActiveArm, CardColor } from "../../Data_Types/Referee_Types";
import {
  JOINT_NAMES,
  type HighlightArms,
  type JointName,
  type ResolvedPose,
} from "./Pose_Types";
import { mapBoneNamesToJoints } from "./Bone_Mapper";
import type { RefereeRigHandle, RigOverlayOptions } from "./Referee_Rig_Builder";

const TARGET_STANDING_HEIGHT = 1.78;
const MIN_MAPPED_CORE_JOINTS = 6;
const ANGLE_ARC_RADIUS = 0.42;
const ANGLE_ARC_SEGMENTS = 36;
const SKELETON_BODY_OPACITY = 0.3;
const SKELETON_KEYPOINT_COUNT = 17;

const SKELETON_BONE_EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 4],
  [3, 5],
  [4, 6],
  [5, 6],
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10],
  [5, 11],
  [6, 12],
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
];

const CANONICAL_HIERARCHY: ReadonlyArray<{
  joint: JointName;
  parent: JointName | null;
}> = [
  { joint: "hips", parent: null },
  { joint: "spine", parent: "hips" },
  { joint: "chest", parent: "spine" },
  { joint: "neck", parent: "chest" },
  { joint: "head", parent: "neck" },
  { joint: "leftShoulder", parent: "chest" },
  { joint: "leftElbow", parent: "leftShoulder" },
  { joint: "leftWrist", parent: "leftElbow" },
  { joint: "rightShoulder", parent: "chest" },
  { joint: "rightElbow", parent: "rightShoulder" },
  { joint: "rightWrist", parent: "rightElbow" },
  { joint: "leftHip", parent: "hips" },
  { joint: "leftKnee", parent: "leftHip" },
  { joint: "leftAnkle", parent: "leftKnee" },
  { joint: "rightHip", parent: "hips" },
  { joint: "rightKnee", parent: "rightHip" },
  { joint: "rightAnkle", parent: "rightKnee" },
];

const LIMB_CHILD_MAP: Partial<Record<JointName, JointName>> = {
  leftShoulder: "leftElbow",
  leftElbow: "leftWrist",
  rightShoulder: "rightElbow",
  rightElbow: "rightWrist",
  leftHip: "leftKnee",
  leftKnee: "leftAnkle",
  rightHip: "rightKnee",
  rightKnee: "rightAnkle",
};

const WRIST_ELBOW_PARENT: Partial<Record<JointName, JointName>> = {
  leftWrist: "leftElbow",
  rightWrist: "rightElbow",
};

const UP_Y = new THREE.Vector3(0, 1, 0);
const DOWN_Y = new THREE.Vector3(0, -1, 0);

const COLOR_CYAN_KEYPOINT = new THREE.Color("#22D3EE");
const COLOR_EMERALD_KEYPOINT = new THREE.Color("#10B981");
const COLOR_CYAN_BONE = new THREE.Color("#06B6D4");
const COLOR_EMERALD_BONE = new THREE.Color("#34D399");

const CARD_PALETTE: Record<
  CardColor,
  { base: string; emissive: string; intensity: number }
> = {
  yellow: { base: "#FACC15", emissive: "#CA8A04", intensity: 0.24 },
  red: { base: "#EF4444", emissive: "#DC2626", intensity: 0.28 },
};

const DEFAULT_OVERLAY_OPTIONS: RigOverlayOptions = {
  showAngleGuide: false,
  showSkeleton: false,
  highlightArms: "none",
  activeArm: "none",
  targetElevationDeg: 90,
  minElevationDeg: 60,
  mirrored: false,
};

interface MaterialSnapshot {
  material: THREE.Material;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
}

interface MappedBoneEntry {
  joint: JointName;
  bone: THREE.Bone;
  depth: number;
  canonicalIndex: number;
}

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("The operation was aborted.", "AbortError");
  }
  const err = new Error("The operation was aborted.");
  err.name = "AbortError";
  return err;
}

function clampDeg(degValue: number): number {
  if (!Number.isFinite(degValue)) return 0;
  return Math.max(0, Math.min(180, degValue));
}

function degToRad(degValue: number): number {
  return (degValue * Math.PI) / 180;
}

function safeInverseScale(value: number): number {
  if (!Number.isFinite(value) || Math.abs(value) < 1e-4) return 1;
  return 1 / value;
}

function resolveResourceBasePath(url: string): string {
  if (url.startsWith("blob:") || url.startsWith("data:")) return "";
  const slashIdx = url.lastIndexOf("/");
  return slashIdx >= 0 ? url.slice(0, slashIdx + 1) : "";
}

function getNodeDepth(node: THREE.Object3D): number {
  let depth = 0;
  let current = node.parent;
  while (current !== null) {
    depth += 1;
    current = current.parent;
  }
  return depth;
}

function resolveEffectiveHighlightedArms(
  highlightArms: HighlightArms,
  mirrored: boolean
): { left: boolean; right: boolean } {
  if (highlightArms === "both") return { left: true, right: true };
  if (highlightArms === "left") {
    return mirrored ? { left: false, right: true } : { left: true, right: false };
  }
  if (highlightArms === "right") {
    return mirrored ? { left: true, right: false } : { left: false, right: true };
  }
  return { left: false, right: false };
}

function createRoundedCardGeometry(): THREE.ExtrudeGeometry {
  const width = 0.085;
  const height = 0.12;
  const bevel = 0.001;
  const innerW = width - bevel * 2;
  const innerH = height - bevel * 2;
  const r = 0.006;
  const hw = innerW / 2;
  const hh = innerH / 2;

  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.004,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geo.center();
  return geo;
}

function buildAngleSectorGeometry(
  targetRad: number,
  axisOutX: number,
  axisOutZ: number,
  radius: number
): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const segments = Math.max(
    2,
    Math.round((targetRad / Math.PI) * ANGLE_ARC_SEGMENTS)
  );
  const positions: number[] = [];

  for (let i = 0; i < segments; i += 1) {
    const phi0 = (i / segments) * targetRad;
    const phi1 = ((i + 1) / segments) * targetRad;
    positions.push(
      0,
      0,
      0,
      axisOutX * radius * Math.sin(phi0),
      -radius * Math.cos(phi0),
      axisOutZ * radius * Math.sin(phi0),
      axisOutX * radius * Math.sin(phi1),
      -radius * Math.cos(phi1),
      axisOutZ * radius * Math.sin(phi1)
    );
  }

  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function buildAngleArcLineGeometry(
  targetRad: number,
  axisOutX: number,
  axisOutZ: number,
  radius: number
): THREE.BufferGeometry {
  const segments = Math.max(
    4,
    Math.round((targetRad / Math.PI) * ANGLE_ARC_SEGMENTS)
  );
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const phi = (i / segments) * targetRad;
    points.push(
      new THREE.Vector3(
        axisOutX * radius * Math.sin(phi),
        -radius * Math.cos(phi),
        axisOutZ * radius * Math.sin(phi)
      )
    );
  }
  points.push(new THREE.Vector3(0, 0, 0));
  return new THREE.BufferGeometry().setFromPoints(points);
}

function buildMinTickLineGeometry(
  minRad: number,
  axisOutX: number,
  axisOutZ: number,
  radius: number
): THREE.BufferGeometry {
  const innerR = radius * 0.78;
  const outerR = radius * 1.15;
  const sinPhi = Math.sin(minRad);
  const cosPhi = Math.cos(minRad);
  return new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(
      axisOutX * innerR * sinPhi,
      -innerR * cosPhi,
      axisOutZ * innerR * sinPhi
    ),
    new THREE.Vector3(
      axisOutX * outerR * sinPhi,
      -outerR * cosPhi,
      axisOutZ * outerR * sinPhi
    ),
  ]);
}

function disposeObjectResources(target: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>();

  target.traverse((obj) => {
    if (obj instanceof THREE.InstancedMesh) {
      obj.dispose();
    }
    if (obj instanceof THREE.SkinnedMesh && obj.skeleton) {
      skeletons.add(obj.skeleton);
    }
    const resourceObj = obj as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    if (resourceObj.geometry) {
      geometries.add(resourceObj.geometry);
    }
    if (resourceObj.material) {
      const matList = Array.isArray(resourceObj.material)
        ? resourceObj.material
        : [resourceObj.material];
      for (const mat of matList) {
        materials.add(mat);
      }
    }
  });

  for (const skeleton of skeletons) {
    skeleton.dispose();
  }
  for (const geo of geometries) {
    geo.dispose();
  }
  for (const mat of materials) {
    const texFields = mat as unknown as Record<string, unknown>;
    for (const key of [
      "map",
      "normalMap",
      "roughnessMap",
      "metalnessMap",
      "emissiveMap",
      "aoMap",
      "alphaMap",
      "bumpMap",
      "displacementMap",
      "lightMap",
      "envMap",
    ]) {
      const candidate = texFields[key];
      if (candidate instanceof THREE.Texture) {
        textures.add(candidate);
      }
    }
    mat.dispose();
  }
  for (const tex of textures) {
    tex.dispose();
  }
}

function collectSkeletonBones(scene: THREE.Object3D): THREE.Bone[] {
  const seen = new Set<THREE.Bone>();
  const ordered: THREE.Bone[] = [];

  const pushBone = (bone: THREE.Bone): void => {
    if (seen.has(bone)) return;
    seen.add(bone);
    ordered.push(bone);
  };

  scene.traverse((obj) => {
    if (obj instanceof THREE.Bone) {
      pushBone(obj);
    } else if (obj instanceof THREE.SkinnedMesh && obj.skeleton) {
      for (const bone of obj.skeleton.bones) {
        pushBone(bone);
      }
    }
  });

  return ordered;
}

/**
 * Loads a humanoid .glb model and adapts it to the RefereeRigHandle contract
 * using world-space quaternion delta retargeting so any T-pose or A-pose rig
 * executes all 20 IFAB signal clips identically to the procedural rig.
 */
export async function loadGlbRefereeRig(
  url: string,
  signal?: AbortSignal
): Promise<RefereeRigHandle> {
  if (signal?.aborted) {
    throw createAbortError();
  }

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load GLB model (${response.status}): ${url}`);
  }

  const buffer = await response.arrayBuffer();
  if (signal?.aborted) {
    throw createAbortError();
  }

  const loader = new GLTFLoader();
  const gltf: GLTF = await loader.parseAsync(
    buffer,
    resolveResourceBasePath(url)
  );

  if (signal?.aborted) {
    disposeObjectResources(gltf.scene);
    throw createAbortError();
  }

  const allBones = collectSkeletonBones(gltf.scene);
  const bonesByName = new Map<string, THREE.Bone>();
  for (const bone of allBones) {
    if (bone.name && !bonesByName.has(bone.name)) {
      bonesByName.set(bone.name, bone);
    }
  }

  const mapResult = mapBoneNamesToJoints(allBones.map((b) => b.name));
  const hasTorso = Boolean(
    mapResult.mapping.hips || mapResult.mapping.spine || mapResult.mapping.chest
  );
  const hasArms = Boolean(
    mapResult.mapping.leftShoulder || mapResult.mapping.rightShoulder
  );

  if (mapResult.mappedCount < MIN_MAPPED_CORE_JOINTS || (!hasTorso && !hasArms)) {
    disposeObjectResources(gltf.scene);
    throw new Error("GLB_UNSUPPORTED_SKELETON");
  }

  const mappedBones: Partial<Record<JointName, THREE.Bone>> = {};
  for (const joint of JOINT_NAMES) {
    const boneName = mapResult.mapping[joint];
    if (boneName) {
      const bone = bonesByName.get(boneName);
      if (bone) {
        mappedBones[joint] = bone;
      }
    }
  }

  // --- Wrap Scene, Configure Meshes, Snapshot Materials ---
  const root = new THREE.Group();
  root.name = "glbRefereeRoot";

  const modelPivot = new THREE.Group();
  modelPivot.name = "glbModelPivot";
  modelPivot.add(gltf.scene);
  root.add(modelPivot);

  const overlayRoot = new THREE.Group();
  overlayRoot.name = "refereeOverlayRoot";

  const materialSet = new Set<THREE.Material>();
  const meshMaterialSnapshots: MaterialSnapshot[] = [];

  gltf.scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = true;
      obj.receiveShadow = false;
      if (obj instanceof THREE.SkinnedMesh) {
        obj.frustumCulled = false;
      }
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!mat || materialSet.has(mat)) continue;
        materialSet.add(mat);
        meshMaterialSnapshots.push({
          material: mat,
          opacity: mat.opacity,
          transparent: mat.transparent,
          depthWrite: mat.depthWrite,
        });
      }
    }
  });

  // --- Facing, Uniform Height (1.78m), and Floor Grounding (min.y = 0) ---
  root.updateMatrixWorld(true);

  const leftRef = mappedBones.leftShoulder ?? mappedBones.leftHip;
  const rightRef = mappedBones.rightShoulder ?? mappedBones.rightHip;
  if (leftRef && rightRef) {
    const leftPos = leftRef.getWorldPosition(new THREE.Vector3());
    const rightPos = rightRef.getWorldPosition(new THREE.Vector3());
    const leftVec = leftPos.sub(rightPos);
    leftVec.y = 0;
    if (leftVec.lengthSq() > 1e-6) {
      const forwardDir = leftVec.cross(UP_Y).normalize();
      const facingYaw = Math.atan2(forwardDir.x, forwardDir.z);
      if (Math.abs(facingYaw) > 0.35) {
        gltf.scene.rotation.y -= facingYaw;
        root.updateMatrixWorld(true);
      }
    }
  }

  const rawBox = new THREE.Box3().setFromObject(modelPivot);
  const rawHeight = rawBox.max.y - rawBox.min.y;
  const uniformScale =
    Number.isFinite(rawHeight) && rawHeight > 1e-4
      ? TARGET_STANDING_HEIGHT / rawHeight
      : 1;
  modelPivot.scale.setScalar(uniformScale);
  root.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(modelPivot);
  if (
    !scaledBox.isEmpty() &&
    Number.isFinite(scaledBox.min.x) &&
    Number.isFinite(scaledBox.min.y) &&
    Number.isFinite(scaledBox.min.z)
  ) {
    const centerX = (scaledBox.min.x + scaledBox.max.x) * 0.5;
    const centerZ = (scaledBox.min.z + scaledBox.max.z) * 0.5;
    modelPivot.position.set(-centerX, -scaledBox.min.y, -centerZ);
    root.updateMatrixWorld(true);
  }

  // --- Capture Bind-Pose World Quaternions & Precompute Neutral Alignment ---
  const restWorldQuat: Partial<Record<JointName, THREE.Quaternion>> = {};
  const restWorldPos: Partial<Record<JointName, THREE.Vector3>> = {};
  for (const joint of JOINT_NAMES) {
    const bone = mappedBones[joint];
    if (!bone) continue;
    restWorldQuat[joint] = bone.getWorldQuaternion(new THREE.Quaternion());
    restWorldPos[joint] = bone.getWorldPosition(new THREE.Vector3());
  }

  const limbAlignMap: Partial<Record<JointName, THREE.Quaternion>> = {};
  const neutralWorldQuat: Partial<Record<JointName, THREE.Quaternion>> = {};

  for (const [limbJoint, childJoint] of Object.entries(LIMB_CHILD_MAP) as Array<
    [JointName, JointName]
  >) {
    const pRest = restWorldPos[limbJoint];
    const cRest = restWorldPos[childJoint];
    const qRest = restWorldQuat[limbJoint];
    if (!pRest || !cRest || !qRest) continue;

    const vBind = cRest.clone().sub(pRest);
    if (vBind.lengthSq() > 1e-8) {
      vBind.normalize();
      const qAlign = new THREE.Quaternion().setFromUnitVectors(vBind, DOWN_Y);
      limbAlignMap[limbJoint] = qAlign;
      neutralWorldQuat[limbJoint] = qAlign.clone().multiply(qRest).normalize();
    } else {
      neutralWorldQuat[limbJoint] = qRest.clone();
    }
  }

  // Align wrists with parent forearm alignment so hands never kink on T/A-pose rigs
  for (const [wristJoint, elbowJoint] of Object.entries(
    WRIST_ELBOW_PARENT
  ) as Array<[JointName, JointName]>) {
    const qRest = restWorldQuat[wristJoint];
    if (!qRest) continue;
    const qElbowAlign = limbAlignMap[elbowJoint];
    neutralWorldQuat[wristJoint] = qElbowAlign
      ? qElbowAlign.clone().multiply(qRest).normalize()
      : qRest.clone();
  }

  for (const joint of JOINT_NAMES) {
    const qRest = restWorldQuat[joint];
    if (qRest && !neutralWorldQuat[joint]) {
      neutralWorldQuat[joint] = qRest.clone();
    }
  }

  // Record hips rest position and world-Y offset basis in hips parent space
  const hipsBone = mappedBones.hips ?? null;
  const restHipsLocalPos = hipsBone ? hipsBone.position.clone() : null;
  const hipsLocalUpPerWorldMeter = new THREE.Vector3(0, 1, 0);
  if (hipsBone) {
    const hipsParent = hipsBone.parent ?? modelPivot;
    hipsParent.updateWorldMatrix(true, false);
    const invParentMat4 = hipsParent.matrixWorld.clone().invert();
    const invParentMat3 = new THREE.Matrix3().setFromMatrix4(invParentMat4);
    hipsLocalUpPerWorldMeter.set(0, 1, 0).applyMatrix3(invParentMat3);
  }

  // Strict parent-before-child traversal list for applyPose
  const orderedMappedEntries: MappedBoneEntry[] = CANONICAL_HIERARCHY.flatMap(
    ({ joint }, canonicalIndex) => {
      const bone = mappedBones[joint];
      if (!bone) return [];
      return [
        {
          joint,
          bone,
          depth: getNodeDepth(bone),
          canonicalIndex,
        },
      ];
    }
  ).sort((a, b) => a.depth - b.depth || a.canonicalIndex - b.canonicalIndex);

  // --- Props: World-Scaled Yellow/Red Cards + Whistle Pulse ---
  const cardMat = new THREE.MeshStandardMaterial({
    color: CARD_PALETTE.yellow.base,
    emissive: CARD_PALETTE.yellow.emissive,
    emissiveIntensity: CARD_PALETTE.yellow.intensity,
    roughness: 0.32,
    metalness: 0.06,
  });
  const cardGeo = createRoundedCardGeometry();
  const tempScale = new THREE.Vector3();

  const attachCardToHand = (
    wristJoint: JointName,
    elbowFallback: JointName,
    meshName: string
  ): THREE.Mesh | null => {
    const targetJoint = mappedBones[wristJoint]
      ? wristJoint
      : mappedBones[elbowFallback]
        ? elbowFallback
        : null;
    const bone = targetJoint ? mappedBones[targetJoint] : undefined;
    if (!bone || !targetJoint) return null;

    const mount = new THREE.Group();
    mount.name = `${meshName}Mount`;
    bone.getWorldScale(tempScale);
    mount.scale.set(
      safeInverseScale(tempScale.x),
      safeInverseScale(tempScale.y),
      safeInverseScale(tempScale.z)
    );
    const refQuat = neutralWorldQuat[targetJoint];
    if (refQuat) {
      mount.quaternion.copy(refQuat).invert();
    }
    bone.add(mount);

    const card = new THREE.Mesh(cardGeo, cardMat);
    card.name = meshName;
    card.position.set(0, -0.145, 0.025);
    card.castShadow = true;
    card.receiveShadow = false;
    card.visible = false;
    mount.add(card);
    return card;
  };

  const rightCard = attachCardToHand("rightWrist", "rightElbow", "rightCard");
  const leftCard = attachCardToHand("leftWrist", "leftElbow", "leftCard");

  const whistlePulseMat = new THREE.MeshBasicMaterial({
    color: "#34D399",
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const whistlePulse = new THREE.Mesh(
    new THREE.TorusGeometry(0.026, 0.004, 8, 24),
    whistlePulseMat
  );
  whistlePulse.name = "whistlePulseRing";
  whistlePulse.visible = false;
  overlayRoot.add(whistlePulse);

  // --- Coaching Overlay 1: World-Aligned Angle Arc Guide ---
  const angleGuideGroup = new THREE.Group();
  angleGuideGroup.name = "angleArcGuideGroup";
  angleGuideGroup.visible = false;
  overlayRoot.add(angleGuideGroup);

  const angleSectorMat = new THREE.MeshBasicMaterial({
    color: "#10B981",
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const angleArcLineMat = new THREE.LineBasicMaterial({
    color: "#34D399",
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const angleRefLineMat = new THREE.LineDashedMaterial({
    color: "#94A3B8",
    dashSize: 0.035,
    gapSize: 0.025,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const angleMinTickMat = new THREE.LineBasicMaterial({
    color: "#F59E0B",
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });

  const angleRefGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -ANGLE_ARC_RADIUS * 1.12, 0),
  ]);
  const angleRefLine = new THREE.Line(angleRefGeo, angleRefLineMat);
  angleRefLine.name = "angleReferenceLine";
  angleRefLine.computeLineDistances();

  let angleSectorGeo: THREE.BufferGeometry = buildAngleSectorGeometry(
    Math.PI / 2,
    -1,
    0,
    ANGLE_ARC_RADIUS
  );
  const angleSectorMesh = new THREE.Mesh(angleSectorGeo, angleSectorMat);
  angleSectorMesh.name = "angleTargetSector";
  angleSectorMesh.renderOrder = 1;

  let angleArcGeo: THREE.BufferGeometry = buildAngleArcLineGeometry(
    Math.PI / 2,
    -1,
    0,
    ANGLE_ARC_RADIUS
  );
  const angleArcLine = new THREE.Line(angleArcGeo, angleArcLineMat);
  angleArcLine.name = "angleTargetArcLine";
  angleArcLine.renderOrder = 2;

  let angleMinTickGeo: THREE.BufferGeometry = buildMinTickLineGeometry(
    Math.PI / 3,
    -1,
    0,
    ANGLE_ARC_RADIUS
  );
  const angleMinTickLine = new THREE.Line(angleMinTickGeo, angleMinTickMat);
  angleMinTickLine.name = "angleMinElevationTick";
  angleMinTickLine.renderOrder = 3;

  angleGuideGroup.add(
    angleRefLine,
    angleSectorMesh,
    angleArcLine,
    angleMinTickLine
  );

  // --- Coaching Overlay 2: 17-Keypoint AI Skeleton Overlay ---
  const skeletonGroup = new THREE.Group();
  skeletonGroup.name = "aiSkeletonGroup";
  skeletonGroup.visible = false;
  overlayRoot.add(skeletonGroup);

  const skeletonJointGeo = new THREE.SphereGeometry(0.024, 12, 10);
  const skeletonJointMat = new THREE.MeshBasicMaterial({
    color: "#FFFFFF",
    toneMapped: false,
  });
  const skeletonJointsMesh = new THREE.InstancedMesh(
    skeletonJointGeo,
    skeletonJointMat,
    SKELETON_KEYPOINT_COUNT
  );
  skeletonJointsMesh.name = "skeletonKeypointsInstanced";
  skeletonJointsMesh.frustumCulled = false;
  skeletonJointsMesh.renderOrder = 3;

  const skeletonBoneGeo = new THREE.CylinderGeometry(0.01, 0.01, 1, 8);
  const skeletonBoneMat = new THREE.MeshBasicMaterial({
    color: "#FFFFFF",
    toneMapped: false,
  });
  const skeletonBonesMesh = new THREE.InstancedMesh(
    skeletonBoneGeo,
    skeletonBoneMat,
    SKELETON_BONE_EDGES.length
  );
  skeletonBonesMesh.name = "skeletonBonesInstanced";
  skeletonBonesMesh.frustumCulled = false;
  skeletonBonesMesh.renderOrder = 2;

  skeletonGroup.add(skeletonBonesMesh, skeletonJointsMesh);

  // --- Reusable Pre-Allocated Math Buffers (Zero Per-Frame Allocations) ---
  const qTargetWorld: Record<JointName, THREE.Quaternion> = {
    hips: new THREE.Quaternion(),
    spine: new THREE.Quaternion(),
    chest: new THREE.Quaternion(),
    neck: new THREE.Quaternion(),
    head: new THREE.Quaternion(),
    leftShoulder: new THREE.Quaternion(),
    leftElbow: new THREE.Quaternion(),
    leftWrist: new THREE.Quaternion(),
    rightShoulder: new THREE.Quaternion(),
    rightElbow: new THREE.Quaternion(),
    rightWrist: new THREE.Quaternion(),
    leftHip: new THREE.Quaternion(),
    leftKnee: new THREE.Quaternion(),
    leftAnkle: new THREE.Quaternion(),
    rightHip: new THREE.Quaternion(),
    rightKnee: new THREE.Quaternion(),
    rightAnkle: new THREE.Quaternion(),
  };

  const keypointPositions: THREE.Vector3[] = Array.from(
    { length: SKELETON_KEYPOINT_COUNT },
    () => new THREE.Vector3()
  );

  const scratchEuler = new THREE.Euler(0, 0, 0, "XYZ");
  const scratchLocalQuat = new THREE.Quaternion();
  const scratchDesiredQuat = new THREE.Quaternion();
  const scratchParentQuat = new THREE.Quaternion();
  const scratchMatrix = new THREE.Matrix4();
  const scratchQuat = new THREE.Quaternion();
  const scratchScale = new THREE.Vector3();
  const scratchDir = new THREE.Vector3();
  const scratchMid = new THREE.Vector3();
  const scratchShoulderWorld = new THREE.Vector3();
  const scratchHeadWorld = new THREE.Vector3();
  const scratchHeadOffset = new THREE.Vector3();

  // Proportions-aware facial keypoint offsets derived from GLB head height
  const headBaseY = restWorldPos.head?.y ?? 1.48;
  const headRoom = Math.max(0.12, Math.min(0.42, TARGET_STANDING_HEIGHT - headBaseY));
  const faceCenterY = headRoom * 0.48;
  const headNoseLocal = new THREE.Vector3(0, faceCenterY * 0.94, 0.12);
  const headLeftEyeLocal = new THREE.Vector3(0.04, faceCenterY * 1.12, 0.11);
  const headRightEyeLocal = new THREE.Vector3(-0.04, faceCenterY * 1.12, 0.11);
  const headLeftEarLocal = new THREE.Vector3(0.1, faceCenterY * 1.04, 0);
  const headRightEarLocal = new THREE.Vector3(-0.1, faceCenterY * 1.04, 0);
  const whistleMouthLocal = new THREE.Vector3(0, faceCenterY * 0.55, 0.135);

  const fallbackAnchors = new Map<JointName, THREE.Group>();
  const joints = {} as Record<JointName, THREE.Group>;
  for (const joint of JOINT_NAMES) {
    const bone = mappedBones[joint];
    if (bone) {
      joints[joint] = bone as unknown as THREE.Group;
    } else {
      const anchor = new THREE.Group();
      anchor.name = `unmapped_${joint}`;
      fallbackAnchors.set(joint, anchor);
      joints[joint] = anchor;
    }
  }

  let disposed = false;
  let overlayState: RigOverlayOptions = { ...DEFAULT_OVERLAY_OPTIONS };
  let activeMirrored = false;
  let lastAngleSignature = "";
  let currentSkeletonVisible = false;

  const updateBodyOpacity = (skeletonVisible: boolean): void => {
    currentSkeletonVisible = skeletonVisible;
    for (const snap of meshMaterialSnapshots) {
      const mat = snap.material;
      const nextTransparent = skeletonVisible ? true : snap.transparent;
      const nextOpacity = skeletonVisible ? SKELETON_BODY_OPACITY : snap.opacity;
      const nextDepthWrite = skeletonVisible ? false : snap.depthWrite;

      if (mat.transparent !== nextTransparent) {
        mat.transparent = nextTransparent;
        mat.needsUpdate = true;
      }
      mat.opacity = nextOpacity;
      mat.depthWrite = nextDepthWrite;
    }
  };

  const updateSkeletonColors = (
    highlightArms: HighlightArms,
    mirrored: boolean
  ): void => {
    const active = resolveEffectiveHighlightedArms(highlightArms, mirrored);
    const isHighlightedJoint = (idx: number): boolean => {
      if (active.left && (idx === 5 || idx === 7 || idx === 9)) return true;
      if (active.right && (idx === 6 || idx === 8 || idx === 10)) return true;
      return false;
    };

    for (let i = 0; i < SKELETON_KEYPOINT_COUNT; i += 1) {
      skeletonJointsMesh.setColorAt(
        i,
        isHighlightedJoint(i) ? COLOR_EMERALD_KEYPOINT : COLOR_CYAN_KEYPOINT
      );
    }
    if (skeletonJointsMesh.instanceColor) {
      skeletonJointsMesh.instanceColor.needsUpdate = true;
    }

    for (let i = 0; i < SKELETON_BONE_EDGES.length; i += 1) {
      const [a, b] = SKELETON_BONE_EDGES[i];
      const highlightBone = isHighlightedJoint(a) && isHighlightedJoint(b);
      skeletonBonesMesh.setColorAt(
        i,
        highlightBone ? COLOR_EMERALD_BONE : COLOR_CYAN_BONE
      );
    }
    if (skeletonBonesMesh.instanceColor) {
      skeletonBonesMesh.instanceColor.needsUpdate = true;
    }
  };

  const syncAngleGuideGeometry = (
    opts: RigOverlayOptions,
    mirrored: boolean
  ): void => {
    const visible = opts.showAngleGuide && opts.activeArm !== "none";
    angleGuideGroup.visible = visible;
    if (!visible) return;

    const targetDeg = clampDeg(opts.targetElevationDeg);
    const minDeg = clampDeg(opts.minElevationDeg);
    const isForwardPlane = opts.activeArm === "both";
    const axisOutX = isForwardPlane ? 0 : mirrored ? 1 : -1;
    const axisOutZ = isForwardPlane ? 1 : 0;

    const sig = `${opts.activeArm}|${mirrored ? 1 : 0}|${targetDeg.toFixed(2)}|${minDeg.toFixed(2)}`;
    if (sig === lastAngleSignature) return;
    lastAngleSignature = sig;

    const targetRad = degToRad(Math.max(1, targetDeg));
    const minRad = degToRad(minDeg);

    const prevSectorGeo = angleSectorGeo;
    const prevArcGeo = angleArcGeo;
    const prevMinTickGeo = angleMinTickGeo;

    angleSectorGeo = buildAngleSectorGeometry(
      targetRad,
      axisOutX,
      axisOutZ,
      ANGLE_ARC_RADIUS
    );
    angleArcGeo = buildAngleArcLineGeometry(
      targetRad,
      axisOutX,
      axisOutZ,
      ANGLE_ARC_RADIUS
    );
    angleMinTickGeo = buildMinTickLineGeometry(
      minRad,
      axisOutX,
      axisOutZ,
      ANGLE_ARC_RADIUS
    );

    angleSectorMesh.geometry = angleSectorGeo;
    angleSectorMesh.visible = targetDeg >= 1;
    angleArcLine.geometry = angleArcGeo;
    angleMinTickLine.geometry = angleMinTickGeo;

    prevSectorGeo.dispose();
    prevArcGeo.dispose();
    prevMinTickGeo.dispose();
  };

  const readJointWorldPos = (
    primary: JointName,
    fallback: JointName,
    out: THREE.Vector3,
    defaultX: number,
    defaultY: number,
    defaultZ: number
  ): void => {
    const bone = mappedBones[primary] ?? mappedBones[fallback];
    if (bone) {
      bone.getWorldPosition(out);
    } else {
      out.set(defaultX, defaultY, defaultZ);
    }
  };

  const updateWorldOverlays = (mirrored: boolean): void => {
    const needAngle =
      overlayState.showAngleGuide && overlayState.activeArm !== "none";
    const needSkeleton = overlayState.showSkeleton;
    if (!needAngle && !needSkeleton) return;

    root.updateMatrixWorld(true);

    if (needAngle) {
      const shoulderJoint: JointName = mirrored ? "leftShoulder" : "rightShoulder";
      readJointWorldPos(
        shoulderJoint,
        "chest",
        scratchShoulderWorld,
        mirrored ? 0.2 : -0.2,
        1.4,
        0
      );
      angleGuideGroup.position.copy(scratchShoulderWorld);
    }

    if (needSkeleton) {
      const headRef = mappedBones.head ?? mappedBones.neck ?? mappedBones.chest;
      if (headRef) {
        headRef.getWorldPosition(scratchHeadWorld);
      } else {
        scratchHeadWorld.set(0, 1.48, 0);
      }

      const headWorldQuat = qTargetWorld.head;
      keypointPositions[0]
        .copy(headNoseLocal)
        .applyQuaternion(headWorldQuat)
        .add(scratchHeadWorld);
      keypointPositions[1]
        .copy(headLeftEyeLocal)
        .applyQuaternion(headWorldQuat)
        .add(scratchHeadWorld);
      keypointPositions[2]
        .copy(headRightEyeLocal)
        .applyQuaternion(headWorldQuat)
        .add(scratchHeadWorld);
      keypointPositions[3]
        .copy(headLeftEarLocal)
        .applyQuaternion(headWorldQuat)
        .add(scratchHeadWorld);
      keypointPositions[4]
        .copy(headRightEarLocal)
        .applyQuaternion(headWorldQuat)
        .add(scratchHeadWorld);

      readJointWorldPos("leftShoulder", "chest", keypointPositions[5], 0.2, 1.4, 0);
      readJointWorldPos("rightShoulder", "chest", keypointPositions[6], -0.2, 1.4, 0);
      readJointWorldPos("leftElbow", "leftShoulder", keypointPositions[7], 0.22, 1.12, 0);
      readJointWorldPos("rightElbow", "rightShoulder", keypointPositions[8], -0.22, 1.12, 0);
      readJointWorldPos("leftWrist", "leftElbow", keypointPositions[9], 0.24, 0.87, 0);
      readJointWorldPos("rightWrist", "rightElbow", keypointPositions[10], -0.24, 0.87, 0);
      readJointWorldPos("leftHip", "hips", keypointPositions[11], 0.1, 0.92, 0);
      readJointWorldPos("rightHip", "hips", keypointPositions[12], -0.1, 0.92, 0);
      readJointWorldPos("leftKnee", "leftHip", keypointPositions[13], 0.1, 0.5, 0);
      readJointWorldPos("rightKnee", "rightHip", keypointPositions[14], -0.1, 0.5, 0);
      readJointWorldPos("leftAnkle", "leftKnee", keypointPositions[15], 0.1, 0.08, 0);
      readJointWorldPos("rightAnkle", "rightKnee", keypointPositions[16], -0.1, 0.08, 0);

      scratchQuat.identity();
      for (let i = 0; i < SKELETON_KEYPOINT_COUNT; i += 1) {
        const s = i <= 4 ? 0.62 : 1;
        scratchScale.set(s, s, s);
        scratchMatrix.compose(keypointPositions[i], scratchQuat, scratchScale);
        skeletonJointsMesh.setMatrixAt(i, scratchMatrix);
      }
      skeletonJointsMesh.instanceMatrix.needsUpdate = true;

      for (let i = 0; i < SKELETON_BONE_EDGES.length; i += 1) {
        const [idxA, idxB] = SKELETON_BONE_EDGES[i];
        const pA = keypointPositions[idxA];
        const pB = keypointPositions[idxB];
        scratchDir.subVectors(pB, pA);
        const len = scratchDir.length();
        if (len > 1e-5) {
          scratchMid.addVectors(pA, pB).multiplyScalar(0.5);
          scratchDir.divideScalar(len);
          scratchQuat.setFromUnitVectors(UP_Y, scratchDir);
          const thickness = idxA <= 4 && idxB <= 4 ? 0.55 : 1;
          scratchScale.set(thickness, len, thickness);
          scratchMatrix.compose(scratchMid, scratchQuat, scratchScale);
        } else {
          scratchScale.set(0, 0, 0);
          scratchMatrix.compose(pA, scratchQuat, scratchScale);
        }
        skeletonBonesMesh.setMatrixAt(i, scratchMatrix);
      }
      skeletonBonesMesh.instanceMatrix.needsUpdate = true;
    }
  };

  updateSkeletonColors(DEFAULT_OVERLAY_OPTIONS.highlightArms, false);

  const setCardColor = (color: CardColor): void => {
    if (disposed) return;
    const palette = CARD_PALETTE[color];
    cardMat.color.set(palette.base);
    cardMat.emissive.set(palette.emissive);
    cardMat.emissiveIntensity = palette.intensity;
  };

  const setOverlayOptions = (options: RigOverlayOptions): void => {
    if (disposed) return;
    overlayState = { ...options };
    activeMirrored = options.mirrored;

    if (options.showSkeleton !== currentSkeletonVisible) {
      updateBodyOpacity(options.showSkeleton);
    }
    skeletonGroup.visible = options.showSkeleton;

    updateSkeletonColors(options.highlightArms, activeMirrored);
    syncAngleGuideGeometry(options, activeMirrored);
    updateWorldOverlays(activeMirrored);
  };

  const applyPose = (
    pose: ResolvedPose,
    mirrored: boolean,
    elapsedSec = 0
  ): void => {
    if (disposed) return;

    // 1. Chain canonical Euler XYZ rotations down the 17-joint hierarchy in-place
    for (let i = 0; i < CANONICAL_HIERARCHY.length; i += 1) {
      const { joint, parent } = CANONICAL_HIERARCHY[i];
      const [rx, ry, rz] = pose.joints[joint];
      scratchEuler.set(rx, ry, rz, "XYZ");
      scratchLocalQuat.setFromEuler(scratchEuler);
      if (parent === null) {
        qTargetWorld[joint].copy(scratchLocalQuat);
      } else {
        qTargetWorld[joint].copy(qTargetWorld[parent]).multiply(scratchLocalQuat);
      }
    }

    // 2. Apply vertical rootOffsetY in world +Y converted to hips parent local space
    if (hipsBone && restHipsLocalPos) {
      const offsetY = Number.isFinite(pose.rootOffsetY) ? pose.rootOffsetY : 0;
      hipsBone.position
        .copy(restHipsLocalPos)
        .addScaledVector(hipsLocalUpPerWorldMeter, offsetY);
    }

    // 3. Apply world-space quaternion delta retargeting in strict parent-before-child order
    root.updateMatrixWorld(true);
    for (let i = 0; i < orderedMappedEntries.length; i += 1) {
      const { joint, bone } = orderedMappedEntries[i];
      const qNeutral = neutralWorldQuat[joint];
      if (!qNeutral) continue;

      const parentObj = bone.parent ?? root;
      parentObj.getWorldQuaternion(scratchParentQuat);
      scratchDesiredQuat.copy(qTargetWorld[joint]).multiply(qNeutral);
      bone.quaternion
        .copy(scratchParentQuat.invert().multiply(scratchDesiredQuat))
        .normalize();
      bone.updateMatrixWorld(true);
    }

    // 4. Props: Yellow/Red card visibility + mouth-level whistle pulse
    if (rightCard) {
      rightCard.visible = pose.cardVisible && !mirrored;
    }
    if (leftCard) {
      leftCard.visible = pose.cardVisible && mirrored;
    }

    whistlePulse.visible = pose.whistleActive;
    if (pose.whistleActive) {
      const headRef = mappedBones.head ?? mappedBones.neck ?? mappedBones.chest;
      if (headRef) {
        headRef.getWorldPosition(scratchHeadWorld);
      } else {
        scratchHeadWorld.set(0, 1.48, 0);
      }
      scratchHeadOffset
        .copy(whistleMouthLocal)
        .applyQuaternion(qTargetWorld.head);
      whistlePulse.position.copy(scratchHeadWorld).add(scratchHeadOffset);
      whistlePulse.quaternion.copy(qTargetWorld.head);

      const safeSec = Number.isFinite(elapsedSec) ? Math.max(0, elapsedSec) : 0;
      const phase = (safeSec * 2.2) % 1;
      const scale = 0.75 + phase * 1.15;
      whistlePulse.scale.set(scale, scale, 1);
      whistlePulseMat.opacity = (1 - phase) * 0.75;
    }

    if (mirrored !== activeMirrored) {
      activeMirrored = mirrored;
      updateSkeletonColors(overlayState.highlightArms, activeMirrored);
      syncAngleGuideGeometry(overlayState, activeMirrored);
    }

    updateWorldOverlays(activeMirrored);
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;

    disposeObjectResources(root);
    disposeObjectResources(overlayRoot);
    fallbackAnchors.clear();
    meshMaterialSnapshots.length = 0;

    root.clear();
    overlayRoot.clear();
  };

  return {
    root,
    overlayRoot,
    joints,
    setCardColor,
    setOverlayOptions,
    applyPose,
    dispose,
  };
}
