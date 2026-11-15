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
      lightBox: "bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/20",
      darkBox: "bg-[#0A84FF]/15 text-[#0A84FF] border-[#0A84FF]/30",
      subColor: isLightMode ? "text-[#248A3D]" : "text-[#30D158]",
    },
    {
      label: "ชุดข้อสอบที่ผ่าน (Passed)",
      value: `${report.passedPacks} / ${report.completedPacks}`,
      subtext: `อัตราผ่าน ${passRatePct}%`,
      icon: "quiz",
      lightBox: "bg-[#34C759]/12 text-[#248A3D] border-[#34C759]/25",
      darkBox: "bg-[#30D158]/15 text-[#30D158] border-[#30D158]/30",
      subColor: isLightMode ? "text-[#6E6E73]" : "text-[#A1A1A6]",
    },
    {
      label: "เวลาตอบสนองเฉลี่ย (Reaction)",
      value: `${report.averageReactionSeconds}s`,
      subtext: "เร็วกว่าเกณฑ์มาตรฐาน 0.65s",
      icon: "speed",
      lightBox: "bg-[#5856D6]/10 text-[#5856D6] border-[#5856D6]/20",
      darkBox: "bg-[#5E5CE6]/15 text-[#5E5CE6] border-[#5E5CE6]/30",
      subColor: isLightMode ? "text-[#248A3D]" : "text-[#30D158]",
    },
    {
      label: "ระดับสมรรถนะ (Competency)",
      value: `เกรด ${report.overallGrade}`,
      subtext: `${report.classTierTh} · พร้อมสอบภาคสนาม`,
      icon: "school",
      lightBox: "bg-[#AF52DE]/10 text-[#AF52DE] border-[#AF52DE]/20",
      darkBox: "bg-[#BF5AF2]/15 text-[#BF5AF2] border-[#BF5AF2]/30",
      subColor: isLightMode ? "text-[#6E6E73]" : "text-[#A1A1A6]",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-[20px] border p-4 shadow-xs flex items-start gap-3.5 ${
            isLightMode
              ? "apple-material-light border-black/[0.06]"
              : "apple-material-dark border-white/[0.08]"
          }`}
        >
          <div
            className={`w-11 h-11 rounded-2xl border shrink-0 flex items-center justify-center ${
              isLightMode ? c.lightBox : c.darkBox
            }`}
          >
            <Google_Icon name={c.icon} size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <div
              className={`text-[11px] font-medium truncate ${
                isLightMode ? "text-[#6E6E73]" : "text-[#A1A1A6]"
              }`}
            >
              {c.label}
            </div>
            <div
              className={`text-2xl font-bold font-mono apple-tabular mt-0.5 ${
                isLightMode ? "text-[#1D1D1F]" : "text-[#F5F5F7]"
              }`}
            >
              {c.value}
            </div>
            <div className={`text-[11px] font-medium mt-1 apple-tabular ${c.subColor}`}>
              {c.subtext}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
