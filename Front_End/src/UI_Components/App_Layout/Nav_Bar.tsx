"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";
import { checkModalHealth } from "../../Core_Lib/Api_Client";
import type { ModalHealthResponse } from "../../Data_Types/Referee_Types";

const NAV_LINKS = [
  { href: "/", label: "หน้าหลัก", icon: "sports_soccer" },
  { href: "/live", label: "ฝึกซ้อมสด", icon: "videocam" },
  { href: "/upload", label: "ตรวจคลิป/ภาพ", icon: "photo_camera" },
  { href: "/signals", label: "กติกา 20 ท่า", icon: "menu_book" },
] as const;

function formatLatencySec(latencyMs?: number): string | null {
  if (typeof latencyMs !== "number" || !Number.isFinite(latencyMs)) return null;
  return `${(latencyMs / 1000).toFixed(1)}s`;
}

export const Nav_Bar: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [healthState, setHealthState] = useState<"warming" | "online" | "offline">(
    "warming"
  );
  const [healthInfo, setHealthInfo] = useState<ModalHealthResponse | null>(null);

  const refreshHealth = useCallback(async () => {
    setHealthState("warming");
    const res = await checkModalHealth();
    setHealthInfo(res);
    setHealthState(res.status === "ok" ? "online" : "offline");
  }, []);

  useEffect(() => {
    let active = true;
    checkModalHealth().then((res) => {
      if (!active) return;
      setHealthInfo(res);
      setHealthState(res.status === "ok" ? "online" : "offline");
    });
    return () => {
      active = false;
    };
  }, []);

  // Close mobile drawer upon navigating
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const formattedLatency = formatLatencySec(healthInfo?.latencyMs);

  const isLinkActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070B0F]/90 backdrop-blur-xl border-b border-white/[0.08] text-slate-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand / Logo */}
        <Link
          href="/"
          onPointerDown={() => triggerCausalFeedback("tap")}
          className="flex items-center gap-2.5 shrink-0 rounded-xl p-1 -ml-1 apple-pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/15 border border-emerald-400/35 text-emerald-400">
            <Google_Icon name="sports_soccer" size={18} />
          </span>
          <span className="text-sm font-semibold tracking-tight text-white">
            IFAB Referee Signal AI
          </span>
        </Link>

        {/* Center: Underline Navigation Tabs (Desktop / Tablet) */}
        <nav
          aria-label="เมนูหลัก"
          className="hidden md:flex items-center gap-6 h-full"
        >
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onPointerDown={() => triggerCausalFeedback("snap")}
                className={`relative h-full flex items-center gap-1.5 text-xs lg:text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-sm ${
                  active
                    ? "text-emerald-400 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>{link.label}</span>
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-400 rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Minimal AI Status Badge + Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/system"
            role="status"
            aria-live="polite"
            title="คลิกเพื่อดูสถานะระบบและข้อมูลโมเดล"
            onPointerDown={() => triggerCausalFeedback("tap")}
            className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium apple-tabular transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              healthState === "online"
                ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/15"
                : healthState === "warming"
                ? "bg-amber-500/10 border-amber-400/30 text-amber-200 hover:bg-amber-500/15"
                : "bg-rose-500/10 border-rose-400/35 text-rose-200 hover:bg-rose-500/15"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                healthState === "online"
                  ? "bg-emerald-400"
                  : healthState === "warming"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-rose-400"
              }`}
            />
            {healthState === "online" && (
              <>
                <span>AI พร้อมใช้งาน</span>
                {formattedLatency && (
                  <span className="text-emerald-200/80">{formattedLatency}</span>
                )}
              </>
            )}
            {healthState === "warming" && <span>กำลังเตรียมระบบ...</span>}
            {healthState === "offline" && <span>ออฟไลน์</span>}
          </Link>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? "ปิดเมนูนำทาง" : "เปิดเมนูนำทาง"}
            aria-expanded={mobileMenuOpen}
            onClick={() => {
              triggerCausalFeedback("tap");
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            className="md:hidden p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <Google_Icon name={mobileMenuOpen ? "close" : "menu"} size={18} />
          </button>
        </div>
      </div>

      {/* Sleek Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-label="เมนูนำทางบนมือถือ"
          className="md:hidden border-t border-white/[0.08] bg-[#070B0F]/95 backdrop-blur-2xl px-4 py-3 space-y-1 shadow-2xl animate-in slide-in-from-top-2 duration-150"
        >
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onPointerDown={() => triggerCausalFeedback("snap")}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? "bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-400/30"
                    : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <Google_Icon
                  name={link.icon}
                  size={18}
                  className={active ? "text-emerald-400" : "text-slate-400"}
                />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between px-3 text-xs text-slate-400">
            <Link
              href="/system"
              className="text-emerald-400 hover:underline inline-flex items-center gap-1.5 py-1"
            >
              <Google_Icon name="monitoring" size={14} />
              <span>ตรวจสอบข้อมูลระบบ & โมเดล</span>
            </Link>
            <button
              type="button"
              onClick={() => void refreshHealth()}
              className="text-slate-400 hover:text-white py-1"
            >
              รีเฟรชสถานะ
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
