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
  hint: string;
  icon: string;
}[] = [
  {
    id: "webcam",
    label: "1. กล้องวิเคราะห์สด",
    hint: "ฝึกซ้อมและตรวจจับแบบเรียลไทม์",
    icon: "videocam",
  },
  {
    id: "image",
    label: "2. วิเคราะห์จากรูปภาพ",
    hint: "ตรวจสอบภาพถ่ายและเส้นโครงกระดูก",
    icon: "photo_camera",
  },
  {
    id: "video",
    label: "3. วิเคราะห์จากวิดีโอ",
    hint: "สร้างไทม์ไลน์จังหวะสัญญาณ",
    icon: "movie",
  },
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
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#060B0F] via-[#091218] to-[#060B0F] text-slate-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
        {/* Studio Intro & Accessible Mode Switcher */}
        <section
          aria-label="เลือกโหมดการทำงาน"
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-white/10"
        >
          <div className="space-y-1.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              สตูดิโอวิเคราะห์ท่าสัญญาณผู้ตัดสินฟุตบอล
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              จำแนกและฝึกซ้อมท่าสัญญาณผู้ตัดสินตามกติกาสากล IFAB ครบ 20 ท่ามาตรฐาน
              ผ่านกล้องสด ภาพถ่าย และคลิปวิดีโอการแข่งขัน
            </p>
          </div>

          <div
            role="tablist"
            aria-label="โหมดวิเคราะห์สัญญาณผู้ตัดสิน"
            className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-white/10 shrink-0"
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
                  className={`px-3.5 py-2 rounded-xl text-left transition apple-pressable border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    isActive
                      ? "bg-emerald-500 border-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
                      : "border-transparent text-slate-200 hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Google_Icon name={tab.icon} size={15} />
                    <span>{tab.label}</span>
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      isActive ? "text-slate-900 font-medium" : "text-slate-400"
                    }`}
                  >
                    {tab.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Main Content Workspace: 8 Col Studio + 4 Col Interactive IFAB Guide */}
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
