"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";
import { checkModalHealth } from "../../Core_Lib/Api_Client";
import type { ModalHealthResponse } from "../../Data_Types/Referee_Types";

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

  const [healthState, setHealthState] = useState<"warming" | "online" | "offline">("warming");
  const [healthInfo, setHealthInfo] = useState<ModalHealthResponse | null>(null);

  const refreshHealth = useCallback(async () => {
    setHealthState("warming");
    const res = await checkModalHealth();
    setHealthInfo(res);
    setHealthState(res.status === "ok" ? "online" : "offline");
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      const res = await checkModalHealth();
      if (!active) return;
      setHealthInfo(res);
      setHealthState(res.status === "ok" ? "online" : "offline");
    };
    init();
    return () => {
      active = false;
    };
  }, []);

  const statusPillStyle =
    healthState === "online"
      ? isLightRoute
        ? "bg-[#34C759]/10 border-[#34C759]/30 text-[#1E8E3E]"
        : "bg-[#30D158]/15 border-[#30D158]/35 text-[#30D158]"
      : healthState === "warming"
      ? isLightRoute
        ? "bg-[#FF9500]/10 border-[#FF9500]/30 text-[#C96A00]"
        : "bg-[#FF9F0A]/15 border-[#FF9F0A]/35 text-[#FF9F0A]"
      : isLightRoute
      ? "bg-[#007AFF]/10 border-[#007AFF]/30 text-[#007AFF]"
      : "bg-[#0A84FF]/15 border-[#0A84FF]/35 text-[#64D2FF]";

  const statusDotStyle =
    healthState === "online"
      ? isLightRoute
        ? "bg-[#34C759]"
        : "bg-[#30D158]"
      : healthState === "warming"
      ? "bg-[#FF9F0A] animate-pulse"
      : isLightRoute
      ? "bg-[#007AFF]"
      : "bg-[#64D2FF]";

  const statusLabel =
    healthState === "online"
      ? `Modal AI Online · ${(healthInfo?.device || "cpu").toUpperCase()}${
          healthInfo?.latencyMs ? ` (${healthInfo.latencyMs}ms)` : ""
        }`
      : healthState === "warming"
      ? "Warming Modal CPU..."
      : "Simulation Fallback";

  return (
    <nav
      className={`sticky top-0 z-40 transition-colors print:hidden ${
        isLightRoute
          ? "apple-chrome-light text-[#1D1D1F]"
          : "apple-chrome-dark text-[#F5F5F7]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <Link
          href="/"
          onPointerDown={() => triggerCausalFeedback("tap")}
          className="flex items-center gap-2.5 shrink-0 group apple-pressable"
        >
          <span
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
              isLightRoute
                ? "bg-[#007AFF] text-white shadow-sm"
                : "bg-[#0A84FF]/15 border border-[#0A84FF]/40 text-[#0A84FF]"
            }`}
          >
            <Google_Icon name="sports_soccer" size={20} />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold apple-title">
              Referee Academy AI
            </div>
            <div
              className={`text-[10px] font-medium ${
                isLightRoute ? "text-[#6E6E73]" : "text-[#A1A1A6]"
              }`}
            >
              สื่อการสอนและประเมินผลผู้ตัดสิน
            </div>
          </div>
        </Link>

        {/* Center: Apple Segmented Control Tabs */}
        <div
          className={`hidden lg:flex items-center gap-1 p-1 rounded-2xl border ${
            isLightRoute
              ? "bg-[#E5E5EA]/75 border-black/[0.06]"
              : "bg-[#141416]/90 border-white/[0.08]"
          }`}
        >
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onPointerDown={() => triggerCausalFeedback("tap")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 apple-pressable border ${
                  active
                    ? isLightRoute
                      ? "bg-white border-black/[0.08] text-[#1D1D1F] shadow-sm"
                      : "bg-[#2C2C2E] border-white/[0.12] text-[#F5F5F7] shadow-sm"
                    : isLightRoute
                    ? "border-transparent text-[#6E6E73] hover:text-[#1D1D1F]"
                    : "border-transparent text-[#A1A1A6] hover:text-[#F5F5F7]"
                }`}
              >
                <Google_Icon
                  name={item.icon}
                  size={16}
                  className={
                    active
                      ? isLightRoute
                        ? "text-[#007AFF]"
                        : "text-[#0A84FF]"
                      : undefined
                  }
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right: Live Modal API Status & Trainee Profile Pill */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onPointerDown={() => triggerCausalFeedback("tap")}
            onClick={refreshHealth}
            title={
              healthState === "online"
                ? `Model: ${healthInfo?.model} (conf ${healthInfo?.conf}, imgsz ${healthInfo?.imgsz}) — คลิกเพื่อเช็คสถานะอีกครั้ง`
                : healthInfo?.detail || "คลิกเพื่อ Warmup / เชื่อมต่อ Modal API"
            }
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium apple-pressable apple-tabular ${statusPillStyle}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusDotStyle}`} />
            <span>{statusLabel}</span>
          </button>

          <Link
            href="/gradebook"
            onPointerDown={() => triggerCausalFeedback("tap")}
            className={`flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full border text-xs font-semibold apple-pressable ${
              isLightRoute
                ? "bg-white border-black/[0.08] hover:bg-[#F2F2F7] text-[#1D1D1F] shadow-sm"
                : "bg-[#1C1C1E] border-white/[0.1] hover:bg-[#2C2C2E] text-[#F5F5F7]"
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                isLightRoute
                  ? "bg-[#007AFF] text-white"
                  : "bg-[#0A84FF] text-white"
              }`}
            >
              IR
            </span>
            <span className="hidden md:inline">อัศวิน · Level 2</span>
          </Link>
        </div>
      </div>

      {/* Mobile Compact Segmented Navigation Row */}
      <div
        className={`lg:hidden border-t px-3 py-2 flex items-center gap-1.5 overflow-x-auto ${
          isLightRoute
            ? "border-black/[0.08] bg-[#F2F2F7]/90"
            : "border-white/[0.08] bg-[#141416]/90"
        }`}
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onPointerDown={() => triggerCausalFeedback("tap")}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 shrink-0 border apple-pressable ${
                active
                  ? isLightRoute
                    ? "bg-white border-black/[0.08] text-[#007AFF] shadow-sm"
                    : "bg-[#2C2C2E] border-white/[0.12] text-[#0A84FF]"
                  : isLightRoute
                  ? "border-transparent text-[#6E6E73]"
                  : "border-transparent text-[#A1A1A6]"
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
