"use client";

import React, { useState, useEffect } from "react";
import { Skeleton_Canvas } from "../UI_Components/Canvas_Engine/Skeleton_Canvas";
import {
  MOCK_IFAB_RULES,
  generateMockKeypoints,
  getMockSystemHealth,
} from "../Core_Lib/Microservices_Mock";
import {
  Activity,
  Award,
  BookOpen,
  Camera,
  CheckCircle2,
  Clock,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";

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
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* Top Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚽</span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Football Referee AI Assistant
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            ระบบผู้ช่วยอัจฉริยะสำหรับฝึกอบรมและประเมินผู้ตัดสินฟุตบอล (Microservices Frontend)
          </p>
        </div>

        {/* Microservices Status Pill */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-full px-4 py-1.5 text-xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-slate-300 font-medium">Microservices Online</span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-400 font-mono">30+ FPS Ready</span>
        </div>
      </header>

      {/* Main Grid: Interactive Canvas Preview & Control */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
        {/* Left: Canvas 60 FPS Viewport (lg: 8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          {/* Viewport Header */}
          <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-slate-200">
                Live Skeleton Engine Preview (Task 2 Engine)
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <span>Resolution: 640x480</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-mono">60 FPS Native</span>
            </div>
          </div>

          {/* Canvas Display */}
          <div className="relative flex-1 min-h-[440px] bg-slate-950 flex items-center justify-center overflow-hidden">
            {/* Background Pitch Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px]"></div>

            {/* Skeleton Canvas */}
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

            {/* Floating Live Badge */}
            <div className="absolute top-4 left-4 z-20 bg-slate-900/80 backdrop-blur border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="font-mono text-slate-200 uppercase">Live Simulation</span>
            </div>
          </div>

          {/* Viewport Controls */}
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

            <div className="text-slate-400">
              Joints: <span className="text-emerald-400 font-mono">17 COCO</span> | Conf:{" "}
              <span className="text-emerald-400 font-mono">96.4%</span>
            </div>
          </div>
        </div>

        {/* Right: Signal Selector & Angle Inspector (lg: 4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Signal Selector Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-cyan-400" />
              เลือกทดสอบท่าสัญญาณ (20 IFAB Signals)
            </h2>
            <div className="grid grid-cols-2 gap-2 max-h-[190px] overflow-y-auto pr-1">
              {MOCK_IFAB_RULES.slice(0, 10).map((rule) => (
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

          {/* Joint Angle Telemetry Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex-1">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-emerald-400" />
              การวิเคราะห์มุมข้อต่อ (Joint Angle Telemetry)
            </h2>

            <div className="space-y-3">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <div className="text-xs text-slate-400">Right Arm Elevation</div>
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
                  <div className="text-xs text-slate-400">Right Elbow Straightness</div>
                  <div className="text-[10px] text-slate-500">
                    เป้าหมาย: {selectedRule.targetStraightnessDeg}° (เหยียดตรง)
                  </div>
                </div>
                <div className="text-base font-mono font-bold text-emerald-400">
                  {angles.rElbowAngle}°
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                <div className="text-xs text-slate-400 mb-1">คำแนะนำการฝึกสอน (Coaching Tip):</div>
                <div className="text-xs text-slate-300 font-medium leading-relaxed">
                  💡 {selectedRule.coachingTips[0] || "รักษาท่าทางให้มั่นคง"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Navigation Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
        <div className="bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <Camera className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Live Practice Drill</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            เปิดกล้องสด Webcam ฝึกซ้อมสัญญาณผู้ตัดสินพร้อม Ghost Guide ซ้อนทับ และวงล้อถอยหลัง Hold Timer
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Match Review & Timeline</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            ตรวจประเมินวิดีโอแมตช์การตัดสิน บันทึกไทม์ไลน์จุดเป่าฟาวล์ และสรุปคะแนนประเมินรายสัญญาณ
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">IFAB Digital Rulebook</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            คลังกติกา 20 ท่าทางสัญญาณผู้ตัดสินตามมาตรฐานสากล IFAB Laws of the Game พร้อมมุมองศาอ้างอิง
          </p>
        </div>
      </div>
    </main>
  );
}
