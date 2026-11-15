"use client";

import React, { useState } from "react";
import { GestureCategory, GestureRule } from "../../Data_Types/Referee_Types";
import { MOCK_IFAB_RULES } from "../../Core_Lib/Microservices_Mock";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

export interface DrillSelectorProps {
  selectedRuleId: number;
  onSelectDrill: (rule: GestureRule) => void;
}

const CATEGORIES: { id: GestureCategory | "all"; label: string }[] = [
  { id: "all", label: "ทั้งหมด (20)" },
  { id: "restarts", label: "ลูกตั้งเตะ (Restarts)" },
  { id: "fouls", label: "การทำฟาวล์ (Fouls)" },
  { id: "match_control", label: "การควบคุมเกม" },
  { id: "offside", label: "การล้ำหน้า (Offside)" },
];

export const Drill_Selector: React.FC<DrillSelectorProps> = ({
  selectedRuleId,
  onSelectDrill,
}) => {
  const [activeCategory, setActiveCategory] = useState<GestureCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredRules = MOCK_IFAB_RULES.filter((rule) => {
    const matchesCategory =
      activeCategory === "all" || rule.category === activeCategory;
    const matchesSearch =
      rule.nameTh.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.ifabLaw.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="apple-material-dark rounded-[22px] p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold apple-title text-[#F5F5F7] flex items-center gap-2">
          <Google_Icon name="emoji_events" size={16} className="text-[#0A84FF]" />
          เลือกแบบฝึกหัดสัญญาณผู้ตัดสิน (IFAB Drills)
        </h2>
        <span className="text-xs text-[#6E6E73] font-mono apple-tabular">
          {filteredRules.length} รายการ
        </span>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Google_Icon name="search" size={16} className="text-[#6E6E73] absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาชื่อสัญญาณ, กฎ IFAB..."
          className="w-full bg-[#141416] border border-white/[0.1] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#F5F5F7] placeholder-[#6E6E73] focus:outline-none focus:border-[#0A84FF] transition"
        />
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onPointerDown={() => triggerCausalFeedback("tap")}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap apple-pressable border ${
              activeCategory === cat.id
                ? "bg-[#0A84FF]/20 border-[#0A84FF]/60 text-[#0A84FF]"
                : "bg-[#141416] border-white/[0.08] text-[#A1A1A6] hover:text-[#F5F5F7]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Drill List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[360px]">
        {filteredRules.map((rule) => {
          const isSelected = rule.id === selectedRuleId;

          return (
            <button
              key={rule.id}
              onPointerDown={() => triggerCausalFeedback("snap")}
              onClick={() => onSelectDrill(rule)}
              className={`w-full text-left p-3 rounded-2xl border apple-pressable flex flex-col gap-1.5 ${
                isSelected
                  ? "bg-[#0A84FF]/15 border-[#0A84FF] text-[#F5F5F7] shadow-md"
                  : "bg-[#141416]/80 border-white/[0.08] text-[#A1A1A6] hover:border-white/[0.18] hover:bg-[#2C2C2E]/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#F5F5F7]">
                  {rule.nameTh}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#2C2C2E] text-[#A1A1A6] border border-white/[0.08]">
                  {rule.activeArm.toUpperCase()}
                </span>
              </div>

              <div className="text-[11px] text-[#A1A1A6] font-mono truncate">
                {rule.name}
              </div>

              <div className="flex items-center gap-3 text-[10px] text-[#6E6E73] pt-1 border-t border-white/[0.06] apple-tabular">
                <span className="flex items-center gap-1">
                  <Google_Icon name="schedule" size={13} className="text-[#0A84FF]" />
                  Hold: {rule.minHoldSeconds}s
                </span>
                <span>•</span>
                <span>เป้าหมาย: {rule.targetElevationDeg}°</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
