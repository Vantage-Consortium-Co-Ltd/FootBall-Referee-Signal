"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";
import { checkModalHealth } from "../../Core_Lib/Api_Client";
import { MODEL_SPEC_INFO } from "../../Core_Lib/Ifab_Rules_Catalog";
import type { ModalHealthResponse } from "../../Data_Types/Referee_Types";

export const Nav_Bar: React.FC = () => {
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
    checkModalHealth().then((res) => {
      if (!active) return;
      setHealthInfo(res);
      setHealthState(res.status === "ok" ? "online" : "offline");
    });
    return () => {
      active = false;
    };
  }, []);

  const statusPillStyle =
    healthState === "online"
      ? "bg-[#30D158]/15 border-[#30D158]/35 text-[#30D158]"
      : healthState === "warming"
      ? "bg-[#FF9F0A]/15 border-[#FF9F0A]/35 text-[#FF9F0A]"
      : "bg-[#FF453A]/15 border-[#FF453A]/35 text-[#FF453A]";

  const statusDotStyle =
    healthState === "online"
      ? "bg-[#30D158]"
      : healthState === "warming"
      ? "bg-[#FF9F0A] animate-pulse"
      : "bg-[#FF453A]";

  const statusLabel =
    healthState === "online"
      ? `Modal ${(healthInfo?.device || "cpu").toUpperCase()} Online · conf ${
          healthInfo?.conf ?? 0.25
        } · imgsz ${healthInfo?.imgsz ?? 640}${
          healthInfo?.latencyMs ? ` · ${healthInfo.latencyMs}ms` : ""
        }`
      : healthState === "warming"
      ? "Warming Modal CPU..."
      : "Modal API Offline";

  return (
    <nav className="sticky top-0 z-40 apple-chrome-dark text-[#F5F5F7]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <Link
          href="/"
          onPointerDown={() => triggerCausalFeedback("tap")}
          className="flex items-center gap-2.5 shrink-0 apple-pressable"
        >
          <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#0A84FF]/15 border border-[#0A84FF]/40 text-[#0A84FF]">
            <Google_Icon name="sports_soccer" size={20} />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold apple-title">
              Football Referee Signal Service
            </div>
            <div className="text-[10px] font-mono text-[#A1A1A6]">
              YOLO26n-pose · FastAPI v{MODEL_SPEC_INFO.apiVersion}
            </div>
          </div>
        </Link>

        {/* Right: FastAPI Docs link + Live /health badge */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onPointerDown={() => triggerCausalFeedback("tap")}
            onClick={refreshHealth}
            title={
              healthState === "online"
                ? `Model: ${healthInfo?.model} — คลิกเพื่อตรวจสอบ /health อีกครั้ง`
                : healthInfo?.detail || "คลิกเพื่อ Warmup Modal API"
            }
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium apple-pressable apple-tabular ${statusPillStyle}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusDotStyle}`} />
            <span>{statusLabel}</span>
          </button>

          <a
            href={MODEL_SPEC_INFO.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={() => triggerCausalFeedback("tap")}
            className="px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 apple-pressable bg-[#1C1C1E] border-white/[0.1] hover:bg-[#2C2C2E] text-[#F5F5F7]"
          >
            <Google_Icon name="menu_book" size={14} className="text-[#0A84FF]" />
            <span>FastAPI Docs</span>
          </a>
        </div>
      </div>
    </nav>
  );
};
