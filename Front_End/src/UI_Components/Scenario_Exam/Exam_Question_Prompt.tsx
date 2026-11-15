"use client";

import React, { useEffect, useRef, useState } from "react";
import { ScenarioExamQuestion } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";

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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
      {/* Reaction Window Bar */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Google_Icon name="timer" size={16} className="text-amber-400" />
            เวลาตัดสินใจให้สัญญาณ ({windowSec}s Reaction Window)
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-semibold flex items-center gap-1 ${
              isLocked
                ? "bg-cyan-950/50 border-cyan-500/40 text-cyan-300"
                : timeLeft <= 1.5
                ? "bg-rose-950/50 border-rose-500/50 text-rose-300"
                : "bg-amber-950/50 border-amber-500/40 text-amber-300"
            }`}
          >
            <Google_Icon name="schedule" size={12} />
            {isLocked
              ? `ตอบสนองใน ${elapsedDecisionTime.toFixed(2)}s`
              : `เหลือ ${timeLeft.toFixed(1)}s`}
          </span>
        </div>

        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-75 ${
              timeLeft <= 1.5
                ? "bg-rose-500"
                : isLocked
                ? "bg-cyan-400"
                : "bg-amber-400"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Scenario Question Narrative */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
        <div className="text-xs font-bold text-cyan-400 mb-1">
          {question.titleTh}
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {question.situationSummaryTh}
        </p>
      </div>

      {/* Main Prompt */}
      <div>
        <h3 className="text-sm font-bold text-slate-100 mb-3">
          คำถาม: จากเหตุการณ์ในคลิป ในฐานะผู้ตัดสิน ท่านต้องให้สัญญาณใด?
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            const isCorrectAnswer = opt.id === question.correctOptionId;

            let cardStyle =
              "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900";
            let badgeStyle = "bg-slate-800 text-slate-300";

            if (hasCompletedResult) {
              if (isCorrectAnswer) {
                cardStyle =
                  "bg-emerald-950/40 border-emerald-500/70 text-emerald-100 shadow-sm";
                badgeStyle = "bg-emerald-500 text-slate-950";
              } else if (isSelected && !isCorrectAnswer) {
                cardStyle =
                  "bg-rose-950/40 border-rose-500/70 text-rose-100";
                badgeStyle = "bg-rose-500 text-white";
              }
            } else if (isSelected) {
              cardStyle =
                "bg-cyan-950/50 border-cyan-400 text-cyan-100 shadow-md shadow-cyan-950/40";
              badgeStyle = "bg-cyan-400 text-slate-950";
            }

            return (
              <button
                key={opt.id}
                type="button"
                disabled={isLocked || hasCompletedResult}
                onClick={() => onSelectOption(opt.id)}
                className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 disabled:cursor-default ${cardStyle}`}
              >
                <span
                  className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-extrabold ${badgeStyle}`}
                >
                  {opt.id}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold leading-snug">
                    {opt.labelTh}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
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
            onClick={() => onConfirmDecision(elapsedDecisionTime)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              selectedOptionId
                ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
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
