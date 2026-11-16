"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  formatSignalEnglishName,
  IFAB_SIGNAL_CLASSES,
} from "../../Core_Lib/Ifab_Rules_Catalog";
import { GestureCategory, SignalClassInfo } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../../UI_Components/Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

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
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#070B0F] text-slate-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Google_Icon name="menu_book" size={20} className="text-emerald-400" />
            <span>กติกาและท่าสัญญาณผู้ตัดสิน IFAB (20 ท่ามาตรฐาน)</span>
          </h1>

          <div className="relative sm:w-72">
            <Google_Icon
              name="search"
              size={15}
              className="text-slate-500 absolute left-3 top-2.5 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อท่าหรือกติกา..."
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
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
                    ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300 font-semibold"
                    : "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white"
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
                  className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                    isSelected
                      ? "bg-emerald-500/15 border-emerald-400/60 text-white"
                      : "bg-white/[0.02] border-white/[0.06] hover:border-white/20 text-slate-300"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {cls.nameTh}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {formatSignalEnglishName(cls.name)}
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-[10px] text-slate-300 font-mono">
                    {cls.ifabLaw.split(" - ")[0]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 bg-[#0D131A] border border-white/[0.08] rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-xs font-semibold">
                  {selectedClass.ifabLaw}
                </span>
                <h2 className="text-xl font-bold text-white mt-2">
                  {selectedClass.nameTh}
                </h2>
                <div className="text-xs text-slate-400 mt-0.5">
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
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/35 text-amber-300 text-xs font-medium">
                    อยู่ระหว่างเพิ่มข้อมูลฝึกสอน
                  </span>
                )}
              </div>
            </div>

            <div className="border-t border-white/[0.08] pt-4 space-y-3">
              <div className="text-xs font-semibold text-slate-200">
                รายละเอียดกติกาและการปฏิบัติ
              </div>
              <div className="text-xs text-slate-300 leading-relaxed bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
                {selectedClass.descriptionTh}
              </div>

              {selectedClass.coachingTips.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                    <Google_Icon name="lightbulb" size={14} />
                    <span>จุดสังเกตท่าทาง</span>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc pl-5">
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
