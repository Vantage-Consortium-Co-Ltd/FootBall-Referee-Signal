"use client";

import React, { useEffect, useState } from "react";
import { ScenarioExamQuestion } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";

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

  const duration = question.clipDurationSeconds || 8;
  const keyframes =
    SCENARIO_TACTICAL_DATA[question.id] || SCENARIO_TACTICAL_DATA["Q-01"];

  // Reset when question or replayTrigger changes
  useEffect(() => {
    setElapsed(0);
    setIsPlaying(true);
    setCueTriggered(false);
  }, [question.id, replayTrigger]);

  // Frame-rate independent playback loop using performance.now()
  useEffect(() => {
    if (!isPlaying) return;
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
  }, [isPlaying, slowMotion, duration]);

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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Google_Icon name="quiz" size={18} className="text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100">
            โจทย์สถานการณ์ (Instructional Scenario)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-medium text-slate-300">
            คลิปที่ {question.questionNumber} · {question.pitchZoneTh}
          </span>
        </div>
      </div>

      {/* Tactical 2D Pitch Simulation Screen */}
      <div className="p-4 bg-slate-950/60">
        <div className="relative rounded-xl overflow-hidden border border-emerald-800/60 bg-[#0B3B24] shadow-inner">
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
            <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs font-semibold flex items-center gap-1.5 shadow-lg animate-pulse">
              <Google_Icon name="warning" size={14} className="text-rose-400" />
              <span>{keyframes.incidentLabelTh}</span>
            </div>
          )}

          {/* Decision Cue Badge */}
          {progress >= 0.99 && (
            <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-amber-950/90 border border-amber-500/60 text-amber-200 text-[11px] font-semibold flex items-center gap-1.5">
              <Google_Icon name="bolt" size={14} className="text-amber-400" />
              <span>หมดคลิปเหตุการณ์ — โปรดเลือกคำตัดสินและให้สัญญาณ!</span>
            </div>
          )}
        </div>

        {/* Scrubber & Playback Controls */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (elapsed >= duration) setElapsed(0);
                setIsPlaying(!isPlaying);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Google_Icon name={isPlaying ? "pause" : "play_arrow"} size={16} className="text-cyan-400" />
              <span>{isPlaying ? "หยุดชั่วคราว" : "เล่นคลิป"}</span>
            </button>

            <button
              onClick={() => {
                setElapsed(0);
                setIsPlaying(true);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs flex items-center gap-1 transition"
              title="เล่นซ้ำตั้งแต่ต้น"
            >
              <Google_Icon name="replay" size={15} />
              <span>เล่นซ้ำ</span>
            </button>

            <span className="font-mono text-xs text-slate-400 ml-1">
              00:0{elapsed.toFixed(1)}s / 00:0{duration.toFixed(1)}s
            </span>
          </div>

          <button
            onClick={() => setSlowMotion(!slowMotion)}
            className={`px-3 py-1 rounded-full border text-[11px] font-semibold transition ${
              slowMotion
                ? "bg-cyan-950/60 border-cyan-500/60 text-cyan-300"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            SLOW MOTION 0.5x: {slowMotion ? "ON" : "OFF"}
          </button>
        </div>

        {/* Progress Scrubber Bar */}
        <div
          className="mt-2.5 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setElapsed(pct * duration);
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-75"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
