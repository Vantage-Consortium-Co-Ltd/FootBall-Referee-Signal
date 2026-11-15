"use client";

import React from "react";
import {
  ExamAttemptResult,
  GestureRule,
  ScenarioExamQuestion,
} from "../../Data_Types/Referee_Types";
import { MOCK_IFAB_RULES } from "../../Core_Lib/Microservices_Mock";
import { Google_Icon } from "../Common/Google_Icon";

export interface ExamResultInspectorProps {
  question: ScenarioExamQuestion;
  attemptResult: ExamAttemptResult | null;
  questionIndex: number;
  totalQuestions: number;
  onReplayClip: () => void;
  onNextQuestion: () => void;
}

export const Exam_Result_Inspector: React.FC<ExamResultInspectorProps> = ({
  question,
  attemptResult,
  questionIndex,
  totalQuestions,
  onReplayClip,
  onNextQuestion,
}) => {
  const targetRule: GestureRule | undefined = MOCK_IFAB_RULES.find(
    (r) => r.id === question.targetGestureId
  );

  // Before submission: show IFAB Assessment Rubric card
  if (!attemptResult) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Google_Icon name="straighten" size={18} className="text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">
              เกณฑ์การประเมินภาคปฏิบัติ 3 มิติ
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-medium text-slate-300">
            100 คะแนนเต็ม
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <Google_Icon name="quiz" size={16} className="text-cyan-400" />
              <span>1. ความถูกต้องของการตัดสินตามกติกา IFAB</span>
            </div>
            <span className="font-mono font-bold text-cyan-400">40 คะแนน</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <Google_Icon name="straighten" size={16} className="text-emerald-400" />
              <span>2. ความถูกต้องของสรีระและองศาข้อต่อ</span>
            </div>
            <span className="font-mono font-bold text-emerald-400">40 คะแนน</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <Google_Icon name="speed" size={16} className="text-amber-400" />
              <span>3. ความเร็วในการตอบสนอง (Reaction Time)</span>
            </div>
            <span className="font-mono font-bold text-amber-400">20 คะแนน</span>
          </div>
        </div>

        {targetRule && (
          <div className="px-3.5 py-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-cyan-200/90 flex items-start gap-2">
            <Google_Icon name="lightbulb" size={16} className="text-cyan-400 shrink-0 mt-0.5" />
            <span>
              คำแนะนำสนามสอบ: ดูคลิปเหตุการณ์ให้จบ จากนั้นเลือกคำตอบ A–D แล้วกดยืนยันเพื่อแสดงท่าทางค้างไว้อย่างน้อย{" "}
              <b className="text-cyan-300">{targetRule.minHoldSeconds} วินาที</b>
            </span>
          </div>
        )}
      </div>
    );
  }

  const passed = attemptResult.passed;
  const gradeLabel =
    attemptResult.totalQuestionScore >= 90
      ? "เกรด A+ (ยอดเยี่ยม)"
      : attemptResult.totalQuestionScore >= 80
      ? "เกรด A (ดีมาก)"
      : attemptResult.totalQuestionScore >= 75
      ? "เกรด B (ผ่านเกณฑ์)"
      : "ควรฝึกซ้อมเพิ่มเติม";

  const isLastQuestion = questionIndex + 1 >= totalQuestions;

  return (
    <div
      className={`rounded-2xl border p-5 shadow-xl flex flex-col gap-4 ${
        passed
          ? "bg-emerald-950/25 border-emerald-500/40"
          : "bg-rose-950/25 border-rose-500/40"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Google_Icon
            name={passed ? "check_circle" : "warning"}
            size={20}
            className={passed ? "text-emerald-400" : "text-rose-400"}
          />
          <h3
            className={`text-sm font-bold ${
              passed ? "text-emerald-200" : "text-rose-200"
            }`}
          >
            {passed
              ? "ผลประเมินข้อนี้: ถูกต้องตาม IFAB (PASS)"
              : "ผลประเมินข้อนี้: ยังไม่ผ่านเกณฑ์ (NEEDS REVIEW)"}
          </h3>
        </div>
      </div>

      {/* Score Summary Box */}
      <div
        className={`rounded-xl border p-4 flex flex-wrap items-center justify-between gap-4 ${
          passed
            ? "bg-emerald-950/50 border-emerald-500/30"
            : "bg-rose-950/50 border-rose-500/30"
        }`}
      >
        <div>
          <div className="text-[11px] text-slate-300">คะแนนภาคปฏิบัติรวม</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span
              className={`text-3xl font-extrabold font-mono ${
                passed ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {attemptResult.totalQuestionScore}
            </span>
            <span className="text-xs font-semibold text-slate-400">/ 100</span>
          </div>
        </div>

        <div className="text-right space-y-0.5 text-xs">
          <div className="text-slate-300">
            เวลาตอบสนอง:{" "}
            <span className="font-mono font-bold text-slate-100">
              {attemptResult.reactionTimeSeconds.toFixed(2)} วินาที
            </span>
          </div>
          <div className="text-slate-300">
            ค้างสัญญาณ:{" "}
            <span className="font-mono font-bold text-slate-100">
              {attemptResult.holdDurationSeconds.toFixed(1)} วินาที
            </span>
          </div>
          <div
            className={`font-bold ${
              passed ? "text-emerald-300" : "text-amber-300"
            }`}
          >
            {gradeLabel}
          </div>
        </div>
      </div>

      {/* Breakdown Criteria Checklist */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <Google_Icon
            name={attemptResult.isDecisionCorrect ? "check_circle" : "warning"}
            size={15}
            className={
              attemptResult.isDecisionCorrect ? "text-emerald-400" : "text-rose-400"
            }
          />
          <span className="text-slate-200">
            {attemptResult.isDecisionCorrect
              ? `คำตัดสินถูกต้องตาม ${question.ifabLawReference}`
              : `คำตัดสินคลาดเคลื่อน (เฉลยที่ถูกต้อง: ข้อ ${question.correctOptionId})`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Google_Icon
            name={attemptResult.postureScore >= 75 ? "check_circle" : "warning"}
            size={15}
            className={
              attemptResult.postureScore >= 75 ? "text-emerald-400" : "text-amber-400"
            }
          />
          <span className="text-slate-200">
            สรีระมุมยกแขน {attemptResult.recordedAngles.rElevationAngle}° · ข้อศอกเหยียด{" "}
            {attemptResult.recordedAngles.rElbowAngle}° (ความแม่นยำ {attemptResult.postureScore}/100)
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed">
          <span className="font-bold text-cyan-400">เฉลยและคำอธิบายกติกา: </span>
          {question.explanationTh}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={onReplayClip}
          className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
        >
          <Google_Icon name="replay" size={16} />
          <span>ดู Replay สถานการณ์</span>
        </button>

        <button
          type="button"
          onClick={onNextQuestion}
          className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-500/20"
        >
          <Google_Icon name="skip_next" size={18} />
          <span>
            {isLastQuestion
              ? "สรุปผลสอบทั้งชุด"
              : `ข้อถัดไป (${questionIndex + 2}/${totalQuestions})`}
          </span>
        </button>
      </div>
    </div>
  );
};
