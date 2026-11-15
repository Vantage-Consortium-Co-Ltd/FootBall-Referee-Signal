"use client";

import React from "react";
import Link from "next/link";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

export interface CurriculumHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalCount: number;
  filteredCount: number;
  isLightMode: boolean;
  onToggleTheme: () => void;
}

export const Curriculum_Header: React.FC<CurriculumHeaderProps> = ({
  searchQuery,
  onSearchChange,
  totalCount,
  filteredCount,
  isLightMode,
  onToggleTheme,
}) => {
  return (
    <div className="space-y-4">
      {/* Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3">
          <Link
            href="/"
            onClick={() => triggerCausalFeedback("tap")}
            className={`w-10 h-10 rounded-xl border transition-colors duration-150 inline-flex items-center justify-center apple-pressable ${
              isLightMode
                ? "bg-white border-black/[0.08] hover:bg-[#F2F2F7] text-[#1D1D1F] shadow-xs"
                : "bg-[#1C1C1E] border-white/[0.1] hover:bg-[#2C2C2E] text-[#A1A1A6] hover:text-[#F5F5F7]"
            }`}
          >
            <Google_Icon name="arrow_back" size={20} />
          </Link>
          <div>
            <h1
              className={`apple-title text-xl md:text-2xl font-bold tracking-tight ${
                isLightMode ? "text-[#1D1D1F]" : "text-[#F5F5F7]"
              }`}
            >
              คลังสื่อการสอนสัญญาณผู้ตัดสิน {totalCount} ท่า (IFAB Curriculum)
            </h1>
            <p
              className={`text-xs mt-0.5 apple-tabular ${
                isLightMode ? "text-[#6E6E73]" : "text-[#A1A1A6]"
              }`}
            >
              คู่มือมาตรฐาน International Football Association Board · Laws of the Game 2025/26 (พบ {filteredCount} ท่าทาง)
            </p>
          </div>
        </div>

        {/* Right Badges & Reading Theme Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 apple-tabular ${
              isLightMode
                ? "bg-[#007AFF]/10 border-[#007AFF]/20 text-[#007AFF]"
                : "bg-[#0A84FF]/15 border-[#0A84FF]/30 text-[#0A84FF]"
            }`}
          >
            <Google_Icon name="menu_book" size={14} />
            <span>อัปเดต 2025/26</span>
          </span>

          <button
            type="button"
            onClick={() => {
              triggerCausalFeedback("tap");
              onToggleTheme();
            }}
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-colors duration-150 apple-pressable ${
              isLightMode
                ? "bg-white border-black/[0.08] hover:bg-[#F2F2F7] text-[#1D1D1F] shadow-xs"
                : "bg-[#1C1C1E] border-white/[0.1] hover:bg-[#2C2C2E] text-[#FF9F0A]"
            }`}
          >
            <Google_Icon
              name={isLightMode ? "dark_mode" : "light_mode"}
              size={15}
              className={isLightMode ? "text-slate-600" : "text-amber-400"}
            />
            <span>{isLightMode ? "โหมดมืด" : "โหมดอ่านหนังสือ"}</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
          <Google_Icon
            name="search"
            size={18}
            className="text-[#8E8E93]"
          />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ค้นหาท่าสัญญาณ กติกา หรือคำสำคัญ (เช่น ฟรีคิก, ล้ำหน้า, จุดโทษ, Law 13)..."
          className={`w-full pl-10 pr-10 py-2.5 rounded-2xl border text-sm transition-colors duration-150 focus:outline-none focus:ring-2 ${
            isLightMode
              ? "bg-white border-black/[0.08] text-[#1D1D1F] placeholder:text-[#8E8E93] shadow-xs focus:border-[#007AFF] focus:ring-[#007AFF]/20"
              : "bg-[#1C1C1E] border-white/[0.1] text-[#F5F5F7] placeholder:text-[#636366] focus:border-[#0A84FF] focus:ring-[#0A84FF]/25"
          }`}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              triggerCausalFeedback("tap");
              onSearchChange("");
            }}
            className={`absolute inset-y-0 right-3 flex items-center transition-colors apple-pressable ${
              isLightMode ? "text-[#8E8E93] hover:text-[#1D1D1F]" : "text-[#8E8E93] hover:text-[#F5F5F7]"
            }`}
            aria-label="ล้างคำค้นหา"
          >
            <Google_Icon name="close" size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
