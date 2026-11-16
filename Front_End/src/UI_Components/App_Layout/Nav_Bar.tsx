"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";
import { checkModalHealth } from "../../Core_Lib/Api_Client";
import { IFAB_SIGNAL_CLASSES } from "../../Core_Lib/Ifab_Rules_Catalog";
import type { ModalHealthResponse } from "../../Data_Types/Referee_Types";

function formatResponseTimeTh(latencyMs?: number): string | null {
  if (typeof latencyMs !== "number" || !Number.isFinite(latencyMs)) return null;
  if (latencyMs < 1000) {
    return `${(latencyMs / 1000).toFixed(1)} วินาที`;
  }
  return `${(latencyMs / 1000).toFixed(1)} วินาที`;
}

export const Nav_Bar: React.FC = () => {
  const [healthState, setHealthState] = useState<"warming" | "online" | "offline">(
    "warming"
  );
  const [healthInfo, setHealthInfo] = useState<ModalHealthResponse | null>(null);
  const [targetSignalId, setTargetSignalId] = useState<number | null>(1);

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

  useEffect(() => {
    const handleSignalChange = (event: Event) => {
      const customEvent = event as CustomEvent<number | null>;
      setTargetSignalId(
        typeof customEvent.detail === "number" ? customEvent.detail : null
      );
    };
    window.addEventListener("ifab-target-signal", handleSignalChange);
    return () => {
      window.removeEventListener("ifab-target-signal", handleSignalChange);
    };
  }, []);

  const handleResetSignal = () => {
    triggerCausalFeedback("tap");
    setTargetSignalId(null);
    window.dispatchEvent(new CustomEvent("ifab-reset-target-signal"));
  };

  const targetSignal =
    targetSignalId !== null
      ? IFAB_SIGNAL_CLASSES.find((item) => item.id === targetSignalId) ?? null
      : null;

  const shortLaw = targetSignal ? targetSignal.ifabLaw.split(" - ")[0] : "";
  const formattedLatency = formatResponseTimeTh(healthInfo?.latencyMs);

  return (
    <header className="sticky top-0 z-40 bg-[#0A1014]/90 backdrop-blur-xl border-b border-white/10 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8 min-h-16 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Identity */}
        <Link
          href="/"
          onPointerDown={() => triggerCausalFeedback("tap")}
          className="flex items-center gap-3 shrink-0 rounded-xl p-1 -ml-1 apple-pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <span className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500/25 to-teal-500/10 border border-emerald-400/40 text-emerald-400 shadow-sm shadow-emerald-950/50">
            <Google_Icon name="sports_soccer" size={22} />
          </span>
          <div className="leading-snug">
            <div className="text-sm md:text-base font-bold tracking-tight text-white">
              IFAB Referee Signal AI
            </div>
            <div className="text-[11px] text-slate-300">
              ระบบวิเคราะห์และจำแนกท่าสัญญาณผู้ตัดสินฟุตบอลตามกติกาสากล
            </div>
          </div>
        </Link>

        {/* Right Controls: Target Signal Pill + AI Connection Status */}
        <div className="flex flex-wrap items-center gap-2.5">
          {targetSignal && (
            <div className="hidden lg:flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full bg-slate-800/80 border border-white/15 text-xs text-slate-200">
              <Google_Icon
                name="verified"
                size={14}
                className="text-emerald-400 shrink-0"
              />
              <span className="max-w-[260px] truncate">
                ท่าที่กำลังศึกษา:{" "}
                <strong className="font-semibold text-white">
                  {targetSignal.nameTh}
                </strong>{" "}
                <span className="text-slate-300">({shortLaw})</span>
              </span>
              <button
                type="button"
                onClick={handleResetSignal}
                aria-label="ล้างท่าฝึกซ้อมที่เลือก"
                title="ล้างท่าฝึกซ้อมที่เลือก"
                className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <Google_Icon name="close" size={13} />
              </button>
            </div>
          )}

          {/* AI Connection Status Pill */}
          <div
            role="status"
            aria-live="polite"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium apple-tabular ${
              healthState === "online"
                ? "bg-emerald-500/15 border-emerald-400/35 text-emerald-300"
                : healthState === "warming"
                ? "bg-amber-500/15 border-amber-400/35 text-amber-200"
                : "bg-rose-500/15 border-rose-400/40 text-rose-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                healthState === "online"
                  ? "bg-emerald-400"
                  : healthState === "warming"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-rose-400"
              }`}
            />
            {healthState === "online" && (
              <button
                type="button"
                onPointerDown={() => triggerCausalFeedback("tap")}
                onClick={() => void refreshHealth()}
                className="inline-flex items-center gap-1.5 text-left hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
                title="คลิกเพื่อตรวจสอบความพร้อมของระบบ AI อีกครั้ง"
              >
                <span>ระบบวิเคราะห์ AI พร้อมใช้งาน</span>
                {formattedLatency && (
                  <span className="text-emerald-200/90 font-semibold">
                    ({formattedLatency})
                  </span>
                )}
              </button>
            )}
            {healthState === "warming" && (
              <span>กำลังเตรียมพร้อมระบบ AI...</span>
            )}
            {healthState === "offline" && (
              <div className="flex items-center gap-2">
                <span>ไม่สามารถเชื่อมต่อระบบ AI</span>
                <button
                  type="button"
                  onPointerDown={() => triggerCausalFeedback("tap")}
                  onClick={() => void refreshHealth()}
                  className="px-2 py-0.5 rounded-full bg-rose-500 hover:bg-rose-400 text-white text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  ลองเชื่อมต่อใหม่
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
