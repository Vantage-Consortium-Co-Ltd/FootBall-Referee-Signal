"use client";

import React from "react";
import { GestureCategory } from "../../Data_Types/Referee_Types";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

export type HandbookCategoryFilter = "all" | GestureCategory;

export interface CurriculumFilterTabsProps {
  selectedCategory: HandbookCategoryFilter;
  onSelectCategory: (category: HandbookCategoryFilter) => void;
  counts: Record<HandbookCategoryFilter, number>;
  isLightMode: boolean;
}

const FILTER_OPTIONS: { key: HandbookCategoryFilter; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "restarts", label: "ลูกตั้งเตะ" },
  { key: "fouls", label: "การทำฟาวล์" },
  { key: "match_control", label: "การควบคุมเกม" },
  { key: "offside", label: "การล้ำหน้า" },
];

export const Curriculum_Filter_Tabs: React.FC<CurriculumFilterTabsProps> = ({
  selectedCategory,
  onSelectCategory,
  counts,
  isLightMode,
}) => {
  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl border ${
        isLightMode
          ? "bg-[#E5E5EA]/75 border-black/[0.06]"
          : "bg-[#1C1C1E]/90 border-white/[0.08]"
      }`}
    >
      {FILTER_OPTIONS.map((item) => {
        const active = selectedCategory === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              triggerCausalFeedback("tap");
              onSelectCategory(item.key);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 apple-pressable apple-tabular border ${
              active
                ? isLightMode
                  ? "bg-white border-black/[0.06] text-[#007AFF] shadow-sm"
                  : "bg-[#2C2C2E] border-white/[0.12] text-[#0A84FF] shadow-sm"
                : isLightMode
                ? "border-transparent text-[#6E6E73] hover:text-[#1D1D1F]"
                : "border-transparent text-[#A1A1A6] hover:text-[#F5F5F7]"
            }`}
          >
            {item.label} ({counts[item.key] ?? 0})
          </button>
        );
      })}
    </div>
  );
};
