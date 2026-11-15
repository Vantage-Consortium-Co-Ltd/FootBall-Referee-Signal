"use client";

import React from "react";
import Link from "next/link";
import { GestureRule } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";

export interface SignalAnatomySvgProps {
  rule: GestureRule;
  isLightMode: boolean;
  showGuide?: boolean;
  className?: string;
}

/**
 * Shared SVG Anatomical Posture Diagram for IFAB Referee Signals.
 * Maps 0° = down along torso, 90° = horizontal, 180° = straight overhead.
 */
export const Signal_Anatomy_Svg: React.FC<SignalAnatomySvgProps> = ({
  rule,
  isLightMode,
  showGuide = false,
  className = "w-full h-24",
}) => {
  const rad = (rule.targetElevationDeg * Math.PI) / 180;
  const upperLen = 22;
  const foreLen = 20;

  const isRightActive =
    rule.activeArm === "right" ||
    rule.activeArm === "either" ||
    rule.activeArm === "both";
  const isLeftActive =
    rule.activeArm === "left" || rule.activeArm === "both";

  const computeArmJoints = (
    sx: number,
    sy: number,
    sideSign: 1 | -1,
    active: boolean
  ) => {
    if (!active) {
      return {
        ex: sx + sideSign * 4,
        ey: sy + 20,
        wx: sx + sideSign * 6,
        wy: sy + 38,
      };
    }
    const ex = sx + sideSign * Math.sin(rad) * upperLen;
    const ey = sy + Math.cos(rad) * upperLen;

    // Bend forearm if targetStraightnessDeg indicates flexed elbow (e.g. Elbowing, Time Out)
    const bendRad =
      rule.targetStraightnessDeg < 155
        ? ((180 - rule.targetStraightnessDeg) * Math.PI) / 180
        : 0;
    const foreAngle = rad + (sideSign > 0 ? bendRad * 0.55 : -bendRad * 0.55);
    const wx = ex + sideSign * Math.sin(foreAngle) * foreLen;
    const wy = ey + Math.cos(foreAngle) * foreLen;

    return { ex, ey, wx, wy };
  };

  const rightArm = computeArmJoints(12, -22, 1, isRightActive);
  const leftArm = computeArmJoints(-12, -22, -1, isLeftActive);

  const bodyStroke = isLightMode ? "#334155" : "#94A3B8";
  const activeStroke = isLightMode ? "#0E7490" : "#22D3EE";
  const jointFill = isLightMode ? "#0E7490" : "#34D399";

  return (
    <svg
      viewBox="-64 -70 128 118"
      className={className}
      role="img"
      aria-label={`แผนภาพท่าทาง ${rule.nameTh}`}
    >
      {/* Target Dashed Ghost Guideline */}
      {showGuide && isRightActive && (
        <line
          x1={12}
          y1={-22}
          x2={12 + Math.sin(rad) * (upperLen + foreLen + 8)}
          y2={-22 + Math.cos(rad) * (upperLen + foreLen + 8)}
          stroke={isLightMode ? "#0284C7" : "#38BDF8"}
          strokeWidth={2}
          strokeDasharray="4 4"
          strokeOpacity={0.55}
        />
      )}

      {/* Torso & Head */}
      <circle cx={0} cy={-36} r={7.5} fill={bodyStroke} />
      <line x1={0} y1={-28} x2={0} y2={8} stroke={bodyStroke} strokeWidth={4} strokeLinecap="round" />
      <line x1={-12} y1={-22} x2={12} y2={-22} stroke={bodyStroke} strokeWidth={3.5} strokeLinecap="round" />

      {/* Legs */}
      <line x1={0} y1={8} x2={-9} y2={38} stroke={bodyStroke} strokeWidth={3.5} strokeLinecap="round" />
      <line x1={0} y1={8} x2={9} y2={38} stroke={bodyStroke} strokeWidth={3.5} strokeLinecap="round" />

      {/* Left Arm */}
      <line
        x1={-12}
        y1={-22}
        x2={leftArm.ex}
        y2={leftArm.ey}
        stroke={isLeftActive ? activeStroke : bodyStroke}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <line
        x1={leftArm.ex}
        y1={leftArm.ey}
        x2={leftArm.wx}
        y2={leftArm.wy}
        stroke={isLeftActive ? activeStroke : bodyStroke}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      {isLeftActive && <circle cx={leftArm.wx} cy={leftArm.wy} r={3.2} fill={jointFill} />}

      {/* Right Arm */}
      <line
        x1={12}
        y1={-22}
        x2={rightArm.ex}
        y2={rightArm.ey}
        stroke={isRightActive ? activeStroke : bodyStroke}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <line
        x1={rightArm.ex}
        y1={rightArm.ey}
        x2={rightArm.wx}
        y2={rightArm.wy}
        stroke={isRightActive ? activeStroke : bodyStroke}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      {isRightActive && <circle cx={rightArm.wx} cy={rightArm.wy} r={3.2} fill={jointFill} />}
    </svg>
  );
};

export interface SignalCurriculumCardProps {
  rule: GestureRule;
  isSelected: boolean;
  isLightMode: boolean;
  onSelectRule: (rule: GestureRule) => void;
}

export const Signal_Curriculum_Card: React.FC<SignalCurriculumCardProps> = ({
  rule,
  isSelected,
  isLightMode,
  onSelectRule,
}) => {
  const shortLaw = rule.ifabLaw.split(" - ")[0];

  return (
    <div
      onClick={() => onSelectRule(rule)}
      className={`rounded-2xl border p-4 flex flex-col justify-between transition cursor-pointer ${
        isSelected
          ? isLightMode
            ? "bg-white border-cyan-700 ring-2 ring-cyan-600/20 shadow-md"
            : "bg-slate-900 border-cyan-400 ring-2 ring-cyan-400/20 shadow-xl"
          : isLightMode
          ? "bg-white border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-sm"
          : "bg-slate-900 border-slate-800 hover:border-slate-700"
      }`}
    >
      <div>
        {/* Top Row: IFAB Law Badge + Signal ID */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold inline-flex items-center gap-1 ${
              isLightMode
                ? "bg-sky-50 border-sky-200 text-sky-700"
                : "bg-blue-950/50 border-blue-500/40 text-blue-300"
            }`}
          >
            <Google_Icon name="menu_book" size={12} />
            <span>{shortLaw}</span>
          </span>

          <span
            className={`text-[11px] font-mono font-semibold ${
              isLightMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            #{String(rule.id + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Mini Posture Diagram Box */}
        <div
          className={`rounded-xl border py-2 mb-3 flex items-center justify-center ${
            isLightMode
              ? "bg-slate-50 border-slate-100"
              : "bg-slate-950/60 border-slate-800"
          }`}
        >
          <Signal_Anatomy_Svg rule={rule} isLightMode={isLightMode} className="w-full h-24" />
        </div>

        {/* Title */}
        <h3
          className={`text-sm font-bold leading-snug ${
            isLightMode ? "text-slate-900" : "text-slate-100"
          }`}
        >
          {rule.nameTh}
        </h3>
        <div
          className={`text-xs mt-0.5 ${
            isLightMode ? "text-slate-500" : "text-slate-400"
          }`}
        >
          {rule.name.replace(/_/g, " ")}
        </div>

        {/* Telemetry Requirements Row */}
        <div
          className={`mt-2.5 flex flex-wrap items-center gap-3 text-[11px] font-medium ${
            isLightMode ? "text-slate-600" : "text-slate-300"
          }`}
        >
          <span className="inline-flex items-center gap-1">
            <Google_Icon name="straighten" size={13} className={isLightMode ? "text-cyan-700" : "text-cyan-400"} />
            <span>แขน {rule.targetElevationDeg}°</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Google_Icon name="schedule" size={13} className={isLightMode ? "text-emerald-700" : "text-emerald-400"} />
            <span>Hold {rule.minHoldSeconds}s</span>
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        className={`mt-4 pt-3 border-t flex items-center gap-2 ${
          isLightMode ? "border-slate-200" : "border-slate-800"
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectRule(rule);
          }}
          className={`flex-1 py-2 px-2.5 rounded-xl border text-[11px] font-semibold transition flex items-center justify-center gap-1 ${
            isSelected
              ? isLightMode
                ? "bg-teal-50 border-teal-600 text-teal-800"
                : "bg-cyan-950/50 border-cyan-500 text-cyan-200"
              : isLightMode
              ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <span>ดูรายละเอียด</span>
        </button>

        <Link
          href={`/drills?signalId=${rule.id}`}
          onClick={(e) => e.stopPropagation()}
          className={`flex-1 py-2 px-2.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
            isSelected
              ? isLightMode
                ? "bg-cyan-700 hover:bg-cyan-800 text-white"
                : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
              : isLightMode
              ? "bg-slate-100 hover:bg-slate-200 text-slate-800"
              : "bg-slate-800 hover:bg-slate-700 text-slate-100"
          }`}
        >
          <Google_Icon name="videocam" size={13} />
          <span>ฝึกซ้อม</span>
        </Link>
      </div>
    </div>
  );
};
