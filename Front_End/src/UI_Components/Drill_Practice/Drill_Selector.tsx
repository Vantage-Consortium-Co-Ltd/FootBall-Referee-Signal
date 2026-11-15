"use client";

import React, { useState } from "react";
import { GestureCategory, GestureRule } from "../../Data_Types/Referee_Types";
import { MOCK_IFAB_RULES } from "../../Core_Lib/Microservices_Mock";
import { Google_Icon } from "../Common/Google_Icon";

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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Google_Icon name="emoji_events" size={16} className="text-cyan-400" />
          เลือกแบบฝึกหัดสัญญาณผู้ตัดสิน (IFAB Drills)
        </h2>
        <span className="text-xs text-slate-500 font-mono">
          {filteredRules.length} รายการ
        </span>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Google_Icon name="search" size={16} className="text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาชื่อสัญญาณ, กฎ IFAB..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
        />
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition border ${
              activeCategory === cat.id
                ? "bg-cyan-950 border-cyan-500/60 text-cyan-300"
                : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
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
              onClick={() => onSelectDrill(rule)}
              className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 ${
                isSelected
                  ? "bg-cyan-950/40 border-cyan-500 text-cyan-100 shadow-md ring-1 ring-cyan-500/30"
                  : "bg-slate-950/40 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-100">
                  {rule.nameTh}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                  {rule.activeArm.toUpperCase()}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 font-mono truncate">
                {rule.name}
              </div>

              <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                <span className="flex items-center gap-1">
                  <Google_Icon name="schedule" size={13} className="text-cyan-400" />
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
