"use client";

import React from "react";
import Link from "next/link";
import { Google_Icon } from "../Common/Google_Icon";

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
            className={`p-2 rounded-xl border transition inline-flex items-center justify-center ${
              isLightMode
                ? "bg-white border-slate-200 hover:border-slate-300 text-slate-600 shadow-xs"
                : "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Google_Icon name="arrow_back" size={20} />
          </Link>
          <div>
            <h1
              className={`text-xl md:text-2xl font-extrabold tracking-tight ${
                isLightMode ? "text-slate-900" : "text-slate-100"
              }`}
            >
              คลังสื่อการสอนสัญญาณผู้ตัดสิน {totalCount} ท่า (IFAB Curriculum)
            </h1>
            <p
              className={`text-xs mt-0.5 ${
                isLightMode ? "text-slate-500" : "text-slate-400"
              }`}
            >
              คู่มือมาตรฐาน International Football Association Board · Laws of the Game 2025/26 (พบ {filteredCount} ท่าทาง)
            </p>
          </div>
        </div>

        {/* Right Badges & Reading Theme Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 ${
              isLightMode
                ? "bg-sky-50 border-sky-200 text-sky-700"
                : "bg-blue-950/50 border-blue-500/40 text-blue-300"
            }`}
          >
            <Google_Icon name="menu_book" size={14} />
            <span>อัปเดต 2025/26</span>
          </span>

          <button
            type="button"
            onClick={onToggleTheme}
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition ${
              isLightMode
                ? "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                : "bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200"
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
            className={isLightMode ? "text-slate-400" : "text-slate-500"}
          />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ค้นหาท่าสัญญาณ กติกา หรือคำสำคัญ (เช่น ฟรีคิก, ล้ำหน้า, จุดโทษ, Law 13)..."
          className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm transition focus:outline-none focus:ring-2 ${
            isLightMode
              ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-600 focus:ring-cyan-500/20"
              : "bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
          }`}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
            aria-label="ล้างคำค้นหา"
          >
            <Google_Icon name="close" size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
