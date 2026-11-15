"use client";

import React from "react";
import Link from "next/link";
import { GestureRule } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

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

  const bodyStroke = isLightMode ? "#3A3A3C" : "#A1A1A6";
  const activeStroke = isLightMode ? "#007AFF" : "#0A84FF";
  const jointFill = isLightMode ? "#34C759" : "#30D158";

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
          stroke={isLightMode ? "#007AFF" : "#64D2FF"}
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
      onClick={() => {
        triggerCausalFeedback("snap");
        onSelectRule(rule);
      }}
      className={`rounded-[20px] border p-4 flex flex-col justify-between transition-all duration-150 cursor-pointer apple-pressable ${
        isSelected
          ? isLightMode
            ? "bg-white border-[#007AFF] ring-2 ring-[#007AFF]/20 shadow-md"
            : "apple-material-dark border-[#0A84FF] ring-2 ring-[#0A84FF]/25 shadow-xl"
          : isLightMode
          ? "apple-material-light border-black/[0.06] hover:border-black/[0.14] shadow-xs hover:shadow-sm"
          : "apple-material-dark border-white/[0.08] hover:border-white/[0.18]"
      }`}
    >
      <div>
        {/* Top Row: IFAB Law Badge + Signal ID */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold inline-flex items-center gap-1 ${
              isLightMode
                ? "bg-[#007AFF]/10 border-[#007AFF]/20 text-[#007AFF]"
                : "bg-[#0A84FF]/15 border-[#0A84FF]/30 text-[#0A84FF]"
            }`}
          >
            <Google_Icon name="menu_book" size={12} />
            <span>{shortLaw}</span>
          </span>

          <span
            className={`text-[11px] font-mono font-semibold apple-tabular ${
              isLightMode ? "text-[#8E8E93]" : "text-[#8E8E93]"
            }`}
          >
            #{String(rule.id + 1).padStart(2, "0")}
          </span>
        </div>

        {/* Mini Posture Diagram Box */}
        <div
          className={`rounded-2xl border py-2 mb-3 flex items-center justify-center ${
            isLightMode
              ? "bg-[#F2F2F7] border-black/[0.04]"
              : "bg-[#141416] border-white/[0.06]"
          }`}
        >
          <Signal_Anatomy_Svg rule={rule} isLightMode={isLightMode} className="w-full h-24" />
        </div>

        {/* Title */}
        <h3
          className={`text-sm font-bold leading-snug tracking-tight ${
            isLightMode ? "text-[#1D1D1F]" : "text-[#F5F5F7]"
          }`}
        >
          {rule.nameTh}
        </h3>
        <div
          className={`text-xs mt-0.5 ${
            isLightMode ? "text-[#6E6E73]" : "text-[#A1A1A6]"
          }`}
        >
          {rule.name.replace(/_/g, " ")}
        </div>

        {/* Telemetry Requirements Row */}
        <div
          className={`mt-2.5 flex flex-wrap items-center gap-3 text-[11px] font-medium apple-tabular ${
            isLightMode ? "text-[#6E6E73]" : "text-[#A1A1A6]"
          }`}
        >
          <span className="inline-flex items-center gap-1">
            <Google_Icon name="straighten" size={13} className={isLightMode ? "text-[#007AFF]" : "text-[#0A84FF]"} />
            <span>แขน {rule.targetElevationDeg}°</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Google_Icon name="schedule" size={13} className={isLightMode ? "text-[#34C759]" : "text-[#30D158]"} />
            <span>Hold {rule.minHoldSeconds}s</span>
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        className={`mt-4 pt-3 border-t flex items-center gap-2 ${
          isLightMode ? "border-black/[0.06]" : "border-white/[0.08]"
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerCausalFeedback("snap");
            onSelectRule(rule);
          }}
          className={`flex-1 py-2 px-2.5 rounded-xl border text-[11px] font-semibold transition-colors duration-150 flex items-center justify-center gap-1 apple-pressable ${
            isSelected
              ? isLightMode
                ? "bg-[#007AFF]/10 border-[#007AFF]/30 text-[#007AFF]"
                : "bg-[#0A84FF]/15 border-[#0A84FF]/40 text-[#0A84FF]"
              : isLightMode
              ? "bg-[#F2F2F7] border-black/[0.06] text-[#1D1D1F] hover:bg-[#E5E5EA]"
              : "bg-[#2C2C2E]/80 border-white/[0.08] text-[#F5F5F7] hover:bg-[#3A3A3C]"
          }`}
        >
          <span>ดูรายละเอียด</span>
        </button>

        <Link
          href={`/drills?signalId=${rule.id}`}
          onClick={(e) => {
            e.stopPropagation();
            triggerCausalFeedback("tap");
          }}
          className={`flex-1 py-2 px-2.5 rounded-xl text-[11px] font-semibold transition-colors duration-150 flex items-center justify-center gap-1 apple-pressable ${
            isSelected
              ? isLightMode
                ? "bg-[#007AFF] hover:bg-[#0066D6] text-white shadow-xs"
                : "bg-[#0A84FF] hover:bg-[#3395FF] text-white shadow-xs"
              : isLightMode
              ? "bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F]"
              : "bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[#F5F5F7]"
          }`}
        >
          <Google_Icon name="videocam" size={13} />
          <span>ฝึกซ้อม</span>
        </Link>
      </div>
    </div>
  );
};
