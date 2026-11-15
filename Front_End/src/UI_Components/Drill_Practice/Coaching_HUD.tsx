"use client";

import React from "react";
import {
  FrameFeedbackPayload,
  GestureRule,
} from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";

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
  const { score, state, holdProgress, holdDuration, angles, feedbackTip } = feedback;

  // Circular timer calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - holdProgress * circumference;

  const isCompleted = state === "COMPLETED";
  const isHolding = state === "HOLDING";
  const isLost = state === "LOST_POSTURE";

  const statusColor = isCompleted
    ? "text-emerald-400 border-emerald-500/50 bg-emerald-950/40"
    : isHolding
    ? "text-cyan-400 border-cyan-500/50 bg-cyan-950/40"
    : isLost
    ? "text-amber-400 border-amber-500/50 bg-amber-950/40"
    : "text-slate-400 border-slate-800 bg-slate-900/60";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
      {/* Header: Score & Hold Circular Timer */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            คะแนนความถูกต้อง (Posture Score)
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span
              className={`text-3xl font-extrabold font-mono ${
                score >= 85
                  ? "text-emerald-400"
                  : score >= 70
                  ? "text-cyan-400"
                  : "text-amber-400"
              }`}
            >
              {score}
            </span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
        </div>

        {/* Circular Countdown Progress Ring */}
        <div className="relative flex items-center justify-center">
          <svg className="w-20 h-20 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              className="text-slate-800"
              fill="transparent"
            />
            {/* Progress circle */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-all duration-150 ${
                isCompleted
                  ? "text-emerald-400"
                  : isHolding
                  ? "text-cyan-400"
                  : "text-slate-700"
              }`}
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            {isCompleted ? (
              <Google_Icon name="check_circle" size={24} className="text-emerald-400 animate-bounce" filled />
            ) : (
              <>
                <span className="text-xs font-mono font-bold text-slate-100">
                  {holdDuration.toFixed(1)}s
                </span>
                <span className="text-[9px] text-slate-400">
                  /{targetRule.minHoldSeconds}s
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Live Coaching Toast Feedback Banner */}
      <div
        className={`px-4 py-3 rounded-xl border flex items-center gap-3 transition-all ${statusColor}`}
      >
        {isCompleted ? (
          <Google_Icon name="check_circle" size={20} className="text-emerald-400" filled />
        ) : isLost ? (
          <Google_Icon name="warning" size={20} className="text-amber-400" filled />
        ) : (
          <Google_Icon name="monitoring" size={20} className="text-cyan-400" />
        )}
        <div className="text-xs font-medium leading-relaxed">
          {feedbackTip}
        </div>
      </div>

      {/* Joint Angle Telemetry Gauges */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Google_Icon name="explore" size={16} className="text-cyan-400" />
          การวัดองศาข้อต่อตามกติกา IFAB
        </div>

        {/* Right Arm Elevation */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-400">องศาการยกแขน (Arm Elevation)</span>
            <span className="font-mono font-bold text-cyan-400">
              {angles.rElevationAngle}° / {targetRule.targetElevationDeg}°
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full transition-all duration-200"
              style={{
                width: `${Math.min(
                  100,
                  (angles.rElevationAngle / targetRule.targetElevationDeg) * 100
                )}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0° (แนบลำตัว)</span>
            <span>เกณฑ์ผ่าน: {targetRule.minElevationDeg}°+</span>
            <span>180° (ชูตรง)</span>
          </div>
        </div>

        {/* Elbow Straightness */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-400">ความเหยียดตรงของข้อศอก</span>
            <span className="font-mono font-bold text-emerald-400">
              {angles.rElbowAngle}° / 180°
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-200 ${
                angles.rElbowAngle >= targetRule.minStraightnessDeg
                  ? "bg-emerald-400"
                  : "bg-amber-400"
              }`}
              style={{
                width: `${Math.min(100, (angles.rElbowAngle / 180) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>90° (งอศอก)</span>
            <span>เกณฑ์ตรง: {targetRule.minStraightnessDeg}°+</span>
            <span>180° (เหยียดตรง)</span>
          </div>
        </div>
      </div>

      {/* Practice Streak & Stats Footer */}
      <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Google_Icon name="bolt" size={16} className="text-amber-400" filled />
          <span>ต่อเนื่อง: <b className="text-slate-200">{streakCount} ครั้ง</b></span>
        </div>
        <div>
          <span>ฝึกไปแล้ว: <b className="text-slate-200">{totalAttempts} รอบ</b></span>
        </div>
      </div>
    </div>
  );
};
