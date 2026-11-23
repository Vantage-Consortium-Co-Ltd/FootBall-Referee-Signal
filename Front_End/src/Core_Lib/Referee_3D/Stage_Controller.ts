/**
 * Three.js Studio Stage Controller for the 3D IFAB Referee Viewer.
 * Manages WebGLRenderer lifecycle, 3-point studio lighting, tactical pitch pedestal,
 * dark/light theme switching without context recreation, OrbitControls + camera presets,
 * pose cross-fading, reduced-motion holding, visibility pausing, and strict disposal.
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type {
  CameraPreset,
  CardColor,
  GlbLoadState,
  PlaybackSpeed,
  RigModelMode,
  SignalClassInfo,
} from "../../Data_Types/Referee_Types";
import type { ResolvedPose } from "./Pose_Types";
import {
  blendPoses,
  getSignalAnimationClip,
  sampleSignalPose,
} from "./Signal_Poses";
import {
  buildRefereeRig,
  type RefereeRigHandle,
} from "./Referee_Rig_Builder";
import { loadGlbRefereeRig } from "./GLB_Rig_Adapter";

export type StageTheme = "dark" | "light";

export interface StageState {
  signal: SignalClassInfo;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  mirrored: boolean;
  cardColor: CardColor;
  showAngleGuide: boolean;
  showSkeleton: boolean;
  theme: StageTheme;
  reducedMotion: boolean;
  rigMode: RigModelMode;
  glbUrl: string;
}

export interface StageCallbacks {
  onContextLost?: () => void;
  onContextRestored?: () => void;
  onGlbStatusChange?: (status: GlbLoadState, errorMessage?: string) => void;
}

interface ThemePalette {
  background: string;
  fog: string;
  floor: string;
  ring: string;
  ringOpacity: number;
  tickOpacity: number;
  arrowOpacity: number;
  keyIntensity: number;
  rimColor: string;
  hemiIntensity: number;
}

interface CameraPresetSpec {
  position: readonly [number, number, number];
  target: readonly [number, number, number];
}

interface PoseTransition {
  from: ResolvedPose;
  elapsed: number;
  duration: number;
}

interface CameraTween {
  startSpherical: THREE.Spherical;
  endSpherical: THREE.Spherical;
  deltaTheta: number;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  endPosition: THREE.Vector3;
  elapsed: number;
  duration: number;
}

interface PitchFloorBundle {
  group: THREE.Group;
  floorMaterial: THREE.MeshStandardMaterial;
  ringMaterial: THREE.MeshBasicMaterial;
  tickMaterial: THREE.MeshBasicMaterial;
  arrowMaterial: THREE.MeshBasicMaterial;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
}

const CANVAS_MARKER_ATTR = "data-referee-stage-canvas";
const POSE_CROSSFADE_DURATION_SEC = 0.3;
const CAMERA_TWEEN_DURATION_SEC = 0.35;
const MAX_FRAME_DELTA_SEC = 0.05;
const FOG_NEAR = 7;
const FOG_FAR = 16;

const THEME_PALETTES: Record<StageTheme, ThemePalette> = {
  dark: {
    background: "#0B1118",
    fog: "#0B1118",
    floor: "#111B27",
    ring: "#10B981",
    ringOpacity: 0.45,
    tickOpacity: 0.24,
    arrowOpacity: 0.72,
    keyIntensity: 1.8,
    rimColor: "#6EE7B7",
    hemiIntensity: 0.5,
  },
  light: {
    background: "#F1F5F9",
    fog: "#F1F5F9",
    floor: "#E2E8F0",
    ring: "#059669",
    ringOpacity: 0.55,
    tickOpacity: 0.28,
    arrowOpacity: 0.78,
    keyIntensity: 2.1,
    rimColor: "#A7F3D0",
    hemiIntensity: 0.65,
  },
};

const CAMERA_PRESETS: Record<Exclude<CameraPreset, "free">, CameraPresetSpec> = {
  front: {
    position: [0.0, 1.38, 3.45],
    target: [0, 1.02, 0],
  },
  side: {
    position: [3.35, 1.35, 0.35],
    target: [0, 1.02, 0],
  },
  three_quarter: {
    position: [2.15, 1.52, 2.85],
    target: [0, 1.02, 0],
  },
};

function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

function clonePose(pose: ResolvedPose): ResolvedPose {
  return blendPoses(pose, pose, 0);
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const maybeErr = err as { name?: unknown; code?: unknown };
  return maybeErr.name === "AbortError" || maybeErr.code === 20;
}

function formatGlbLoadError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "GLB_UNSUPPORTED_SKELETON") {
      return "ไม่พบโครงกระดูกมนุษย์มาตรฐานในไฟล์ .glb นี้ — สลับกลับไปใช้ผู้ตัดสิน 3D มาตรฐานให้แล้ว";
    }
    if (/Failed to load GLB model/i.test(err.message)) {
      return "ไม่สามารถโหลดไฟล์โมเดล 3 มิติได้ — สลับกลับไปใช้ผู้ตัดสิน 3D มาตรฐานให้แล้ว";
    }
  }
  return "ไฟล์โมเดล .glb ไม่สมบูรณ์หรือไม่รองรับ — สลับกลับไปใช้ผู้ตัดสิน 3D มาตรฐานให้แล้ว";
}

function createFrontChevronGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  // Lies flat in XZ plane at y = 0 pointing toward +Z (referee's facing direction)
  const positions = new Float32Array([
    0, 0, 1.88,
    0.115, 0, 1.67,
    0, 0, 1.725,

    0, 0, 1.88,
    0, 0, 1.725,
    -0.115, 0, 1.67,
  ]);
  const normals = new Float32Array([
    0, 1, 0,
    0, 1, 0,
    0, 1, 0,

    0, 1, 0,
    0, 1, 0,
    0, 1, 0,
  ]);
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  return geo;
}

function buildTacticalPitchFloor(): PitchFloorBundle {
  const group = new THREE.Group();
  group.name = "tacticalPitchFloor";

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const floorGeo = new THREE.CircleGeometry(2.1, 48);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: THEME_PALETTES.dark.floor,
    roughness: 0.92,
    metalness: 0.04,
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMaterial);
  floorMesh.name = "pitchPedestalDisc";
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  floorMesh.castShadow = false;

  const outerRingGeo = new THREE.RingGeometry(1.48, 1.515, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: THEME_PALETTES.dark.ring,
    transparent: true,
    opacity: THEME_PALETTES.dark.ringOpacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const outerRingMesh = new THREE.Mesh(outerRingGeo, ringMaterial);
  outerRingMesh.name = "pitchCenterRing";
  outerRingMesh.rotation.x = -Math.PI / 2;
  outerRingMesh.position.y = 0.002;

  const innerRingGeo = new THREE.RingGeometry(0.52, 0.54, 48);
  const tickMaterial = new THREE.MeshBasicMaterial({
    color: THEME_PALETTES.dark.ring,
    transparent: true,
    opacity: THEME_PALETTES.dark.tickOpacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const innerRingMesh = new THREE.Mesh(innerRingGeo, tickMaterial);
  innerRingMesh.name = "pitchInnerRing";
  innerRingMesh.rotation.x = -Math.PI / 2;
  innerRingMesh.position.y = 0.002;

  const zTickGeo = new THREE.PlaneGeometry(0.016, 0.16);
  const xTickGeo = new THREE.PlaneGeometry(0.16, 0.016);
  const tickOffsets: ReadonlyArray<{
    geo: THREE.BufferGeometry;
    x: number;
    z: number;
    name: string;
  }> = [
    { geo: zTickGeo, x: 0, z: 1.5, name: "tickOuterFront" },
    { geo: zTickGeo, x: 0, z: -1.5, name: "tickOuterBack" },
    { geo: xTickGeo, x: 1.5, z: 0, name: "tickOuterLeft" },
    { geo: xTickGeo, x: -1.5, z: 0, name: "tickOuterRight" },
    { geo: zTickGeo, x: 0, z: 0.66, name: "tickInnerFront" },
    { geo: zTickGeo, x: 0, z: -0.66, name: "tickInnerBack" },
    { geo: xTickGeo, x: 0.66, z: 0, name: "tickInnerLeft" },
    { geo: xTickGeo, x: -0.66, z: 0, name: "tickInnerRight" },
  ];

  group.add(floorMesh, outerRingMesh, innerRingMesh);
  for (const spec of tickOffsets) {
    const tick = new THREE.Mesh(spec.geo, tickMaterial);
    tick.name = spec.name;
    tick.rotation.x = -Math.PI / 2;
    tick.position.set(spec.x, 0.0025, spec.z);
    group.add(tick);
  }

  const frontArrowGeo = createFrontChevronGeometry();
  const arrowMaterial = new THREE.MeshBasicMaterial({
    color: THEME_PALETTES.dark.ring,
    transparent: true,
    opacity: THEME_PALETTES.dark.arrowOpacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const frontArrowMesh = new THREE.Mesh(frontArrowGeo, arrowMaterial);
  frontArrowMesh.name = "frontDirectionArrow";
  frontArrowMesh.position.y = 0.003;
  group.add(frontArrowMesh);

  geometries.push(
    floorGeo,
    outerRingGeo,
    innerRingGeo,
    zTickGeo,
    xTickGeo,
    frontArrowGeo
  );
  materials.push(floorMaterial, ringMaterial, tickMaterial, arrowMaterial);

  return {
    group,
    floorMaterial,
    ringMaterial,
    tickMaterial,
    arrowMaterial,
    geometries,
    materials,
  };
}

/**
 * Controls the interactive Three.js 3D referee stage, lighting, camera presets,
 * theme synchronization, animation blending, and GPU resource lifecycle.
 */
export class RefereeStageController {
  private readonly container: HTMLElement;
  private readonly callbacks?: StageCallbacks;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly sceneBgColor: THREE.Color;
  private readonly sceneFog: THREE.Fog;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;

  private readonly keyLight: THREE.DirectionalLight;
  private readonly fillLight: THREE.DirectionalLight;
  private readonly rimLight: THREE.DirectionalLight;
  private readonly hemiLight: THREE.HemisphereLight;
  private readonly floorBundle: PitchFloorBundle;
  private readonly proceduralRig: RefereeRigHandle;
  private glbRig: RefereeRigHandle | null = null;
  private loadedGlbUrl: string | null = null;
  private activeRig: RefereeRigHandle;
  private glbLoadSeq = 0;
  private glbAbortController: AbortController | null = null;

  private state: StageState;
  private currentPose: ResolvedPose;
  private clipTimeSec = 0;
  private totalElapsedSec = 0;
  private transition: PoseTransition | null = null;
  private cameraTween: CameraTween | null = null;

  private rafId: number | null = null;
  private lastFrameTimeMs: number | null = null;
  private contextLost = false;
  private disposed = false;

  private resizeObserver: ResizeObserver | null = null;
  private hasWindowResizeListener = false;

  private readonly scratchTweenOffset = new THREE.Vector3();
  private readonly scratchTweenSpherical = new THREE.Spherical();

  constructor(
    container: HTMLElement,
    initialState: StageState,
    callbacks?: StageCallbacks
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.state = { ...initialState };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      if (!renderer.getContext()) {
        renderer.dispose();
        throw new Error("Missing WebGL context");
      }
    } catch {
      throw new Error("WEBGL_UNAVAILABLE");
    }

    // Remove any orphaned stage canvas from a prior unmounted instance (e.g. StrictMode)
    const staleCanvases = container.querySelectorAll(
      `canvas[${CANVAS_MARKER_ATTR}="true"]`
    );
    staleCanvases.forEach((node) => node.remove());

    this.renderer = renderer;
    const pixelRatio =
      typeof window !== "undefined"
        ? Math.min(window.devicePixelRatio || 1, 2)
        : 1;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const canvas = this.renderer.domElement;
    canvas.setAttribute(CANVAS_MARKER_ATTR, "true");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.outline = "none";
    this.container.appendChild(canvas);

    const { width, height } = this.measureContainer();

    this.scene = new THREE.Scene();
    this.sceneBgColor = new THREE.Color(THEME_PALETTES[this.state.theme].background);
    this.sceneFog = new THREE.Fog(
      THEME_PALETTES[this.state.theme].fog,
      FOG_NEAR,
      FOG_FAR
    );
    this.scene.background = this.sceneBgColor;
    this.scene.fog = this.sceneFog;

    this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 30);
    const defaultPreset = CAMERA_PRESETS.three_quarter;
    this.camera.position.set(...defaultPreset.position);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 2.0;
    this.controls.maxDistance = 5.6;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.controls.target.set(...defaultPreset.target);
    this.controls.update();

    // 3-Point Studio Lighting + Ambient Hemisphere Bounce
    this.keyLight = new THREE.DirectionalLight(
      "#FFF7ED",
      THEME_PALETTES[this.state.theme].keyIntensity
    );
    this.keyLight.position.set(2.4, 4.2, 3.2);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.left = -2.2;
    this.keyLight.shadow.camera.right = 2.2;
    this.keyLight.shadow.camera.top = 2.2;
    this.keyLight.shadow.camera.bottom = -2.2;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 12;
    this.keyLight.shadow.camera.updateProjectionMatrix();
    this.keyLight.shadow.bias = -0.0005;

    this.fillLight = new THREE.DirectionalLight("#DBEAFE", 0.85);
    this.fillLight.position.set(-2.8, 2.4, 2.0);

    this.rimLight = new THREE.DirectionalLight(
      THEME_PALETTES[this.state.theme].rimColor,
      1.1
    );
    this.rimLight.position.set(0.0, 2.8, -3.2);

    this.hemiLight = new THREE.HemisphereLight(
      "#E2E8F0",
      "#1E293B",
      THEME_PALETTES[this.state.theme].hemiIntensity
    );

    this.scene.add(
      this.keyLight,
      this.keyLight.target,
      this.fillLight,
      this.rimLight,
      this.hemiLight
    );

    this.floorBundle = buildTacticalPitchFloor();
    this.scene.add(this.floorBundle.group);

    this.proceduralRig = buildRefereeRig();
    this.activeRig = this.proceduralRig;
    this.scene.add(this.proceduralRig.root, this.proceduralRig.overlayRoot);

    this.applyTheme(this.state.theme);
    this.activeRig.setCardColor(this.state.cardColor);
    this.syncOverlayOptions();

    const initialClip = getSignalAnimationClip(this.state.signal.id);
    const effectiveMirrored = this.getEffectiveMirrored();
    this.clipTimeSec = this.state.reducedMotion
      ? initialClip.peakT * initialClip.durationSec
      : 0;
    const initialNormT = this.resolveNormalizedTime(initialClip.durationSec, initialClip.peakT);
    this.currentPose = sampleSignalPose(
      this.state.signal.id,
      initialNormT,
      effectiveMirrored
    );
    this.activeRig.applyPose(this.currentPose, effectiveMirrored, 0);

    this.renderer.setSize(width, height, false);
    this.renderer.render(this.scene, this.camera);

    this.controls.addEventListener("start", this.handleControlsStart);
    canvas.addEventListener("webglcontextlost", this.handleContextLost);
    canvas.addEventListener("webglcontextrestored", this.handleContextRestored);

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.container);
    } else if (typeof window !== "undefined") {
      window.addEventListener("resize", this.handleResize);
      this.hasWindowResizeListener = true;
    }

    this.startLoop();

    if (this.state.rigMode === "glb") {
      this.activateGlbRig(this.state.glbUrl);
    }
  }

  /** Incrementally merge updated viewer state, triggering pose cross-fades and theme sync. */
  public updateState(next: Partial<StageState>): void {
    if (this.disposed) return;

    const prevState = this.state;
    const nextState: StageState = { ...prevState, ...next };

    const prevClip = getSignalAnimationClip(prevState.signal.id);
    const nextClip = getSignalAnimationClip(nextState.signal.id);

    const prevEffectiveMirrored = prevState.mirrored && prevClip.supportsMirror;
    const nextEffectiveMirrored = nextState.mirrored && nextClip.supportsMirror;

    const signalChanged = nextState.signal.id !== prevState.signal.id;
    const mirrorChanged = nextState.mirrored !== prevState.mirrored;
    const effectiveMirrorChanged = nextEffectiveMirrored !== prevEffectiveMirrored;

    this.state = nextState;

    if (signalChanged || effectiveMirrorChanged) {
      if (signalChanged) {
        this.clipTimeSec =
          nextState.reducedMotion || !nextState.isPlaying
            ? nextClip.peakT * nextClip.durationSec
            : 0;
      } else if (nextState.reducedMotion) {
        this.clipTimeSec = nextClip.peakT * nextClip.durationSec;
      }

      this.transition =
        nextState.reducedMotion && !nextState.isPlaying
          ? null
          : {
              from: clonePose(this.currentPose),
              elapsed: 0,
              duration: POSE_CROSSFADE_DURATION_SEC,
            };
    } else if (
      nextState.reducedMotion &&
      !nextState.isPlaying &&
      (!prevState.reducedMotion || prevState.isPlaying)
    ) {
      this.clipTimeSec = nextClip.peakT * nextClip.durationSec;
      this.transition = null;
    }

    const rigModeChanged = nextState.rigMode !== prevState.rigMode;
    const glbUrlChanged = nextState.glbUrl !== prevState.glbUrl;

    if (nextState.theme !== prevState.theme) {
      this.applyTheme(nextState.theme);
    }

    if (nextState.cardColor !== prevState.cardColor) {
      this.activeRig.setCardColor(nextState.cardColor);
    }

    if (
      signalChanged ||
      mirrorChanged ||
      nextState.showAngleGuide !== prevState.showAngleGuide ||
      nextState.showSkeleton !== prevState.showSkeleton ||
      nextState.signal.activeArm !== prevState.signal.activeArm ||
      nextState.signal.targetElevationDeg !== prevState.signal.targetElevationDeg ||
      nextState.signal.minElevationDeg !== prevState.signal.minElevationDeg
    ) {
      this.syncOverlayOptions();
    }

    if (nextState.rigMode === "procedural") {
      if (rigModeChanged) {
        this.activateProceduralRig();
      }
    } else if (rigModeChanged || glbUrlChanged) {
      this.activateGlbRig(nextState.glbUrl);
    }
  }

  /** Smoothly animate camera & orbit target to one of the studio framing presets. */
  public setCameraPreset(preset: Exclude<CameraPreset, "free">): void {
    if (this.disposed) return;

    const spec = CAMERA_PRESETS[preset];
    const endTarget = new THREE.Vector3(...spec.target);
    const endPosition = new THREE.Vector3(...spec.position);

    if (this.state.reducedMotion) {
      this.cameraTween = null;
      this.camera.position.copy(endPosition);
      this.controls.target.copy(endTarget);
      this.flushControlsUpdateWithoutDamping();
      if (!this.contextLost && this.rafId === null) {
        this.renderer.render(this.scene, this.camera);
      }
      return;
    }

    const startTarget = this.controls.target.clone();
    const startOffset = this.camera.position.clone().sub(startTarget);
    const endOffset = endPosition.clone().sub(endTarget);

    const startSpherical = new THREE.Spherical().setFromVector3(startOffset);
    const endSpherical = new THREE.Spherical().setFromVector3(endOffset);

    let deltaTheta = (endSpherical.theta - startSpherical.theta) % (Math.PI * 2);
    if (deltaTheta > Math.PI) deltaTheta -= Math.PI * 2;
    if (deltaTheta < -Math.PI) deltaTheta += Math.PI * 2;

    this.cameraTween = {
      startSpherical,
      endSpherical,
      deltaTheta,
      startTarget,
      endTarget,
      endPosition,
      elapsed: 0,
      duration: CAMERA_TWEEN_DURATION_SEC,
    };
  }

  /** Restart the active signal animation from t = 0 with a smooth cross-fade. */
  public replay(): void {
    if (this.disposed) return;

    if (this.state.reducedMotion && !this.state.isPlaying) {
      const clip = getSignalAnimationClip(this.state.signal.id);
      this.clipTimeSec = clip.peakT * clip.durationSec;
      this.transition = null;
      return;
    }

    this.transition = {
      from: clonePose(this.currentPose),
      elapsed: 0,
      duration: POSE_CROSSFADE_DURATION_SEC,
    };
    this.clipTimeSec = 0;
  }

  /** Release all Three.js GPU allocations, DOM listeners, observers, and canvas element. */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.abortPendingGlbLoad();
    this.stopLoop();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.hasWindowResizeListener && typeof window !== "undefined") {
      window.removeEventListener("resize", this.handleResize);
      this.hasWindowResizeListener = false;
    }

    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }

    const canvas = this.renderer.domElement;
    canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    canvas.removeEventListener("webglcontextrestored", this.handleContextRestored);

    this.controls.removeEventListener("start", this.handleControlsStart);
    this.controls.dispose();

    this.proceduralRig.dispose();
    this.disposeGlbRig();

    for (const geo of this.floorBundle.geometries) {
      geo.dispose();
    }
    for (const mat of this.floorBundle.materials) {
      mat.dispose();
    }

    this.keyLight.shadow.dispose();
    this.scene.clear();

    this.renderer.dispose();
    canvas.remove();
  }

  private getEffectiveMirrored(): boolean {
    const clip = getSignalAnimationClip(this.state.signal.id);
    return this.state.mirrored && clip.supportsMirror;
  }

  private resolveNormalizedTime(durationSec: number, peakT: number): number {
    if (this.state.reducedMotion && !this.state.isPlaying) {
      return peakT;
    }
    if (durationSec <= 0) return 0;
    return this.clipTimeSec / durationSec;
  }

  private applyTheme(theme: StageTheme): void {
    const palette = THEME_PALETTES[theme];
    this.sceneBgColor.set(palette.background);
    this.sceneFog.color.set(palette.fog);

    this.floorBundle.floorMaterial.color.set(palette.floor);
    this.floorBundle.ringMaterial.color.set(palette.ring);
    this.floorBundle.ringMaterial.opacity = palette.ringOpacity;
    this.floorBundle.tickMaterial.color.set(palette.ring);
    this.floorBundle.tickMaterial.opacity = palette.tickOpacity;
    this.floorBundle.arrowMaterial.color.set(palette.ring);
    this.floorBundle.arrowMaterial.opacity = palette.arrowOpacity;

    this.keyLight.intensity = palette.keyIntensity;
    this.rimLight.color.set(palette.rimColor);
    this.hemiLight.intensity = palette.hemiIntensity;
  }

  private syncOverlayOptions(): void {
    const clip = getSignalAnimationClip(this.state.signal.id);
    this.activeRig.setOverlayOptions({
      showAngleGuide: this.state.showAngleGuide,
      showSkeleton: this.state.showSkeleton,
      highlightArms: clip.highlightArms,
      activeArm: this.state.signal.activeArm,
      targetElevationDeg: this.state.signal.targetElevationDeg,
      minElevationDeg: this.state.signal.minElevationDeg,
      mirrored: this.getEffectiveMirrored(),
    });
  }

  private abortPendingGlbLoad(): void {
    this.glbLoadSeq += 1;
    if (this.glbAbortController) {
      this.glbAbortController.abort();
      this.glbAbortController = null;
    }
  }

  private disposeGlbRig(): void {
    if (!this.glbRig) return;
    this.scene.remove(this.glbRig.root, this.glbRig.overlayRoot);
    this.glbRig.dispose();
    this.glbRig = null;
    this.loadedGlbUrl = null;
  }

  private switchToRig(targetRig: RefereeRigHandle): void {
    this.activeRig = targetRig;
    this.proceduralRig.root.visible = targetRig === this.proceduralRig;
    this.proceduralRig.overlayRoot.visible = targetRig === this.proceduralRig;
    if (this.glbRig) {
      this.glbRig.root.visible = targetRig === this.glbRig;
      this.glbRig.overlayRoot.visible = targetRig === this.glbRig;
    }
  }

  private syncActiveRigVisuals(): void {
    this.activeRig.setCardColor(this.state.cardColor);
    const whistleTime =
      this.state.reducedMotion && !this.state.isPlaying
        ? 0
        : this.totalElapsedSec;
    this.activeRig.applyPose(
      this.currentPose,
      this.getEffectiveMirrored(),
      whistleTime
    );
    this.syncOverlayOptions();
  }

  private activateProceduralRig(): void {
    this.abortPendingGlbLoad();
    this.switchToRig(this.proceduralRig);
    this.syncActiveRigVisuals();
    if (!this.contextLost) {
      this.renderer.render(this.scene, this.camera);
    }
    this.callbacks?.onGlbStatusChange?.("idle");
  }

  private activateGlbRig(url: string): void {
    const targetUrl = url.trim();
    if (!targetUrl) {
      this.abortPendingGlbLoad();
      this.switchToRig(this.proceduralRig);
      this.syncActiveRigVisuals();
      if (!this.contextLost) {
        this.renderer.render(this.scene, this.camera);
      }
      this.callbacks?.onGlbStatusChange?.(
        "error",
        "ไม่พบที่อยู่ไฟล์โมเดล 3 มิติ — สลับกลับไปใช้ผู้ตัดสิน 3D มาตรฐานให้แล้ว"
      );
      return;
    }

    if (this.glbRig && this.loadedGlbUrl === targetUrl) {
      this.abortPendingGlbLoad();
      this.switchToRig(this.glbRig);
      this.syncActiveRigVisuals();
      if (!this.contextLost) {
        this.renderer.render(this.scene, this.camera);
      }
      this.callbacks?.onGlbStatusChange?.("ready");
      return;
    }

    this.abortPendingGlbLoad();
    const seq = this.glbLoadSeq;
    const abortController = new AbortController();
    this.glbAbortController = abortController;

    // Keep procedural rig visible while loading or when falling back from an invalid GLB
    this.switchToRig(this.proceduralRig);
    this.disposeGlbRig();
    this.syncActiveRigVisuals();
    if (!this.contextLost) {
      this.renderer.render(this.scene, this.camera);
    }
    this.callbacks?.onGlbStatusChange?.("loading");

    loadGlbRefereeRig(targetUrl, abortController.signal)
      .then((rig) => {
        if (
          this.disposed ||
          seq !== this.glbLoadSeq ||
          abortController.signal.aborted
        ) {
          rig.dispose();
          return;
        }

        this.glbAbortController = null;
        this.glbRig = rig;
        this.loadedGlbUrl = targetUrl;
        this.scene.add(rig.root, rig.overlayRoot);
        this.switchToRig(rig);
        this.syncActiveRigVisuals();
        if (!this.contextLost) {
          this.renderer.render(this.scene, this.camera);
        }
        this.callbacks?.onGlbStatusChange?.("ready");
      })
      .catch((err: unknown) => {
        if (
          this.disposed ||
          seq !== this.glbLoadSeq ||
          abortController.signal.aborted ||
          isAbortError(err)
        ) {
          return;
        }

        this.glbAbortController = null;
        this.switchToRig(this.proceduralRig);
        this.syncActiveRigVisuals();
        if (!this.contextLost) {
          this.renderer.render(this.scene, this.camera);
        }
        this.callbacks?.onGlbStatusChange?.("error", formatGlbLoadError(err));
      });
  }

  private measureContainer(): { width: number; height: number } {
    const rect = this.container.getBoundingClientRect();
    const rawW = this.container.clientWidth || rect.width || 1;
    const rawH = this.container.clientHeight || rect.height || 1;
    return {
      width: Math.max(1, Math.floor(rawW)),
      height: Math.max(1, Math.floor(rawH)),
    };
  }

  private syncSize(): boolean {
    const rect = this.container.getBoundingClientRect();
    const rawW = this.container.clientWidth || rect.width;
    const rawH = this.container.clientHeight || rect.height;
    if (rawW <= 0 || rawH <= 0) return false;

    const width = Math.max(1, Math.floor(rawW));
    const height = Math.max(1, Math.floor(rawH));
    const pixelRatio =
      typeof window !== "undefined"
        ? Math.min(window.devicePixelRatio || 1, 2)
        : 1;

    this.renderer.setPixelRatio(pixelRatio);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    return true;
  }

  private flushControlsUpdateWithoutDamping(): void {
    const prevDamping = this.controls.enableDamping;
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.enableDamping = prevDamping;
  }

  private stepCameraTween(dt: number): void {
    const tween = this.cameraTween;
    if (!tween) {
      this.controls.update();
      return;
    }

    tween.elapsed += dt;
    const rawU = tween.duration > 0 ? tween.elapsed / tween.duration : 1;
    if (rawU >= 1) {
      this.camera.position.copy(tween.endPosition);
      this.controls.target.copy(tween.endTarget);
      this.cameraTween = null;
      this.flushControlsUpdateWithoutDamping();
      return;
    }

    const e = easeOutCubic(rawU);
    const radius =
      tween.startSpherical.radius +
      (tween.endSpherical.radius - tween.startSpherical.radius) * e;
    const phi =
      tween.startSpherical.phi +
      (tween.endSpherical.phi - tween.startSpherical.phi) * e;
    const theta = tween.startSpherical.theta + tween.deltaTheta * e;

    this.controls.target.lerpVectors(tween.startTarget, tween.endTarget, e);
    this.scratchTweenSpherical.set(radius, phi, theta);
    this.scratchTweenOffset.setFromSpherical(this.scratchTweenSpherical);
    this.camera.position
      .copy(this.controls.target)
      .add(this.scratchTweenOffset);
    this.flushControlsUpdateWithoutDamping();
  }

  private stepPoseAndRender(dt: number): void {
    const clip = getSignalAnimationClip(this.state.signal.id);
    const effectiveMirrored = this.getEffectiveMirrored();

    if (this.state.isPlaying) {
      const duration = clip.durationSec > 0 ? clip.durationSec : 1;
      this.clipTimeSec =
        (this.clipTimeSec + dt * this.state.speed) % duration;
      this.totalElapsedSec += dt;
    }

    const normalizedT = this.resolveNormalizedTime(clip.durationSec, clip.peakT);
    const targetPose = sampleSignalPose(
      this.state.signal.id,
      normalizedT,
      effectiveMirrored
    );

    let finalPose = targetPose;
    if (this.transition !== null) {
      this.transition.elapsed += dt;
      const rawAlpha =
        this.transition.duration > 0
          ? this.transition.elapsed / this.transition.duration
          : 1;
      if (rawAlpha >= 1) {
        this.transition = null;
        finalPose = targetPose;
      } else {
        finalPose = blendPoses(
          this.transition.from,
          targetPose,
          easeOutCubic(rawAlpha)
        );
      }
    }

    this.currentPose = finalPose;

    const whistleTime =
      this.state.reducedMotion && !this.state.isPlaying
        ? 0
        : this.totalElapsedSec;
    this.activeRig.applyPose(finalPose, effectiveMirrored, whistleTime);
    this.renderer.render(this.scene, this.camera);
  }

  private startLoop(): void {
    if (
      this.disposed ||
      this.contextLost ||
      this.rafId !== null ||
      (typeof document !== "undefined" && document.hidden) ||
      typeof window === "undefined"
    ) {
      return;
    }
    this.lastFrameTimeMs = null;
    this.rafId = window.requestAnimationFrame(this.tick);
  }

  private stopLoop(): void {
    if (this.rafId !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(this.rafId);
    }
    this.rafId = null;
    this.lastFrameTimeMs = null;
  }

  private readonly tick = (nowMs: number): void => {
    if (
      this.disposed ||
      this.contextLost ||
      (typeof document !== "undefined" && document.hidden)
    ) {
      this.rafId = null;
      this.lastFrameTimeMs = null;
      return;
    }

    const rawDt =
      this.lastFrameTimeMs === null
        ? 0
        : (nowMs - this.lastFrameTimeMs) / 1000;
    this.lastFrameTimeMs = nowMs;
    const dt = Math.min(Math.max(rawDt, 0), MAX_FRAME_DELTA_SEC);

    this.stepCameraTween(dt);
    this.stepPoseAndRender(dt);

    if (!this.disposed && !this.contextLost) {
      this.rafId = window.requestAnimationFrame(this.tick);
    } else {
      this.rafId = null;
    }
  };

  private readonly handleControlsStart = (): void => {
    this.cameraTween = null;
  };

  private readonly handleResize = (): void => {
    if (this.disposed) return;
    if (this.syncSize() && !this.contextLost) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private readonly handleVisibilityChange = (): void => {
    if (this.disposed) return;
    if (typeof document !== "undefined" && document.hidden) {
      this.stopLoop();
    } else {
      this.startLoop();
    }
  };

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    if (this.disposed) return;
    this.contextLost = true;
    this.stopLoop();
    this.callbacks?.onContextLost?.();
  };

  private readonly handleContextRestored = (): void => {
    if (this.disposed) return;
    this.contextLost = false;
    this.applyTheme(this.state.theme);
    this.activeRig.setCardColor(this.state.cardColor);
    this.syncOverlayOptions();
    this.syncSize();
    this.stepPoseAndRender(0);
    this.startLoop();
    this.callbacks?.onContextRestored?.();
  };
}
