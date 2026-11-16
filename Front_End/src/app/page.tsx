"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { IFAB_RULES } from "../Core_Lib/Ifab_Rules_Catalog";
import {
  Curriculum_Quick_Launch,
  Educational_Hero,
} from "../UI_Components/App_Layout";
import { Media_Upload_Analyzer } from "../UI_Components/Drill_Practice";
import { Google_Icon } from "../UI_Components/Common/Google_Icon";
import { triggerCausalFeedback } from "../Core_Lib/Apple_Spring_Engine";
import { checkModalHealth } from "../Core_Lib/Api_Client";
import type { ModalHealthResponse } from "../Data_Types/Referee_Types";

export default function Home() {
  const [selectedRuleId, setSelectedRuleId] = useState<number>(1);
  const [modalHealth, setModalHealth] = useState<ModalHealthResponse | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(true);

  const selectedRule =
    IFAB_RULES.find((r) => r.id === selectedRuleId) || IFAB_RULES[1];

  const refreshHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    const res = await checkModalHealth();
    setModalHealth(res);
    setIsCheckingHealth(false);
  }, []);

  useEffect(() => {
    let active = true;
    checkModalHealth().then((res) => {
      if (!active) return;
      setModalHealth(res);
      setIsCheckingHealth(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-black text-[#F5F5F7] p-4 md:p-8 space-y-8">
      {/* Section 1: Educational Hero & 4-Step Curriculum Flow */}
      <Educational_Hero />

      {/* Section 2: 4 Interactive Learning Module Quick-Launch Cards */}
      <Curriculum_Quick_Launch />

      {/* Section 3: Live Modal AI Quick Image Tester & IFAB Telemetry */}
      <section className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold apple-title text-[#F5F5F7] flex items-center gap-2">
              <Google_Icon name="monitoring" size={20} className="text-[#0A84FF]" />
              <span>ทดสอบตรวจจับท่าสัญญาณจริงด้วย Modal AI (YOLO26n-pose)</span>
            </h2>
            <p className="text-xs text-[#A1A1A6] mt-0.5">
              อัปโหลดภาพถ่ายเพื่อวิเคราะห์ท่าทางและวาดโครงกระดูกจริงจาก API หรือเข้าห้องฝึกซ้อมสดผ่านกล้องเว็บแคม
            </p>
          </div>

          <button
            type="button"
            onPointerDown={() => triggerCausalFeedback("tap")}
            onClick={refreshHealth}
            title={
              modalHealth?.status === "ok"
                ? `Endpoint: ${modalHealth.model} — คลิกเพื่อตรวจสอบอีกครั้ง`
                : "คลิกเพื่อ Warmup Modal API"
            }
            className="flex items-center gap-2 bg-[#1C1C1E] border border-white/[0.1] hover:border-white/[0.2] rounded-full px-3.5 py-1.5 text-xs apple-pressable"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isCheckingHealth
                    ? "bg-[#FF9F0A]"
                    : modalHealth?.status === "ok"
                    ? "bg-[#30D158]"
                    : "bg-[#FF453A]"
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isCheckingHealth
                    ? "bg-[#FF9F0A]"
                    : modalHealth?.status === "ok"
                    ? "bg-[#30D158]"
                    : "bg-[#FF453A]"
                }`}
              ></span>
            </span>
            <span className="text-[#F5F5F7] font-medium apple-tabular">
              {isCheckingHealth
                ? "Warming Modal CPU..."
                : modalHealth?.status === "ok"
                ? `Modal ${modalHealth.device.toUpperCase()} Online · ${
                    modalHealth.model.split("/").pop() || "best_overall.pt"
                  } · imgsz ${modalHealth.imgsz} · conf ${modalHealth.conf}`
                : "Modal API Offline — คลิกเพื่อลองใหม่"}
            </span>
            <span className="text-[#6E6E73]">|</span>
            <span className="text-[#0A84FF] font-mono apple-tabular">FastAPI</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Real Image Inference Analyzer (lg: 8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <Media_Upload_Analyzer
              mode="image"
              targetRule={selectedRule}
              onSelectRule={(rule) => setSelectedRuleId(rule.id)}
            />

            <div className="flex justify-end">
              <Link
                href={`/drills?signalId=${selectedRule.id}`}
                onPointerDown={() => triggerCausalFeedback("tap")}
                className="px-4 py-2 rounded-xl bg-[#0A84FF] hover:bg-[#3B9CFF] text-white text-xs font-bold flex items-center gap-1.5 apple-pressable shadow-md shadow-[#0A84FF]/25"
              >
                <Google_Icon name="videocam" size={14} />
                <span>เปิดฝึกท่า {selectedRule.nameTh} ผ่านกล้องสด (/drills)</span>
              </Link>
            </div>
          </div>

          {/* Right: Signal Selector & IFAB Target Criteria Inspector (lg: 4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="apple-material-dark rounded-[22px] p-5">
              <h3 className="text-sm font-semibold apple-title text-[#F5F5F7] flex items-center gap-2 mb-3">
                <Google_Icon name="layers" size={16} className="text-[#0A84FF]" />
                เลือกท่าสัญญาณเป้าหมาย (20 IFAB Signals)
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1">
                {IFAB_RULES.map((rule) => (
                  <button
                    key={rule.id}
                    type="button"
                    onPointerDown={() => triggerCausalFeedback("snap")}
                    onClick={() => setSelectedRuleId(rule.id)}
                    className={`px-3 py-2 rounded-xl text-left text-xs apple-pressable border flex flex-col ${
                      selectedRuleId === rule.id
                        ? "bg-[#0A84FF]/20 border-[#0A84FF] text-[#F5F5F7] shadow-sm"
                        : "bg-[#141416]/85 border-white/[0.08] text-[#A1A1A6] hover:border-white/[0.18] hover:text-[#F5F5F7]"
                    }`}
                  >
                    <span className="font-semibold truncate">{rule.nameTh}</span>
                    <span className="text-[10px] text-[#6E6E73] truncate">{rule.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="apple-material-dark rounded-[22px] p-5 flex-1 flex flex-col justify-between gap-3">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold apple-title text-[#F5F5F7] flex items-center gap-2">
                  <Google_Icon name="straighten" size={16} className="text-[#30D158]" />
                  เกณฑ์มาตรฐาน IFAB ({selectedRule.ifabLaw})
                </h3>

                <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-[#A1A1A6]">Arm Elevation Target</div>
                    <div className="text-[10px] text-[#6E6E73] apple-tabular">
                      ขั้นต่ำที่ยอมรับ {selectedRule.minElevationDeg}°
                    </div>
                  </div>
                  <div className="text-base font-mono font-bold apple-tabular text-[#0A84FF]">
                    {selectedRule.targetElevationDeg}°
                  </div>
                </div>

                <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-[#A1A1A6]">Elbow Straightness</div>
                    <div className="text-[10px] text-[#6E6E73] apple-tabular">
                      ค้างสัญญาณอย่างน้อย {selectedRule.minHoldSeconds}s
                    </div>
                  </div>
                  <div className="text-base font-mono font-bold apple-tabular text-[#30D158]">
                    {selectedRule.targetStraightnessDeg}°
                  </div>
                </div>
              </div>

              <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-3">
                <div className="text-xs text-[#A1A1A6] mb-1 flex items-center gap-1.5">
                  <Google_Icon name="lightbulb" size={14} className="text-[#FF9F0A]" />
                  <span>คำแนะนำการฝึกสอน (Coaching Tip):</span>
                </div>
                <div className="text-xs text-[#F5F5F7] font-medium leading-relaxed">
                  {selectedRule.coachingTips[0] || "รักษาท่าทางให้มั่นคง"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
