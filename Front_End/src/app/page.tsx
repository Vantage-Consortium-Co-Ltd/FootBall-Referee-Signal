"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Drill_Selector,
  Live_Drill_Feed,
  Media_Upload_Analyzer,
} from "../UI_Components/Drill_Practice";
import { Google_Icon } from "../UI_Components/Common/Google_Icon";
import { triggerCausalFeedback } from "../Core_Lib/Apple_Spring_Engine";
import { checkModalHealth, findRuleByLabel } from "../Core_Lib/Api_Client";
import { MODEL_SPEC_INFO } from "../Core_Lib/Ifab_Rules_Catalog";
import type {
  ModalDetection,
  ModalHealthResponse,
} from "../Data_Types/Referee_Types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"webcam" | "image" | "video">("webcam");
  const [health, setHealth] = useState<ModalHealthResponse | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(true);
  const [liveDetections, setLiveDetections] = useState<ModalDetection[]>([]);
  const [liveLatencyMs, setLiveLatencyMs] = useState<number | null>(null);

  const refreshHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    const res = await checkModalHealth();
    setHealth(res);
    setIsCheckingHealth(false);
  }, []);

  useEffect(() => {
    let active = true;
    checkModalHealth().then((res) => {
      if (!active) return;
      setHealth(res);
      setIsCheckingHealth(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleDetectionsUpdate = useCallback(
    (detections: ModalDetection[], latencyMs: number | null) => {
      setLiveDetections(detections);
      setLiveLatencyMs(latencyMs);
    },
    []
  );

  return (
    <main className="min-h-screen bg-black text-[#F5F5F7] p-4 md:p-8 space-y-6">
      {/* Header & Endpoint Switcher */}
      <section className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
          <div>
            <h1 className="text-xl md:text-2xl font-bold apple-title text-[#F5F5F7] flex items-center gap-2.5">
              <Google_Icon name="sports_soccer" size={24} className="text-[#0A84FF]" />
              <span>Football Referee Signal — Modal Inference Console</span>
            </h1>
            <p className="text-xs text-[#A1A1A6] mt-1">
              เชื่อมต่อตรงกับ FastAPI Backend ({MODEL_SPEC_INFO.baseModel}) ครบทั้ง 4 Endpoints:{" "}
              <code className="font-mono text-[#64D2FF]">/health</code>,{" "}
              <code className="font-mono text-[#64D2FF]">/ws/webcam</code>,{" "}
              <code className="font-mono text-[#64D2FF]">/predict/image</code>,{" "}
              <code className="font-mono text-[#64D2FF]">/predict/video</code>
            </p>
          </div>

          <a
            href={MODEL_SPEC_INFO.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={() => triggerCausalFeedback("tap")}
            className="px-4 py-2 rounded-xl bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-white/[0.1] text-xs font-semibold text-[#F5F5F7] inline-flex items-center gap-2 self-start apple-pressable"
          >
            <Google_Icon name="menu_book" size={15} className="text-[#0A84FF]" />
            <span>เปิด Swagger /docs</span>
          </a>
        </div>

        {/* 3 Inference Endpoint Tabs */}
        <div className="inline-flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[#141416] border border-white/[0.08]">
          {[
            {
              id: "webcam" as const,
              label: "WS /ws/webcam · กล้องสด",
              icon: "videocam",
            },
            {
              id: "image" as const,
              label: "POST /predict/image · รูปภาพ",
              icon: "crop_free",
            },
            {
              id: "video" as const,
              label: "POST /predict/video · วิดีโอ",
              icon: "play_arrow",
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onPointerDown={() => triggerCausalFeedback("snap")}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 apple-pressable border ${
                  isActive
                    ? "bg-[#0A84FF] border-[#0A84FF] text-white shadow-md shadow-[#0A84FF]/25"
                    : "border-transparent text-[#A1A1A6] hover:text-[#F5F5F7] hover:bg-[#1C1C1E]"
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
      <section className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Active Inference Endpoint Panel (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {activeTab === "webcam" ? (
            <Live_Drill_Feed onDetectionsUpdate={handleDetectionsUpdate} />
          ) : (
            <Media_Upload_Analyzer mode={activeTab} />
          )}

          {/* Live WebSocket JSON Output Inspector */}
          {activeTab === "webcam" && (
            <div className="apple-material-dark rounded-[22px] p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#F5F5F7] flex items-center gap-1.5">
                  <Google_Icon name="monitoring" size={15} className="text-[#30D158]" />
                  <span>ผลลัพธ์ JSON ล่าสุดจาก WS /ws/webcam</span>
                </span>
                {liveLatencyMs !== null && (
                  <span className="font-mono text-[11px] text-[#30D158] apple-tabular">
                    RTT {liveLatencyMs}ms
                  </span>
                )}
              </div>

              {liveDetections.length === 0 ? (
                <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-3 text-xs font-mono text-[#A1A1A6]">
                  {`{"detections": []}`}
                </div>
              ) : (
                <div className="space-y-2">
                  {liveDetections.map((det, idx) => {
                    const info = findRuleByLabel(det.label);
                    return (
                      <div
                        key={`${det.label}-${idx}`}
                        className="bg-[#141416] border border-white/[0.08] rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-bold text-[#F5F5F7]">
                            {info ? info.nameTh : det.label}
                          </div>
                          <div className="font-mono text-[10px] text-[#A1A1A6]">
                            {det.label} {info ? `· ${info.ifabLaw}` : ""}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-[#30D158] apple-tabular">
                          {det.confidence.toFixed(4)} ({Math.round(det.confidence * 100)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: GET /health Config + 20 Model Classes (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* GET /health & Backend Configuration Card */}
          <div className="apple-material-dark rounded-[22px] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold apple-title text-[#F5F5F7] flex items-center gap-2">
                <Google_Icon name="speed" size={16} className="text-[#30D158]" />
                สถานะเซิร์ฟเวอร์ (GET /health)
              </h2>

              <button
                type="button"
                onPointerDown={() => triggerCausalFeedback("tap")}
                onClick={refreshHealth}
                disabled={isCheckingHealth}
                className="px-2.5 py-1 rounded-xl bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-white/[0.1] text-[11px] font-medium text-[#F5F5F7] flex items-center gap-1 apple-pressable disabled:opacity-50"
              >
                <Google_Icon name="refresh" size={13} />
                <span>{isCheckingHealth ? "กำลังเช็ค..." : "เช็ค /health"}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs apple-tabular">
              <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-2.5">
                <div className="text-[10px] text-[#6E6E73]">status</div>
                <div
                  className={`font-mono font-bold mt-0.5 ${
                    health?.status === "ok"
                      ? "text-[#30D158]"
                      : isCheckingHealth
                      ? "text-[#FF9F0A]"
                      : "text-[#FF453A]"
                  }`}
                >
                  {isCheckingHealth ? "warming..." : health?.status || "error"}
                </div>
              </div>

              <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-2.5">
                <div className="text-[10px] text-[#6E6E73]">device / cuda / fp16</div>
                <div className="font-mono font-bold text-[#F5F5F7] mt-0.5">
                  {health?.device || "cpu"} / {String(Boolean(health?.cuda))} /{" "}
                  {String(Boolean(health?.fp16))}
                </div>
              </div>

              <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-2.5">
                <div className="text-[10px] text-[#6E6E73]">conf / imgsz</div>
                <div className="font-mono font-bold text-[#0A84FF] mt-0.5">
                  {health?.conf ?? 0.25} / {health?.imgsz ?? 640}px
                </div>
              </div>

              <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-2.5">
                <div className="text-[10px] text-[#6E6E73]">limits (upload / stride / ws)</div>
                <div className="font-mono font-bold text-[#64D2FF] mt-0.5">
                  {MODEL_SPEC_INFO.maxUploadMb}MB / {MODEL_SPEC_INFO.videoStride}f /{" "}
                  {MODEL_SPEC_INFO.wsIdleSeconds}s
                </div>
              </div>
            </div>

            <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-2.5 text-[11px] font-mono text-[#A1A1A6] truncate">
              model: {health?.model || MODEL_SPEC_INFO.weightsPath}
            </div>
          </div>

          {/* 20 Model Classes & Metrics */}
          <Drill_Selector />
        </div>
      </section>
    </main>
  );
}
