"use client";

import React, { useEffect, useRef } from "react";
import {
  FrameFeedbackPayload,
  GestureRule,
} from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";
import {
  triggerCausalFeedback,
  useAppleSpring,
} from "../../Core_Lib/Apple_Spring_Engine";

export interface CoachingHUDProps {
  feedback: FrameFeedbackPayload;
  targetRule: GestureRule;
  streakCount: number;
  totalAttempts: number;
}

export const Coaching_HUD: React.FC<CoachingHUDProps> = ({
  feedback,
  targetRule,
  streakCount,
  totalAttempts,
}) => {
  const {
    score,
    state,
    holdProgress,
    holdDuration,
    angles,
    feedbackTip,
    detected,
    gestureNameTh,
  } = feedback;

  const isCompleted = state === "COMPLETED";
  const isHolding = state === "HOLDING";
  const isLost = state === "LOST_POSTURE" || (state === "DETECTED" && !feedback.isAcceptable);

  // Determine active arm elevation & elbow straightness from real COCO-17 keypoints
  const useLeftArm =
    targetRule.activeArm === "left" ||
    (targetRule.activeArm === "either" &&
      Math.abs(angles.lElevationAngle - targetRule.targetElevationDeg) <
        Math.abs(angles.rElevationAngle - targetRule.targetElevationDeg) &&
      angles.lElevationAngle > 0);

  const liveElevation =
    targetRule.activeArm === "both"
      ? Math.round((angles.rElevationAngle + angles.lElevationAngle) / 2)
      : useLeftArm
      ? angles.lElevationAngle
      : angles.rElevationAngle;

  const liveElbow =
    targetRule.activeArm === "both"
      ? Math.round((angles.rElbowAngle + angles.lElbowAngle) / 2)
      : useLeftArm
      ? angles.lElbowAngle
      : angles.rElbowAngle;

  // Apple critically damped springs driven from live real values
  const scoreSpring = useAppleSpring(score, {
    dampingRatio: 1.0,
    response: 0.36,
    precision: 0.25,
  });
  const holdSpring = useAppleSpring(holdProgress, {
    dampingRatio: 1.0,
    response: 0.22,
    precision: 0.002,
  });
  const elevationSpring = useAppleSpring(liveElevation, {
    dampingRatio: 1.0,
    response: 0.26,
    precision: 0.25,
  });
  const elbowSpring = useAppleSpring(liveElbow, {
    dampingRatio: 1.0,
    response: 0.26,
    precision: 0.25,
  });

  // Edge-triggered causal audio-haptic feedback on state transitions
  const prevStateRef = useRef(state);
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (state === "COMPLETED" && prev !== "COMPLETED") {
      triggerCausalFeedback("success");
    } else if (isLost && prev === "HOLDING") {
      triggerCausalFeedback("warning");
    }
  }, [state, isLost]);

  // Circular timer calculations driven by spring hold progress
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const clampedHold = Math.min(1, Math.max(0, holdSpring.value));
  const strokeDashoffset = circumference - clampedHold * circumference;

  const displayedScore = Math.round(scoreSpring.value);
  const displayedElevation = Math.round(elevationSpring.value);
  const displayedElbow = Math.round(elbowSpring.value);

  const statusColor = isCompleted
    ? "text-[#30D158] border-[#30D158]/45 bg-[#30D158]/15"
    : isHolding
    ? "text-[#0A84FF] border-[#0A84FF]/45 bg-[#0A84FF]/15"
    : isLost
    ? "text-[#FF9F0A] border-[#FF9F0A]/45 bg-[#FF9F0A]/15"
    : "text-[#A1A1A6] border-white/[0.1] bg-[#141416]/90";

  return (
    <div className="apple-material-dark rounded-[22px] p-5 flex flex-col gap-4">
      {/* Header: Score & Hold Circular Timer */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div>
          <span className="text-xs text-[#A1A1A6] uppercase tracking-wider font-semibold">
            คะแนนรวม &amp; ความมั่นใจ AI (Score)
          </span>
          <div className="flex items-baseline gap-2 mt-0.5 apple-tabular">
            <span
              className={`text-3xl font-bold font-mono apple-display ${
                displayedScore >= 75
                  ? "text-[#30D158]"
                  : displayedScore >= 40
                  ? "text-[#0A84FF]"
                  : "text-[#FF9F0A]"
              }`}
            >
              {displayedScore}
            </span>
            <span className="text-xs text-[#6E6E73]">/ 100</span>
          </div>
        </div>

        {/* Circular Countdown Progress Ring */}
        <div className="relative flex items-center justify-center">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              className="text-[#2C2C2E]"
              fill="transparent"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={
                isCompleted
                  ? "text-[#30D158]"
                  : isHolding
                  ? "text-[#0A84FF]"
                  : "text-[#6E6E73]"
              }
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center apple-tabular">
            {isCompleted ? (
              <Google_Icon name="check_circle" size={24} className="text-[#30D158]" filled />
            ) : (
              <>
                <span className="text-xs font-mono font-bold text-[#F5F5F7]">
                  {holdDuration.toFixed(1)}s
                </span>
                <span className="text-[9px] text-[#A1A1A6]">
                  /{targetRule.minHoldSeconds}s
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Live Coaching Feedback Banner */}
      <div className={`px-4 py-3 rounded-2xl border flex items-center gap-3 ${statusColor}`}>
        {isCompleted ? (
          <Google_Icon name="check_circle" size={20} className="text-[#30D158]" filled />
        ) : isLost ? (
          <Google_Icon name="warning" size={20} className="text-[#FF9F0A]" filled />
        ) : (
          <Google_Icon name="monitoring" size={20} className="text-[#0A84FF]" />
        )}
        <div className="text-xs font-medium leading-relaxed">{feedbackTip}</div>
      </div>

      {/* Real Joint Angle Telemetry + Modal AI Classification */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-[#F5F5F7] flex items-center gap-1.5">
          <Google_Icon name="explore" size={16} className="text-[#0A84FF]" />
          การวัดองศาข้อต่อจริง (Real-Time Keypoints &amp; Modal AI)
        </div>

        {/* Real Arm Elevation */}
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-3">
          <div className="flex justify-between items-center text-xs mb-1.5 apple-tabular">
            <span className="text-[#A1A1A6]">องศาการยกแขนจริง (Arm Elevation)</span>
            <span className="font-mono font-bold text-[#0A84FF]">
              {displayedElevation}° / {targetRule.targetElevationDeg}°
            </span>
          </div>
          <div className="w-full bg-[#2C2C2E] rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#0A84FF] to-[#64D2FF] h-2 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    (elevationSpring.value / Math.max(1, targetRule.targetElevationDeg)) * 100
                  )
                )}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#6E6E73] mt-1 apple-tabular">
            <span>0° (แนบลำตัว)</span>
            <span>เกณฑ์ผ่าน: {targetRule.minElevationDeg}°+</span>
            <span>180° (ชูตรง)</span>
          </div>
        </div>

        {/* Real Elbow Straightness */}
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-3">
          <div className="flex justify-between items-center text-xs mb-1.5 apple-tabular">
            <span className="text-[#A1A1A6]">ความเหยียดตรงของข้อศอกจริง (Elbow)</span>
            <span className="font-mono font-bold text-[#30D158]">
              {displayedElbow}° / 180°
            </span>
          </div>
          <div className="w-full bg-[#2C2C2E] rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full ${
                displayedElbow >= targetRule.minStraightnessDeg
                  ? "bg-[#30D158]"
                  : "bg-[#FF9F0A]"
              }`}
              style={{
                width: `${Math.min(100, Math.max(0, (elbowSpring.value / 180) * 100))}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[#6E6E73] mt-1 apple-tabular">
            <span>90° (งอศอก)</span>
            <span>เกณฑ์ตรง: {targetRule.minStraightnessDeg}°+</span>
            <span>180° (เหยียดตรง)</span>
          </div>
        </div>

        {/* Detected Class vs Target Class */}
        <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-3 space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[#A1A1A6]">ผลทำนายจาก Modal YOLO26n-pose:</span>
            <span
              className={`font-semibold ${
                feedback.isAcceptable
                  ? "text-[#30D158]"
                  : detected
                  ? "text-[#FF9F0A]"
                  : "text-[#6E6E73]"
              }`}
            >
              {feedback.isAcceptable || (detected && state !== "DETECTED")
                ? gestureNameTh
                : detected && feedback.keypoints.length === 0
                ? gestureNameTh
                : detected && feedback.score > 0 && state === "DETECTED" && feedback.keypoints.length > 0
                ? gestureNameTh !== targetRule.nameTh
                  ? gestureNameTh
                  : "กำลังรอ Modal ยืนยัน..."
                : "ยังไม่พบสัญญาณในเฟรม"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#A1A1A6]">ท่าเป้าหมาย:</span>
            <span className="font-semibold text-[#F5F5F7]">{targetRule.nameTh}</span>
          </div>
        </div>
      </div>

      {/* Practice Streak & Stats Footer */}
      <div className="pt-3 border-t border-white/[0.08] flex justify-between items-center text-xs text-[#A1A1A6] apple-tabular">
        <div className="flex items-center gap-1.5">
          <Google_Icon name="bolt" size={16} className="text-[#FF9F0A]" filled />
          <span>
            ต่อเนื่อง: <b className="text-[#F5F5F7]">{streakCount} ครั้ง</b>
          </span>
        </div>
        <div>
          <span>
            บันทึกแล้ว: <b className="text-[#F5F5F7]">{totalAttempts} รอบ</b>
          </span>
        </div>
      </div>
    </div>
  );
};
