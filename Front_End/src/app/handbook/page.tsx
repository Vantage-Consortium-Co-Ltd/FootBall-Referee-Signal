"use client";

import React, { useMemo, useState } from "react";
import { GestureRule } from "../../Data_Types/Referee_Types";
import { MOCK_IFAB_RULES } from "../../Core_Lib/Microservices_Mock";
import {
  Curriculum_Filter_Tabs,
  Curriculum_Header,
  HandbookCategoryFilter,
  Signal_Curriculum_Card,
  Signal_Deep_Dive_Drawer,
} from "../../UI_Components/Instructional_Handbook";
import { Google_Icon } from "../../UI_Components/Common/Google_Icon";

export default function HandbookPage() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [category, setCategory] = useState<HandbookCategoryFilter>("all");
  const [selectedRule, setSelectedRule] = useState<GestureRule>(MOCK_IFAB_RULES[1]);
  const [isLightMode, setIsLightMode] = useState<boolean>(true);

  const counts = useMemo(() => {
    const result: Record<HandbookCategoryFilter, number> = {
      all: MOCK_IFAB_RULES.length,
      restarts: 0,
      fouls: 0,
      match_control: 0,
      offside: 0,
    };
    for (const rule of MOCK_IFAB_RULES) {
      result[rule.category] = (result[rule.category] ?? 0) + 1;
    }
    return result;
  }, []);

  const filteredRules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOCK_IFAB_RULES.filter((rule) => {
      const matchCategory = category === "all" || rule.category === category;
      if (!matchCategory) return false;
      if (!q) return true;
      return (
        rule.nameTh.toLowerCase().includes(q) ||
        rule.name.toLowerCase().includes(q) ||
        rule.ifabLaw.toLowerCase().includes(q) ||
        rule.descriptionTh.toLowerCase().includes(q)
      );
    });
  }, [category, searchQuery]);

  return (
    <div
      className={`min-h-screen transition-colors duration-200 p-4 md:p-8 ${
        isLightMode ? "bg-[#F9FAFB] text-slate-900" : "bg-slate-950 text-slate-100"
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <Curriculum_Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalCount={MOCK_IFAB_RULES.length}
          filteredCount={filteredRules.length}
          isLightMode={isLightMode}
          onToggleTheme={() => setIsLightMode((prev) => !prev)}
        />

        <Curriculum_Filter_Tabs
          selectedCategory={category}
          onSelectCategory={setCategory}
          counts={counts}
          isLightMode={isLightMode}
        />

        {/* 2-Column Main Grid aligned to FigCraft Screen 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Signal Curriculum Grid (8 cols) */}
          <div className="lg:col-span-8">
            {filteredRules.length === 0 ? (
              <div
                className={`rounded-2xl border p-12 text-center ${
                  isLightMode
                    ? "bg-white border-slate-200 text-slate-500"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                <Google_Icon name="search" size={32} className="mx-auto mb-2 opacity-50" />
                <div className="text-sm font-semibold">
                  ไม่พบท่าสัญญาณที่ตรงกับคำค้นหา &ldquo;{searchQuery}&rdquo;
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCategory("all");
                  }}
                  className="mt-3 px-4 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-700 transition"
                >
                  แสดงทั้งหมด {MOCK_IFAB_RULES.length} ท่า
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredRules.map((rule) => (
                  <Signal_Curriculum_Card
                    key={rule.id}
                    rule={rule}
                    isSelected={selectedRule.id === rule.id}
                    isLightMode={isLightMode}
                    onSelectRule={setSelectedRule}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Sticky Deep Dive Drawer (4 cols) */}
          <div className="lg:col-span-4">
            <Signal_Deep_Dive_Drawer
              rule={selectedRule}
              isLightMode={isLightMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
