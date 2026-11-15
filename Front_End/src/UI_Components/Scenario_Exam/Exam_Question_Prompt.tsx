"use client";

import React, { useEffect, useRef, useState } from "react";
import { ScenarioExamQuestion } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

export interface ExamQuestionPromptProps {
  question: ScenarioExamQuestion;
  selectedOptionId: "A" | "B" | "C" | "D" | null;
  isLocked: boolean;
  hasCompletedResult: boolean;
  onSelectOption: (optionId: "A" | "B" | "C" | "D") => void;
  onConfirmDecision: (reactionSeconds: number) => void;
}

export const Exam_Question_Prompt: React.FC<ExamQuestionPromptProps> = ({
  question,
  selectedOptionId,
  isLocked,
  hasCompletedResult,
  onSelectOption,
  onConfirmDecision,
}) => {
  const windowSec = question.decisionWindowSeconds || 5;
  const [timeLeft, setTimeLeft] = useState<number>(windowSec);
  const startTimeRef = useRef<number>(performance.now());

  // Reset countdown whenever question changes
  useEffect(() => {
    setTimeLeft(windowSec);
    startTimeRef.current = performance.now();
  }, [question.id, windowSec]);

  // High-precision countdown timer using performance.now()
  useEffect(() => {
    if (isLocked || hasCompletedResult) return;

    const intervalId = window.setInterval(() => {
      const elapsedSec = (performance.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, windowSec - elapsedSec);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        window.clearInterval(intervalId);
      }
    }, 50);

    return () => window.clearInterval(intervalId);
  }, [question.id, windowSec, isLocked, hasCompletedResult]);

  const progressPct = Math.max(0, Math.min(100, (timeLeft / windowSec) * 100));
  const elapsedDecisionTime = Number(
    Math.min(windowSec, Math.max(0.25, windowSec - timeLeft)).toFixed(2)
  );

  return (
    <div className="apple-material-dark rounded-[22px] p-5 flex flex-col gap-4">
      {/* Reaction Window Bar */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-[#F5F5F7] flex items-center gap-1.5">
            <Google_Icon name="timer" size={16} className="text-[#FF9F0A]" />
            เวลาตัดสินใจให้สัญญาณ ({windowSec}s Reaction Window)
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-semibold apple-tabular flex items-center gap-1 ${
              isLocked
                ? "bg-[#0A84FF]/15 border-[#0A84FF]/45 text-[#0A84FF]"
                : timeLeft <= 1.5
                ? "bg-[#FF453A]/15 border-[#FF453A]/45 text-[#FF453A]"
                : "bg-[#FF9F0A]/15 border-[#FF9F0A]/45 text-[#FF9F0A]"
            }`}
          >
            <Google_Icon name="schedule" size={12} />
            {isLocked
              ? `ตอบสนองใน ${elapsedDecisionTime.toFixed(2)}s`
              : `เหลือ ${timeLeft.toFixed(1)}s`}
          </span>
        </div>

        <div className="w-full h-2 bg-[#141416] rounded-full overflow-hidden border border-white/[0.08]">
          <div
            className={`h-full rounded-full transition-all duration-75 ${
              timeLeft <= 1.5
                ? "bg-[#FF453A]"
                : isLocked
                ? "bg-[#0A84FF]"
                : "bg-[#FF9F0A]"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Scenario Question Narrative */}
      <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-3.5">
        <div className="text-xs font-bold text-[#0A84FF] mb-1">
          {question.titleTh}
        </div>
        <p className="text-xs text-[#A1A1A6] apple-body">
          {question.situationSummaryTh}
        </p>
      </div>

      {/* Main Prompt */}
      <div>
        <h3 className="text-sm font-bold apple-title text-[#F5F5F7] mb-3">
          คำถาม: จากเหตุการณ์ในคลิป ในฐานะผู้ตัดสิน ท่านต้องให้สัญญาณใด?
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            const isCorrectAnswer = opt.id === question.correctOptionId;

            let cardStyle =
              "bg-[#141416]/85 border-white/[0.08] text-[#A1A1A6] hover:border-white/[0.2] hover:bg-[#2C2C2E]/70";
            let badgeStyle = "bg-[#2C2C2E] text-[#F5F5F7]";

            if (hasCompletedResult) {
              if (isCorrectAnswer) {
                cardStyle =
                  "bg-[#30D158]/15 border-[#30D158]/70 text-[#E5F9EC] shadow-sm";
                badgeStyle = "bg-[#30D158] text-black";
              } else if (isSelected && !isCorrectAnswer) {
                cardStyle =
                  "bg-[#FF453A]/15 border-[#FF453A]/70 text-[#FFD6D4]";
                badgeStyle = "bg-[#FF453A] text-white";
              }
            } else if (isSelected) {
              cardStyle =
                "bg-[#0A84FF]/15 border-[#0A84FF] text-[#F5F5F7] shadow-md shadow-[#0A84FF]/15";
              badgeStyle = "bg-[#0A84FF] text-white";
            }

            return (
              <button
                key={opt.id}
                type="button"
                disabled={isLocked || hasCompletedResult}
                onPointerDown={() => {
                  if (!isLocked && !hasCompletedResult) triggerCausalFeedback("snap");
                }}
                onClick={() => onSelectOption(opt.id)}
                className={`p-3.5 rounded-2xl border text-left apple-pressable flex items-start gap-3 disabled:cursor-default ${cardStyle}`}
              >
                <span
                  className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${badgeStyle}`}
                >
                  {opt.id}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold leading-snug text-[#F5F5F7]">
                    {opt.labelTh}
                  </div>
                  <div className="text-[11px] text-[#A1A1A6] mt-0.5 line-clamp-2">
                    {opt.labelEn}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirm Decision Button */}
      {!isLocked && !hasCompletedResult && (
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            disabled={!selectedOptionId}
            onPointerDown={() => {
              if (selectedOptionId) triggerCausalFeedback("tap");
            }}
            onClick={() => onConfirmDecision(elapsedDecisionTime)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 apple-pressable ${
              selectedOptionId
                ? "bg-[#0A84FF] hover:bg-[#3B9CFF] text-white shadow-lg shadow-[#0A84FF]/25"
                : "bg-[#2C2C2E] text-[#6E6E73] cursor-not-allowed"
            }`}
          >
            <Google_Icon name="how_to_reg" size={16} />
            <span>ยืนยันคำตัดสินและเริ่มทำท่าทางหน้ากล้อง</span>
          </button>
        </div>
      )}
    </div>
  );
};
