"use client";

import React, { useState, useEffect } from "react";
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

export default function Home() {
  const [selectedRuleId, setSelectedRuleId] = useState<number>(1); // Default: Indirect Free Kick
  const [frameTick, setFrameTick] = useState<number>(0);
  const [mirror, setMirror] = useState<boolean>(true);
  const [showGhost, setShowGhost] = useState<boolean>(true);
  const [showAngles, setShowAngles] = useState<boolean>(true);

  const selectedRule =
    MOCK_IFAB_RULES.find((r) => r.id === selectedRuleId) || MOCK_IFAB_RULES[1];
  const systemHealth = getMockSystemHealth();

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
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8">
      {/* Section 1: Educational Hero & 4-Step Curriculum Flow */}
      <Educational_Hero />

      {/* Section 2: 4 Interactive Learning Module Quick-Launch Cards */}
      <Curriculum_Quick_Launch />

      {/* Section 3: Interactive 60 FPS Skeleton Engine & Telemetry Preview */}
      <section className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
              <Google_Icon name="monitoring" size={20} className="text-cyan-400" />
              <span>ตัวอย่างการทำงานระบบวิเคราะห์ท่าทาง 60 FPS (Interactive Preview)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ทดลองเลือกท่าสัญญาณ IFAB เพื่อดูการจำลองโครงกระดูก 17 จุดและค่าองศาข้อต่อ ก่อนเข้าห้องฝึกซ้อมจริง
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-full px-3.5 py-1.5 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 font-medium">
              {systemHealth.services.length} Services Ready
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400 font-mono">60 FPS Native</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Canvas 60 FPS Viewport (lg: 8 cols) */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <Google_Icon name="videocam" size={16} className="text-emerald-400" />
                <span className="font-semibold text-slate-200">
                  Live Skeleton Engine Preview · {selectedRule.nameTh}
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <span>640×440</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-mono">{selectedRule.ifabLaw}</span>
              </div>
            </div>

            <div className="relative flex-1 min-h-[440px] bg-slate-950 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px]"></div>

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

              <div className="absolute top-4 left-4 z-20 bg-slate-900/85 backdrop-blur border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="font-mono text-slate-200 uppercase">Educational Simulation</span>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex flex-wrap justify-between items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMirror(!mirror)}
                  className={`px-3 py-1.5 rounded-lg border transition ${
                    mirror
                      ? "bg-slate-800 border-slate-700 text-cyan-400"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  Mirror View: {mirror ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => setShowGhost(!showGhost)}
                  className={`px-3 py-1.5 rounded-lg border transition ${
                    showGhost
                      ? "bg-slate-800 border-slate-700 text-cyan-400"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  Ghost Guide: {showGhost ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => setShowAngles(!showAngles)}
                  className={`px-3 py-1.5 rounded-lg border transition ${
                    showAngles
                      ? "bg-slate-800 border-slate-700 text-emerald-400"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  Angle Indicators: {showAngles ? "ON" : "OFF"}
                </button>
              </div>

              <Link
                href={`/drills?signalId=${selectedRule.id}`}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 transition"
              >
                <Google_Icon name="videocam" size={14} />
                <span>เปิดฝึกท่านี้เต็มรูปแบบ</span>
              </Link>
            </div>
          </div>

          {/* Right: Signal Selector & Angle Inspector (lg: 4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
                <Google_Icon name="layers" size={16} className="text-cyan-400" />
                เลือกทดสอบท่าสัญญาณ (IFAB Signals)
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-[210px] overflow-y-auto pr-1">
                {MOCK_IFAB_RULES.slice(0, 12).map((rule) => (
                  <button
                    key={rule.id}
                    onClick={() => setSelectedRuleId(rule.id)}
                    className={`px-3 py-2 rounded-xl text-left text-xs transition border flex flex-col ${
                      selectedRuleId === rule.id
                        ? "bg-cyan-950/50 border-cyan-500/50 text-cyan-200 shadow-sm"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span className="font-semibold truncate">{rule.nameTh}</span>
                    <span className="text-[10px] text-slate-500 truncate">{rule.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex-1 flex flex-col justify-between gap-3">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Google_Icon name="straighten" size={16} className="text-emerald-400" />
                  การวิเคราะห์มุมข้อต่อ (Joint Angle Telemetry)
                </h3>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-slate-400">Arm Elevation Angle</div>
                    <div className="text-[10px] text-slate-500">
                      เป้าหมาย: {selectedRule.targetElevationDeg}° (ขั้นต่ำ {selectedRule.minElevationDeg}°)
                    </div>
                  </div>
                  <div className="text-base font-mono font-bold text-cyan-400">
                    {angles.rElevationAngle}°
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-slate-400">Elbow Straightness</div>
                    <div className="text-[10px] text-slate-500">
                      เป้าหมาย: {selectedRule.targetStraightnessDeg}° (เหยียดตรง)
                    </div>
                  </div>
                  <div className="text-base font-mono font-bold text-emerald-400">
                    {angles.rElbowAngle}°
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5">
                  <Google_Icon name="lightbulb" size={14} className="text-amber-400" />
                  <span>คำแนะนำการฝึกสอน (Coaching Tip):</span>
                </div>
                <div className="text-xs text-slate-300 font-medium leading-relaxed">
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
