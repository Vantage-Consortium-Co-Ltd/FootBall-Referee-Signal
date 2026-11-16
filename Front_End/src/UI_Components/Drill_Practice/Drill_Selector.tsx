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
  { id: "match_control", label: "การควบคุมเกม" },
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
      cls.ifabLaw.toLowerCase().includes(q) ||
      cls.descriptionTh.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const handleSelect = (cls: SignalClassInfo) => {
    triggerCausalFeedback("snap");
    setInternalSelectedId(cls.id);
    onSelectSignal?.(cls);
  };

  return (
    <aside
      aria-label="คู่มือท่าสัญญาณผู้ตัดสินฟุตบอล 20 ท่า"
      className="rounded-3xl bg-slate-900/80 border border-white/10 p-4 md:p-5 shadow-2xl shadow-black/50 flex flex-col gap-3.5"
    >
      {/* Guide Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
            <Google_Icon name="menu_book" size={18} className="text-emerald-400" />
            <span>คู่มือท่าสัญญาณผู้ตัดสินฟุตบอล</span>
          </h2>
          <p className="text-xs text-slate-300">
            IFAB 20 ท่ามาตรฐาน · เลือกท่าเพื่อดูวิธีปฏิบัติและใช้ฝึกซ้อม
          </p>
        </div>
        <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-slate-800 border border-white/10 text-xs text-slate-200 font-semibold apple-tabular">
          {filtered.length}/{IFAB_SIGNAL_CLASSES.length}
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <label htmlFor="signal-guide-search" className="sr-only">
          ค้นหาชื่อท่าสัญญาณ หรือกติกา Law
        </label>
        <Google_Icon
          name="search"
          size={16}
          className="text-slate-400 absolute left-3 top-2.5 pointer-events-none"
        />
        <input
          id="signal-guide-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาชื่อท่าสัญญาณ หรือกติกา Law..."
          className="w-full bg-slate-950/90 border border-white/15 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-400 transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            aria-label="ล้างคำค้นหา"
            className="absolute right-2.5 top-2 p-0.5 rounded text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <Google_Icon name="close" size={14} />
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div
        role="group"
        aria-label="กรองตามหมวดหมู่สัญญาณ"
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
              className={`px-3 py-1 rounded-full text-xs font-medium border apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                active
                  ? "bg-emerald-500/20 border-emerald-400/55 text-emerald-300"
                  : "bg-slate-950/70 border-white/10 text-slate-300 hover:text-white hover:border-white/25"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Interactive 20-Signal Cards List */}
      <div className="overflow-y-auto space-y-2 pr-1 max-h-[520px]">
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-slate-950/70 border border-white/10 p-5 text-center text-xs text-slate-300">
            ไม่พบท่าสัญญาณที่ตรงกับคำค้นหา ลองเปลี่ยนคำค้นหรือหมวดหมู่ดูอีกครั้ง
          </div>
        ) : (
          filtered.map((cls) => {
            const isSelected = cls.id === effectiveSelectedId;
            const shortLaw = cls.ifabLaw.split(" - ")[0];
            return (
              <button
                key={cls.id}
                type="button"
                aria-expanded={isSelected}
                onClick={() => handleSelect(cls)}
                className={`w-full text-left p-3.5 rounded-2xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  isSelected
                    ? "bg-emerald-950/45 border-emerald-400/70 shadow-lg shadow-emerald-950/40"
                    : "bg-slate-950/65 border-white/10 hover:border-white/25 hover:bg-slate-900/90"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs md:text-sm font-bold text-white truncate">
                      {cls.nameTh}
                    </div>
                    <div className="text-xs text-slate-300 truncate">
                      {formatSignalEnglishName(cls.name)}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-medium text-slate-200">
                      {shortLaw}
                    </span>
                    {cls.isF1ZeroLimited && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/35 text-amber-300 text-[10px] font-medium">
                        อยู่ระหว่างเพิ่มข้อมูลฝึกสอน
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded details inside selected card */}
                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-emerald-400/20 space-y-2 text-xs">
                    <div className="font-semibold text-emerald-300">
                      {cls.ifabLaw}
                    </div>
                    <p className="text-slate-200 leading-relaxed">
                      {cls.descriptionTh}
                    </p>
                    {cls.coachingTips.length > 0 && (
                      <div className="rounded-xl bg-black/35 border border-white/10 p-2.5 space-y-1">
                        <div className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                          <Google_Icon name="lightbulb" size={13} />
                          <span>เคล็ดลับท่าทางที่ถูกต้อง</span>
                        </div>
                        <ul className="space-y-1 text-[11px] text-slate-300 list-disc pl-4">
                          {cls.coachingTips.map((tip, idx) => (
                            <li key={idx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
