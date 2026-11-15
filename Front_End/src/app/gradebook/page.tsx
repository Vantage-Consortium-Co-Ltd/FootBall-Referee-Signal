"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ExamSessionHistoryItem } from "../../Data_Types/Referee_Types";
import { generateMockTraineeEvaluationReport } from "../../Core_Lib/Microservices_Mock";
import {
  Certificate_Preview_Modal,
  Competency_Radar_Chart,
  Exam_History_Table,
  Trainee_Metric_Cards,
  Weakness_Diagnostics_Panel,
} from "../../UI_Components/Trainee_Gradebook";
import { Google_Icon } from "../../UI_Components/Common/Google_Icon";

export default function GradebookPage() {
  const report = useMemo(() => generateMockTraineeEvaluationReport(), []);
  const [isLightMode, setIsLightMode] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [focusedSession, setFocusedSession] =
    useState<ExamSessionHistoryItem | null>(null);

  const openFullCertificate = () => {
    setFocusedSession(null);
    setModalOpen(true);
  };

  const openSessionInspection = (session: ExamSessionHistoryItem) => {
    setFocusedSession(session);
    setModalOpen(true);
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 p-4 md:p-8 ${
        isLightMode ? "bg-[#F9FAFB] text-slate-900" : "bg-slate-950 text-slate-100"
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Page Header Bar matching FigCraft Screen 4 */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start md:items-center gap-3">
            <Link
              href="/"
              className={`p-2 rounded-xl border transition inline-flex items-center justify-center ${
                isLightMode
                  ? "bg-white border-slate-200 hover:border-slate-300 text-slate-600 shadow-xs"
                  : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Google_Icon name="arrow_back" size={20} />
            </Link>
            <div>
              <h1
                className={`text-xl md:text-2xl font-extrabold tracking-tight ${
                  isLightMode ? "text-slate-900" : "text-slate-100"
                }`}
              >
                สมุดบันทึกผลการประเมินผู้เรียน (Trainee Gradebook)
              </h1>
              <p
                className={`text-xs mt-0.5 ${
                  isLightMode ? "text-slate-500" : "text-slate-400"
                }`}
              >
                สถิติการฝึกภาคปฏิบัติและผลสอบสถานการณ์จำลองตามเกณฑ์ IFAB ·{" "}
                {report.traineeName} ({report.traineeCode}) · {report.classTierTh}
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsLightMode((prev) => !prev)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                isLightMode
                  ? "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                  : "bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200"
              }`}
            >
              <Google_Icon
                name={isLightMode ? "dark_mode" : "light_mode"}
                size={15}
                className={isLightMode ? "text-slate-600" : "text-amber-400"}
              />
              <span>{isLightMode ? "โหมดมืด" : "โหมดสว่าง"}</span>
            </button>

            <button
              type="button"
              onClick={openFullCertificate}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                isLightMode
                  ? "bg-white border-slate-200 hover:bg-slate-100 text-slate-800"
                  : "bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200"
              }`}
            >
              <Google_Icon name="download" size={16} />
              <span>ดาวน์โหลด PDF</span>
            </button>

            <button
              type="button"
              onClick={openFullCertificate}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                isLightMode
                  ? "bg-cyan-700 hover:bg-cyan-800 text-white"
                  : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
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
