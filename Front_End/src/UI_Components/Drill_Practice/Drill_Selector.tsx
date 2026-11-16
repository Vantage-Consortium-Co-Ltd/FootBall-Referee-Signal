"use client";

import React, { useState } from "react";
import { GestureCategory, SignalClassInfo } from "../../Data_Types/Referee_Types";
import {
  formatSignalEnglishName,
  IFAB_SIGNAL_CLASSES,
} from "../../Core_Lib/Ifab_Rules_Catalog";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

const CATEGORIES: { id: GestureCategory | "all"; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "restarts", label: "ลูกตั้งเตะ" },
  { id: "fouls", label: "การทำฟาวล์" },
  { id: "match_control", label: "ควบคุมเกม" },
  { id: "offside", label: "ล้ำหน้า" },
];

export interface DrillSelectorProps {
  selectedSignalId?: number | null;
  onSelectSignal?: (signal: SignalClassInfo) => void;
}

export const Drill_Selector: React.FC<DrillSelectorProps> = ({
  selectedSignalId,
  onSelectSignal,
}) => {
  const [activeCategory, setActiveCategory] = useState<GestureCategory | "all">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [internalSelectedId, setInternalSelectedId] = useState<number>(1);

  const effectiveSelectedId =
    selectedSignalId !== undefined ? selectedSignalId : internalSelectedId;

  const filtered = IFAB_SIGNAL_CLASSES.filter((cls) => {
    const matchesCategory =
      activeCategory === "all" || cls.category === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    const readableEn = formatSignalEnglishName(cls.name).toLowerCase();
    const matchesSearch =
      !q ||
      cls.nameTh.toLowerCase().includes(q) ||
      readableEn.includes(q) ||
      cls.ifabLaw.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const handleSelect = (cls: SignalClassInfo) => {
    triggerCausalFeedback("snap");
    setInternalSelectedId(cls.id);
    onSelectSignal?.(cls);
  };

  return (
    <aside
      aria-label="ท่าสัญญาณ IFAB 20 ท่า"
      className="rounded-2xl bg-[#0D131A] border border-white/[0.08] p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Google_Icon name="menu_book" size={16} className="text-emerald-400" />
          <span>สัญญาณ IFAB</span>
        </h2>
        <span className="text-xs text-slate-400 apple-tabular">
          {filtered.length}/{IFAB_SIGNAL_CLASSES.length}
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <label htmlFor="signal-guide-search" className="sr-only">
          ค้นหาท่าสัญญาณ
        </label>
        <Google_Icon
          name="search"
          size={15}
          className="text-slate-500 absolute left-3 top-2.5 pointer-events-none"
        />
        <input
          id="signal-guide-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาท่าสัญญาณหรือกติกา..."
          className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-400 transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            aria-label="ล้างคำค้นหา"
            className="absolute right-2 top-1.5 p-0.5 rounded text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <Google_Icon name="close" size={13} />
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div
        role="group"
        aria-label="หมวดหมู่"
        className="flex flex-wrap gap-1.5"
      >
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={active}
              onPointerDown={() => triggerCausalFeedback("tap")}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                active
                  ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                  : "bg-transparent border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Compact Signal Rows */}
      <div className="overflow-y-auto space-y-1.5 pr-1 max-h-[500px]">
        {filtered.length === 0 ? (
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] py-6 text-center text-xs text-slate-400">
            ไม่พบรายการ
          </div>
        ) : (
          filtered.map((cls) => {
            const isSelected = cls.id === effectiveSelectedId;
            const shortLaw = cls.ifabLaw.split(" - ")[0];
            return (
              <button
                key={cls.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleSelect(cls)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border flex items-center justify-between gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  isSelected
                    ? "bg-emerald-500/15 border-emerald-400/60 text-white"
                    : "bg-white/[0.02] border-white/[0.06] hover:border-white/20 text-slate-200"
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    {cls.nameTh}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {formatSignalEnglishName(cls.name)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {cls.isF1ZeroLimited && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/35 text-amber-300 text-[10px]">
                      ข้อมูลจำกัด
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-[10px] text-slate-300">
                    {shortLaw}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
