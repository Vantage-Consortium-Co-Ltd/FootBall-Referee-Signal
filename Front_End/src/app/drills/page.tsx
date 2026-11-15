"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FrameFeedbackPayload,
  GestureRule,
} from "../../Data_Types/Referee_Types";
import {
  MOCK_IFAB_RULES,
  evaluateMockPosture,
} from "../../Core_Lib/Microservices_Mock";
import {
  Coaching_HUD,
  Drill_Selector,
  Live_Drill_Feed,
} from "../../UI_Components/Drill_Practice";
import { Google_Icon } from "../../UI_Components/Common/Google_Icon";

function DrillsStudioContent() {
  const searchParams = useSearchParams();
  const initialSignalIdParam = searchParams.get("signalId");

  const [selectedRule, setSelectedRule] = useState<GestureRule>(() => {
    if (initialSignalIdParam !== null) {
      const parsed = Number(initialSignalIdParam);
      const matched = MOCK_IFAB_RULES.find((r) => r.id === parsed);
      if (matched) return matched;
    }
    return MOCK_IFAB_RULES[1];
  });

  useEffect(() => {
    if (initialSignalIdParam !== null) {
      const parsed = Number(initialSignalIdParam);
      const matched = MOCK_IFAB_RULES.find((r) => r.id === parsed);
      if (matched) setSelectedRule(matched);
    }
  }, [initialSignalIdParam]);

  const [streakCount, setStreakCount] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [feedback, setFeedback] = useState<FrameFeedbackPayload>(() =>
    evaluateMockPosture(MOCK_IFAB_RULES[1], 0, 0)
  );

  const handleDrillSuccess = () => {
    setStreakCount((prev) => prev + 1);
    setTotalAttempts((prev) => prev + 1);
  };

  const handleSelectDrill = (rule: GestureRule) => {
    setSelectedRule(rule);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Top Navigation */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition inline-flex items-center justify-center"
          >
            <Google_Icon name="arrow_back" size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-100">
                Live Practice Drill (โหมดฝึกซ้อมสัญญาณสด)
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              ฝึกซ้อมการให้สัญญาณผ่านกล้อง Webcam พร้อม Ghost Target Guide และการประเมินองศาข้อต่อแบบเรียลไทม์
            </p>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs font-semibold">
            <Google_Icon name="emoji_events" size={16} className="text-amber-400" filled />
            <span>สำเร็จต่อเนื่อง: {streakCount} ครั้ง</span>
          </div>

          <Link
            href="/"
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition"
          >
            กลับหน้าหลัก
          </Link>
        </div>
      </header>

      {/* Main Practice Workspace Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Left Column: Live Viewport (lg: 7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <Live_Drill_Feed
            targetRule={selectedRule}
            onFeedbackUpdate={setFeedback}
            onDrillSuccess={handleDrillSuccess}
          />

          {/* Drill Description Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Google_Icon name="menu_book" size={16} className="text-cyan-400" />
                คำอธิบายกติกา IFAB: {selectedRule.nameTh}
              </h3>
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                {selectedRule.ifabLaw}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedRule.descriptionTh}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2">
              {selectedRule.coachingTips.map((tip, idx) => (
                <span
                  key={idx}
                  className="text-[11px] bg-slate-950 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg"
                >
                  💡 {tip}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Coaching HUD & Selector (lg: 5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Real-time Coaching HUD */}
          <Coaching_HUD
            feedback={feedback}
            targetRule={selectedRule}
            streakCount={streakCount}
            totalAttempts={totalAttempts}
          />

          {/* Drill Selector Component */}
          <Drill_Selector
            selectedRuleId={selectedRule.id}
            onSelectDrill={handleSelectDrill}
          />
        </div>
      </div>
    </div>
  );
}

export default function DrillsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-sm">
          กำลังโหลดห้องฝึกซ้อมสัญญาณผู้ตัดสิน...
        </div>
      }
    >
      <DrillsStudioContent />
    </Suspense>
  );
}
