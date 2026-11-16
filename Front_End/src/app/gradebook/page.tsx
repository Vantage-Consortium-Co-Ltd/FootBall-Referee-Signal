"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ExamSessionHistoryItem,
  TraineeEvaluationReport,
} from "../../Data_Types/Referee_Types";
import {
  SESSIONS_UPDATED_EVENT,
  clearAllSessions,
  computeTraineeEvaluationReport,
} from "../../Core_Lib/Session_Store";
import {
  Certificate_Preview_Modal,
  Competency_Radar_Chart,
  Exam_History_Table,
  Trainee_Metric_Cards,
  Weakness_Diagnostics_Panel,
} from "../../UI_Components/Trainee_Gradebook";
import { Google_Icon } from "../../UI_Components/Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

const EMPTY_REPORT_SSR: TraineeEvaluationReport = {
  reportId: "GRD-LIVE-INIT",
  traineeName: "ผู้ตัดสินฝึกหัด (Active Session)",
  traineeCode: "LIVE-MODEL-2026",
  classTierTh: "YOLO26n-pose Real Assessment",
  evaluationDate: "-",
  overallPostureAccuracy: 0,
  accuracyTrendDelta: "กำลังโหลดข้อมูลเซสชัน...",
  completedPacks: 0,
  passedPacks: 0,
  averageReactionSeconds: 0,
  overallGrade: "D",
  categoryCompetency: {
    restarts: 0,
    fouls: 0,
    match_control: 0,
    offside: 0,
  },
  weaknessDiagnostics: [],
  examHistory: [],
  instructorNotes: [],
};

export default function GradebookPage() {
  const [report, setReport] = useState<TraineeEvaluationReport>(EMPTY_REPORT_SSR);
  const [isLightMode, setIsLightMode] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [focusedSession, setFocusedSession] =
    useState<ExamSessionHistoryItem | null>(null);

  useEffect(() => {
    const sync = () => {
      setReport(computeTraineeEvaluationReport());
    };
    sync();
    window.addEventListener(SESSIONS_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SESSIONS_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const openFullCertificate = () => {
    setFocusedSession(null);
    setModalOpen(true);
  };

  const openSessionInspection = (session: ExamSessionHistoryItem) => {
    setFocusedSession(session);
    setModalOpen(true);
  };

  const handleClearHistory = () => {
    triggerCausalFeedback("warning");
    clearAllSessions();
    setReport(computeTraineeEvaluationReport());
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 p-4 md:p-8 ${
        isLightMode ? "bg-[#F5F5F7] text-[#1D1D1F]" : "bg-black text-[#F5F5F7]"
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Page Header Bar */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start md:items-center gap-3">
            <Link
              href="/"
              onClick={() => triggerCausalFeedback("tap")}
              className={`w-10 h-10 rounded-xl border transition-colors duration-150 inline-flex items-center justify-center apple-pressable ${
                isLightMode
                  ? "bg-white border-black/[0.08] hover:bg-[#F2F2F7] text-[#1D1D1F] shadow-xs"
                  : "bg-[#1C1C1E] border-white/[0.1] hover:bg-[#2C2C2E] text-[#A1A1A6] hover:text-[#F5F5F7]"
              }`}
            >
              <Google_Icon name="arrow_back" size={20} />
            </Link>
            <div>
              <h1
                className={`apple-title text-xl md:text-2xl font-bold tracking-tight ${
                  isLightMode ? "text-[#1D1D1F]" : "text-[#F5F5F7]"
                }`}
              >
                สมุดบันทึกผลการประเมินผู้เรียน (Trainee Gradebook)
              </h1>
              <p
                className={`text-xs mt-0.5 apple-tabular ${
                  isLightMode ? "text-[#6E6E73]" : "text-[#A1A1A6]"
                }`}
              >
                สถิติการฝึกภาคปฏิบัติและผลสอบจริงตามเกณฑ์ IFAB ·{" "}
                {report.traineeName} ({report.traineeCode}) · {report.classTierTh}
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {report.completedPacks > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors duration-150 apple-pressable ${
                  isLightMode
                    ? "bg-white border-[#FF3B30]/30 hover:bg-[#FF3B30]/10 text-[#FF3B30] shadow-xs"
                    : "bg-[#1C1C1E] border-[#FF453A]/35 hover:bg-[#FF453A]/15 text-[#FF453A]"
                }`}
              >
                <Google_Icon name="close" size={15} />
                <span>ล้างประวัติการฝึก/สอบ</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                triggerCausalFeedback("tap");
                setIsLightMode((prev) => !prev);
              }}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors duration-150 apple-pressable ${
                isLightMode
                  ? "bg-white border-black/[0.08] hover:bg-[#F2F2F7] text-[#1D1D1F] shadow-xs"
                  : "bg-[#1C1C1E] border-white/[0.1] hover:bg-[#2C2C2E] text-[#F5F5F7]"
              }`}
            >
              <Google_Icon
                name={isLightMode ? "dark_mode" : "light_mode"}
                size={15}
                className={isLightMode ? "text-[#6E6E73]" : "text-[#FF9F0A]"}
              />
              <span>{isLightMode ? "โหมดมืด" : "โหมดสว่าง"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerCausalFeedback("tap");
                openFullCertificate();
              }}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors duration-150 apple-pressable ${
                isLightMode
                  ? "bg-white border-black/[0.08] hover:bg-[#F2F2F7] text-[#1D1D1F] shadow-xs"
                  : "bg-[#1C1C1E] border-white/[0.1] hover:bg-[#2C2C2E] text-[#F5F5F7]"
              }`}
            >
              <Google_Icon name="download" size={16} />
              <span>ดาวน์โหลด PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerCausalFeedback("tap");
                openFullCertificate();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors duration-150 shadow-sm apple-pressable ${
                isLightMode
                  ? "bg-[#007AFF] hover:bg-[#0066D6] text-white"
                  : "bg-[#0A84FF] hover:bg-[#3395FF] text-white"
              }`}
            >
              <Google_Icon name="school" size={16} />
              <span>ดูใบรับรองผล</span>
            </button>
          </div>
        </header>

        {/* Row 1: 4 KPI Stat Cards */}
        <Trainee_Metric_Cards report={report} isLightMode={isLightMode} />

        {/* Row 2: Radar Chart + Weakness Action Plan */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-6">
            <Competency_Radar_Chart
              competency={report.categoryCompetency}
              isLightMode={isLightMode}
            />
          </div>
          <div className="lg:col-span-6">
            <Weakness_Diagnostics_Panel
              weaknesses={report.weaknessDiagnostics}
              isLightMode={isLightMode}
            />
          </div>
        </div>

        {/* Row 3: Exam & Practice Session History Table */}
        <Exam_History_Table
          history={report.examHistory}
          isLightMode={isLightMode}
          onInspectSession={openSessionInspection}
        />
      </div>

      {/* Certificate / Session Inspection Modal */}
      <Certificate_Preview_Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        report={report}
        focusedSession={focusedSession}
      />
    </div>
  );
}
