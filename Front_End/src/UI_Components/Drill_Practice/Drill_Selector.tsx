"use client";

import React, { useState } from "react";
import { GestureCategory, SignalClassInfo } from "../../Data_Types/Referee_Types";
import {
  IFAB_SIGNAL_CLASSES,
  MODEL_SPEC_INFO,
} from "../../Core_Lib/Ifab_Rules_Catalog";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

const CATEGORIES: { id: GestureCategory | "all"; label: string }[] = [
  { id: "all", label: "ทั้งหมด (20)" },
  { id: "restarts", label: "ลูกตั้งเตะ" },
  { id: "fouls", label: "การทำฟาวล์" },
  { id: "match_control", label: "การควบคุมเกม" },
  { id: "offside", label: "ล้ำหน้า" },
];

export const Drill_Selector: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<GestureCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedId, setSelectedId] = useState<number>(1);

  const filtered = IFAB_SIGNAL_CLASSES.filter((cls) => {
    const matchesCategory =
      activeCategory === "all" || cls.category === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      cls.nameTh.toLowerCase().includes(q) ||
      cls.name.toLowerCase().includes(q) ||
      cls.ifabLaw.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const selectedClass: SignalClassInfo =
    IFAB_SIGNAL_CLASSES.find((c) => c.id === selectedId) || IFAB_SIGNAL_CLASSES[0];

  return (
    <div className="apple-material-dark rounded-[22px] p-4 flex flex-col gap-3">
      {/* Model Evaluation Benchmark Header (apiSpec.md & hfModelCard.md) */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold apple-title text-[#F5F5F7] flex items-center gap-2">
          <Google_Icon name="layers" size={16} className="text-[#0A84FF]" />
          20 คลาสของโมเดล YOLO26n-pose
        </h2>
        <span className="text-[11px] text-[#A1A1A6] font-mono apple-tabular">
          {filtered.length} / {IFAB_SIGNAL_CLASSES.length}
        </span>
      </div>

      {/* Model Test Metrics Summary */}
      <div className="grid grid-cols-3 gap-2 text-center text-[11px] apple-tabular">
        <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-2">
          <div className="text-[#6E6E73]">Macro-F1</div>
          <div className="font-mono font-bold text-[#0A84FF] mt-0.5">
            {MODEL_SPEC_INFO.macroF1.toFixed(2)}
          </div>
        </div>
        <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-2">
          <div className="text-[#6E6E73]">Accuracy</div>
          <div className="font-mono font-bold text-[#30D158] mt-0.5">
            {(MODEL_SPEC_INFO.accuracy * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-2">
          <div className="text-[#6E6E73]">Pose mAP</div>
          <div className="font-mono font-bold text-[#64D2FF] mt-0.5">
            {MODEL_SPEC_INFO.poseMap5095.toFixed(3)}
          </div>
        </div>
      </div>

      {/* Known F1=0 Limitation Banner */}
      <div className="px-3 py-2 rounded-xl bg-[#2C1A04]/80 border border-[#FF9F0A]/35 text-[11px] text-[#FFD18A] flex items-start gap-2">
        <Google_Icon name="warning" size={14} className="text-[#FF9F0A] shrink-0 mt-0.5" />
        <span>
          จากชุดทดสอบ {MODEL_SPEC_INFO.testPersons} คน คลาส{" "}
          <code className="font-mono text-[#FF9F0A]">Offside</code>,{" "}
          <code className="font-mono text-[#FF9F0A]">Goal</code>,{" "}
          <code className="font-mono text-[#FF9F0A]">Elbowing</code> มี{" "}
          <b>F1 = 0</b> ยังจำแนกไม่ได้
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Google_Icon name="search" size={16} className="text-[#6E6E73] absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาชื่อคลาส (เช่น Card, Corner_Kick)..."
          className="w-full bg-[#141416] border border-white/[0.1] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#F5F5F7] placeholder-[#6E6E73] focus:outline-none focus:border-[#0A84FF] transition"
        />
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
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

      {/* 20 Classes List */}
      <div className="overflow-y-auto space-y-1.5 pr-1 max-h-[280px]">
        {filtered.map((cls) => {
          const isSelected = cls.id === selectedClass.id;
          return (
            <button
              key={cls.id}
              type="button"
              onPointerDown={() => triggerCausalFeedback("snap")}
              onClick={() => setSelectedId(cls.id)}
              className={`w-full text-left px-3 py-2 rounded-xl border apple-pressable flex items-center justify-between gap-2 ${
                isSelected
                  ? "bg-[#0A84FF]/15 border-[#0A84FF] text-[#F5F5F7]"
                  : "bg-[#141416]/80 border-white/[0.08] text-[#A1A1A6] hover:border-white/[0.18]"
              }`}
            >
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#F5F5F7] truncate">
                  #{cls.id} · {cls.nameTh}
                </div>
                <div className="text-[11px] font-mono text-[#A1A1A6] truncate">
                  {cls.name}
                </div>
              </div>

              {cls.isF1ZeroLimited ? (
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#FF9F0A]/15 border border-[#FF9F0A]/40 text-[#FF9F0A] text-[10px] font-mono font-bold">
                  F1=0
                </span>
              ) : (
                <span className="shrink-0 text-[10px] font-mono text-[#6E6E73]">
                  {cls.ifabLaw.split(" - ")[0]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Class Detail */}
      <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-3 text-xs space-y-1">
        <div className="font-bold text-[#F5F5F7]">
          {selectedClass.nameTh} ({selectedClass.name})
        </div>
        <div className="text-[11px] text-[#0A84FF] font-mono">
          {selectedClass.ifabLaw}
        </div>
        <p className="text-[11px] text-[#A1A1A6] leading-relaxed">
          {selectedClass.descriptionTh}
        </p>
      </div>
    </div>
  );
};
