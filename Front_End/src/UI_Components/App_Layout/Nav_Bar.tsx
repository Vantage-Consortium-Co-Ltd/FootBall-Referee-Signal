"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";
import { checkModalHealth } from "../../Core_Lib/Api_Client";
import { IFAB_SIGNAL_CLASSES } from "../../Core_Lib/Ifab_Rules_Catalog";
import type { ModalHealthResponse } from "../../Data_Types/Referee_Types";

function formatLatencySec(latencyMs?: number): string | null {
  if (typeof latencyMs !== "number" || !Number.isFinite(latencyMs)) return null;
  return `${(latencyMs / 1000).toFixed(1)}s`;
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
  const formattedLatency = formatLatencySec(healthInfo?.latencyMs);

  return (
    <header className="sticky top-0 z-40 bg-[#070B0F]/85 backdrop-blur-xl border-b border-white/[0.08] text-slate-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between gap-3">
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

        <div className="flex items-center gap-2">
          {targetSignal && (
            <div className="hidden md:flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs text-slate-200">
              <Google_Icon
                name="verified"
                size={13}
                className="text-emerald-400 shrink-0"
              />
              <span className="max-w-[240px] truncate font-medium text-white">
                {targetSignal.nameTh} · {shortLaw}
              </span>
              <button
                type="button"
                onClick={handleResetSignal}
                aria-label="ล้างท่าที่เลือก"
                className="p-0.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <Google_Icon name="close" size={13} />
              </button>
            </div>
          )}

          <div
            role="status"
            aria-live="polite"
            className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium apple-tabular ${
              healthState === "online"
                ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-300"
                : healthState === "warming"
                ? "bg-amber-500/10 border-amber-400/30 text-amber-200"
                : "bg-rose-500/10 border-rose-400/35 text-rose-200"
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
              <button
                type="button"
                onPointerDown={() => triggerCausalFeedback("tap")}
                onClick={() => void refreshHealth()}
                className="inline-flex items-center gap-1.5 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
              >
                <span>AI พร้อมใช้งาน</span>
                {formattedLatency && (
                  <span className="text-emerald-200/80">{formattedLatency}</span>
                )}
              </button>
            )}
            {healthState === "warming" && <span>กำลังเตรียมระบบ...</span>}
            {healthState === "offline" && (
              <button
                type="button"
                onPointerDown={() => triggerCausalFeedback("tap")}
                onClick={() => void refreshHealth()}
                className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
              >
                ออฟไลน์
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
