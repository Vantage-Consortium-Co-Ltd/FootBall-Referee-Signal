"use client";

import React from "react";
import {
  ExamSessionHistoryItem,
  TraineeEvaluationReport,
} from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";

export interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: TraineeEvaluationReport;
  focusedSession?: ExamSessionHistoryItem | null;
}

export const Certificate_Preview_Modal: React.FC<CertificatePreviewModalProps> = ({
  isOpen,
  onClose,
  report,
  focusedSession = null,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Controls */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Google_Icon
              name="workspace_premium"
              size={20}
              className="text-cyan-700"
            />
            <span className="text-sm font-bold text-slate-800">
              {focusedSession
                ? `รายงานผลเซสชัน ${focusedSession.sessionId}`
                : "ใบรับรองผลการฝึกอบรมผู้ตัดสิน (IFAB Academy Certificate)"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition"
            aria-label="ปิดหน้าต่าง"
          >
            <Google_Icon name="close" size={18} />
          </button>
        </div>

        {/* Certificate Body */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Outer Decorative Certificate Frame */}
          <div className="border-2 border-cyan-700/30 rounded-xl p-6 bg-gradient-to-br from-slate-50 to-cyan-50/40 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-700">
                  IFAB REFEREE TRAINING ACADEMY · OFFICIAL RECORD
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  {report.traineeName}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  รหัสประจำตัวผู้เรียน: {report.traineeCode} · {report.classTierTh}
                </div>
              </div>

              <div className="text-center px-4 py-2 rounded-xl bg-cyan-700 text-white shadow-sm">
                <div className="text-[10px] uppercase opacity-80">ผลการประเมินรวม</div>
                <div className="text-2xl font-extrabold font-mono">
                  เกรด {report.overallGrade}
                </div>
              </div>
            </div>

            {focusedSession ? (
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
                <div className="font-bold text-slate-800 text-sm">
                  {focusedSession.examTitleTh}
                </div>
                <div className="text-slate-500">วันที่ทดสอบ: {focusedSession.date}</div>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-500">คะแนนสรีระ</div>
                    <div className="text-lg font-extrabold font-mono text-cyan-700">
                      {focusedSession.postureAccuracy}/100
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-500">Reaction Time</div>
                    <div className="text-lg font-extrabold font-mono text-slate-800">
                      {focusedSession.reactionLatencySeconds.toFixed(2)}s
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-500">จำนวนข้อผ่าน</div>
                    <div className="text-lg font-extrabold font-mono text-emerald-700">
                      {focusedSession.passedCount}/{focusedSession.totalQuestions}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* 4-Category Competency Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <div className="text-[11px] text-slate-500">ลูกตั้งเตะ</div>
                    <div className="text-lg font-extrabold font-mono text-cyan-700">
                      {report.categoryCompetency.restarts}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <div className="text-[11px] text-slate-500">การทำฟาวล์</div>
                    <div className="text-lg font-extrabold font-mono text-emerald-700">
                      {report.categoryCompetency.fouls}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <div className="text-[11px] text-slate-500">ควบคุมเกม</div>
                    <div className="text-lg font-extrabold font-mono text-amber-700">
                      {report.categoryCompetency.match_control}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <div className="text-[11px] text-slate-500">การล้ำหน้า</div>
                    <div className="text-lg font-extrabold font-mono text-blue-700">
                      {report.categoryCompetency.offside}%
                    </div>
                  </div>
                </div>

                {/* Instructor Endorsement Notes */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1.5">
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Google_Icon name="school" size={16} className="text-cyan-700" />
                    <span>ความเห็นจากคณะวิทยากรผู้ตัดสิน (Instructor Assessment Notes)</span>
                  </div>
                  <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1 leading-relaxed">
                    {report.instructorNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2">
              <span>เลขที่เอกสาร: {report.reportId}</span>
              <span>ออกเมื่อวันที่ {report.evaluationDate}</span>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Google_Icon name="print" size={16} />
              <span>พิมพ์ / บันทึก PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
