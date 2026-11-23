"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ModalDetection,
  ModalVideoPredictResponse,
} from "../../Data_Types/Referee_Types";
import {
  findRuleByLabel,
  predictImageBoth,
  predictVideoFile,
} from "../../Core_Lib/Api_Client";
import {
  formatSignalEnglishName,
  formatTimestampSec,
  getConfidenceVisualMeta,
  MODEL_SPEC_INFO,
} from "../../Core_Lib/Ifab_Rules_Catalog";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

export interface MediaUploadAnalyzerProps {
  mode?: "auto" | "image" | "video";
}

export const Media_Upload_Analyzer: React.FC<MediaUploadAnalyzerProps> = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  const [activeType, setActiveType] = useState<"image" | "video" | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeMb, setFileSizeMb] = useState<string | null>(null);

  // Photo state
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const [imageDetections, setImageDetections] = useState<ModalDetection[]>([]);

  // Lightbox state for zooming images
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>("");

  // Video state
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<ModalVideoPredictResponse | null>(
    null
  );
  const [activeFrameIdx, setActiveFrameIdx] = useState<number | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<string>("detected");
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0);

  useEffect(() => {
    return () => {
      if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
    };
  }, [originalImageUrl]);

  useEffect(() => {
    return () => {
      if (annotatedImageUrl) URL.revokeObjectURL(annotatedImageUrl);
    };
  }, [annotatedImageUrl]);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  // Handle escape key to close lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxUrl) {
        setLightboxUrl(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxUrl]);

  const handleReset = () => {
    triggerCausalFeedback("tap");
    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
    if (annotatedImageUrl) URL.revokeObjectURL(annotatedImageUrl);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);

    setActiveType(null);
    setFileName(null);
    setFileSizeMb(null);
    setOriginalImageUrl(null);
    setAnnotatedImageUrl(null);
    setImageDetections([]);
    setVideoPreviewUrl(null);
    setVideoResult(null);
    setActiveFrameIdx(null);
    setErrorMsg(null);
  };

  const handleAnalyzeFile = async (file: File) => {
    setErrorMsg(null);
    const maxBytes = MODEL_SPEC_INFO.maxUploadMb * 1024 * 1024;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);

    if (file.size > maxBytes) {
      setErrorMsg(
        `ขนาดไฟล์ ${sizeMb} MB เกินขีดจำกัด ${MODEL_SPEC_INFO.maxUploadMb} MB`
      );
      triggerCausalFeedback("warning");
      return;
    }

    const isVideo =
      file.type.startsWith("video/") ||
      /\.(mp4|mov|avi|webm|mkv|m4v)$/i.test(file.name);
    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|bmp|gif)$/i.test(file.name);

    if (!isVideo && !isImage) {
      setErrorMsg(
        "รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WebP) หรือวิดีโอ (MP4, MOV, WebM)"
      );
      triggerCausalFeedback("warning");
      return;
    }

    setFileName(file.name);
    setFileSizeMb(sizeMb);
    setIsLoading(true);
    triggerCausalFeedback("tap");

    try {
      if (isVideo) {
        setActiveType("video");
        const nextVideoUrl = URL.createObjectURL(file);
        setVideoPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return nextVideoUrl;
        });
        setActiveFrameIdx(null);
        setTimelineFilter("detected");

        const res = await predictVideoFile(file);
        setVideoResult(res);
        triggerCausalFeedback("success");
      } else {
        setActiveType("image");
        const nextOriginalUrl = URL.createObjectURL(file);
        setOriginalImageUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return nextOriginalUrl;
        });

        const res = await predictImageBoth(file, file.name);
        const sorted = [...res.detections].sort(
          (a, b) => b.confidence - a.confidence
        );
        setImageDetections(sorted);
        setAnnotatedImageUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return res.annotatedImageUrl;
        });
        triggerCausalFeedback("success");
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "วิเคราะห์ไฟล์ไม่สำเร็จ"
      );
      triggerCausalFeedback("warning");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleAnalyzeFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleAnalyzeFile(file);
  };

  const handleSeekVideo = (frameNumber: number, timeSec: number) => {
    triggerCausalFeedback("snap");
    setActiveFrameIdx(frameNumber);
    if (videoPreviewRef.current) {
      videoPreviewRef.current.currentTime = timeSec;
      void videoPreviewRef.current.play().catch(() => {});
    }
  };

  const videoStats = useMemo(() => {
    if (!videoResult) {
      return {
        totalDetections: 0,
        topSignalTh: "-",
        analyzedDurationSec: 0,
        uniqueLabels: [] as string[],
      };
    }

    const counts = new Map<string, number>();
    let totalDetections = 0;
    for (const row of videoResult.results) {
      for (const det of row.detections) {
        totalDetections += 1;
        counts.set(det.label, (counts.get(det.label) ?? 0) + 1);
      }
    }

    let topLabel: string | null = null;
    let topCount = 0;
    counts.forEach((count, label) => {
      if (count > topCount) {
        topCount = count;
        topLabel = label;
      }
    });

    const topRule = topLabel ? findRuleByLabel(topLabel) : undefined;
    const topSignalTh = topLabel
      ? topRule
        ? topRule.nameTh
        : formatSignalEnglishName(topLabel)
      : "-";

    const durationFromFrames =
      videoResult.fps > 0 && videoResult.frames_read > 0
        ? videoResult.frames_read / videoResult.fps
        : 0;
    const lastSampleTime =
      videoResult.results.length > 0
        ? videoResult.results[videoResult.results.length - 1].time
        : 0;

    return {
      totalDetections,
      topSignalTh,
      analyzedDurationSec: Math.max(durationFromFrames, lastSampleTime, 1),
      uniqueLabels: Array.from(counts.keys()),
    };
  }, [videoResult]);

  const filteredTimelineRows = useMemo(() => {
    if (!videoResult) return [];
    if (timelineFilter === "all") return videoResult.results;
    if (timelineFilter === "detected") {
      return videoResult.results.filter((row) => row.detections.length > 0);
    }
    return videoResult.results.filter((row) =>
      row.detections.some((d) => d.label === timelineFilter)
    );
  }, [videoResult, timelineFilter]);

  // Detected keyframes list for Visual Scrubber Ticks
  const detectedKeyframes = useMemo(() => {
    if (!videoResult) return [];
    return videoResult.results.filter((r) => r.detections.length > 0);
  }, [videoResult]);

  return (
    <section
      aria-label="วิเคราะห์ไฟล์สื่อ"
      className="rounded-3xl bg-white dark:bg-[#0D131A] border border-slate-200/80 dark:border-white/[0.08] overflow-hidden flex flex-col shadow-sm transition-colors duration-200"
    >
      {/* 1. Header with File Chip and Management Actions */}
      <div className="px-5 py-4 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Google_Icon
              name={activeType === "video" ? "movie" : "photo_camera"}
              size={18}
            />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {activeType === "video"
                ? "ผลวิเคราะห์วิดีโอ"
                : activeType === "image"
                ? "ผลวิเคราะห์รูปภาพ"
                : "ตรวจจับคลิปวิดีโอและรูปภาพ"}
            </h2>
            {fileName && fileSizeMb && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {fileName} · {fileSizeMb} MB
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeType && (
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 apple-pressable transition"
            >
              <Google_Icon name="refresh" size={14} />
              <span>วิเคราะห์ไฟล์ใหม่</span>
            </button>
          )}

          <button
            type="button"
            onPointerDown={() => triggerCausalFeedback("tap")}
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 apple-pressable disabled:opacity-50 shadow-md shadow-emerald-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 transition"
          >
            <Google_Icon name="upload_file" size={15} />
            <span>{activeType ? "เปลี่ยนไฟล์" : "เลือกไฟล์"}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="p-5 md:p-6 space-y-6">
        {/* 2. Universal Drag & Drop Dropzone (Shown prominently when no file active, or compact below) */}
        {!activeType && (
          <div
            role="button"
            tabIndex={0}
            aria-label="เลือกหรือวางไฟล์ภาพหรือวิดีโอ"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isLoading && fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !isLoading) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`rounded-3xl border-2 border-dashed p-10 md:p-14 text-center cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              isDragging
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 scale-[0.99]"
                : "border-slate-300 dark:border-white/15 bg-slate-50/60 dark:bg-white/[0.02] hover:border-emerald-500/50 dark:hover:border-emerald-400/50"
            }`}
          >
            <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10">
                <Google_Icon name="cloud_upload" size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isLoading
                    ? "กำลังส่งข้อมูลให้ AI วิเคราะห์..."
                    : "ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  รองรับภาพนิ่ง (JPG, PNG, WebP) และวิดีโอคลิปการแข่งขัน (MP4, MOV, WebM) สูงสุด {MODEL_SPEC_INFO.maxUploadMb} MB
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/70 dark:bg-white/10 text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-1">
                <Google_Icon name="bolt" size={13} className="text-amber-500" />
                <span>ระบบตรวจจับชนิดไฟล์และประมวลผลอัตโนมัติ</span>
              </span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="px-4 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-400/40 text-xs text-rose-800 dark:text-rose-100 flex items-center gap-2.5 shadow-sm"
          >
            <Google_Icon name="warning" size={16} className="text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 3. PHOTO RESULTS (Side-by-Side Dual Studio + Lightbox Zoom + Confidence Cards) */}
        {activeType === "image" && (originalImageUrl || annotatedImageUrl) && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Image Card */}
              <div className="bg-slate-50 dark:bg-black/50 border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    ภาพต้นฉบับ
                  </span>
                  {originalImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setLightboxUrl(originalImageUrl);
                        setLightboxTitle("ภาพต้นฉบับ");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-200/70 hover:bg-slate-300/80 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-medium inline-flex items-center gap-1 apple-pressable transition"
                    >
                      <Google_Icon name="zoom_in" size={14} />
                      <span>ขยายดู</span>
                    </button>
                  )}
                </div>
                <div className="h-[280px] bg-black rounded-xl overflow-hidden flex items-center justify-center">
                  {originalImageUrl && (
                    <img
                      src={originalImageUrl}
                      alt="ภาพต้นฉบับ"
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
              </div>

              {/* AI Skeleton Annotated Image Card */}
              <div className="bg-slate-50 dark:bg-black/50 border border-emerald-500/30 dark:border-emerald-400/25 rounded-2xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <Google_Icon name="crop_free" size={15} />
                    <span>โครงกระดูก AI & ตำแหน่งท่าทาง</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    {annotatedImageUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setLightboxUrl(annotatedImageUrl);
                            setLightboxTitle("โครงกระดูก AI & ตำแหน่งท่าทาง");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-semibold inline-flex items-center gap-1 apple-pressable transition"
                        >
                          <Google_Icon name="zoom_in" size={14} />
                          <span>ขยายดู</span>
                        </button>
                        <a
                          href={annotatedImageUrl}
                          download={`referee-pose-${fileName || "result"}.jpg`}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1 apple-pressable shadow-sm transition"
                        >
                          <Google_Icon name="download" size={14} />
                          <span>บันทึกภาพ</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>
                <div className="h-[280px] bg-black rounded-xl overflow-hidden flex items-center justify-center">
                  {annotatedImageUrl ? (
                    <img
                      src={annotatedImageUrl}
                      alt="ภาพผลวิเคราะห์ AI"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                      <span className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      <span>กำลังประมวลผลโครงกระดูก...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detected Pose Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  สัญญาณที่ตรวจพบ
                </h3>
                <span className="text-slate-500 dark:text-slate-400 apple-tabular">
                  {imageDetections.length} รายการ
                </span>
              </div>

              {imageDetections.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  ไม่พบสัญญาณผู้ตัดสินที่เข้าเกณฑ์ความมั่นใจ
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {imageDetections.map((det, idx) => {
                    const info = findRuleByLabel(det.label);
                    const meta = getConfidenceVisualMeta(det.confidence);

                    return (
                      <div
                        key={`${det.label}-${idx}`}
                        className="p-4 rounded-2xl border bg-slate-50/80 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/[0.08] space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-white/20 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-base font-bold text-slate-900 dark:text-white truncate">
                              {info ? info.nameTh : formatSignalEnglishName(det.label)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {formatSignalEnglishName(det.label)}
                            </div>
                          </div>
                          {info && (
                            <span className="shrink-0 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-300">
                              {info.ifabLaw.split(" - ")[0]}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 apple-tabular">
                          <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${meta.barClass}`}
                              style={{ width: `${meta.pct}%` }}
                            />
                          </div>
                          <span className={`text-sm font-extrabold ${meta.textClass}`}>
                            {meta.pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. VIDEO RESULTS (Player + Visual Scrubber + Stats + Keyframe Stamp Cards) */}
        {activeType === "video" && videoPreviewUrl && (
          <div className="space-y-6">
            {/* Video Player Box */}
            <div className="bg-black rounded-3xl border border-slate-200/80 dark:border-white/[0.08] overflow-hidden shadow-lg">
              <video
                ref={videoPreviewRef}
                src={videoPreviewUrl}
                controls
                onTimeUpdate={() => {
                  if (videoPreviewRef.current) {
                    setVideoCurrentTime(videoPreviewRef.current.currentTime);
                  }
                }}
                className="w-full max-h-[380px] object-contain"
              />
            </div>

            {videoResult && (
              <>
                {/* 4.1 Interactive Visual Scrubber Bar */}
                <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Google_Icon name="timeline" size={15} className="text-emerald-500" />
                      <span>ไทม์ไลน์จุดเกิดสัญญาณในวิดีโอ</span>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 apple-tabular font-mono">
                      {formatTimestampSec(videoCurrentTime)} / {formatTimestampSec(videoStats.analyzedDurationSec)}
                    </span>
                  </div>

                  {/* Scrubber Track */}
                  <div className="relative w-full h-4 bg-slate-200 dark:bg-white/10 rounded-full overflow-visible select-none">
                    {/* Playhead progress bar */}
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-500/20 rounded-full pointer-events-none"
                      style={{
                        width: `${Math.min(
                          100,
                          (videoCurrentTime / videoStats.analyzedDurationSec) * 100
                        )}%`,
                      }}
                    />

                    {/* Colored Tick Markers for each detected referee pose */}
                    {detectedKeyframes.map((frameRow) => {
                      const posPct =
                        (frameRow.time / videoStats.analyzedDurationSec) * 100;
                      const isSelected = activeFrameIdx === frameRow.frame;
                      const topDet = frameRow.detections[0];
                      const meta = topDet
                        ? getConfidenceVisualMeta(topDet.confidence)
                        : null;

                      return (
                        <button
                          key={frameRow.frame}
                          type="button"
                          onClick={() => handleSeekVideo(frameRow.frame, frameRow.time)}
                          title={`${formatTimestampSec(frameRow.time)} - ${
                            topDet ? formatSignalEnglishName(topDet.label) : "สัญญาณ"
                          }`}
                          className={`absolute top-0 bottom-0 w-2.5 -ml-1 rounded-full cursor-pointer transition-all ${
                            isSelected
                              ? "bg-white ring-2 ring-emerald-500 scale-125 z-20"
                              : meta?.pct && meta.pct >= 70
                              ? "bg-emerald-500 hover:scale-125 z-10"
                              : "bg-amber-400 hover:scale-125 z-10"
                          }`}
                          style={{ left: `${Math.min(99, Math.max(1, posPct))}%` }}
                        />
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                    <span>00:00.0</span>
                    <span>คลิกจุดสีบนไทม์ไลน์เพื่อกระโดดไปยังจังหวะที่ตรวจพบ</span>
                    <span>{formatTimestampSec(videoStats.analyzedDurationSec)}</span>
                  </div>
                </div>

                {/* 4.2 Summary Stat Tiles */}
                <div className="grid grid-cols-3 gap-3.5 apple-tabular">
                  <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">จังหวะที่พบ</div>
                    <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {videoStats.totalDetections}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">สัญญาณหลัก</div>
                    <div className="text-sm md:text-base font-bold text-slate-900 dark:text-white mt-1 truncate">
                      {videoStats.topSignalTh}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-4 shadow-sm">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">ความยาวคลิป</div>
                    <div className="text-xl font-extrabold text-sky-600 dark:text-sky-300 mt-0.5">
                      {videoStats.analyzedDurationSec.toFixed(1)}s
                    </div>
                  </div>
                </div>

                {/* 4.3 Keyframe Stamp Cards & Filter */}
                <div className="bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] rounded-3xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-transparent border-b border-slate-200/80 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2.5">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      รายการจังหวะสัญญาณ IFAB
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "detected", label: "ที่พบสัญญาณ" },
                        { id: "all", label: "ทั้งหมด" },
                        ...videoStats.uniqueLabels.map((label) => {
                          const rule = findRuleByLabel(label);
                          return {
                            id: label,
                            label: rule
                              ? rule.nameTh
                              : formatSignalEnglishName(label),
                          };
                        }),
                      ].map((pill) => {
                        const active = timelineFilter === pill.id;
                        return (
                          <button
                            key={pill.id}
                            type="button"
                            onClick={() => setTimelineFilter(pill.id)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                              active
                                ? "bg-emerald-500/20 border-emerald-400/45 text-emerald-700 dark:text-emerald-300 font-semibold"
                                : "bg-transparent border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            {pill.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {filteredTimelineRows.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      ไม่พบสัญญาณตามเงื่อนไขที่เลือก
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.06] text-xs apple-tabular">
                      {filteredTimelineRows.map((row) => {
                        const isActive = activeFrameIdx === row.frame;
                        return (
                          <button
                            key={row.frame}
                            type="button"
                            onClick={() => handleSeekVideo(row.frame, row.time)}
                            className={`w-full text-left px-5 py-3.5 flex items-center justify-between gap-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                              isActive
                                ? "bg-emerald-50 dark:bg-emerald-500/15 text-slate-900 dark:text-white font-semibold"
                                : "hover:bg-slate-50 dark:hover:bg-white/[0.03] text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-3 shrink-0">
                              <span
                                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                  isActive
                                    ? "bg-emerald-500 text-slate-950"
                                    : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                                }`}
                              >
                                <Google_Icon name="play_arrow" size={15} />
                              </span>
                              <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                                {formatTimestampSec(row.time)}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              {row.detections.length === 0 ? (
                                <span className="text-slate-400 text-xs">-</span>
                              ) : (
                                row.detections.map((d, idx) => {
                                  const info = findRuleByLabel(d.label);
                                  const meta = getConfidenceVisualMeta(d.confidence);
                                  return (
                                    <span
                                      key={`${row.frame}-${d.label}-${idx}`}
                                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 ${meta.badgeClass}`}
                                    >
                                      <span>
                                        {info
                                          ? info.nameTh
                                          : formatSignalEnglishName(d.label)}
                                      </span>
                                      <span className="opacity-75">· {meta.pct}%</span>
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 5. Lightbox Modal for Zooming Images */}
      {lightboxUrl && (
        <div
          role="dialog"
          aria-label={lightboxTitle}
          className="fixed inset-0 z-50 backdrop-blur-2xl bg-black/90 flex flex-col p-4 md:p-8 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between gap-3 text-white max-w-6xl w-full mx-auto pb-4">
            <span className="text-sm md:text-base font-bold flex items-center gap-2">
              <Google_Icon name="photo_camera" size={18} className="text-emerald-400" />
              <span>{lightboxTitle}</span>
            </span>

            <div className="flex items-center gap-2">
              <a
                href={lightboxUrl}
                download="referee-signal-zoom.jpg"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition"
              >
                <Google_Icon name="download" size={15} />
                <span>ดาวน์โหลด</span>
              </a>

              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                aria-label="ปิดหน้าต่างขยายภาพ"
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <Google_Icon name="close" size={18} />
              </button>
            </div>
          </div>

          <div
            className="flex-1 min-h-0 flex items-center justify-center p-2"
            onClick={() => setLightboxUrl(null)}
          >
            <img
              src={lightboxUrl}
              alt={lightboxTitle}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl ring-1 ring-white/15"
            />
          </div>
        </div>
      )}
    </section>
  );
};
