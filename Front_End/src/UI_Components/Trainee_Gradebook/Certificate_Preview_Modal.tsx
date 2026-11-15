"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ExamSessionHistoryItem,
  TraineeEvaluationReport,
} from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";
import {
  createVelocityTracker,
  projectMomentum,
  rubberband,
  triggerCausalFeedback,
  useAppleSpring,
} from "../../Core_Lib/Apple_Spring_Engine";

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
  const [dragTargetY, setDragTargetY] = useState(0);
  const dragStartYRef = useRef<number | null>(null);
  const dragStartOffsetRef = useRef(0);
  const velocityTrackerRef = useRef(createVelocityTracker());

  const openSpring = useAppleSpring(isOpen ? 1 : 0, {
    dampingRatio: 1.0,
    response: 0.34,
  });

  const dragSpring = useAppleSpring(dragTargetY, {
    dampingRatio: 0.82,
    response: 0.32,
  });

  useEffect(() => {
    if (isOpen) {
      dragStartYRef.current = null;
      setDragTargetY(0);
      dragSpring.setImmediate(0);
    }
    // Reset vertical drag offset whenever the modal re-opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        triggerCausalFeedback("tap");
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen && openSpring.value <= 0.02) return null;

  const progress = Math.max(0, Math.min(1, openSpring.value));
  const scale = 0.94 + 0.06 * progress;
  const materializeY = (1 - progress) * 28;
  const totalY = materializeY + dragSpring.value;
  const dismissFade = Math.max(0.25, 1 - Math.max(0, dragSpring.value) / 420);

  const handleClose = () => {
    triggerCausalFeedback("tap");
    onClose();
  };

  const handlePrint = () => {
    triggerCausalFeedback("tap");
    window.print();
  };

  const handleGrabDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartYRef.current = e.clientY;
    dragStartOffsetRef.current = dragSpring.value;
    velocityTrackerRef.current.reset();
    velocityTrackerRef.current.push(dragSpring.value);
    dragSpring.setImmediate(dragSpring.value);
    triggerCausalFeedback("tap");
  };

  const handleGrabMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return;
    const rawY = dragStartOffsetRef.current + (e.clientY - dragStartYRef.current);
    const trackedY = rawY < 0 ? -rubberband(-rawY, 64, 0.38) : rawY;
    velocityTrackerRef.current.push(trackedY);
    dragSpring.setImmediate(trackedY);
    setDragTargetY(trackedY);
  };

  const handleGrabEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const vy = velocityTrackerRef.current.getVelocity();
    const projectedY = dragSpring.value + projectMomentum(vy, 0.995);
    dragStartYRef.current = null;

    if (projectedY > 120) {
      triggerCausalFeedback("snap");
      setDragTargetY(dragSpring.value + 160);
      dragSpring.injectVelocity(vy * 0.4);
      onClose();
      return;
    }

    setDragTargetY(0);
    dragSpring.injectVelocity(vy * 0.35);
    triggerCausalFeedback("snap");
  };

  return (
    <div
      style={{
        opacity: progress * dismissFade,
        backdropFilter: `blur(${(progress * 12).toFixed(1)}px)`,
        WebkitBackdropFilter: `blur(${(progress * 12).toFixed(1)}px)`,
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      onClick={handleClose}
    >
      <div
        style={{
          transform: `translate3d(0, ${totalY.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`,
          filter: progress < 0.99 ? `blur(${((1 - progress) * 4).toFixed(2)}px)` : undefined,
        }}
        className="w-full max-w-2xl bg-white text-[#1D1D1F] rounded-[24px] border border-black/[0.08] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag-to-Dismiss Grabber Pill */}
        <div
          onPointerDown={handleGrabDown}
          onPointerMove={handleGrabMove}
          onPointerUp={handleGrabEnd}
          onPointerCancel={handleGrabEnd}
          className="bg-[#F5F5F7]/90 touch-none cursor-grab active:cursor-grabbing pt-2.5 pb-1 flex items-center justify-center"
          title="ปัดลงเพื่อปิดหน้าต่าง"
        >
          <span className="w-11 h-1 rounded-full bg-black/15" />
        </div>

        {/* Top Modal Controls */}
        <div className="px-6 py-3.5 bg-[#F5F5F7]/90 border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Google_Icon
              name="workspace_premium"
              size={20}
              className="text-[#007AFF]"
            />
            <span className="text-sm font-bold text-[#1D1D1F] tracking-tight">
              {focusedSession
                ? `รายงานผลเซสชัน ${focusedSession.sessionId}`
                : "ใบรับรองผลการฝึกอบรมผู้ตัดสิน (IFAB Academy Certificate)"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-black/[0.06] transition-colors apple-pressable"
            aria-label="ปิดหน้าต่าง"
          >
            <Google_Icon name="close" size={18} />
          </button>
        </div>

        {/* Certificate Body */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Outer Decorative Certificate Frame */}
          <div className="border border-[#007AFF]/20 rounded-2xl p-6 bg-gradient-to-br from-[#F5F5F7] via-white to-[#007AFF]/[0.06] space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-black/[0.08] pb-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#007AFF]">
                  IFAB REFEREE TRAINING ACADEMY · OFFICIAL RECORD
                </div>
                <h3 className="apple-title text-xl font-bold text-[#1D1D1F] mt-1 tracking-tight">
                  {report.traineeName}
                </h3>
                <div className="text-xs text-[#6E6E73] mt-0.5 apple-tabular">
                  รหัสประจำตัวผู้เรียน: {report.traineeCode} · {report.classTierTh}
                </div>
              </div>

              <div className="text-center px-4 py-2 rounded-2xl bg-[#007AFF] text-white shadow-sm">
                <div className="text-[10px] uppercase opacity-85">ผลการประเมินรวม</div>
                <div className="text-2xl font-bold font-mono apple-tabular">
                  เกรด {report.overallGrade}
                </div>
              </div>
            </div>

            {focusedSession ? (
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4 space-y-2 text-xs">
                <div className="font-bold text-[#1D1D1F] text-sm">
                  {focusedSession.examTitleTh}
                </div>
                <div className="text-[#6E6E73] apple-tabular">วันที่ทดสอบ: {focusedSession.date}</div>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-2.5 rounded-xl bg-[#F2F2F7] border border-black/[0.04]">
                    <div className="text-[#6E6E73]">คะแนนสรีระ</div>
                    <div className="text-lg font-bold font-mono apple-tabular text-[#007AFF]">
                      {focusedSession.postureAccuracy}/100
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F2F2F7] border border-black/[0.04]">
                    <div className="text-[#6E6E73]">Reaction Time</div>
                    <div className="text-lg font-bold font-mono apple-tabular text-[#1D1D1F]">
                      {focusedSession.reactionLatencySeconds.toFixed(2)}s
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F2F2F7] border border-black/[0.04]">
                    <div className="text-[#6E6E73]">จำนวนข้อผ่าน</div>
                    <div className="text-lg font-bold font-mono apple-tabular text-[#248A3D]">
                      {focusedSession.passedCount}/{focusedSession.totalQuestions}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* 4-Category Competency Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-2xl bg-white border border-black/[0.06]">
                    <div className="text-[11px] text-[#6E6E73]">ลูกตั้งเตะ</div>
                    <div className="text-lg font-bold font-mono apple-tabular text-[#007AFF]">
                      {report.categoryCompetency.restarts}%
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-black/[0.06]">
                    <div className="text-[11px] text-[#6E6E73]">การทำฟาวล์</div>
                    <div className="text-lg font-bold font-mono apple-tabular text-[#248A3D]">
                      {report.categoryCompetency.fouls}%
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-black/[0.06]">
                    <div className="text-[11px] text-[#6E6E73]">ควบคุมเกม</div>
                    <div className="text-lg font-bold font-mono apple-tabular text-[#B25000]">
                      {report.categoryCompetency.match_control}%
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-black/[0.06]">
                    <div className="text-[11px] text-[#6E6E73]">การล้ำหน้า</div>
                    <div className="text-lg font-bold font-mono apple-tabular text-[#5856D6]">
                      {report.categoryCompetency.offside}%
                    </div>
                  </div>
                </div>

                {/* Instructor Endorsement Notes */}
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 space-y-1.5">
                  <div className="text-xs font-bold text-[#1D1D1F] flex items-center gap-1.5">
                    <Google_Icon name="school" size={16} className="text-[#007AFF]" />
                    <span>ความเห็นจากคณะวิทยากรผู้ตัดสิน (Instructor Assessment Notes)</span>
                  </div>
                  <ul className="list-disc pl-5 text-xs text-[#3A3A3C] space-y-1 leading-relaxed">
                    {report.instructorNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <div className="flex items-center justify-between text-[11px] text-[#6E6E73] pt-2 apple-tabular">
              <span>เลขที่เอกสาร: {report.reportId}</span>
              <span>ออกเมื่อวันที่ {report.evaluationDate}</span>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl border border-black/[0.1] bg-[#F2F2F7] text-xs font-semibold text-[#1D1D1F] hover:bg-[#E5E5EA] transition-colors apple-pressable"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs apple-pressable"
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
