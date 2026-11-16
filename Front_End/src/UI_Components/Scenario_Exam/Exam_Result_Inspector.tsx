"use client";

import React from "react";
import {
  ExamAttemptResult,
  GestureRule,
  ScenarioExamQuestion,
} from "../../Data_Types/Referee_Types";
import { IFAB_RULES } from "../../Core_Lib/Ifab_Rules_Catalog";
import { Google_Icon } from "../Common/Google_Icon";
import {
  triggerCausalFeedback,
  useAppleSpring,
} from "../../Core_Lib/Apple_Spring_Engine";

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
  const targetRule: GestureRule | undefined = IFAB_RULES.find(
    (r) => r.id === question.targetGestureId
  );

  const scoreSpring = useAppleSpring(attemptResult?.totalQuestionScore ?? 0, {
    dampingRatio: 0.88,
    response: 0.4,
    precision: 0.25,
  });

  // Before submission: show IFAB Assessment Rubric card
  if (!attemptResult) {
    return (
      <div className="apple-material-dark rounded-[22px] p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Google_Icon name="straighten" size={18} className="text-[#0A84FF]" />
            <h3 className="text-sm font-bold apple-title text-[#F5F5F7]">
              เกณฑ์การประเมินภาคปฏิบัติ 3 มิติ
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-[#2C2C2E] border border-white/[0.1] text-[11px] font-medium text-[#A1A1A6] apple-tabular">
            100 คะแนนเต็ม
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="p-3 rounded-2xl bg-[#141416] border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#F5F5F7]">
              <Google_Icon name="quiz" size={16} className="text-[#0A84FF]" />
              <span>1. ความถูกต้องของการตัดสินตามกติกา IFAB</span>
            </div>
            <span className="font-mono font-bold text-[#0A84FF] apple-tabular">40 คะแนน</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#141416] border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#F5F5F7]">
              <Google_Icon name="straighten" size={16} className="text-[#30D158]" />
              <span>2. ความถูกต้องของสรีระและองศาข้อต่อ</span>
            </div>
            <span className="font-mono font-bold text-[#30D158] apple-tabular">40 คะแนน</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#141416] border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#F5F5F7]">
              <Google_Icon name="speed" size={16} className="text-[#FF9F0A]" />
              <span>3. ความเร็วในการตอบสนอง (Reaction Time)</span>
            </div>
            <span className="font-mono font-bold text-[#FF9F0A] apple-tabular">20 คะแนน</span>
          </div>
        </div>

        {targetRule && (
          <div className="px-3.5 py-2.5 rounded-2xl bg-[#0A84FF]/10 border border-[#0A84FF]/25 text-[11px] text-[#64D2FF] flex items-start gap-2">
            <Google_Icon name="lightbulb" size={16} className="text-[#0A84FF] shrink-0 mt-0.5" />
            <span>
              คำแนะนำสนามสอบ: ดูคลิปเหตุการณ์ให้จบ จากนั้นเลือกคำตอบ A–D แล้วกดยืนยันเพื่อแสดงท่าทางค้างไว้อย่างน้อย{" "}
              <b className="text-[#F5F5F7]">{targetRule.minHoldSeconds} วินาที</b>
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
      className={`rounded-[22px] border p-5 shadow-xl flex flex-col gap-4 backdrop-blur-xl ${
        passed
          ? "bg-[#062614]/90 border-[#30D158]/40"
          : "bg-[#2B0B0D]/90 border-[#FF453A]/40"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Google_Icon
            name={passed ? "check_circle" : "warning"}
            size={20}
            className={passed ? "text-[#30D158]" : "text-[#FF453A]"}
            filled
          />
          <h3
            className={`text-sm font-bold apple-title ${
              passed ? "text-[#30D158]" : "text-[#FF453A]"
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
        className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-4 ${
          passed
            ? "bg-[#0C381F]/80 border-[#30D158]/30"
            : "bg-[#3B1215]/80 border-[#FF453A]/30"
        }`}
      >
        <div>
          <div className="text-[11px] text-[#A1A1A6]">คะแนนภาคปฏิบัติรวม</div>
          <div className="flex items-baseline gap-1.5 mt-0.5 apple-tabular">
            <span
              className={`text-3xl font-bold font-mono apple-display ${
                passed ? "text-[#30D158]" : "text-[#FF453A]"
              }`}
            >
              {Math.round(scoreSpring.value)}
            </span>
            <span className="text-xs font-semibold text-[#A1A1A6]">/ 100</span>
          </div>
        </div>

        <div className="text-right space-y-0.5 text-xs apple-tabular">
          <div className="text-[#F5F5F7]">
            เวลาตอบสนอง:{" "}
            <span className="font-mono font-bold text-white">
              {attemptResult.reactionTimeSeconds.toFixed(2)} วินาที
            </span>
          </div>
          <div className="text-[#A1A1A6]">
            ค้างสัญญาณ:{" "}
            <span className="font-mono font-bold text-[#F5F5F7]">
              {attemptResult.holdDurationSeconds.toFixed(1)} วินาที
            </span>
          </div>
          <div
            className={`font-bold ${
              passed ? "text-[#FF9F0A]" : "text-[#FF9F0A]"
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
              attemptResult.isDecisionCorrect ? "text-[#30D158]" : "text-[#FF453A]"
            }
          />
          <span className="text-[#F5F5F7]">
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
              attemptResult.postureScore >= 75 ? "text-[#30D158]" : "text-[#FF9F0A]"
            }
          />
          <span className="text-[#F5F5F7] apple-tabular">
            ความมั่นใจท่าทางจากโมเดล YOLO26n-pose: {attemptResult.postureScore}/100 · ค้างสัญญาณ{" "}
            {attemptResult.holdDurationSeconds.toFixed(1)}s
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-[#141416]/85 border border-white/[0.08] text-[11px] text-[#A1A1A6] leading-relaxed">
          <span className="font-bold text-[#0A84FF]">เฉลยและคำอธิบายกติกา: </span>
          {question.explanationTh}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onPointerDown={() => triggerCausalFeedback("tap")}
          onClick={onReplayClip}
          className="py-2.5 px-3 rounded-2xl bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-white/[0.12] text-[#F5F5F7] text-xs font-semibold flex items-center justify-center gap-1.5 apple-pressable"
        >
          <Google_Icon name="replay" size={16} />
          <span>ดู Replay สถานการณ์</span>
        </button>

        <button
          type="button"
          onPointerDown={() => triggerCausalFeedback("snap")}
          onClick={onNextQuestion}
          className="py-2.5 px-3 rounded-2xl bg-[#30D158] hover:bg-[#42DF69] text-black text-xs font-bold flex items-center justify-center gap-1.5 apple-pressable shadow-lg shadow-[#30D158]/20"
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
