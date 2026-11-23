"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  formatSignalEnglishName,
  IFAB_SIGNAL_CLASSES,
} from "../../Core_Lib/Ifab_Rules_Catalog";
import {
  ActiveArm,
  GestureCategory,
  SignalClassInfo,
} from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../../UI_Components/Common/Google_Icon";
import { Referee_3D_Viewer } from "../../UI_Components/Referee_3D";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

const ACTIVE_ARM_LABELS: Record<ActiveArm, string> = {
  none: "ท่าเตรียม (ปล่อยข้างตัว)",
  right: "แขนขวา",
  either: "แขนซ้ายหรือขวา",
  both: "แขนทั้งสองข้าง",
};

const CATEGORIES: { id: GestureCategory | "all"; label: string }[] = [
  { id: "all", label: "ทั้งหมด (20)" },
  { id: "restarts", label: "ลูกตั้งเตะ" },
  { id: "fouls", label: "การทำฟาวล์" },
  { id: "match_control", label: "ควบคุมเกม" },
  { id: "offside", label: "ล้ำหน้า" },
];

export default function SignalsPage() {
  const [activeCategory, setActiveCategory] = useState<GestureCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedId, setSelectedId] = useState<number>(1);

  const filtered = IFAB_SIGNAL_CLASSES.filter((cls) => {
    const matchesCategory =
      activeCategory === "all" || cls.category === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    const readableEn = formatSignalEnglishName(cls.name).toLowerCase();
    return (
      matchesCategory &&
      (!q ||
        cls.nameTh.toLowerCase().includes(q) ||
        readableEn.includes(q) ||
        cls.ifabLaw.toLowerCase().includes(q))
    );
  });

  const selectedClass: SignalClassInfo =
    IFAB_SIGNAL_CLASSES.find((c) => c.id === selectedId) || IFAB_SIGNAL_CLASSES[0];

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#F8FAFC] dark:bg-[#070B0F] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Google_Icon name="menu_book" size={20} className="text-emerald-600 dark:text-emerald-400" />
            <span>กติกาและท่าสัญญาณผู้ตัดสิน IFAB (20 ท่ามาตรฐาน)</span>
          </h1>

          <div className="relative sm:w-72">
            <Google_Icon
              name="search"
              size={15}
              className="text-slate-400 dark:text-slate-500 absolute left-3 top-2.5 pointer-events-none"
            />
            <input
              id="signal-search"
              name="signal-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อท่าหรือกติกา..."
              aria-label="ค้นหาชื่อท่าหรือกติกา"
              className="w-full bg-white dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onPointerDown={() => triggerCausalFeedback("tap")}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  active
                    ? "bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/40 dark:border-emerald-400/50 text-emerald-700 dark:text-emerald-300 font-semibold"
                    : "bg-white dark:bg-white/[0.02] border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* 2-Column Catalog: Signal Cards on Left, Detailed View on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 grid grid-cols-1 gap-2 max-h-[640px] overflow-y-auto pr-1">
            {filtered.map((cls) => {
              const isSelected = cls.id === selectedClass.id;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => {
                    triggerCausalFeedback("snap");
                    setSelectedId(cls.id);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition ${
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500/50 dark:border-emerald-400/60 text-slate-900 dark:text-white shadow-sm"
                      : "bg-white dark:bg-white/[0.02] border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-slate-300 shadow-sm"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {cls.nameTh}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {formatSignalEnglishName(cls.name)}
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                    {cls.ifabLaw.split(" - ")[0]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-[#0D131A] border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 space-y-5 shadow-sm transition-colors duration-200">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                  {selectedClass.ifabLaw}
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                  {selectedClass.nameTh}
                </h2>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {formatSignalEnglishName(selectedClass.name)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/?signal=${selectedClass.id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 apple-pressable shadow-md shadow-emerald-500/20 transition"
                >
                  <Google_Icon name="videocam" size={15} />
                  <span>ฝึกซ้อมท่านี้ด้วยกล้องสด</span>
                </Link>
                {selectedClass.isF1ZeroLimited && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/35 text-amber-600 dark:text-amber-300 text-xs font-medium">
                    อยู่ระหว่างเพิ่มข้อมูลฝึกสอน
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Referee_3D_Viewer signal={selectedClass} />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-3">
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    แขนหลัก
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 leading-snug">
                    {ACTIVE_ARM_LABELS[selectedClass.activeArm]}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-3">
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    มุมยกเป้าหมาย
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 tabular-nums">
                    {selectedClass.targetElevationDeg}°
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    ขั้นต่ำ {selectedClass.minElevationDeg}°
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-3">
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    ความเหยียดแขน
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 tabular-nums">
                    {selectedClass.targetStraightnessDeg}°
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    ขั้นต่ำ {selectedClass.minStraightnessDeg}°
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-3">
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    ระยะเวลาค้างท่า
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                    ≥ {selectedClass.minHoldSeconds} วินาที
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200/80 dark:border-white/[0.08] pt-4 space-y-3">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                รายละเอียดกติกาและการปฏิบัติ
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-4">
                {selectedClass.descriptionTh}
              </div>

              {selectedClass.coachingTips.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <Google_Icon name="lightbulb" size={14} />
                    <span>จุดสังเกตท่าทาง</span>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-5">
                    {selectedClass.coachingTips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
