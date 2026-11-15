"use client";

import React from "react";
import { TraineeEvaluationReport } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";

export interface TraineeMetricCardsProps {
  report: TraineeEvaluationReport;
  isLightMode: boolean;
}

export const Trainee_Metric_Cards: React.FC<TraineeMetricCardsProps> = ({
  report,
  isLightMode,
}) => {
  const passRatePct =
    report.completedPacks > 0
      ? ((report.passedPacks / report.completedPacks) * 100).toFixed(1)
      : "0.0";

  const cards = [
    {
      label: "ความแม่นยำรวม (Overall Accuracy)",
      value: `${report.overallPostureAccuracy}%`,
      subtext: report.accuracyTrendDelta,
      icon: "monitoring",
      lightBox: "bg-cyan-50 text-cyan-700 border-cyan-100",
      darkBox: "bg-cyan-950/60 text-cyan-400 border-cyan-500/30",
      subColor: isLightMode ? "text-emerald-700" : "text-emerald-400",
    },
    {
      label: "ชุดข้อสอบที่ผ่าน (Passed)",
      value: `${report.passedPacks} / ${report.completedPacks}`,
      subtext: `อัตราผ่าน ${passRatePct}%`,
      icon: "quiz",
      lightBox: "bg-emerald-50 text-emerald-700 border-emerald-100",
      darkBox: "bg-emerald-950/60 text-emerald-400 border-emerald-500/30",
      subColor: isLightMode ? "text-slate-600" : "text-slate-400",
    },
    {
      label: "เวลาตอบสนองเฉลี่ย (Reaction)",
      value: `${report.averageReactionSeconds}s`,
      subtext: "เร็วกว่าเกณฑ์มาตรฐาน 0.65s",
      icon: "speed",
      lightBox: "bg-sky-50 text-sky-700 border-sky-100",
      darkBox: "bg-blue-950/60 text-blue-400 border-blue-500/30",
      subColor: isLightMode ? "text-emerald-700" : "text-emerald-400",
    },
    {
      label: "ระดับสมรรถนะ (Competency)",
      value: `เกรด ${report.overallGrade}`,
      subtext: `${report.classTierTh} · พร้อมสอบภาคสนาม`,
      icon: "school",
      lightBox: "bg-violet-50 text-violet-700 border-violet-100",
      darkBox: "bg-violet-950/60 text-violet-400 border-violet-500/30",
      subColor: isLightMode ? "text-slate-600" : "text-slate-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-2xl border p-4 shadow-xs flex items-start gap-3.5 ${
            isLightMode
              ? "bg-white border-slate-200"
              : "bg-slate-900 border-slate-800"
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl border shrink-0 flex items-center justify-center ${
              isLightMode ? c.lightBox : c.darkBox
            }`}
          >
            <Google_Icon name={c.icon} size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <div
              className={`text-[11px] font-medium truncate ${
                isLightMode ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {c.label}
            </div>
            <div
              className={`text-2xl font-extrabold font-mono mt-0.5 ${
                isLightMode ? "text-slate-900" : "text-slate-100"
              }`}
            >
              {c.value}
            </div>
            <div className={`text-[11px] font-medium mt-1 ${c.subColor}`}>
              {c.subtext}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
