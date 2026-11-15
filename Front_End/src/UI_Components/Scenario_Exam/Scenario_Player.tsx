"use client";

import React, { useEffect, useRef, useState } from "react";
import { ScenarioExamQuestion } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";
import {
  createVelocityTracker,
  projectMomentum,
  rubberband,
  triggerCausalFeedback,
  useAppleSpring,
} from "../../Core_Lib/Apple_Spring_Engine";

export interface ScenarioPlayerProps {
  question: ScenarioExamQuestion;
  replayTrigger?: number;
  onClipReadyForDecision?: () => void;
}

interface PitchKeyframes {
  attackerStart: [number, number];
  attackerEnd: [number, number];
  defenderStart: [number, number];
  defenderEnd: [number, number];
  ballStart: [number, number];
  ballEnd: [number, number];
  incidentPoint: [number, number];
  incidentLabelTh: string;
  refereePos: [number, number];
}

const SCENARIO_TACTICAL_DATA: Record<string, PitchKeyframes> = {
  "Q-01": {
    attackerStart: [165, 118],
    attackerEnd: [108, 124],
    defenderStart: [152, 146],
    defenderEnd: [112, 128],
    ballStart: [158, 119],
    ballEnd: [95, 134],
    incidentPoint: [110, 126],
    incidentLabelTh: "ฟาวล์สกัดขาในเขตโทษ",
    refereePos: [188, 108],
  },
  "Q-02": {
    attackerStart: [215, 132],
    attackerEnd: [315, 86],
    defenderStart: [204, 126],
    defenderEnd: [232, 126],
    ballStart: [215, 132],
    ballEnd: [338, 76],
    incidentPoint: [228, 128],
    incidentLabelTh: "ดึงเสื้อกลางสนาม · บอลหลุดขึ้นหน้า",
    refereePos: [195, 168],
  },
  "Q-03": {
    attackerStart: [192, 54],
    attackerEnd: [156, 48],
    defenderStart: [198, 62],
    defenderEnd: [158, 52],
    ballStart: [188, 53],
    ballEnd: [166, 36],
    incidentPoint: [157, 50],
    incidentLabelTh: "ผลักด้านหลังริมเส้นนอกเขตโทษ",
    refereePos: [214, 96],
  },
  "Q-04": {
    attackerStart: [168, 162],
    attackerEnd: [116, 152],
    defenderStart: [176, 126],
    defenderEnd: [134, 130],
    ballStart: [248, 120],
    ballEnd: [120, 154],
    incidentPoint: [122, 152],
    incidentLabelTh: "ตำแหน่งล้ำหน้าขณะบอลออกจากเท้า",
    refereePos: [208, 92],
  },
  "Q-05": {
    attackerStart: [138, 154],
    attackerEnd: [126, 146],
    defenderStart: [44, 122],
    defenderEnd: [34, 104],
    ballStart: [126, 146],
    ballEnd: [22, 46],
    incidentPoint: [24, 52],
    incidentLabelTh: "ผู้รักษาประตูปัดออกหลังเส้นประตู",
    refereePos: [168, 118],
  },
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const Scenario_Player: React.FC<ScenarioPlayerProps> = ({
  question,
  replayTrigger = 0,
  onClipReadyForDecision,
}) => {
  const [elapsed, setElapsed] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [slowMotion, setSlowMotion] = useState<boolean>(false);
  const [cueTriggered, setCueTriggered] = useState<boolean>(false);

  // Apple 1:1 Pointer Scrubbing + Momentum Projection state
  const trackRef = useRef<HTMLDivElement | null>(null);
  const velocityTrackerRef = useRef(createVelocityTracker());
  const wasPlayingBeforeScrubRef = useRef<boolean>(false);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [isCoasting, setIsCoasting] = useState<boolean>(false);
  const [scrubTargetSec, setScrubTargetSec] = useState<number>(0);
  const [overshootTargetPx, setOvershootTargetPx] = useState<number>(0);

  const coastSpring = useAppleSpring(scrubTargetSec, {
    dampingRatio: 0.92,
    response: 0.3,
    precision: 0.015,
  });
  const overshootSpring = useAppleSpring(overshootTargetPx, {
    dampingRatio: 0.8,
    response: 0.28,
    precision: 0.25,
  });

  const duration = question.clipDurationSeconds || 8;
  const keyframes =
    SCENARIO_TACTICAL_DATA[question.id] || SCENARIO_TACTICAL_DATA["Q-01"];

  // Reset when question or replayTrigger changes
  useEffect(() => {
    setIsScrubbing(false);
    setIsCoasting(false);
    setOvershootTargetPx(0);
    setScrubTargetSec(0);
    coastSpring.setImmediate(0);
    overshootSpring.setImmediate(0);
    setElapsed(0);
    setIsPlaying(true);
    setCueTriggered(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, replayTrigger]);

  // Sync projected coast spring back to elapsed until settled
  useEffect(() => {
    if (!isCoasting || isScrubbing) return;
    const clamped = Math.max(0, Math.min(duration, coastSpring.value));
    setElapsed(clamped);
    if (Math.abs(coastSpring.value - scrubTargetSec) < 0.025) {
      setElapsed(Math.max(0, Math.min(duration, scrubTargetSec)));
      setIsCoasting(false);
      if (wasPlayingBeforeScrubRef.current && scrubTargetSec < duration - 0.05) {
        setIsPlaying(true);
      }
    }
  }, [isCoasting, isScrubbing, coastSpring.value, scrubTargetSec, duration]);

  // Frame-rate independent playback loop using performance.now()
  useEffect(() => {
    if (!isPlaying || isScrubbing || isCoasting) return;
    let animId: number;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = ((now - lastTime) / 1000) * (slowMotion ? 0.5 : 1.0);
      lastTime = now;

      setElapsed((prev) => {
        const next = prev + dt;
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next;
      });
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isScrubbing, isCoasting, slowMotion, duration]);

  const updateScrubFromPointer = (clientX: number, timeStamp: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const localX = clientX - rect.left;
    const clampedPct = Math.max(0, Math.min(1, localX / width));
    const nextSec = clampedPct * duration;

    velocityTrackerRef.current.push(clientX, timeStamp);
    setElapsed(nextSec);

    if (localX < 0) {
      const stretched = rubberband(localX, 42, 0.55);
      setOvershootTargetPx(stretched);
      overshootSpring.setImmediate(stretched);
    } else if (localX > width) {
      const stretched = rubberband(localX - width, 42, 0.55);
      setOvershootTargetPx(stretched);
      overshootSpring.setImmediate(stretched);
    } else if (overshootTargetPx !== 0) {
      setOvershootTargetPx(0);
      overshootSpring.setImmediate(0);
    }
    return width;
  };

  const handleScrubPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    triggerCausalFeedback("tap");
    wasPlayingBeforeScrubRef.current = isPlaying;
    setIsPlaying(false);
    setIsCoasting(false);
    setIsScrubbing(true);
    velocityTrackerRef.current.reset();
    updateScrubFromPointer(e.clientX, e.timeStamp || performance.now());
  };

  const handleScrubPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    updateScrubFromPointer(e.clientX, e.timeStamp || performance.now());
  };

  const handleScrubPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const track = trackRef.current;
    const width = Math.max(1, track?.getBoundingClientRect().width ?? 1);
    const velocityPxPerSec = velocityTrackerRef.current.getVelocity();
    const velocitySecPerSec = (velocityPxPerSec / width) * duration;
    const projectedSec = Math.max(
      0,
      Math.min(duration, elapsed + projectMomentum(velocitySecPerSec, 0.992))
    );

    setIsScrubbing(false);
    setOvershootTargetPx(0);
    coastSpring.setImmediate(elapsed, velocitySecPerSec);
    setScrubTargetSec(projectedSec);

    if (Math.abs(velocitySecPerSec) > 0.25 && Math.abs(projectedSec - elapsed) > 0.04) {
      coastSpring.injectVelocity(velocitySecPerSec);
      setIsCoasting(true);
    } else if (wasPlayingBeforeScrubRef.current && elapsed < duration - 0.05) {
      setIsPlaying(true);
    }
  };

  // Trigger decision cue at ~65% of clip playback
  const progress = Math.min(1, elapsed / duration);
  useEffect(() => {
    if (progress >= 0.65 && !cueTriggered) {
      setCueTriggered(true);
      if (onClipReadyForDecision) onClipReadyForDecision();
    }
  }, [progress, cueTriggered, onClipReadyForDecision]);

  const attX = lerp(keyframes.attackerStart[0], keyframes.attackerEnd[0], progress);
  const attY = lerp(keyframes.attackerStart[1], keyframes.attackerEnd[1], progress);
  const defX = lerp(keyframes.defenderStart[0], keyframes.defenderEnd[0], progress);
  const defY = lerp(keyframes.defenderStart[1], keyframes.defenderEnd[1], progress);
  const ballX = lerp(keyframes.ballStart[0], keyframes.ballEnd[0], progress);
  const ballY = lerp(keyframes.ballStart[1], keyframes.ballEnd[1], progress);
  const showIncident = progress >= 0.6;

  return (
    <div className="apple-material-dark rounded-[22px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 bg-[#1C1C1E]/90 border-b border-white/[0.08] flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Google_Icon name="quiz" size={18} className="text-[#0A84FF]" />
          <h2 className="text-sm font-bold apple-title text-[#F5F5F7]">
            โจทย์สถานการณ์ (Instructional Scenario)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#2C2C2E] border border-white/[0.1] text-[11px] font-medium text-[#A1A1A6]">
            คลิปที่ {question.questionNumber} · {question.pitchZoneTh}
          </span>
        </div>
      </div>

      {/* Tactical 2D Pitch Simulation Screen */}
      <div className="p-4 bg-[#141416]">
        <div className="relative rounded-2xl overflow-hidden border border-[#30D158]/30 bg-[#0B3318] shadow-inner">
          <svg
            viewBox="0 0 460 230"
            className="w-full h-auto block select-none"
            role="img"
            aria-label={question.titleTh}
          >
            {/* Alternating Turf Stripes */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <rect
                key={i}
                x={20 + i * 52.5}
                y={14}
                width={52.5}
                height={202}
                fill={i % 2 === 0 ? "#0B3B24" : "#0D442A"}
              />
            ))}

            {/* Pitch Lines */}
            <rect
              x="20"
              y="14"
              width="420"
              height="202"
              fill="none"
              stroke="#6EE7B755"
              strokeWidth="1.5"
            />
            {/* Halfway Line & Center Circle */}
            <line
              x1="230"
              y1="14"
              x2="230"
              y2="216"
              stroke="#6EE7B755"
              strokeWidth="1.5"
            />
            <circle
              cx="230"
              cy="115"
              r="34"
              fill="none"
              stroke="#6EE7B755"
              strokeWidth="1.5"
            />
            <circle cx="230" cy="115" r="2.5" fill="#6EE7B788" />

            {/* Left Penalty Box (Active Zone) */}
            <rect
              x="20"
              y="48"
              width="78"
              height="134"
              fill="none"
              stroke="#6EE7B766"
              strokeWidth="1.5"
            />
            <rect
              x="20"
              y="78"
              width="28"
              height="74"
              fill="none"
              stroke="#6EE7B766"
              strokeWidth="1.5"
            />
            <circle cx="72" cy="115" r="2" fill="#6EE7B799" />

            {/* Right Penalty Box */}
            <rect
              x="362"
              y="48"
              width="78"
              height="134"
              fill="none"
              stroke="#6EE7B744"
              strokeWidth="1.5"
            />

            {/* Ball trajectory dashed guide */}
            <line
              x1={keyframes.ballStart[0]}
              y1={keyframes.ballStart[1]}
              x2={keyframes.ballEnd[0]}
              y2={keyframes.ballEnd[1]}
              stroke="#FFFFFF55"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Referee Positioning Marker */}
            <g transform={`translate(${keyframes.refereePos[0]}, ${keyframes.refereePos[1]})`}>
              <circle r="7" fill="#0F172A" stroke="#22D3EE" strokeWidth="2" />
              <text
                y="18"
                textAnchor="middle"
                fill="#22D3EE"
                fontSize="8.5"
                fontWeight="bold"
              >
                REF
              </text>
            </g>

            {/* Defender Token (#4) */}
            <g transform={`translate(${defX}, ${defY})`}>
              <circle r="8.5" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="1.8" />
              <text
                y="19"
                textAnchor="middle"
                fill="#CBD5E1"
                fontSize="9"
                fontWeight="bold"
              >
                #4
              </text>
            </g>

            {/* Attacker Token (#9) */}
            <g transform={`translate(${attX}, ${attY})`}>
              <circle r="8.5" fill="#F43F5E" stroke="#FFFFFF" strokeWidth="1.8" />
              <text
                y="19"
                textAnchor="middle"
                fill="#FFE4E6"
                fontSize="9"
                fontWeight="bold"
              >
                #9
              </text>
            </g>

            {/* Football */}
            <circle
              cx={ballX}
              cy={ballY}
              r="4.2"
              fill="#FFFFFF"
              stroke="#0F172A"
              strokeWidth="1"
            />

            {/* Highlighted Incident Ring & Label */}
            {showIncident && (
              <g>
                <circle
                  cx={keyframes.incidentPoint[0]}
                  cy={keyframes.incidentPoint[1]}
                  r="18"
                  fill="#F43F5E22"
                  stroke="#FB7185"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              </g>
            )}
          </svg>

          {/* Incident Callout Pill overlay when incident unfolds */}
          {showIncident && (
            <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-[#2B0B0D]/95 border border-[#FF453A]/60 text-[#FFD6D4] text-xs font-semibold flex items-center gap-1.5 shadow-lg animate-pulse">
              <Google_Icon name="warning" size={14} className="text-[#FF453A]" />
              <span>{keyframes.incidentLabelTh}</span>
            </div>
          )}

          {/* Decision Cue Badge */}
          {progress >= 0.99 && (
            <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-[#2C1A04]/95 border border-[#FF9F0A]/60 text-[#FF9F0A] text-[11px] font-semibold flex items-center gap-1.5">
              <Google_Icon name="bolt" size={14} className="text-[#FF9F0A]" />
              <span>หมดคลิปเหตุการณ์ — โปรดเลือกคำตัดสินและให้สัญญาณ!</span>
            </div>
          )}
        </div>

        {/* Scrubber & Playback Controls */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onPointerDown={() => triggerCausalFeedback("tap")}
              onClick={() => {
                setIsCoasting(false);
                if (elapsed >= duration) setElapsed(0);
                setIsPlaying(!isPlaying);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#2C2C2E] border border-white/[0.1] hover:border-[#0A84FF]/60 text-[#F5F5F7] text-xs font-semibold flex items-center gap-1.5 apple-pressable"
            >
              <Google_Icon name={isPlaying ? "pause" : "play_arrow"} size={16} className="text-[#0A84FF]" />
              <span>{isPlaying ? "หยุดชั่วคราว" : "เล่นคลิป"}</span>
            </button>

            <button
              onPointerDown={() => triggerCausalFeedback("tap")}
              onClick={() => {
                setIsCoasting(false);
                setElapsed(0);
                setIsPlaying(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-[#1C1C1E] border border-white/[0.1] hover:bg-[#2C2C2E] text-[#A1A1A6] hover:text-[#F5F5F7] text-xs flex items-center gap-1 apple-pressable"
              title="เล่นซ้ำตั้งแต่ต้น"
            >
              <Google_Icon name="replay" size={15} />
              <span>เล่นซ้ำ</span>
            </button>

            <span className="font-mono text-xs text-[#A1A1A6] ml-1 apple-tabular">
              00:0{elapsed.toFixed(1)}s / 00:0{duration.toFixed(1)}s
            </span>
          </div>

          <button
            onPointerDown={() => triggerCausalFeedback("snap")}
            onClick={() => setSlowMotion(!slowMotion)}
            className={`px-3 py-1 rounded-full border text-[11px] font-semibold apple-pressable ${
              slowMotion
                ? "bg-[#0A84FF]/20 border-[#0A84FF]/60 text-[#0A84FF]"
                : "bg-[#1C1C1E] border-white/[0.1] text-[#A1A1A6] hover:text-[#F5F5F7]"
            }`}
          >
            SLOW MOTION 0.5x: {slowMotion ? "ON" : "OFF"}
          </button>
        </div>

        {/* Apple 1:1 Pointer-Captured Fluid Progress Scrubber Bar */}
        <div
          ref={trackRef}
          role="slider"
          aria-label="คลิกลากเพื่อเลื่อนเวลาสถานการณ์"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={Number(elapsed.toFixed(2))}
          tabIndex={0}
          onPointerDown={handleScrubPointerDown}
          onPointerMove={handleScrubPointerMove}
          onPointerUp={handleScrubPointerEnd}
          onPointerCancel={handleScrubPointerEnd}
          style={{
            transform: `translateX(${overshootSpring.value}px)`,
            touchAction: "none",
          }}
          className="mt-2.5 py-2 -my-1 cursor-grab active:cursor-grabbing group select-none"
        >
          <div
            className={`relative w-full bg-[#2C2C2E] rounded-full overflow-visible transition-[height] duration-150 ${
              isScrubbing ? "h-3" : "h-1.5 group-hover:h-2.5"
            }`}
          >
            <div
              className="h-full bg-gradient-to-r from-[#0A84FF] to-[#30D158] rounded-full relative"
              style={{ width: `${progress * 100}%` }}
            >
              <span
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-md border border-black/20 transition-transform duration-150 ${
                  isScrubbing
                    ? "w-4 h-4 scale-110"
                    : "w-3 h-3 scale-0 group-hover:scale-100"
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
