"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Drill_Selector,
  Live_Drill_Feed,
  Media_Upload_Analyzer,
} from "../UI_Components/Drill_Practice";
import { Google_Icon } from "../UI_Components/Common/Google_Icon";
import { triggerCausalFeedback } from "../Core_Lib/Apple_Spring_Engine";
import { IFAB_SIGNAL_CLASSES } from "../Core_Lib/Ifab_Rules_Catalog";
import type { SignalClassInfo } from "../Data_Types/Referee_Types";

type StudioMode = "webcam" | "image" | "video";

const STUDIO_TABS: {
  id: StudioMode;
  label: string;
  icon: string;
}[] = [
  { id: "webcam", label: "กล้องสด", icon: "videocam" },
  { id: "image", label: "รูปภาพ", icon: "photo_camera" },
  { id: "video", label: "วิดีโอ", icon: "movie" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<StudioMode>("webcam");
  const [selectedSignalId, setSelectedSignalId] = useState<number | null>(1);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent<number | null>("ifab-target-signal", {
        detail: selectedSignalId,
      })
    );
  }, [selectedSignalId]);

  useEffect(() => {
    const handleReset = () => setSelectedSignalId(null);
    window.addEventListener("ifab-reset-target-signal", handleReset);
    return () => {
      window.removeEventListener("ifab-reset-target-signal", handleReset);
    };
  }, []);

  const handleSelectSignal = useCallback((signal: SignalClassInfo) => {
    setSelectedSignalId(signal.id);
  }, []);

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number
  ) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const nextIdx =
      e.key === "ArrowRight"
        ? (idx + 1) % STUDIO_TABS.length
        : (idx - 1 + STUDIO_TABS.length) % STUDIO_TABS.length;
    const nextTab = STUDIO_TABS[nextIdx].id;
    setActiveTab(nextTab);
    document.getElementById(`tab-${nextTab}`)?.focus();
  };

  const selectedSignal =
    selectedSignalId !== null
      ? IFAB_SIGNAL_CLASSES.find((item) => item.id === selectedSignalId) ?? null
      : null;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#070B0F] text-slate-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Minimal Workspace Bar */}
        <section
          aria-label="เลือกโหมดการทำงาน"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-white">
            ระบบวิเคราะห์สัญญาณผู้ตัดสิน
          </h1>

          <div
            role="tablist"
            aria-label="โหมดวิเคราะห์"
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] self-start sm:self-auto"
          >
            {STUDIO_TABS.map((tab, idx) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  onPointerDown={() => triggerCausalFeedback("snap")}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    isActive
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  <Google_Icon name={tab.icon} size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Main 2-Column Workspace */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            className="lg:col-span-8"
          >
            {activeTab === "webcam" ? (
              <Live_Drill_Feed targetSignal={selectedSignal} />
            ) : (
              <Media_Upload_Analyzer mode={activeTab} />
            )}
          </div>

          <div className="lg:col-span-4">
            <Drill_Selector
              selectedSignalId={selectedSignalId}
              onSelectSignal={handleSelectSignal}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
