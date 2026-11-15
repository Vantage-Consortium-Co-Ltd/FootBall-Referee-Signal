"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Apple WWDC "Designing Fluid Interfaces" momentum projection:
 * Projects where an inertial drag/flick will come to rest using exponential decay.
 * decelerationRate ≈ 0.998 for scroll/sheet deceleration; 0.99 for snappier throws.
 */
export function projectMomentum(
  velocityPxPerSec: number,
  decelerationRate = 0.998
): number {
  if (!Number.isFinite(velocityPxPerSec)) return 0;
  return ((velocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Apple progressive rubber-band resistance past content boundaries.
 * Dimension is the axis extent (e.g., track width or sheet height); constant defaults to 0.55.
 */
export function rubberband(
  overshoot: number,
  dimension: number,
  constant = 0.55
): number {
  if (overshoot === 0 || dimension <= 0) return 0;
  const sign = overshoot < 0 ? -1 : 1;
  const abs = Math.abs(overshoot);
  return sign * (1 - 1 / ((abs * constant) / dimension + 1)) * dimension;
}

/**
 * Clamps a numeric coordinate inside [min, max], applying Apple rubber-banding beyond either edge.
 */
export function clampWithRubberband(
  value: number,
  min: number,
  max: number,
  dimension: number,
  constant = 0.55
): number {
  if (value < min) {
    return min + rubberband(value - min, dimension, constant);
  }
  if (value > max) {
    return max + rubberband(value - max, dimension, constant);
  }
  return value;
}

export interface VelocitySample {
  position: number;
  time: number;
}

/**
 * Tracks a rolling window of pointer positions to compute smoothed release velocity (units/sec).
 */
export function createVelocityTracker() {
  const samples: VelocitySample[] = [];

  return {
    reset() {
      samples.length = 0;
    },
    push(position: number, time = performance.now()) {
      samples.push({ position, time });
      const cutoff = time - 110;
      while (samples.length > 6 || (samples.length > 2 && samples[0].time < cutoff)) {
        samples.shift();
      }
    },
    getVelocity(): number {
      if (samples.length < 2) return 0;
      const newest = samples[samples.length - 1];
      const oldest = samples[0];
      const dtSec = (newest.time - oldest.time) / 1000;
      if (dtSec <= 0.004) return 0;
      return (newest.position - oldest.position) / dtSec;
    },
  };
}

/**
 * React hook tracking @media (prefers-reduced-motion: reduce).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export interface AppleSpringOptions {
  /** 1.0 = critically damped (default, no overshoot); ~0.8 = slight bounce on momentum flicks */
  dampingRatio?: number;
  /** Approximate time to settle toward target in seconds (default 0.38s) */
  response?: number;
  /** Optional precision floor before snapping to rest (default 0.002) */
  precision?: number;
}

/**
 * Interruptible Apple-style spring powered by dampingRatio + response.
 * Always integrates from the live presentation value and blends velocity across re-targets.
 */
export function useAppleSpring(
  target: number,
  options: AppleSpringOptions = {}
): {
  value: number;
  setImmediate: (nextValue: number, velocity?: number) => void;
  injectVelocity: (velocity: number) => void;
} {
  const { dampingRatio = 1.0, response = 0.38, precision = 0.002 } = options;
  const reducedMotion = usePrefersReducedMotion();

  const [displayValue, setDisplayValue] = useState<number>(target);
  const simRef = useRef({
    value: target,
    velocity: 0,
    target,
    dampingRatio,
    response,
    precision,
    rafId: null as number | null,
    lastTs: 0,
  });

  simRef.current.dampingRatio = dampingRatio;
  simRef.current.response = response;
  simRef.current.precision = precision;

  const stopLoop = useCallback(() => {
    if (simRef.current.rafId !== null) {
      cancelAnimationFrame(simRef.current.rafId);
      simRef.current.rafId = null;
    }
    simRef.current.lastTs = 0;
  }, []);

  const startLoop = useCallback(() => {
    if (simRef.current.rafId !== null) return;

    const step = (now: number) => {
      const sim = simRef.current;
      const rawDt = sim.lastTs ? (now - sim.lastTs) / 1000 : 1 / 60;
      sim.lastTs = now;
      const frameDt = Math.min(rawDt, 0.05);

      const safeResponse = Math.max(0.05, sim.response);
      const omega = (2 * Math.PI) / safeResponse;
      const stiffness = omega * omega;
      const damping = 2 * Math.max(0.15, sim.dampingRatio) * omega;

      // Sub-step physics at <= 4ms slices so fast springs never destabilize
      const subSteps = Math.max(1, Math.ceil(frameDt / 0.004));
      const dt = frameDt / subSteps;

      for (let i = 0; i < subSteps; i += 1) {
        const displacement = sim.value - sim.target;
        const accel = -stiffness * displacement - damping * sim.velocity;
        sim.velocity += accel * dt;
        sim.value += sim.velocity * dt;
      }

      const settled =
        Math.abs(sim.target - sim.value) < sim.precision &&
        Math.abs(sim.velocity) < sim.precision * 12;

      if (settled) {
        sim.value = sim.target;
        sim.velocity = 0;
        sim.rafId = null;
        sim.lastTs = 0;
        setDisplayValue(sim.target);
        return;
      }

      setDisplayValue(sim.value);
      sim.rafId = requestAnimationFrame(step);
    };

    simRef.current.rafId = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    simRef.current.target = target;
    if (reducedMotion) {
      stopLoop();
      simRef.current.value = target;
      simRef.current.velocity = 0;
      setDisplayValue(target);
      return;
    }

    if (
      Math.abs(target - simRef.current.value) >= precision ||
      Math.abs(simRef.current.velocity) >= precision * 12
    ) {
      startLoop();
    }
  }, [target, reducedMotion, precision, startLoop, stopLoop]);

  useEffect(() => stopLoop, [stopLoop]);

  const setImmediate = useCallback(
    (nextValue: number, velocity = 0) => {
      stopLoop();
      simRef.current.value = nextValue;
      simRef.current.target = nextValue;
      simRef.current.velocity = velocity;
      setDisplayValue(nextValue);
    },
    [stopLoop]
  );

  const injectVelocity = useCallback(
    (velocity: number) => {
      if (reducedMotion) return;
      simRef.current.velocity = velocity;
      startLoop();
    },
    [reducedMotion, startLoop]
  );

  return { value: displayValue, setImmediate, injectVelocity };
}

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtor) return null;
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioCtor();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => undefined);
  }
  return sharedAudioCtx;
}

export type CausalFeedbackKind = "tap" | "snap" | "success" | "warning";

/**
 * Apple "Designing Audio-Haptic Experiences":
 * Subtle, physically congruent causal audio + optional gentle tactile vibration.
 */
export function triggerCausalFeedback(kind: CausalFeedbackKind): void {
  if (typeof window === "undefined") return;

  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      if (kind === "tap") navigator.vibrate(6);
      else if (kind === "snap") navigator.vibrate(10);
      else if (kind === "success") navigator.vibrate([10, 24, 14]);
      else if (kind === "warning") navigator.vibrate([16, 20, 16]);
    } catch {
      // Ignore hardware vibration denials
    }
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const playTone = (
      freqStart: number,
      freqEnd: number,
      durationSec: number,
      peakGain: number,
      delaySec = 0,
      type: OscillatorType = "sine"
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now + delaySec);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(40, freqEnd),
        now + delaySec + durationSec
      );
      gain.gain.setValueAtTime(0.0001, now + delaySec);
      gain.gain.exponentialRampToValueAtTime(peakGain, now + delaySec + 0.005);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + delaySec + durationSec
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delaySec);
      osc.stop(now + delaySec + durationSec + 0.01);
    };

    if (kind === "tap") {
      playTone(540, 320, 0.028, 0.018, 0, "triangle");
    } else if (kind === "snap") {
      playTone(420, 620, 0.036, 0.024, 0, "sine");
    } else if (kind === "success") {
      playTone(587.33, 587.33, 0.09, 0.032, 0, "sine");
      playTone(880, 880, 0.14, 0.038, 0.055, "sine");
    } else if (kind === "warning") {
      playTone(340, 250, 0.11, 0.03, 0, "triangle");
    }
  } catch {
    // Audio playback silently ignored when browser blocks autoplay before gesture
  }
}
