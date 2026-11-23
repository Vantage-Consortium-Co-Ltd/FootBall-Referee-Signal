"use client";

import React, { useEffect, useRef, useState } from "react";
import type {
  CameraPreset,
  CardColor,
  PlaybackSpeed,
  SignalClassInfo,
} from "../../Data_Types/Referee_Types";
import {
  RefereeStageController,
  type StageState,
  type StageTheme,
} from "../../Core_Lib/Referee_3D/Stage_Controller";
import { Google_Icon } from "../Common/Google_Icon";

export interface CameraCommand {
  preset: Exclude<CameraPreset, "free">;
  seq: number;
}

export interface Referee3DStageProps {
  signal: SignalClassInfo;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  mirrored: boolean;
  cardColor: CardColor;
  showAngleGuide: boolean;
  showSkeleton: boolean;
  theme: StageTheme;
  reducedMotion: boolean;
  cameraCommand: CameraCommand | null;
  replaySeq: number;
}

/**
 * Client-only Three.js stage host.
 * Owns a single RefereeStageController instance per mount, forwards prop updates
 * incrementally without recreating the WebGL context, and renders a non-crashing
 * fallback card when WebGL is unavailable or its context is lost.
 */
export const Referee_3D_Stage: React.FC<Referee3DStageProps> = ({
  signal,
  isPlaying,
  speed,
  mirrored,
  cardColor,
  showAngleGuide,
  showSkeleton,
  theme,
  reducedMotion,
  cameraCommand,
  replaySeq,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<RefereeStageController | null>(null);
  const lastCameraSeqRef = useRef<number>(0);
  const lastReplaySeqRef = useRef<number>(0);

  const [webglUnavailable, setWebglUnavailable] = useState<boolean>(false);
  const [contextLost, setContextLost] = useState<boolean>(false);

  const latestStateRef = useRef<StageState>({
    signal,
    isPlaying,
    speed,
    mirrored,
    cardColor,
    showAngleGuide,
    showSkeleton,
    theme,
    reducedMotion,
  });
  latestStateRef.current = {
    signal,
    isPlaying,
    speed,
    mirrored,
    cardColor,
    showAngleGuide,
    showSkeleton,
    theme,
    reducedMotion,
  };

  const latestReplaySeqRef = useRef<number>(replaySeq);
  latestReplaySeqRef.current = replaySeq;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setWebglUnavailable(false);
    setContextLost(false);
    // A freshly mounted controller already initializes clipTimeSec at 0.
    lastReplaySeqRef.current = latestReplaySeqRef.current;

    let controller: RefereeStageController;
    try {
      controller = new RefereeStageController(
        container,
        latestStateRef.current,
        {
          onContextLost: () => {
            setContextLost(true);
          },
          onContextRestored: () => {
            setContextLost(false);
          },
        }
      );
    } catch (err) {
      if (!(err instanceof Error && err.message === "WEBGL_UNAVAILABLE")) {
        console.error("Failed to initialize 3D referee stage:", err);
      }
      setWebglUnavailable(true);
      return;
    }

    controllerRef.current = controller;

    return () => {
      controller.dispose();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
      lastCameraSeqRef.current = 0;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.updateState({
      signal,
      isPlaying,
      speed,
      mirrored,
      cardColor,
      showAngleGuide,
      showSkeleton,
      theme,
      reducedMotion,
    });
  }, [
    signal,
    isPlaying,
    speed,
    mirrored,
    cardColor,
    showAngleGuide,
    showSkeleton,
    theme,
    reducedMotion,
  ]);

  useEffect(() => {
    if (!cameraCommand || cameraCommand.seq <= 0) return;
    if (cameraCommand.seq === lastCameraSeqRef.current) return;
    if (!controllerRef.current) return;

    lastCameraSeqRef.current = cameraCommand.seq;
    controllerRef.current.setCameraPreset(cameraCommand.preset);
  }, [cameraCommand]);

  useEffect(() => {
    if (replaySeq <= 0) return;
    if (replaySeq === lastReplaySeqRef.current) return;
    if (!controllerRef.current) return;

    lastReplaySeqRef.current = replaySeq;
    controllerRef.current.replay();
  }, [replaySeq]);

  const showFallback = webglUnavailable || contextLost;
  const isDark = theme === "dark";

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        role={showFallback ? undefined : "img"}
        aria-hidden={showFallback}
        aria-label={
          showFallback ? undefined : `แบบจำลอง 3 มิติท่าสัญญาณ ${signal.nameTh}`
        }
        className={`w-full h-full select-none ${
          showFallback ? "opacity-0 pointer-events-none" : "cursor-grab active:cursor-grabbing"
        }`}
      />

      {showFallback && (
        <div
          role="status"
          aria-live="polite"
          className={`absolute inset-0 z-10 flex items-center justify-center px-4 pt-14 pb-20 overflow-y-auto ${
            isDark
              ? "bg-[#0B1118]/95 text-slate-100"
              : "bg-[#F1F5F9]/95 text-slate-900"
          }`}
        >
          <div
            className={`w-full max-w-md rounded-2xl border p-4 sm:p-5 space-y-3 shadow-lg ${
              isDark
                ? "bg-slate-900/90 border-white/10"
                : "bg-white/95 border-slate-200/90"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  contextLost
                    ? "bg-amber-500/15 border-amber-400/35 text-amber-500"
                    : "bg-emerald-500/15 border-emerald-400/35 text-emerald-500"
                }`}
              >
                <Google_Icon
                  name={contextLost ? "warning" : "view_in_ar"}
                  size={20}
                />
              </span>
              <div className="min-w-0 space-y-0.5">
                <h3 className="text-xs sm:text-sm font-bold leading-snug">
                  {contextLost
                    ? "การเชื่อมต่อกราฟิก 3 มิติ (WebGL) ถูกขัดจังหวะ"
                    : "ไม่สามารถแสดงผล 3 มิติบนอุปกรณ์นี้ได้ (WebGL ไม่พร้อมใช้งาน)"}
                </h3>
                <p
                  className={`text-[11px] sm:text-xs leading-relaxed ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {contextLost
                    ? "กำลังรอเบราว์เซอร์กู้คืนการแสดงผลอัตโนมัติ คุณยังสามารถดูค่ามุมและคำแนะนำท่าทางด้านล่างได้"
                    : "เบราว์เซอร์หรืออุปกรณ์นี้ปิดการใช้งาน WebGL ชั่วคราว — ใช้ค่ามุมเป้าหมายและระยะเวลาค้างท่าด้านล่างแทนได้"}
                </p>
              </div>
            </div>

            <div
              className={`rounded-xl border p-3 space-y-2 ${
                isDark
                  ? "bg-white/[0.03] border-white/[0.08]"
                  : "bg-slate-50 border-slate-200/80"
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold truncate">
                  {signal.nameTh}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                    isDark
                      ? "bg-white/[0.04] border-white/10 text-slate-300"
                      : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  {signal.ifabLaw.split(" - ")[0]}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] apple-tabular">
                {signal.activeArm !== "none" && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border font-medium ${
                      isDark
                        ? "bg-emerald-500/15 border-emerald-400/35 text-emerald-300"
                        : "bg-emerald-50 border-emerald-500/35 text-emerald-800"
                    }`}
                  >
                    <Google_Icon name="straighten" size={13} />
                    <span>มุมเป้าหมาย {signal.targetElevationDeg}°</span>
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border font-medium ${
                    isDark
                      ? "bg-white/[0.04] border-white/10 text-slate-200"
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                >
                  <Google_Icon name="schedule" size={13} />
                  <span>ค้าง ≥ {signal.minHoldSeconds}s</span>
                </span>
              </div>

              {signal.coachingTips[0] && (
                <p
                  className={`text-[11px] leading-relaxed ${
                    isDark ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {signal.coachingTips[0]}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Referee_3D_Stage;
