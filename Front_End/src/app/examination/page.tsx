"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ExamAttemptResult } from "../../Data_Types/Referee_Types";
import { SCENARIO_EXAM_PACK } from "../../Core_Lib/Ifab_Rules_Catalog";
import { recordExamPackSession } from "../../Core_Lib/Session_Store";
import {
  Exam_Live_Detector,
  Exam_Question_Prompt,
  Exam_Result_Inspector,
  Scenario_Player,
} from "../../UI_Components/Scenario_Exam";
import { Google_Icon } from "../../UI_Components/Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

export default function ExaminationPage() {
  const examPack = SCENARIO_EXAM_PACK;
  const totalQuestions = examPack.questions.length;

  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [isDecisionLocked, setIsDecisionLocked] = useState<boolean>(false);
  const [reactionSeconds, setReactionSeconds] = useState<number>(1.2);
  const [replayTrigger, setReplayTrigger] = useState<number>(0);
  const [results, setResults] = useState<ExamAttemptResult[]>([]);
  const [isExamFinished, setIsExamFinished] = useState<boolean>(false);

  // Exam pack countdown clock (5 minutes = 300s)
  const [packSecondsLeft, setPackSecondsLeft] = useState<number>(300);

  useEffect(() => {
    if (isExamFinished) return;
    const timer = window.setInterval(() => {
      setPackSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isExamFinished]);

  const currentQuestion = examPack.questions[questionIndex];
  const currentResult =
    results.find((r) => r.questionId === currentQuestion.id) || null;

  const progressPct = Math.round(((questionIndex + (currentResult ? 1 : 0)) / totalQuestions) * 100);
  const mins = String(Math.floor(packSecondsLeft / 60)).padStart(2, "0");
  const secs = String(packSecondsLeft % 60).padStart(2, "0");

  const handleConfirmDecision = (elapsedDecisionSec: number) => {
    setReactionSeconds(elapsedDecisionSec);
    setIsDecisionLocked(true);
  };

  const handleSubmitAttempt = (attempt: ExamAttemptResult) => {
    setResults((prev) => [
      ...prev.filter((item) => item.questionId !== attempt.questionId),
      attempt,
    ]);
  };

  const handleNextQuestion = () => {
    if (questionIndex + 1 >= totalQuestions) {
      recordExamPackSession({ pack: examPack, results });
      setIsExamFinished(true);
      return;
    }
    setQuestionIndex((prev) => prev + 1);
    setSelectedOptionId(null);
    setIsDecisionLocked(false);
    setReactionSeconds(1.2);
  };

  const handleRestartExam = () => {
    setQuestionIndex(0);
    setSelectedOptionId(null);
    setIsDecisionLocked(false);
    setReactionSeconds(1.2);
    setResults([]);
    setIsExamFinished(false);
    setPackSecondsLeft(300);
    setReplayTrigger((prev) => prev + 1);
  };

  // Summary Stats
  const avgScore =
    results.length > 0
      ? (
          results.reduce((sum, r) => sum + r.totalQuestionScore, 0) /
          results.length
        ).toFixed(1)
      : "0.0";
  const avgReaction =
    results.length > 0
      ? (
          results.reduce((sum, r) => sum + r.reactionTimeSeconds, 0) /
          results.length
        ).toFixed(2)
      : "0.00";
  const passedCount = results.filter((r) => r.passed).length;

  return (
    <div className="min-h-screen bg-black text-[#F5F5F7] p-4 md:p-8">
      {/* Page Title Bar */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            onPointerDown={() => triggerCausalFeedback("tap")}
            className="p-2.5 rounded-2xl bg-[#1C1C1E] border border-white/[0.1] hover:bg-[#2C2C2E] text-[#A1A1A6] hover:text-[#F5F5F7] apple-pressable inline-flex items-center justify-center"
          >
            <Google_Icon name="arrow_back" size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Google_Icon name="quiz" size={22} className="text-[#0A84FF]" />
              <h1 className="text-xl md:text-2xl font-bold apple-title text-[#F5F5F7]">
                ห้องสอบสถานการณ์ (Scenario Examination)
              </h1>
            </div>
            <p className="text-xs text-[#A1A1A6] mt-0.5">
              {examPack.titleTh} · {examPack.levelTh}
            </p>
          </div>
        </div>

        {/* Progress & Timer Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-1.5 rounded-full bg-[#0A84FF]/15 border border-[#0A84FF]/40 text-[#64D2FF] text-xs font-semibold apple-tabular flex items-center gap-1.5">
            <Google_Icon name="quiz" size={14} />
            <span>
              ข้อ {questionIndex + 1} / {totalQuestions} · {progressPct}%
            </span>
          </div>

          <div className="px-3.5 py-1.5 rounded-full bg-[#FF9F0A]/15 border border-[#FF9F0A]/40 text-[#FF9F0A] text-xs font-mono font-semibold apple-tabular flex items-center gap-1.5">
            <Google_Icon name="schedule" size={14} />
            <span>เวลาสอบเหลือ {mins}:{secs}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto mt-6">
        {isExamFinished ? (
          /* Exam Pack Completion Report */
          <div className="apple-material-dark rounded-[24px] p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/[0.08]">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#30D158]/15 border border-[#30D158]/40 text-[#30D158] text-xs font-bold mb-2">
                  <Google_Icon name="emoji_events" size={15} />
                  <span>สอบภาคปฏิบัติครบทั้ง {totalQuestions} สถานการณ์แล้ว</span>
                </div>
                <h2 className="text-2xl font-bold apple-title text-[#F5F5F7]">
                  สรุปผลการประเมินชุดข้อสอบ {examPack.packId}
                </h2>
                <p className="text-xs text-[#A1A1A6] mt-1">
                  บันทึกผลคะแนนลงในสมุดบันทึกผู้เรียน (Trainee Gradebook) เรียบร้อยแล้ว
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onPointerDown={() => triggerCausalFeedback("tap")}
                  onClick={handleRestartExam}
                  className="px-4 py-2.5 rounded-2xl bg-[#2C2C2E] hover:bg-[#3A3A3C] border border-white/[0.1] text-[#F5F5F7] text-xs font-semibold flex items-center gap-2 apple-pressable"
                >
                  <Google_Icon name="replay" size={16} />
                  <span>สอบใหม่อีกครั้ง</span>
                </button>
                <Link
                  href="/gradebook"
                  onPointerDown={() => triggerCausalFeedback("tap")}
                  className="px-4 py-2.5 rounded-2xl bg-[#0A84FF] hover:bg-[#3B9CFF] text-white text-xs font-bold flex items-center gap-2 apple-pressable shadow-lg shadow-[#0A84FF]/25"
                >
                  <Google_Icon name="monitoring" size={16} />
                  <span>ดูสมุดบันทึกผลการประเมิน (Go to Gradebook)</span>
                </Link>
              </div>
            </div>

            {/* 3 KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-4">
                <div className="text-xs text-[#A1A1A6]">คะแนนเฉลี่ยรวม</div>
                <div className="text-3xl font-bold font-mono apple-tabular text-[#30D158] mt-1">
                  {avgScore}{" "}
                  <span className="text-sm font-normal text-[#6E6E73]">/ 100</span>
                </div>
              </div>
              <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-4">
                <div className="text-xs text-[#A1A1A6]">จำนวนข้อที่ผ่านเกณฑ์</div>
                <div className="text-3xl font-bold font-mono apple-tabular text-[#0A84FF] mt-1">
                  {passedCount}{" "}
                  <span className="text-sm font-normal text-[#6E6E73]">
                    / {totalQuestions} ข้อ
                  </span>
                </div>
              </div>
              <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-4">
                <div className="text-xs text-[#A1A1A6]">เวลาตอบสนองเฉลี่ย</div>
                <div className="text-3xl font-bold font-mono apple-tabular text-[#FF9F0A] mt-1">
                  {avgReaction}{" "}
                  <span className="text-sm font-normal text-[#6E6E73]">วินาที</span>
                </div>
              </div>
            </div>

            {/* Question-by-Question Breakdown */}
            <div className="overflow-x-auto border border-white/[0.08] rounded-2xl bg-[#141416]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1C1C1E] text-[#A1A1A6] border-b border-white/[0.08]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">ข้อสอบ</th>
                    <th className="py-3 px-4 font-semibold">คำตัดสิน</th>
                    <th className="py-3 px-4 font-semibold">คะแนนสรีระ</th>
                    <th className="py-3 px-4 font-semibold">Reaction Time</th>
                    <th className="py-3 px-4 font-semibold">คะแนนรวม</th>
                    <th className="py-3 px-4 font-semibold">ผลการประเมิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] apple-tabular">
                  {examPack.questions.map((q) => {
                    const res = results.find((r) => r.questionId === q.id);
                    return (
                      <tr key={q.id} className="hover:bg-[#1C1C1E]/70">
                        <td className="py-3 px-4 font-medium text-[#F5F5F7]">
                          {q.titleTh}
                        </td>
                        <td className="py-3 px-4">
                          {res?.isDecisionCorrect ? (
                            <span className="text-[#30D158] font-semibold">
                              ถูกต้อง (ข้อ {res.selectedOptionId})
                            </span>
                          ) : (
                            <span className="text-[#FF453A] font-semibold">
                              ไม่ถูกต้อง (เฉลย {q.correctOptionId})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#A1A1A6]">
                          {res?.postureScore ?? 0}/100
                        </td>
                        <td className="py-3 px-4 font-mono text-[#A1A1A6]">
                          {res?.reactionTimeSeconds.toFixed(2) ?? "-"}s
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#0A84FF]">
                          {res?.totalQuestionScore ?? 0}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              res?.passed
                                ? "bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/40"
                                : "bg-[#FF453A]/15 text-[#FF453A] border border-[#FF453A]/40"
                            }`}
                          >
                            {res?.passed ? "PASS" : "REVIEW"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Active Question Studio (2-column grid aligned to FigCraft Screen 2) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Scenario Player + Question Prompt */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <Scenario_Player
                question={currentQuestion}
                replayTrigger={replayTrigger}
              />

              <Exam_Question_Prompt
                question={currentQuestion}
                selectedOptionId={selectedOptionId}
                isLocked={isDecisionLocked}
                hasCompletedResult={Boolean(currentResult)}
                onSelectOption={setSelectedOptionId}
                onConfirmDecision={handleConfirmDecision}
              />
            </div>

            {/* Right Column: Live Detector + Result Breakdown */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <Exam_Live_Detector
                question={currentQuestion}
                selectedOptionId={selectedOptionId}
                isDecisionLocked={isDecisionLocked}
                reactionSeconds={reactionSeconds}
                hasCompletedResult={Boolean(currentResult)}
                onSubmitAttempt={handleSubmitAttempt}
              />

              <Exam_Result_Inspector
                question={currentQuestion}
                attemptResult={currentResult}
                questionIndex={questionIndex}
                totalQuestions={totalQuestions}
                onReplayClip={() => setReplayTrigger((prev) => prev + 1)}
                onNextQuestion={handleNextQuestion}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
