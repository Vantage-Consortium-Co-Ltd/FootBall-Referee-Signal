"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Google_Icon } from "../Common/Google_Icon";

const NAV_ITEMS = [
  { href: "/drills", label: "ห้องฝึกซ้อมสด", icon: "videocam" },
  { href: "/examination", label: "ห้องสอบสถานการณ์", icon: "quiz" },
  { href: "/handbook", label: "คู่มือ IFAB 20 ท่า", icon: "menu_book" },
  { href: "/gradebook", label: "สมุดผลการประเมิน", icon: "monitoring" },
] as const;

export const Nav_Bar: React.FC = () => {
  const pathname = usePathname();
  const isLightRoute =
    pathname?.startsWith("/handbook") || pathname?.startsWith("/gradebook");

  return (
    <nav
      className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors print:hidden ${
        isLightRoute
          ? "bg-white/95 border-slate-200 text-slate-900"
          : "bg-slate-900/95 border-slate-800 text-slate-100"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <span
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
              isLightRoute
                ? "bg-cyan-700 text-white group-hover:bg-cyan-800"
                : "bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 group-hover:bg-cyan-500/25"
            }`}
          >
            <Google_Icon name="sports_soccer" size={20} />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-extrabold tracking-tight">
              Referee Academy AI
            </div>
            <div
              className={`text-[10px] font-medium ${
                isLightRoute ? "text-slate-500" : "text-slate-400"
              }`}
            >
              สื่อการสอนและประเมินผลผู้ตัดสิน
            </div>
          </div>
        </Link>

        {/* Center: 4 Main Classroom Tabs */}
        <div className="hidden lg:flex items-center gap-1.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                  active
                    ? isLightRoute
                      ? "bg-teal-50 border-teal-200 text-teal-800 shadow-2xs"
                      : "bg-cyan-950/70 border-cyan-500/50 text-cyan-300 shadow-sm"
                    : isLightRoute
                    ? "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    : "border-transparent text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                }`}
              >
                <Google_Icon name={item.icon} size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right: Offline Status & Trainee Profile Pill */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium ${
              isLightRoute
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Offline Demo Ready</span>
          </div>

          <Link
            href="/gradebook"
            className={`flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border text-xs font-semibold transition ${
              isLightRoute
                ? "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800"
                : "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200"
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                isLightRoute
                  ? "bg-cyan-700 text-white"
                  : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              }`}
            >
              IR
            </span>
            <span className="hidden md:inline">อัศวิน · Level 2</span>
          </Link>
        </div>
      </div>

      {/* Mobile Compact Navigation Row */}
      <div
        className={`lg:hidden border-t px-3 py-2 flex items-center gap-1.5 overflow-x-auto ${
          isLightRoute ? "border-slate-200 bg-slate-50/70" : "border-slate-800 bg-slate-950/70"
        }`}
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 shrink-0 border transition ${
                active
                  ? isLightRoute
                    ? "bg-teal-50 border-teal-200 text-teal-800"
                    : "bg-cyan-950/70 border-cyan-500/50 text-cyan-300"
                  : isLightRoute
                  ? "border-transparent text-slate-600"
                  : "border-transparent text-slate-400"
              }`}
            >
              <Google_Icon name={item.icon} size={14} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
