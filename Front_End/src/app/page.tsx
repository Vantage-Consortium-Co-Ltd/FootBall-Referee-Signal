"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Live_Drill_Feed } from "../UI_Components/Drill_Practice";
import { IFAB_SIGNAL_CLASSES } from "../Core_Lib/Ifab_Rules_Catalog";
import type { SignalClassInfo } from "../Data_Types/Referee_Types";

function LivePracticeContent() {
  const searchParams = useSearchParams();
  const signalParam = searchParams.get("signal");

  const [targetSignalId, setTargetSignalId] = useState<number | null>(() => {
    if (signalParam) {
      const parsed = parseInt(signalParam, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  });

  useEffect(() => {
    if (signalParam) {
      const parsed = parseInt(signalParam, 10);
      if (Number.isFinite(parsed)) {
        setTargetSignalId(parsed);
      }
    }
  }, [signalParam]);

  useEffect(() => {
    const handleReset = () => setTargetSignalId(null);
    window.addEventListener("ifab-reset-target-signal", handleReset);
    return () => {
      window.removeEventListener("ifab-reset-target-signal", handleReset);
    };
  }, []);

  const selectedSignal: SignalClassInfo | null =
    targetSignalId !== null
      ? IFAB_SIGNAL_CLASSES.find((item) => item.id === targetSignalId) ?? null
      : null;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#070B0F] text-slate-100 flex flex-col justify-center py-4 md:py-6 px-4 md:px-8">
      <div className="max-w-5xl w-full mx-auto">
        <Live_Drill_Feed targetSignal={selectedSignal} />
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-3.5rem)] bg-[#070B0F]" />}>
      <LivePracticeContent />
    </Suspense>
  );
}
