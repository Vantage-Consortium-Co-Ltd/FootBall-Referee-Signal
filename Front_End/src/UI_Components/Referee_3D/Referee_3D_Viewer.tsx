"use client";

import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type {
  CameraPreset,
  CardColor,
  PlaybackSpeed,
  SignalClassInfo,
} from "../../Data_Types/Referee_Types";
import { getSignalAnimationClip } from "../../Core_Lib/Referee_3D/Signal_Poses";
import { useTheme } from "../../Core_Lib/Theme_Context";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";
import { Google_Icon } from "../Common/Google_Icon";
import type { CameraCommand } from "./Referee_3D_Stage";

const StageLoadingSkeleton: React.FC = () => (
  <div
    role="status"
    aria-label="กำลังโหลดโมเดลผู้ตัดสิน 3 มิติ"
    className="w-full h-full flex flex-col items-center justify-center gap-2.5 bg-[#F1F5F9] dark:bg-[#0B1118] text-slate-600 dark:text-slate-300"
  >
    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#10B981]/15 border border-[#10B981]/35 text-[#10B981] animate-pulse">
      <Google_Icon name="view_in_ar" size={22} />
    </div>
    <span className="text-xs font-medium tracking-tight">
      กำลังเตรียมมุมมอง 3 มิติ...
    </span>
  </div>
);

const Referee_3D_Stage = dynamic(() => import("./Referee_3D_Stage"), {
  ssr: false,
  loading: () => <StageLoadingSkeleton />,
});

const CAMERA_PRESET_BUTTONS: ReadonlyArray<{
  preset: Exclude<CameraPreset, "free">;
  label: string;
  ariaLabel: string;
}> = [
  { preset: "front", label: "หน้า", ariaLabel: "มุมกล้องด้านหน้า" },
  { preset: "side", label: "ข้าง", ariaLabel: "มุมกล้องด้านข้าง" },
  { preset: "three_quarter", label: "เฉียง", ariaLabel: "มุมกล้องเฉียง 3/4" },
];

export interface Referee3DViewerProps {
  signal: SignalClassInfo;
  className?: string;
  compact?: boolean;
}

/**
 * Reusable interactive 3D IFAB referee signal viewer with Apple-inspired
 * glassmorphic HUD controls, dynamic Three.js stage loading, and seamless
 * single-instance fullscreen toggling.
 */
export const Referee_3D_Viewer: React.FC<Referee3DViewerProps> = ({
  signal,
  className = "",
  compact = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [mirrored, setMirrored] = useState<boolean>(false);
  const [cardColor, setCardColor] = useState<CardColor>("yellow");
  const [showAngleGuide, setShowAngleGuide] = useState<boolean>(true);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(false);
  const [activePreset, setActivePreset] =
    useState<Exclude<CameraPreset, "free">>("three_quarter");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(
    null
  );
  const [replaySeq, setReplaySeq] = useState<number>(0);

  const fullscreenBtnRef = useRef<HTMLButtonElement | null>(null);

  const clip = getSignalAnimationClip(signal.id);
  const effectiveMirrored = clip.supportsMirror ? mirrored : false;

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    if (mq.matches) {
      setIsPlaying(false);
    }

    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
      if (event.matches) {
        setIsPlaying(false);
      }
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!clip.supportsMirror && mirrored) {
      setMirrored(false);
    }
  }, [clip.supportsMirror, mirrored]);

  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        triggerCausalFeedback("tap");
        setIsFullscreen(false);
        window.requestAnimationFrame(() => {
          fullscreenBtnRef.current?.focus();
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  const sendCameraPreset = (preset: Exclude<CameraPreset, "free">) => {
    triggerCausalFeedback("tap");
    setActivePreset(preset);
    setCameraCommand((prev) => ({
      preset,
      seq: (prev?.seq ?? 0) + 1,
    }));
  };

  const handleTogglePlay = () => {
    triggerCausalFeedback("tap");
    setIsPlaying((prev) => !prev);
  };

  const handleReplay = () => {
    triggerCausalFeedback("tap");
    setIsPlaying(true);
    setReplaySeq((prev) => prev + 1);
  };

  const handleToggleSpeed = () => {
    triggerCausalFeedback("snap");
    setSpeed((prev) => (prev === 1 ? 0.5 : 1));
  };

  const handleToggleMirror = () => {
    if (!clip.supportsMirror) return;
    triggerCausalFeedback("snap");
    setMirrored((prev) => !prev);
  };

  const handleToggleCardColor = () => {
    triggerCausalFeedback("snap");
    setCardColor((prev) => (prev === "yellow" ? "red" : "yellow"));
  };

  const handleToggleAngleGuide = () => {
    triggerCausalFeedback("snap");
    setShowAngleGuide((prev) => !prev);
  };

  const handleToggleSkeleton = () => {
    triggerCausalFeedback("snap");
    setShowSkeleton((prev) => !prev);
  };

  const handleToggleFullscreen = () => {
    triggerCausalFeedback("tap");
    setIsFullscreen((prev) => !prev);
  };

  const glassMaterialClass = isDark
    ? "apple-material-dark text-slate-100"
    : "apple-material-light text-slate-900";

  const stageBorderClass = isDark
    ? "border-white/10 bg-[#0B1118]"
    : "border-slate-200/90 bg-[#F1F5F9]";

  const mutedTextClass = isDark ? "text-slate-400" : "text-slate-500";

  const inactiveChipClass = isDark
    ? "border-transparent text-slate-300 hover:text-white hover:bg-white/[0.08]"
    : "border-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-900/[0.06]";

  const activeEmeraldChipClass = isDark
    ? "bg-[#10B981]/20 border-[#10B981]/50 text-emerald-300 font-semibold"
    : "bg-[#10B981]/15 border-[#10B981]/45 text-emerald-800 font-semibold";

  const inlineHeightClass = compact ? "h-[280px]" : "h-[340px] sm:h-[380px]";

  return (
    <div className={className}>
      {/* Preserves inline flow height while the stage container expands into a fixed fullscreen modal */}
      <div
        aria-hidden="true"
        className={isFullscreen ? `w-full rounded-2xl ${inlineHeightClass}` : "hidden"}
      />

      <div
        role={isFullscreen ? "dialog" : "region"}
        aria-modal={isFullscreen ? true : undefined}
        aria-label={
          isFullscreen
            ? `มุมมอง 3 มิติเต็มหน้าจอ: ${signal.nameTh}`
            : `มุมมอง 3 มิติ: ${signal.nameTh}`
        }
        onClick={
          isFullscreen
            ? (event) => {
                if (event.target === event.currentTarget) {
                  triggerCausalFeedback("tap");
                  setIsFullscreen(false);
                }
              }
            : undefined
        }
        className={
          isFullscreen
            ? "fixed inset-0 z-50 p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md flex items-center justify-center"
            : "w-full"
        }
      >
        {/* Single mounted stage container keeps WebGL context, camera, and playback time intact across fullscreen toggles */}
        <div
          className={`relative w-full overflow-hidden rounded-2xl border transition-colors duration-200 ${stageBorderClass} ${
            isFullscreen
              ? "h-full max-w-6xl max-h-[92vh] shadow-2xl"
              : inlineHeightClass
          }`}
        >
          <Referee_3D_Stage
            signal={signal}
            isPlaying={isPlaying}
            speed={speed}
            mirrored={effectiveMirrored}
            cardColor={cardColor}
            showAngleGuide={showAngleGuide}
            showSkeleton={showSkeleton}
            theme={theme}
            reducedMotion={reducedMotion}
            cameraCommand={cameraCommand}
            replaySeq={replaySeq}
          />

          {/* Top HUD Row: Target Guidance Pill (left) + Camera & Fullscreen Controls (right) */}
          <div className="absolute top-2.5 inset-x-2.5 sm:top-3 sm:inset-x-3 z-20 flex items-start justify-between gap-2 pointer-events-none">
            <div
              className={`pointer-events-auto min-w-0 rounded-xl px-2.5 py-1.5 flex flex-col gap-0.5 ${glassMaterialClass}`}
            >
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] apple-tabular">
                <Google_Icon
                  name="view_in_ar"
                  size={14}
                  className="text-[#10B981]"
                />
                {signal.activeArm !== "none" && (
                  <>
                    <span className="font-semibold">
                      มุมเป้าหมาย {signal.targetElevationDeg}°
                    </span>
                    <span aria-hidden="true" className="opacity-40">
                      ·
                    </span>
                  </>
                )}
                <span className="font-medium">
                  ค้าง ≥ {signal.minHoldSeconds}s
                </span>
              </div>
              <span className={`text-[10px] leading-tight ${mutedTextClass}`}>
                ลากเพื่อหมุน 360°
              </span>
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap justify-end">
              <div
                role="group"
                aria-label="มุมกล้อง 3 มิติ"
                className={`rounded-xl p-1 flex items-center gap-0.5 ${glassMaterialClass}`}
              >
                {CAMERA_PRESET_BUTTONS.map(({ preset, label, ariaLabel }) => {
                  const isActive = activePreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      aria-pressed={isActive}
                      aria-label={ariaLabel}
                      onClick={() => sendCameraPreset(preset)}
                      className={`px-2 py-1 rounded-lg border text-[11px] leading-none apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${
                        isActive ? activeEmeraldChipClass : inactiveChipClass
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
                <span
                  aria-hidden="true"
                  className="h-3.5 w-px bg-current opacity-15 mx-0.5"
                />
                <button
                  type="button"
                  aria-label="รีเซ็ตมุมกล้อง"
                  title="รีเซ็ตมุมกล้อง"
                  onClick={() => sendCameraPreset("three_quarter")}
                  className={`px-2 py-1 rounded-lg border text-[11px] leading-none inline-flex items-center gap-1 apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${inactiveChipClass}`}
                >
                  <Google_Icon name="refresh" size={13} />
                  <span>รีเซ็ต</span>
                </button>
              </div>

              <button
                ref={fullscreenBtnRef}
                type="button"
                aria-pressed={isFullscreen}
                aria-label={
                  isFullscreen ? "ออกจากโหมดเต็มหน้าจอ" : "ขยายเต็มหน้าจอ"
                }
                title={
                  isFullscreen
                    ? "ออกจากโหมดเต็มหน้าจอ (Esc)"
                    : "ขยายเต็มหน้าจอ"
                }
                onClick={handleToggleFullscreen}
                className={`rounded-xl p-2 border apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${glassMaterialClass} ${
                  isFullscreen
                    ? "border-[#10B981]/50 text-[#10B981]"
                    : "hover:border-[#10B981]/40"
                }`}
              >
                <Google_Icon
                  name={isFullscreen ? "fullscreen_exit" : "fullscreen"}
                  size={16}
                />
              </button>
            </div>
          </div>

          {/* Bottom Floating Glass Dock */}
          <div className="absolute bottom-2.5 inset-x-2.5 sm:bottom-3 sm:inset-x-3 z-20 flex justify-center pointer-events-none">
            <div
              role="toolbar"
              aria-label="ควบคุมการแสดงผลท่าสัญญาณ 3 มิติ"
              className={`pointer-events-auto max-w-full rounded-2xl px-2 py-1.5 flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 ${glassMaterialClass}`}
            >
              <button
                type="button"
                aria-pressed={isPlaying}
                aria-label={isPlaying ? "หยุดเล่นชั่วคราว" : "เล่นท่าสัญญาณ"}
                title={isPlaying ? "หยุดชั่วคราว" : "เล่น"}
                onClick={handleTogglePlay}
                className="px-2.5 py-1.5 rounded-xl bg-[#10B981] hover:bg-emerald-400 text-slate-950 font-semibold text-xs inline-flex items-center justify-center shadow-sm shadow-[#10B981]/25 apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
              >
                <Google_Icon
                  name={isPlaying ? "pause" : "play_arrow"}
                  size={16}
                />
              </button>

              <button
                type="button"
                aria-label="เล่นซ้ำตั้งแต่เริ่มต้น"
                title="เล่นซ้ำ"
                onClick={handleReplay}
                className={`px-2 py-1.5 rounded-xl border text-[11px] inline-flex items-center justify-center apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${inactiveChipClass}`}
              >
                <Google_Icon name="replay" size={15} />
              </button>

              <button
                type="button"
                aria-pressed={speed === 0.5}
                aria-label={`ความเร็วการเล่น ${speed}x สลับระหว่าง 1x และ 0.5x`}
                title={
                  speed === 1
                    ? "สลับเป็นภาพช้า 0.5x"
                    : "สลับเป็นความเร็วปกติ 1x"
                }
                onClick={handleToggleSpeed}
                className={`px-2 py-1 rounded-xl border text-[11px] apple-tabular apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${
                  speed === 0.5 ? activeEmeraldChipClass : inactiveChipClass
                }`}
              >
                {speed === 0.5 ? "0.5x" : "1x"}
              </button>

              <span
                aria-hidden="true"
                className="hidden sm:block h-4 w-px bg-current opacity-15 mx-0.5"
              />

              <button
                type="button"
                disabled={!clip.supportsMirror}
                aria-pressed={effectiveMirrored}
                aria-label={
                  clip.supportsMirror
                    ? effectiveMirrored
                      ? "สลับกลับเป็นแขนขวา"
                      : "สลับเป็นแขนซ้าย"
                    : "ท่านี้ไม่รองรับการสลับข้างแขน"
                }
                title={
                  clip.supportsMirror
                    ? "สลับข้างแขน (ขวา / ซ้าย)"
                    : "ท่านี้ไม่รองรับการสลับข้างแขน"
                }
                onClick={handleToggleMirror}
                className={`px-2 py-1 rounded-xl border text-[11px] inline-flex items-center gap-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${
                  !clip.supportsMirror
                    ? "border-transparent opacity-40 cursor-not-allowed"
                    : effectiveMirrored
                    ? `apple-pressable ${activeEmeraldChipClass}`
                    : `apple-pressable ${inactiveChipClass}`
                }`}
              >
                <Google_Icon name="swap_horiz" size={14} />
                <span>{effectiveMirrored ? "แขนซ้าย" : "แขนขวา"}</span>
              </button>

              {clip.supportsCardToggle && (
                <button
                  type="button"
                  aria-pressed={cardColor === "red"}
                  aria-label={`สีใบคาดโทษปัจจุบัน ${
                    cardColor === "yellow" ? "ใบเหลือง" : "ใบแดง"
                  } กดเพื่อสลับ`}
                  title="สลับสีใบเหลือง / ใบแดง"
                  onClick={handleToggleCardColor}
                  className={`px-2 py-1 rounded-xl border text-[11px] font-medium inline-flex items-center gap-1 apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${
                    cardColor === "red"
                      ? isDark
                        ? "bg-red-500/20 border-red-400/50 text-red-300"
                        : "bg-red-500/15 border-red-500/45 text-red-700"
                      : isDark
                      ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                      : "bg-amber-500/15 border-amber-500/45 text-amber-800"
                  }`}
                >
                  <Google_Icon name="style" size={14} />
                  <span>{cardColor === "yellow" ? "ใบเหลือง" : "ใบแดง"}</span>
                </button>
              )}

              <span
                aria-hidden="true"
                className="hidden sm:block h-4 w-px bg-current opacity-15 mx-0.5"
              />

              <button
                type="button"
                aria-pressed={showAngleGuide}
                aria-label="แสดงหรือซ่อนไกด์องศา"
                title="ไกด์องศาเป้าหมาย"
                onClick={handleToggleAngleGuide}
                className={`px-2 py-1 rounded-xl border text-[11px] inline-flex items-center gap-1 apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${
                  showAngleGuide ? activeEmeraldChipClass : inactiveChipClass
                }`}
              >
                <Google_Icon name="straighten" size={14} />
                <span>ไกด์องศา</span>
              </button>

              <button
                type="button"
                aria-pressed={showSkeleton}
                aria-label="แสดงหรือซ่อนโครงกระดูก AI"
                title="โครงกระดูก AI 17 จุด"
                onClick={handleToggleSkeleton}
                className={`px-2 py-1 rounded-xl border text-[11px] inline-flex items-center gap-1 apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] ${
                  showSkeleton ? activeEmeraldChipClass : inactiveChipClass
                }`}
              >
                <Google_Icon name="accessibility_new" size={14} />
                <span>โครงกระดูก AI</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Referee_3D_Viewer;
