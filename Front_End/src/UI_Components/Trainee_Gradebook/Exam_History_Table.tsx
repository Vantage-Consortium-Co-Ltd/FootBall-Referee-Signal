"use client";

import React from "react";
import { ExamSessionHistoryItem } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";

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
      className={`rounded-2xl border shadow-xs overflow-hidden ${
        isLightMode
          ? "bg-white border-slate-200 text-slate-900"
          : "bg-slate-900 border-slate-800 text-slate-100"
      }`}
    >
      {/* Header */}
      <div
        className={`px-5 py-4 border-b flex items-center justify-between ${
          isLightMode ? "border-slate-200" : "border-slate-800"
        }`}
      >
        <div className="flex items-center gap-2">
          <Google_Icon
            name="quiz"
            size={18}
            className={isLightMode ? "text-cyan-700" : "text-cyan-400"}
          />
          <h2 className="text-sm font-bold">
            ประวัติผลการประเมินล่าสุด (Recent Assessment Sessions)
          </h2>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${
            isLightMode
              ? "bg-slate-100 border-slate-200 text-slate-600"
              : "bg-slate-800 border-slate-700 text-slate-300"
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
                ? "bg-slate-50 text-slate-500 border-b border-slate-200"
                : "bg-slate-950/60 text-slate-400 border-b border-slate-800"
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
              isLightMode ? "divide-slate-100" : "divide-slate-800/80"
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
                      ? "hover:bg-slate-50/80 transition"
                      : "hover:bg-slate-950/40 transition"
                  }
                >
                  <td className="py-3.5 px-4 font-mono font-semibold">
                    {item.sessionId}
                  </td>
                  <td
                    className={`py-3.5 px-4 ${
                      isLightMode ? "text-slate-600" : "text-slate-400"
                    }`}
                  >
                    {item.date}
                  </td>
                  <td className="py-3.5 px-4 font-semibold">
                    {item.examTitleTh}
                  </td>
                  <td
                    className={`py-3.5 px-4 font-mono font-bold ${
                      isLightMode ? "text-cyan-700" : "text-cyan-400"
                    }`}
                  >
                    {item.postureAccuracy} / 100
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {item.reactionLatencySeconds.toFixed(2)}s
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${
                        item.passed
                          ? isLightMode
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                          : isLightMode
                          ? "bg-amber-50 border-amber-200 text-amber-800"
                          : "bg-amber-950/50 border-amber-500/40 text-amber-300"
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
                      onClick={() => onInspectSession(item)}
                      className={`px-3 py-1 rounded-lg border text-[11px] font-semibold transition ${
                        isLightMode
                          ? "bg-white border-slate-200 hover:border-cyan-600 text-slate-700 hover:text-cyan-800"
                          : "bg-slate-800 border-slate-700 hover:border-cyan-400 text-slate-200"
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
