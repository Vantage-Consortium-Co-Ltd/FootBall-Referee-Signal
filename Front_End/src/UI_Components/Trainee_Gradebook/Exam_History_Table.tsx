"use client";

import React from "react";
import { ExamSessionHistoryItem } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

export interface ExamHistoryTableProps {
  history: ExamSessionHistoryItem[];
  isLightMode: boolean;
  onInspectSession: (session: ExamSessionHistoryItem) => void;
}

export const Exam_History_Table: React.FC<ExamHistoryTableProps> = ({
  history,
  isLightMode,
  onInspectSession,
}) => {
  return (
    <div
      className={`rounded-[22px] border shadow-xs overflow-hidden ${
        isLightMode
          ? "apple-material-light border-black/[0.06] text-[#1D1D1F]"
          : "apple-material-dark border-white/[0.08] text-[#F5F5F7]"
      }`}
    >
      {/* Header */}
      <div
        className={`px-5 py-4 border-b flex items-center justify-between ${
          isLightMode ? "border-black/[0.06]" : "border-white/[0.08]"
        }`}
      >
        <div className="flex items-center gap-2">
          <Google_Icon
            name="quiz"
            size={18}
            className={isLightMode ? "text-[#007AFF]" : "text-[#0A84FF]"}
          />
          <h2 className="text-sm font-bold tracking-tight">
            ประวัติผลการประเมินล่าสุด (Recent Assessment Sessions)
          </h2>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold apple-tabular ${
            isLightMode
              ? "bg-[#F2F2F7] border-black/[0.06] text-[#6E6E73]"
              : "bg-[#2C2C2E] border-white/[0.08] text-[#A1A1A6]"
          }`}
        >
          {history.length} รายการล่าสุด
        </span>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead
            className={
              isLightMode
                ? "bg-[#F2F2F7]/80 text-[#6E6E73] border-b border-black/[0.06]"
                : "bg-[#141416] text-[#A1A1A6] border-b border-white/[0.08]"
            }
          >
            <tr>
              <th className="py-3 px-4 font-semibold">รหัสเซสชัน</th>
              <th className="py-3 px-4 font-semibold">วันที่ - เวลา</th>
              <th className="py-3 px-4 font-semibold">ชุดแบบฝึก / ข้อสอบ</th>
              <th className="py-3 px-4 font-semibold">คะแนน</th>
              <th className="py-3 px-4 font-semibold">เวลาตอบสนอง</th>
              <th className="py-3 px-4 font-semibold">ผลประเมิน</th>
              <th className="py-3 px-4 font-semibold text-right">การกระทำ</th>
            </tr>
          </thead>

          <tbody
            className={`divide-y ${
              isLightMode ? "divide-black/[0.05]" : "divide-white/[0.06]"
            }`}
          >
            {history.map((item) => {
              const gradeText =
                item.postureAccuracy >= 92
                  ? "ผ่าน (A+)"
                  : item.passed
                  ? "ผ่าน (A)"
                  : "ปรับปรุง (C)";

              return (
                <tr
                  key={item.sessionId}
                  className={
                    isLightMode
                      ? "hover:bg-[#F2F2F7]/70 transition-colors"
                      : "hover:bg-white/[0.03] transition-colors"
                  }
                >
                  <td className="py-3.5 px-4 font-mono font-semibold apple-tabular">
                    {item.sessionId}
                  </td>
                  <td
                    className={`py-3.5 px-4 apple-tabular ${
                      isLightMode ? "text-[#6E6E73]" : "text-[#A1A1A6]"
                    }`}
                  >
                    {item.date}
                  </td>
                  <td className="py-3.5 px-4 font-semibold">
                    {item.examTitleTh}
                  </td>
                  <td
                    className={`py-3.5 px-4 font-mono font-bold apple-tabular ${
                      isLightMode ? "text-[#007AFF]" : "text-[#0A84FF]"
                    }`}
                  >
                    {item.postureAccuracy} / 100
                  </td>
                  <td className="py-3.5 px-4 font-mono apple-tabular">
                    {item.reactionLatencySeconds.toFixed(2)}s
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${
                        item.passed
                          ? isLightMode
                            ? "bg-[#34C759]/12 border-[#34C759]/25 text-[#248A3D]"
                            : "bg-[#30D158]/15 border-[#30D158]/30 text-[#30D158]"
                          : isLightMode
                          ? "bg-[#FF9500]/12 border-[#FF9500]/25 text-[#B25000]"
                          : "bg-[#FF9F0A]/15 border-[#FF9F0A]/30 text-[#FF9F0A]"
                      }`}
                    >
                      <Google_Icon
                        name={item.passed ? "check_circle" : "warning"}
                        size={12}
                      />
                      <span>{gradeText}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        triggerCausalFeedback("snap");
                        onInspectSession(item);
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-colors duration-150 apple-pressable ${
                        isLightMode
                          ? "bg-white border-black/[0.08] hover:border-[#007AFF] text-[#1D1D1F] hover:text-[#007AFF]"
                          : "bg-[#2C2C2E] border-white/[0.1] hover:border-[#0A84FF] text-[#F5F5F7] hover:text-[#0A84FF]"
                      }`}
                    >
                      ดูผลตรวจ
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
