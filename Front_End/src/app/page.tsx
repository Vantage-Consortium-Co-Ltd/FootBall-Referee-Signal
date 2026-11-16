"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Skeleton_Canvas } from "../UI_Components/Canvas_Engine/Skeleton_Canvas";
import {
  MOCK_IFAB_RULES,
  generateMockKeypoints,
  getMockSystemHealth,
} from "../Core_Lib/Microservices_Mock";
import {
  Curriculum_Quick_Launch,
  Educational_Hero,
} from "../UI_Components/App_Layout";
import { Google_Icon } from "../UI_Components/Common/Google_Icon";
import { triggerCausalFeedback } from "../Core_Lib/Apple_Spring_Engine";
import { checkModalHealth } from "../Core_Lib/Api_Client";
import type { ModalHealthResponse } from "../Data_Types/Referee_Types";

export default function Home() {
  const [selectedRuleId, setSelectedRuleId] = useState<number>(1); // Default: Indirect Free Kick
  const [frameTick, setFrameTick] = useState<number>(0);
  const [mirror, setMirror] = useState<boolean>(true);
  const [showGhost, setShowGhost] = useState<boolean>(true);
  const [showAngles, setShowAngles] = useState<boolean>(true);
  const [modalHealth, setModalHealth] = useState<ModalHealthResponse | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(true);

  const selectedRule =
    MOCK_IFAB_RULES.find((r) => r.id === selectedRuleId) || MOCK_IFAB_RULES[1];
  const systemHealth = getMockSystemHealth();

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

  // Animation frame loop to simulate 60 FPS skeleton movement
  useEffect(() => {
    let animId: number;
    const update = () => {
      setFrameTick((prev) => (prev + 1) % 1000);
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, []);

  const { keypoints, angles } = generateMockKeypoints(selectedRuleId, frameTick);

  return (
    <main className="min-h-screen bg-black text-[#F5F5F7] p-4 md:p-8 space-y-8">
      {/* Section 1: Educational Hero & 4-Step Curriculum Flow */}
      <Educational_Hero />

      {/* Section 2: 4 Interactive Learning Module Quick-Launch Cards */}
      <Curriculum_Quick_Launch />

      {/* Section 3: Interactive 60 FPS Skeleton Engine & Telemetry Preview */}
      <section className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold apple-title text-[#F5F5F7] flex items-center gap-2">
              <Google_Icon name="monitoring" size={20} className="text-[#0A84FF]" />
              <span>ตัวอย่างการทำงานระบบวิเคราะห์ท่าทาง 60 FPS (Interactive Preview)</span>
            </h2>
            <p className="text-xs text-[#A1A1A6] mt-0.5">
              ทดลองเลือกท่าสัญญาณ IFAB เพื่อดูการจำลองโครงกระดูก 17 จุดและค่าองศาข้อต่อ ก่อนเข้าห้องฝึกซ้อมจริง
            </p>
          </div>

          <button
            type="button"
            onPointerDown={() => triggerCausalFeedback("tap")}
            onClick={refreshHealth}
            title={
              modalHealth?.status === "ok"
                ? `Endpoint: ${modalHealth.model} — คลิกเพื่อตรวจสอบอีกครั้ง`
                : `${systemHealth.services.length} Services Configured — คลิกเพื่อ Warmup Modal API`
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
                    : "bg-[#0A84FF]"
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isCheckingHealth
                    ? "bg-[#FF9F0A]"
                    : modalHealth?.status === "ok"
                    ? "bg-[#30D158]"
                    : "bg-[#0A84FF]"
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
                : `${systemHealth.services.length} Services Ready (Simulation)`}
            </span>
            <span className="text-[#6E6E73]">|</span>
            <span className="text-[#0A84FF] font-mono apple-tabular">60 FPS Native</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Canvas 60 FPS Viewport (lg: 8 cols) */}
          <div className="lg:col-span-8 apple-material-dark rounded-[22px] overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 bg-[#1C1C1E]/90 border-b border-white/[0.08] flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <Google_Icon name="videocam" size={16} className="text-[#30D158]" />
                <span className="font-semibold text-[#F5F5F7]">
                  Live Skeleton Engine Preview · {selectedRule.nameTh}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[#A1A1A6] apple-tabular">
                <span>640×440</span>
                <span className="text-[#6E6E73]">•</span>
                <span className="text-[#30D158] font-mono">{selectedRule.ifabLaw}</span>
              </div>
            </div>

            <div className="relative flex-1 min-h-[440px] bg-[#060608] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#2C2C2E33_1px,transparent_1px),linear-gradient(to_bottom,#2C2C2E33_1px,transparent_1px)] bg-[size:32px_32px]"></div>

              <Skeleton_Canvas
                keypoints={keypoints}
                targetRule={selectedRule}
                angles={angles}
                width={640}
                height={440}
                mirror={mirror}
                showGhost={showGhost}
                showAngles={showAngles}
                className="relative z-10"
              />

              <div className="absolute top-4 left-4 z-20 apple-material-dark rounded-xl px-3 py-1.5 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF453A] animate-pulse"></span>
                <span className="font-mono text-[#F5F5F7] uppercase tracking-wide">Educational Simulation</span>
              </div>
            </div>

            <div className="px-5 py-3 bg-[#1C1C1E]/90 border-t border-white/[0.08] flex flex-wrap justify-between items-center gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onPointerDown={() => triggerCausalFeedback("tap")}
                  onClick={() => setMirror(!mirror)}
                  className={`px-3 py-1.5 rounded-xl border apple-pressable ${
                    mirror
                      ? "bg-[#0A84FF]/15 border-[#0A84FF]/45 text-[#0A84FF]"
                      : "bg-[#2C2C2E]/70 border-white/[0.08] text-[#A1A1A6]"
                  }`}
                >
                  Mirror View: {mirror ? "ON" : "OFF"}
                </button>
                <button
                  onPointerDown={() => triggerCausalFeedback("tap")}
                  onClick={() => setShowGhost(!showGhost)}
                  className={`px-3 py-1.5 rounded-xl border apple-pressable ${
                    showGhost
                      ? "bg-[#0A84FF]/15 border-[#0A84FF]/45 text-[#0A84FF]"
                      : "bg-[#2C2C2E]/70 border-white/[0.08] text-[#A1A1A6]"
                  }`}
                >
                  Ghost Guide: {showGhost ? "ON" : "OFF"}
                </button>
                <button
                  onPointerDown={() => triggerCausalFeedback("tap")}
                  onClick={() => setShowAngles(!showAngles)}
                  className={`px-3 py-1.5 rounded-xl border apple-pressable ${
                    showAngles
                      ? "bg-[#30D158]/15 border-[#30D158]/45 text-[#30D158]"
                      : "bg-[#2C2C2E]/70 border-white/[0.08] text-[#A1A1A6]"
                  }`}
                >
                  Angle Indicators: {showAngles ? "ON" : "OFF"}
                </button>
              </div>

              <Link
                href={`/drills?signalId=${selectedRule.id}`}
                onPointerDown={() => triggerCausalFeedback("tap")}
                className="px-4 py-1.5 rounded-xl bg-[#0A84FF] hover:bg-[#3B9CFF] text-white font-bold flex items-center gap-1.5 apple-pressable shadow-md shadow-[#0A84FF]/25"
              >
                <Google_Icon name="videocam" size={14} />
                <span>เปิดฝึกท่านี้เต็มรูปแบบ</span>
              </Link>
            </div>
          </div>

          {/* Right: Signal Selector & Angle Inspector (lg: 4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="apple-material-dark rounded-[22px] p-5">
              <h3 className="text-sm font-semibold apple-title text-[#F5F5F7] flex items-center gap-2 mb-3">
                <Google_Icon name="layers" size={16} className="text-[#0A84FF]" />
                เลือกทดสอบท่าสัญญาณ (IFAB Signals)
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-[210px] overflow-y-auto pr-1">
                {MOCK_IFAB_RULES.slice(0, 12).map((rule) => (
                  <button
                    key={rule.id}
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
                  การวิเคราะห์มุมข้อต่อ (Joint Angle Telemetry)
                </h3>

                <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-[#A1A1A6]">Arm Elevation Angle</div>
                    <div className="text-[10px] text-[#6E6E73] apple-tabular">
                      เป้าหมาย: {selectedRule.targetElevationDeg}° (ขั้นต่ำ {selectedRule.minElevationDeg}°)
                    </div>
                  </div>
                  <div className="text-base font-mono font-bold apple-tabular text-[#0A84FF]">
                    {angles.rElevationAngle}°
                  </div>
                </div>

                <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-[#A1A1A6]">Elbow Straightness</div>
                    <div className="text-[10px] text-[#6E6E73] apple-tabular">
                      เป้าหมาย: {selectedRule.targetStraightnessDeg}° (เหยียดตรง)
                    </div>
                  </div>
                  <div className="text-base font-mono font-bold apple-tabular text-[#30D158]">
                    {angles.rElbowAngle}°
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
