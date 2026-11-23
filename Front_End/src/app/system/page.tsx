"use client";

import React, { useCallback, useEffect, useState } from "react";
import { checkModalHealth } from "../../Core_Lib/Api_Client";
import { MODEL_SPEC_INFO } from "../../Core_Lib/Ifab_Rules_Catalog";
import type { ModalHealthResponse } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../../UI_Components/Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

export default function SystemPage() {
  const [health, setHealth] = useState<ModalHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    triggerCausalFeedback("tap");
    const res = await checkModalHealth(true);
    setHealth(res);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    checkModalHealth().then((res) => {
      if (!active) return;
      setHealth(res);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[#F8FAFC] dark:bg-[#070B0F] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Google_Icon name="monitoring" size={20} className="text-emerald-600 dark:text-emerald-400" />
            <span>สถานะระบบและข้อมูลโมเดล AI</span>
          </h1>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => void refresh()}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 apple-pressable disabled:opacity-50 shadow-md shadow-emerald-500/10 transition"
          >
            <Google_Icon name="refresh" size={14} />
            <span>{isLoading ? "กำลังตรวจสอบ..." : "รีเฟรชสถานะ"}</span>
          </button>
        </div>

        {/* Live Service Health Card */}
        <section className="bg-white dark:bg-[#0D131A] border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-sm transition-colors duration-200">
          <div className="flex items-center justify-between text-xs">
            <h2 className="font-semibold text-slate-900 dark:text-white">การเชื่อมต่อ Modal AI Service</h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                health?.status === "ok"
                  ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/15 border border-rose-400/40 text-rose-700 dark:text-rose-300"
              }`}
            >
              {health?.status === "ok" ? "ออนไลน์" : "ไม่พร้อมใช้งาน"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs apple-tabular">
            <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-3.5 shadow-sm">
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">เวลาตอบสนอง</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {health?.latencyMs !== undefined ? `${health.latencyMs} ms` : "-"}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-3.5 shadow-sm">
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">อุปกรณ์ประมวลผล</div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-1 uppercase">
                {health?.device || "CPU"}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-3.5 shadow-sm">
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">Threshold ความเชื่อมั่น</div>
              <div className="text-base font-bold text-sky-600 dark:text-sky-400 mt-1">
                ≥ {health?.conf ?? 0.25}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-3.5 shadow-sm">
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">ขนาดภาพนำเข้า</div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {health?.imgsz ?? 640} px
              </div>
            </div>
          </div>
        </section>

        {/* Model Benchmark Card */}
        <section className="bg-white dark:bg-[#0D131A] border border-slate-200/80 dark:border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-sm transition-colors duration-200">
          <h2 className="text-xs font-semibold text-slate-900 dark:text-white">ข้อมูลจำเพาะของโมเดล (YOLO26n-pose)</h2>

          <div className="grid grid-cols-3 gap-3 text-xs apple-tabular">
            <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-3.5 shadow-sm">
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">ความแม่นยำ (Accuracy)</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {(MODEL_SPEC_INFO.accuracy * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-3.5 shadow-sm">
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">Macro-F1</div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {MODEL_SPEC_INFO.macroF1.toFixed(2)}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-3.5 shadow-sm">
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">Pose mAP (50-95)</div>
              <div className="text-base font-bold text-sky-600 dark:text-sky-400 mt-1">
                {MODEL_SPEC_INFO.poseMap5095.toFixed(3)}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
