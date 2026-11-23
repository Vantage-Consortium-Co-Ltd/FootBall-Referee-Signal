/**
 * Procedural 3D Stylized Referee Rig, Props (Yellow/Red Card & Whistle),
 * and World-Aligned Coaching Overlays (Elevation Angle Guide + 17-Keypoint AI Skeleton).
 *
 * Coordinate contract (aligned 1:1 with Signal_Poses.ts):
 * - Right-handed Y-Up Three.js world
 * - Referee faces +Z, +Y is Up, +X is Referee's LEFT, -X is Referee's RIGHT
 * - Feet rest cleanly on y = 0; standing height ~1.78 units
 * - Limbs hang straight down along -Y at neutral [0, 0, 0] Euler('XYZ')
 */

import * as THREE from "three";

import type { ActiveArm, CardColor } from "../../Data_Types/Referee_Types";
import type { HighlightArms, JointName, ResolvedPose } from "./Pose_Types";

export interface RigOverlayOptions {
  showAngleGuide: boolean;
  showSkeleton: boolean;
  highlightArms: HighlightArms;
  activeArm: ActiveArm;
  targetElevationDeg: number;
  minElevationDeg: number;
  mirrored: boolean;
}

export interface RefereeRigHandle {
  root: THREE.Group;
  overlayRoot: THREE.Group;
  joints: Record<JointName, THREE.Group>;
  setCardColor: (color: CardColor) => void;
  setOverlayOptions: (options: RigOverlayOptions) => void;
  applyPose: (pose: ResolvedPose, mirrored: boolean, elapsedSec?: number) => void;
  dispose: () => void;
}

const BASE_HIPS_Y = 0.94;
const ANGLE_ARC_RADIUS = 0.42;
const ANGLE_ARC_SEGMENTS = 36;
const SKELETON_BODY_OPACITY = 0.28;

const SKELETON_KEYPOINT_COUNT = 17;
// Standard COCO / YOLO26-pose 17-keypoint bone graph + ear-to-shoulder links
const SKELETON_BONE_EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], // nose -> leftEye
  [0, 2], // nose -> rightEye
  [1, 3], // leftEye -> leftEar
  [2, 4], // rightEye -> rightEar
  [3, 5], // leftEar -> leftShoulder
  [4, 6], // rightEar -> rightShoulder
  [5, 6], // leftShoulder -> rightShoulder
  [5, 7], // leftShoulder -> leftElbow
  [7, 9], // leftElbow -> leftWrist
  [6, 8], // rightShoulder -> rightElbow
  [8, 10], // rightElbow -> rightWrist
  [5, 11], // leftShoulder -> leftHip
  [6, 12], // rightShoulder -> rightHip
  [11, 12], // leftHip -> rightHip
  [11, 13], // leftHip -> leftKnee
  [13, 15], // leftKnee -> leftAnkle
  [12, 14], // rightHip -> rightKnee
  [14, 16], // rightKnee -> rightAnkle
];

const UP_Y = new THREE.Vector3(0, 1, 0);

const COLOR_CYAN_KEYPOINT = new THREE.Color("#22D3EE");
const COLOR_EMERALD_KEYPOINT = new THREE.Color("#10B981");
const COLOR_CYAN_BONE = new THREE.Color("#06B6D4");
const COLOR_EMERALD_BONE = new THREE.Color("#34D399");

const CARD_PALETTE: Record<CardColor, { base: string; emissive: string; intensity: number }> = {
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

function clampDeg(degValue: number): number {
  if (!Number.isFinite(degValue)) return 0;
  return Math.max(0, Math.min(180, degValue));
}

function degToRad(degValue: number): number {
  return (degValue * Math.PI) / 180;
}

function createCanvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createJerseyStripeTexture(): THREE.CanvasTexture | null {
  const tex = createCanvasTexture(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#1E293B";
    const stripeCount = 16;
    const stripeW = w / stripeCount;
    for (let i = 0; i < stripeCount; i += 2) {
      ctx.fillRect(i * stripeW, 0, stripeW * 0.45, h);
    }
  });
  if (tex) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
  }
  return tex;
}

function createSleeveCuffTexture(): THREE.CanvasTexture | null {
  return createCanvasTexture(64, 128, (ctx, w, h) => {
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#1E293B";
    for (let x = 0; x < w; x += 16) {
      ctx.fillRect(x, 0, 6, h);
    }
    // Bottom UV edge maps to bottom of cylinder sleeve
    ctx.fillStyle = "#10B981";
    ctx.fillRect(0, h * 0.84, w, h * 0.16);
  });
}

function createSockTrimTexture(): THREE.CanvasTexture | null {
  return createCanvasTexture(64, 128, (ctx, w, h) => {
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, w, h);
    // Top UV edge maps to upper cuff below knee
    ctx.fillStyle = "#10B981";
    ctx.fillRect(0, h * 0.04, w, h * 0.06);
    ctx.fillRect(0, h * 0.13, w, h * 0.035);
  });
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

function createBodyMesh(
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  castShadow = true,
  receiveShadow = true
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return mesh;
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

function buildAngleSectorGeometry(
  targetRad: number,
  axisOutX: number,
  axisOutZ: number,
  radius: number
): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const segments = Math.max(2, Math.round((targetRad / Math.PI) * ANGLE_ARC_SEGMENTS));
  const positions: number[] = [];

  for (let i = 0; i < segments; i += 1) {
    const phi0 = (i / segments) * targetRad;
    const phi1 = ((i + 1) / segments) * targetRad;
    const x0 = axisOutX * radius * Math.sin(phi0);
    const y0 = -radius * Math.cos(phi0);
    const z0 = axisOutZ * radius * Math.sin(phi0);

    const x1 = axisOutX * radius * Math.sin(phi1);
    const y1 = -radius * Math.cos(phi1);
    const z1 = axisOutZ * radius * Math.sin(phi1);

    positions.push(0, 0, 0, x0, y0, z0, x1, y1, z1);
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
  const segments = Math.max(4, Math.round((targetRad / Math.PI) * ANGLE_ARC_SEGMENTS));
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
  // End ray from shoulder pivot out along target angle so elevation target is unmistakable
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
    new THREE.Vector3(axisOutX * innerR * sinPhi, -innerR * cosPhi, axisOutZ * innerR * sinPhi),
    new THREE.Vector3(axisOutX * outerR * sinPhi, -outerR * cosPhi, axisOutZ * outerR * sinPhi),
  ]);
}

function disposeObjectResources(target: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  target.traverse((obj) => {
    if (obj instanceof THREE.InstancedMesh) {
      obj.dispose();
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

  for (const geo of geometries) {
    geo.dispose();
  }
  for (const mat of materials) {
    const texturedMat = mat as THREE.Material & {
      map?: THREE.Texture | null;
      roughnessMap?: THREE.Texture | null;
      metalnessMap?: THREE.Texture | null;
    };
    if (texturedMat.map) textures.add(texturedMat.map);
    if (texturedMat.roughnessMap) textures.add(texturedMat.roughnessMap);
    if (texturedMat.metalnessMap) textures.add(texturedMat.metalnessMap);
    mat.dispose();
  }
  for (const tex of textures) {
    tex.dispose();
  }
}

export function buildRefereeRig(): RefereeRigHandle {
  let disposed = false;

  const root = new THREE.Group();
  root.name = "refereeRoot";

  const overlayRoot = new THREE.Group();
  overlayRoot.name = "refereeOverlayRoot";

  // --- Shared Studio Materials ---
  const createdTextures: THREE.Texture[] = [];
  const trackTex = <T extends THREE.Texture | null>(tex: T): T => {
    if (tex) createdTextures.push(tex);
    return tex;
  };

  const jerseyTex = trackTex(createJerseyStripeTexture());
  const sleeveTex = trackTex(createSleeveCuffTexture());
  const sockTex = trackTex(createSockTrimTexture());

  const jerseyMat = new THREE.MeshStandardMaterial({
    color: jerseyTex ? "#FFFFFF" : "#111827",
    ...(jerseyTex ? { map: jerseyTex } : {}),
    roughness: 0.78,
    metalness: 0.04,
  });
  const sleeveMat = new THREE.MeshStandardMaterial({
    color: sleeveTex ? "#FFFFFF" : "#111827",
    ...(sleeveTex ? { map: sleeveTex } : {}),
    roughness: 0.76,
    metalness: 0.04,
  });
  const emeraldTrimMat = new THREE.MeshStandardMaterial({
    color: "#10B981",
    roughness: 0.55,
    metalness: 0.08,
  });
  const badgeMat = new THREE.MeshStandardMaterial({
    color: "#F59E0B",
    emissive: "#10B981",
    emissiveIntensity: 0.12,
    roughness: 0.35,
    metalness: 0.45,
  });
  const shortsMat = new THREE.MeshStandardMaterial({
    color: "#0B0F19",
    roughness: 0.82,
    metalness: 0.03,
  });
  const sockMat = new THREE.MeshStandardMaterial({
    color: sockTex ? "#FFFFFF" : "#0F172A",
    ...(sockTex ? { map: sockTex } : {}),
    roughness: 0.78,
    metalness: 0.04,
  });
  const cleatUpperMat = new THREE.MeshStandardMaterial({
    color: "#0F172A",
    roughness: 0.46,
    metalness: 0.12,
  });
  const cleatSoleMat = new THREE.MeshStandardMaterial({
    color: "#F8FAFC",
    roughness: 0.52,
    metalness: 0.05,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: "#E0B08A",
    roughness: 0.65,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: "#18181B",
    roughness: 0.84,
    metalness: 0.05,
  });
  const faceDetailMat = new THREE.MeshStandardMaterial({
    color: "#0F172A",
    roughness: 0.36,
    metalness: 0.05,
  });
  const lanyardMat = new THREE.MeshStandardMaterial({
    color: "#1E293B",
    roughness: 0.75,
    metalness: 0.08,
  });
  const whistleMat = new THREE.MeshStandardMaterial({
    color: "#E2E8F0",
    roughness: 0.2,
    metalness: 0.88,
  });

  const leftJointAccentMat = new THREE.MeshStandardMaterial({
    color: "#334155",
    emissive: "#000000",
    emissiveIntensity: 0,
    roughness: 0.36,
    metalness: 0.2,
  });
  const rightJointAccentMat = new THREE.MeshStandardMaterial({
    color: "#334155",
    emissive: "#000000",
    emissiveIntensity: 0,
    roughness: 0.36,
    metalness: 0.2,
  });

  const bodyMaterials: THREE.MeshStandardMaterial[] = [
    jerseyMat,
    sleeveMat,
    emeraldTrimMat,
    badgeMat,
    shortsMat,
    sockMat,
    cleatUpperMat,
    cleatSoleMat,
    skinMat,
    hairMat,
    faceDetailMat,
    lanyardMat,
    whistleMat,
    leftJointAccentMat,
    rightJointAccentMat,
  ];

  // Prop materials (cards stay opaque so signals stay readable in skeleton mode)
  const cardMat = new THREE.MeshStandardMaterial({
    color: CARD_PALETTE.yellow.base,
    emissive: CARD_PALETTE.yellow.emissive,
    emissiveIntensity: CARD_PALETTE.yellow.intensity,
    roughness: 0.32,
    metalness: 0.06,
  });

  const whistlePulseMat = new THREE.MeshBasicMaterial({
    color: "#34D399",
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // --- Joint Pivot Hierarchy (17 joints matching Pose_Types.ts) ---
  const createPivot = (name: JointName, x: number, y: number, z: number): THREE.Group => {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(x, y, z);
    return group;
  };

  const hips = createPivot("hips", 0, BASE_HIPS_Y, 0);
  const spine = createPivot("spine", 0, 0.09, 0);
  const chest = createPivot("chest", 0, 0.22, 0);
  const neck = createPivot("neck", 0, 0.2, 0);
  const head = createPivot("head", 0, 0.09, 0);

  const leftShoulder = createPivot("leftShoulder", 0.2, 0.14, 0);
  const leftElbow = createPivot("leftElbow", 0, -0.28, 0);
  const leftWrist = createPivot("leftWrist", 0, -0.25, 0);

  const rightShoulder = createPivot("rightShoulder", -0.2, 0.14, 0);
  const rightElbow = createPivot("rightElbow", 0, -0.28, 0);
  const rightWrist = createPivot("rightWrist", 0, -0.25, 0);

  const leftHip = createPivot("leftHip", 0.1, -0.02, 0);
  const leftKnee = createPivot("leftKnee", 0, -0.42, 0);
  const leftAnkle = createPivot("leftAnkle", 0, -0.42, 0);

  const rightHip = createPivot("rightHip", -0.1, -0.02, 0);
  const rightKnee = createPivot("rightKnee", 0, -0.42, 0);
  const rightAnkle = createPivot("rightAnkle", 0, -0.42, 0);

  root.add(hips);
  hips.add(spine, leftHip, rightHip);
  spine.add(chest);
  chest.add(neck, leftShoulder, rightShoulder);
  neck.add(head);

  leftShoulder.add(leftElbow);
  leftElbow.add(leftWrist);

  rightShoulder.add(rightElbow);
  rightElbow.add(rightWrist);

  leftHip.add(leftKnee);
  leftKnee.add(leftAnkle);

  rightHip.add(rightKnee);
  rightKnee.add(rightAnkle);

  const joints: Record<JointName, THREE.Group> = {
    hips,
    spine,
    chest,
    neck,
    head,
    leftShoulder,
    leftElbow,
    leftWrist,
    rightShoulder,
    rightElbow,
    rightWrist,
    leftHip,
    leftKnee,
    leftAnkle,
    rightHip,
    rightKnee,
    rightAnkle,
  };

  // --- Torso, Pelvis & Chest Props ---
  const pelvisMesh = createBodyMesh(
    "pelvisMesh",
    new THREE.CylinderGeometry(0.14, 0.148, 0.15, 16),
    shortsMat
  );
  pelvisMesh.scale.set(1.14, 1, 0.76);
  pelvisMesh.position.set(0, -0.01, 0);
  hips.add(pelvisMesh);

  const spineMesh = createBodyMesh(
    "spineMesh",
    new THREE.CylinderGeometry(0.138, 0.128, 0.28, 16),
    jerseyMat
  );
  spineMesh.scale.set(1.14, 1, 0.72);
  spineMesh.position.set(0, 0.09, 0);
  spine.add(spineMesh);

  const chestMesh = createBodyMesh(
    "chestMesh",
    new THREE.CylinderGeometry(0.165, 0.135, 0.24, 16),
    jerseyMat
  );
  chestMesh.scale.set(1.18, 1, 0.72);
  chestMesh.position.set(0, 0.1, 0);
  chest.add(chestMesh);

  const collarMesh = createBodyMesh(
    "collarMesh",
    new THREE.TorusGeometry(0.068, 0.014, 10, 20),
    emeraldTrimMat
  );
  collarMesh.rotation.x = Math.PI / 2 + 0.08;
  collarMesh.scale.set(1.02, 0.9, 1);
  collarMesh.position.set(0, 0.205, 0.006);
  chest.add(collarMesh);

  // Breast pocket on Referee's LEFT chest (+X, +Z)
  const pocketMesh = createBodyMesh(
    "leftChestPocket",
    new THREE.BoxGeometry(0.066, 0.072, 0.012),
    shortsMat
  );
  pocketMesh.position.set(0.082, 0.062, 0.104);
  pocketMesh.rotation.y = 0.26;
  chest.add(pocketMesh);

  // Shield referee badge right above/on the left chest pocket facing +Z
  const badgeMesh = createBodyMesh(
    "refereeBadge",
    new THREE.CylinderGeometry(0.022, 0.016, 0.008, 6),
    badgeMat
  );
  badgeMesh.rotation.x = Math.PI / 2;
  badgeMesh.rotation.z = 0.26;
  badgeMesh.position.set(0.082, 0.092, 0.112);
  chest.add(badgeMesh);

  // Lanyard + metallic silver whistle on front sternum (+Z)
  const lanyardMesh = createBodyMesh(
    "whistleLanyard",
    new THREE.TorusGeometry(0.088, 0.0055, 8, 22, Math.PI * 1.18),
    lanyardMat
  );
  lanyardMesh.rotation.set(0.56, 0, Math.PI * 0.91);
  lanyardMesh.position.set(0, 0.118, 0.056);
  chest.add(lanyardMesh);

  const whistleMesh = createBodyMesh(
    "whistle",
    new THREE.CylinderGeometry(0.011, 0.012, 0.036, 12),
    whistleMat
  );
  whistleMesh.rotation.z = Math.PI / 2;
  whistleMesh.rotation.x = 0.25;
  whistleMesh.position.set(0, 0.034, 0.113);
  chest.add(whistleMesh);

  const neckMesh = createBodyMesh(
    "neckMesh",
    new THREE.CylinderGeometry(0.046, 0.052, 0.11, 14),
    skinMat
  );
  neckMesh.position.set(0, 0.05, 0);
  neck.add(neckMesh);

  // --- Head & Unmistakable +Z Facial Features ---
  const headMesh = createBodyMesh(
    "headMesh",
    new THREE.SphereGeometry(0.106, 20, 16),
    skinMat
  );
  headMesh.scale.set(0.9, 1.06, 0.96);
  headMesh.position.set(0, 0.11, 0);
  head.add(headMesh);

  const hairCapMesh = createBodyMesh(
    "hairCap",
    new THREE.SphereGeometry(0.111, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat
  );
  hairCapMesh.scale.set(0.92, 1.04, 0.98);
  hairCapMesh.position.set(0, 0.116, -0.005);
  hairCapMesh.rotation.x = -0.22;
  head.add(hairCapMesh);

  const eyeGeo = new THREE.SphereGeometry(0.011, 10, 8);
  const leftEye = createBodyMesh("leftEye", eyeGeo, faceDetailMat, false, false);
  leftEye.scale.set(1, 0.85, 0.6);
  leftEye.position.set(0.035, 0.117, 0.093);

  const rightEye = createBodyMesh("rightEye", eyeGeo, faceDetailMat, false, false);
  rightEye.scale.set(1, 0.85, 0.6);
  rightEye.position.set(-0.035, 0.117, 0.093);
  head.add(leftEye, rightEye);

  const browGeo = new THREE.BoxGeometry(0.025, 0.006, 0.01);
  const leftBrow = createBodyMesh("leftBrow", browGeo, hairMat, false, false);
  leftBrow.position.set(0.035, 0.137, 0.092);
  leftBrow.rotation.z = -0.08;

  const rightBrow = createBodyMesh("rightBrow", browGeo, hairMat, false, false);
  rightBrow.position.set(-0.035, 0.137, 0.092);
  rightBrow.rotation.z = 0.08;
  head.add(leftBrow, rightBrow);

  const noseBridge = createBodyMesh(
    "noseBridge",
    new THREE.CapsuleGeometry(0.0085, 0.022, 4, 8),
    skinMat
  );
  noseBridge.position.set(0, 0.099, 0.102);
  noseBridge.rotation.x = -0.14;
  head.add(noseBridge);

  // Subtle 3D animated sound-wave pulse ring near mouth when whistleActive === true
  const whistlePulse = new THREE.Mesh(
    new THREE.TorusGeometry(0.026, 0.004, 8, 24),
    whistlePulseMat
  );
  whistlePulse.name = "whistlePulseRing";
  whistlePulse.position.set(0, 0.046, 0.122);
  whistlePulse.visible = false;
  head.add(whistlePulse);

  // --- Shared Limb Geometries ---
  const sleeveGeo = new THREE.CylinderGeometry(0.056, 0.052, 0.16, 14);
  const upperArmGeo = new THREE.CylinderGeometry(0.044, 0.038, 0.15, 14);
  const forearmGeo = new THREE.CylinderGeometry(0.038, 0.029, 0.25, 14);
  const shoulderRingGeo = new THREE.SphereGeometry(0.056, 14, 12);
  const elbowRingGeo = new THREE.SphereGeometry(0.042, 14, 12);
  const wristRingGeo = new THREE.SphereGeometry(0.033, 12, 10);
  const handGeo = new THREE.CapsuleGeometry(0.018, 0.085, 4, 10);
  const cardGeo = createRoundedCardGeometry();

  const shortsLegGeo = new THREE.CylinderGeometry(0.086, 0.08, 0.23, 14);
  const thighGeo = new THREE.CylinderGeometry(0.066, 0.054, 0.24, 14);
  const sockShinGeo = new THREE.CylinderGeometry(0.055, 0.038, 0.43, 14);
  const cleatUpperGeo = new THREE.BoxGeometry(0.084, 0.056, 0.215);
  const cleatSoleGeo = new THREE.BoxGeometry(0.088, 0.012, 0.222);

  const populateArm = (
    side: "left" | "right",
    shoulderPivot: THREE.Group,
    elbowPivot: THREE.Group,
    wristPivot: THREE.Group,
    accentMat: THREE.MeshStandardMaterial
  ): THREE.Mesh => {
    const sleeve = createBodyMesh(`${side}Sleeve`, sleeveGeo, sleeveMat);
    sleeve.position.set(0, -0.08, 0);
    const upperArm = createBodyMesh(`${side}UpperArm`, upperArmGeo, skinMat);
    upperArm.position.set(0, -0.21, 0);
    const shoulderRing = createBodyMesh(`${side}ShoulderAccent`, shoulderRingGeo, accentMat);
    shoulderPivot.add(sleeve, upperArm, shoulderRing);

    const forearm = createBodyMesh(`${side}Forearm`, forearmGeo, skinMat);
    forearm.position.set(0, -0.125, 0);
    const elbowRing = createBodyMesh(`${side}ElbowAccent`, elbowRingGeo, accentMat);
    elbowPivot.add(forearm, elbowRing);

    const wristRing = createBodyMesh(`${side}WristAccent`, wristRingGeo, accentMat);
    const hand = createBodyMesh(`${side}Hand`, handGeo, skinMat);
    hand.scale.set(0.72, 1, 1.85);
    hand.position.set(0, -0.09, 0.005);

    const card = createBodyMesh(`${side}Card`, cardGeo, cardMat, true, false);
    card.position.set(0, -0.118, 0.016);
    card.visible = false;

    wristPivot.add(wristRing, hand, card);
    return card;
  };

  const leftCard = populateArm("left", leftShoulder, leftElbow, leftWrist, leftJointAccentMat);
  const rightCard = populateArm(
    "right",
    rightShoulder,
    rightElbow,
    rightWrist,
    rightJointAccentMat
  );

  const populateLeg = (
    side: "left" | "right",
    hipPivot: THREE.Group,
    kneePivot: THREE.Group,
    anklePivot: THREE.Group
  ): void => {
    const shortsLeg = createBodyMesh(`${side}ShortsLeg`, shortsLegGeo, shortsMat);
    shortsLeg.position.set(0, -0.105, 0);
    const thigh = createBodyMesh(`${side}Thigh`, thighGeo, skinMat);
    thigh.position.set(0, -0.305, 0);
    hipPivot.add(shortsLeg, thigh);

    const sockShin = createBodyMesh(`${side}SockShin`, sockShinGeo, sockMat);
    sockShin.position.set(0, -0.215, 0);
    kneePivot.add(sockShin);

    const cleatUpper = createBodyMesh(`${side}CleatUpper`, cleatUpperGeo, cleatUpperMat);
    cleatUpper.position.set(0, -0.044, 0.048);
    const cleatSole = createBodyMesh(`${side}CleatSole`, cleatSoleGeo, cleatSoleMat);
    cleatSole.position.set(0, -0.074, 0.048);
    anklePivot.add(cleatUpper, cleatSole);
  };

  populateLeg("left", leftHip, leftKnee, leftAnkle);
  populateLeg("right", rightHip, rightKnee, rightAnkle);

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

  let angleSectorGeo: THREE.BufferGeometry = buildAngleSectorGeometry(Math.PI / 2, -1, 0, ANGLE_ARC_RADIUS);
  const angleSectorMesh = new THREE.Mesh(angleSectorGeo, angleSectorMat);
  angleSectorMesh.name = "angleTargetSector";
  angleSectorMesh.renderOrder = 1;

  let angleArcGeo: THREE.BufferGeometry = buildAngleArcLineGeometry(Math.PI / 2, -1, 0, ANGLE_ARC_RADIUS);
  const angleArcLine = new THREE.Line(angleArcGeo, angleArcLineMat);
  angleArcLine.name = "angleTargetArcLine";
  angleArcLine.renderOrder = 2;

  let angleMinTickGeo: THREE.BufferGeometry = buildMinTickLineGeometry(Math.PI / 3, -1, 0, ANGLE_ARC_RADIUS);
  const angleMinTickLine = new THREE.Line(angleMinTickGeo, angleMinTickMat);
  angleMinTickLine.name = "angleMinElevationTick";
  angleMinTickLine.renderOrder = 3;

  angleGuideGroup.add(angleRefLine, angleSectorMesh, angleArcLine, angleMinTickLine);

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

  // Reusable math scratch buffers to keep per-frame applyPose allocation-free
  const keypointPositions: THREE.Vector3[] = Array.from(
    { length: SKELETON_KEYPOINT_COUNT },
    () => new THREE.Vector3()
  );
  const scratchMatrix = new THREE.Matrix4();
  const scratchQuat = new THREE.Quaternion();
  const scratchScale = new THREE.Vector3();
  const scratchDir = new THREE.Vector3();
  const scratchMid = new THREE.Vector3();
  const scratchShoulderWorld = new THREE.Vector3();

  // Head facial keypoint offsets in `head` local space
  const headNoseLocal = new THREE.Vector3(0, 0.099, 0.102);
  const headLeftEyeLocal = new THREE.Vector3(0.035, 0.117, 0.093);
  const headRightEyeLocal = new THREE.Vector3(-0.035, 0.117, 0.093);
  const headLeftEarLocal = new THREE.Vector3(0.092, 0.112, 0);
  const headRightEarLocal = new THREE.Vector3(-0.092, 0.112, 0);

  let overlayState: RigOverlayOptions = { ...DEFAULT_OVERLAY_OPTIONS };
  let activeMirrored = false;
  let lastAngleSignature = "";
  let currentSkeletonVisible = false;

  const updateBodyOpacity = (skeletonVisible: boolean): void => {
    currentSkeletonVisible = skeletonVisible;
    const nextTransparent = skeletonVisible;
    const nextOpacity = skeletonVisible ? SKELETON_BODY_OPACITY : 1;
    const nextDepthWrite = !skeletonVisible;

    for (const mat of bodyMaterials) {
      if (mat.transparent !== nextTransparent) {
        mat.transparent = nextTransparent;
        mat.needsUpdate = true;
      }
      mat.opacity = nextOpacity;
      mat.depthWrite = nextDepthWrite;
    }
  };

  const updateJointHighlights = (highlightArms: HighlightArms, mirrored: boolean): void => {
    const active = resolveEffectiveHighlightedArms(highlightArms, mirrored);
    const applyAccent = (mat: THREE.MeshStandardMaterial, enabled: boolean): void => {
      if (enabled) {
        mat.color.set("#10B981");
        mat.emissive.set("#10B981");
        mat.emissiveIntensity = 0.85;
      } else {
        mat.color.set("#334155");
        mat.emissive.set("#000000");
        mat.emissiveIntensity = 0;
      }
    };
    applyAccent(leftJointAccentMat, active.left);
    applyAccent(rightJointAccentMat, active.right);
  };

  const updateSkeletonColors = (highlightArms: HighlightArms, mirrored: boolean): void => {
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

  const syncAngleGuideGeometry = (opts: RigOverlayOptions, mirrored: boolean): void => {
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

    // Dispose old dynamic geometries before swapping in rebuilt ones
    const prevSectorGeo = angleSectorGeo;
    const prevArcGeo = angleArcGeo;
    const prevMinTickGeo = angleMinTickGeo;

    angleSectorGeo = buildAngleSectorGeometry(targetRad, axisOutX, axisOutZ, ANGLE_ARC_RADIUS);
    angleArcGeo = buildAngleArcLineGeometry(targetRad, axisOutX, axisOutZ, ANGLE_ARC_RADIUS);
    angleMinTickGeo = buildMinTickLineGeometry(minRad, axisOutX, axisOutZ, ANGLE_ARC_RADIUS);

    angleSectorMesh.geometry = angleSectorGeo;
    angleSectorMesh.visible = targetDeg >= 1;
    angleArcLine.geometry = angleArcGeo;
    angleMinTickLine.geometry = angleMinTickGeo;

    prevSectorGeo.dispose();
    prevArcGeo.dispose();
    prevMinTickGeo.dispose();
  };

  const updateWorldOverlays = (mirrored: boolean): void => {
    const needAngle = overlayState.showAngleGuide && overlayState.activeArm !== "none";
    const needSkeleton = overlayState.showSkeleton;
    if (!needAngle && !needSkeleton) return;

    root.updateMatrixWorld(true);

    if (needAngle) {
      const shoulderJoint = mirrored ? leftShoulder : rightShoulder;
      shoulderJoint.getWorldPosition(scratchShoulderWorld);
      angleGuideGroup.position.copy(scratchShoulderWorld);
    }

    if (needSkeleton) {
      // Head 5 facial keypoints (0..4)
      keypointPositions[0].copy(headNoseLocal).applyMatrix4(head.matrixWorld);
      keypointPositions[1].copy(headLeftEyeLocal).applyMatrix4(head.matrixWorld);
      keypointPositions[2].copy(headRightEyeLocal).applyMatrix4(head.matrixWorld);
      keypointPositions[3].copy(headLeftEarLocal).applyMatrix4(head.matrixWorld);
      keypointPositions[4].copy(headRightEarLocal).applyMatrix4(head.matrixWorld);

      // Upper & lower body 12 joint keypoints (5..16)
      leftShoulder.getWorldPosition(keypointPositions[5]);
      rightShoulder.getWorldPosition(keypointPositions[6]);
      leftElbow.getWorldPosition(keypointPositions[7]);
      rightElbow.getWorldPosition(keypointPositions[8]);
      leftWrist.getWorldPosition(keypointPositions[9]);
      rightWrist.getWorldPosition(keypointPositions[10]);
      leftHip.getWorldPosition(keypointPositions[11]);
      rightHip.getWorldPosition(keypointPositions[12]);
      leftKnee.getWorldPosition(keypointPositions[13]);
      rightKnee.getWorldPosition(keypointPositions[14]);
      leftAnkle.getWorldPosition(keypointPositions[15]);
      rightAnkle.getWorldPosition(keypointPositions[16]);

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

  // Initialize default skeleton colors and body material state
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

    updateJointHighlights(options.highlightArms, activeMirrored);
    updateSkeletonColors(options.highlightArms, activeMirrored);
    syncAngleGuideGeometry(options, activeMirrored);
    updateWorldOverlays(activeMirrored);
  };

  const applyPose = (pose: ResolvedPose, mirrored: boolean, elapsedSec = 0): void => {
    if (disposed) return;

    const offsetY = Number.isFinite(pose.rootOffsetY) ? pose.rootOffsetY : 0;
    hips.position.y = BASE_HIPS_Y + offsetY;

    for (const jointName of Object.keys(joints) as JointName[]) {
      const [rx, ry, rz] = pose.joints[jointName];
      joints[jointName].rotation.set(rx, ry, rz);
    }

    // Active card visibility on throwing/raising hand
    rightCard.visible = pose.cardVisible && !mirrored;
    leftCard.visible = pose.cardVisible && mirrored;

    // Animated sound-wave pulse ring when referee blows whistle
    whistlePulse.visible = pose.whistleActive;
    if (pose.whistleActive) {
      const safeSec = Number.isFinite(elapsedSec) ? Math.max(0, elapsedSec) : 0;
      const phase = (safeSec * 2.2) % 1;
      const scale = 0.75 + phase * 1.15;
      whistlePulse.scale.set(scale, scale, 1);
      whistlePulseMat.opacity = (1 - phase) * 0.75;
    }

    if (mirrored !== activeMirrored) {
      activeMirrored = mirrored;
      updateJointHighlights(overlayState.highlightArms, activeMirrored);
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
    for (const tex of createdTextures) {
      tex.dispose();
    }
    createdTextures.length = 0;

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
