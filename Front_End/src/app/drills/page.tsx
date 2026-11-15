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
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

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
    <div className="min-h-screen bg-black text-[#F5F5F7] p-4 md:p-8">
      {/* Top Navigation */}
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
              <Google_Icon name="my_location" size={22} className="text-[#0A84FF]" />
              <h1 className="text-xl md:text-2xl font-bold apple-title text-[#F5F5F7]">
                Live Practice Drill (โหมดฝึกซ้อมสัญญาณสด)
              </h1>
            </div>
            <p className="text-xs text-[#A1A1A6] mt-0.5">
              ฝึกซ้อมการให้สัญญาณผ่านกล้อง Webcam พร้อม Ghost Target Guide และการประเมินองศาข้อต่อแบบเรียลไทม์
            </p>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FF9F0A]/15 border border-[#FF9F0A]/40 text-[#FF9F0A] text-xs font-semibold apple-tabular">
            <Google_Icon name="emoji_events" size={16} className="text-[#FF9F0A]" filled />
            <span>สำเร็จต่อเนื่อง: {streakCount} ครั้ง</span>
          </div>

          <Link
            href="/"
            onPointerDown={() => triggerCausalFeedback("tap")}
            className="px-3.5 py-1.5 rounded-full bg-[#1C1C1E] border border-white/[0.1] hover:bg-[#2C2C2E] text-xs text-[#F5F5F7] apple-pressable"
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
          <div className="apple-material-dark rounded-[22px] p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold apple-title text-[#F5F5F7] flex items-center gap-2">
                <Google_Icon name="menu_book" size={16} className="text-[#0A84FF]" />
                คำอธิบายกติกา IFAB: {selectedRule.nameTh}
              </h3>
              <span className="text-xs font-mono text-[#0A84FF] font-semibold">
                {selectedRule.ifabLaw}
              </span>
            </div>
            <p className="text-xs text-[#A1A1A6] apple-body">
              {selectedRule.descriptionTh}
            </p>
            <div className="mt-3 pt-3 border-t border-white/[0.08] flex flex-wrap gap-2">
              {selectedRule.coachingTips.map((tip, idx) => (
                <span
                  key={idx}
                  className="text-[11px] bg-[#141416] border border-white/[0.08] text-[#F5F5F7] px-2.5 py-1 rounded-xl flex items-center gap-1.5"
                >
                  <Google_Icon name="lightbulb" size={13} className="text-[#FF9F0A]" />
                  <span>{tip}</span>
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
        <div className="min-h-screen bg-black text-[#A1A1A6] flex items-center justify-center text-sm">
          กำลังโหลดห้องฝึกซ้อมสัญญาณผู้ตัดสิน...
        </div>
      }
    >
      <DrillsStudioContent />
    </Suspense>
  );
}
