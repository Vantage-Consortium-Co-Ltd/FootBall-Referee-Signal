"use client";

import React from "react";
import { GestureCategory } from "../../Data_Types/Referee_Types";

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
    <div className="flex flex-wrap items-center gap-2">
      {FILTER_OPTIONS.map((item) => {
        const active = selectedCategory === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelectCategory(item.key)}
            className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold transition ${
              active
                ? isLightMode
                  ? "bg-teal-50 border-teal-700 text-teal-800 shadow-xs"
                  : "bg-cyan-950/60 border-cyan-400 text-cyan-200"
                : isLightMode
                ? "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            {item.label} ({counts[item.key] ?? 0})
          </button>
        );
      })}
    </div>
  );
};
