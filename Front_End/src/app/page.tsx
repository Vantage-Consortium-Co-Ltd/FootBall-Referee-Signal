"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Drill_Selector,
  Live_Drill_Feed,
} from "../UI_Components/Drill_Practice";
import { IFAB_SIGNAL_CLASSES } from "../Core_Lib/Ifab_Rules_Catalog";
import type { SignalClassInfo } from "../Data_Types/Referee_Types";

export default function Home() {
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

  const selectedSignal =
    selectedSignalId !== null
      ? IFAB_SIGNAL_CLASSES.find((item) => item.id === selectedSignalId) ?? null
      : null;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#070B0F] text-slate-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Minimal Header Bar */}
        <section className="flex items-center justify-between gap-4">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-white">
            ระบบวิเคราะห์สัญญาณผู้ตัดสิน
          </h1>
        </section>

        {/* Main 2-Column Workspace */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8">
            <Live_Drill_Feed targetSignal={selectedSignal} />
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
