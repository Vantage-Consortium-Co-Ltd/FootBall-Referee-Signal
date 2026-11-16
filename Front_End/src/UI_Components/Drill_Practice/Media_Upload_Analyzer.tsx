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

  // Photo state
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const [imageDetections, setImageDetections] = useState<ModalDetection[]>([]);

  // Video state
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<ModalVideoPredictResponse | null>(
    null
  );
  const [activeFrameIdx, setActiveFrameIdx] = useState<number | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<string>("detected");

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

  const handleAnalyzeFile = async (file: File) => {
    setErrorMsg(null);
    const maxBytes = MODEL_SPEC_INFO.maxUploadMb * 1024 * 1024;
    if (file.size > maxBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
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
      setErrorMsg("รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WebP) หรือวิดีโอ (MP4, MOV, WebM)");
      triggerCausalFeedback("warning");
      return;
    }

    setFileName(file.name);
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
      analyzedDurationSec: Math.max(durationFromFrames, lastSampleTime),
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

  return (
    <section
      aria-label="วิเคราะห์ไฟล์สื่อ"
      className="rounded-3xl bg-white dark:bg-[#0D131A] border border-slate-200/80 dark:border-white/[0.08] overflow-hidden flex flex-col shadow-sm transition-colors duration-200"
    >
      {/* Compact Header */}
      <div className="px-5 py-3.5 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Google_Icon
            name={activeType === "video" ? "movie" : "photo_camera"}
            size={17}
            className="text-emerald-600 dark:text-emerald-400 shrink-0"
          />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {activeType === "video"
              ? "ผลวิเคราะห์วิดีโอ"
              : activeType === "image"
              ? "ผลวิเคราะห์รูปภาพ"
              : "วิเคราะห์รูปภาพหรือวิดีโอ"}
          </h2>
        </div>

        <button
          type="button"
          onPointerDown={() => triggerCausalFeedback("tap")}
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 apple-pressable disabled:opacity-50 shadow-md shadow-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 transition"
        >
          <Google_Icon name="layers" size={14} />
          <span>เลือกไฟล์</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="p-4 md:p-5 space-y-4">
        {/* Universal Drag & Drop Dropzone */}
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
          className={`rounded-2xl border border-dashed px-4 py-8 text-center cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
            isDragging
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-slate-300 dark:border-white/15 bg-slate-50/60 dark:bg-white/[0.02] hover:border-emerald-500/50 dark:hover:border-emerald-400/50"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Google_Icon name="photo_camera" size={22} />
              <Google_Icon name="movie" size={22} />
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {isLoading
                ? "กำลังวิเคราะห์..."
                : fileName
                ? fileName
                : `วางไฟล์หรือคลิกเพื่อเลือกไฟล์ (รูปภาพ หรือ วิดีโอ) · สูงสุด ${MODEL_SPEC_INFO.maxUploadMb} MB`}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="px-3.5 py-2.5 rounded-xl bg-rose-950/80 border border-rose-400/40 text-xs text-rose-100 flex items-center gap-2"
          >
            <Google_Icon name="warning" size={15} className="text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* PHOTO RESULTS (Auto-rendered when uploaded file is image) */}
        {activeType === "image" && (originalImageUrl || annotatedImageUrl) && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="bg-black/40 border border-white/[0.08] rounded-xl p-3 space-y-2">
                <div className="text-xs font-medium text-slate-300">ต้นฉบับ</div>
                <div className="h-[240px] bg-black rounded-lg overflow-hidden flex items-center justify-center">
                  {originalImageUrl && (
                    <img
                      src={originalImageUrl}
                      alt="ภาพต้นฉบับ"
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
              </div>

              <div className="bg-black/40 border border-emerald-400/25 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-emerald-300">ผลวิเคราะห์ AI</span>
                  {annotatedImageUrl && (
                    <a
                      href={annotatedImageUrl}
                      download={`referee-pose-${fileName || "result"}.jpg`}
                      className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30 text-[11px] font-semibold inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                      <Google_Icon name="download" size={12} />
                      <span>ดาวน์โหลด</span>
                    </a>
                  )}
                </div>
                <div className="h-[240px] bg-black rounded-lg overflow-hidden flex items-center justify-center">
                  {annotatedImageUrl ? (
                    <img
                      src={annotatedImageUrl}
                      alt="ภาพผลวิเคราะห์ AI"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">กำลังประมวลผล...</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <h3 className="font-semibold text-slate-900 dark:text-white">สัญญาณที่ตรวจพบ</h3>
                <span className="text-slate-500 dark:text-slate-400 apple-tabular">
                  {imageDetections.length} รายการ
                </span>
              </div>

              {imageDetections.length === 0 ? (
                <div className="rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] px-3.5 py-3 text-xs text-slate-500 dark:text-slate-400">
                  ไม่พบสัญญาณ
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {imageDetections.map((det, idx) => {
                    const info = findRuleByLabel(det.label);
                    const meta = getConfidenceVisualMeta(det.confidence);

                    return (
                      <div
                        key={`${det.label}-${idx}`}
                        className="p-3.5 rounded-2xl border bg-slate-50/80 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/[0.08] space-y-2 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {info ? info.nameTh : formatSignalEnglishName(det.label)}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {formatSignalEnglishName(det.label)}
                            </div>
                          </div>
                          {info && (
                            <span className="shrink-0 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-300">
                              {info.ifabLaw.split(" - ")[0]}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 apple-tabular">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${meta.barClass}`}
                              style={{ width: `${meta.pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${meta.textClass}`}>
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

        {/* VIDEO RESULTS (Auto-rendered when uploaded file is video) */}
        {activeType === "video" && videoPreviewUrl && (
          <div className="space-y-4">
            <div className="bg-black rounded-2xl border border-slate-200/80 dark:border-white/[0.08] overflow-hidden shadow-md">
              <video
                ref={videoPreviewRef}
                src={videoPreviewUrl}
                controls
                className="w-full max-h-[320px] object-contain"
              />
            </div>

            {videoResult && (
              <>
                <div className="grid grid-cols-3 gap-3 apple-tabular">
                  <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-3.5 shadow-sm">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">จังหวะที่พบ</div>
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {videoStats.totalDetections}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-3.5 shadow-sm">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">สัญญาณหลัก</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                      {videoStats.topSignalTh}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl p-3.5 shadow-sm">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">ความยาวคลิป</div>
                    <div className="text-lg font-bold text-sky-600 dark:text-sky-300 mt-0.5">
                      {videoStats.analyzedDurationSec.toFixed(1)}s
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-slate-50/70 dark:bg-transparent border-b border-slate-200/80 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white">ไทม์ไลน์สัญญาณ</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "detected", label: "ที่พบ" },
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
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
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
                    <div className="p-4 text-center text-xs text-slate-400">
                      ไม่พบสัญญาณ
                    </div>
                  ) : (
                    <div className="max-h-[260px] overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.06] text-xs apple-tabular">
                      {filteredTimelineRows.map((row) => {
                        const isActive = activeFrameIdx === row.frame;
                        return (
                          <button
                            key={row.frame}
                            type="button"
                            onClick={() => handleSeekVideo(row.frame, row.time)}
                            className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                              isActive
                                ? "bg-emerald-50 dark:bg-emerald-500/15 text-slate-900 dark:text-white font-semibold"
                                : "hover:bg-slate-50 dark:hover:bg-white/[0.03] text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2 shrink-0">
                              <Google_Icon
                                name="play_arrow"
                                size={14}
                                className={
                                  isActive
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-slate-400 dark:text-slate-500"
                                }
                              />
                              <span className="font-mono text-slate-900 dark:text-white">
                                {formatTimestampSec(row.time)}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              {row.detections.length === 0 ? (
                                <span className="text-slate-500">-</span>
                              ) : (
                                row.detections.map((d, idx) => {
                                  const info = findRuleByLabel(d.label);
                                  const meta = getConfidenceVisualMeta(d.confidence);
                                  return (
                                    <span
                                      key={`${row.frame}-${d.label}-${idx}`}
                                      className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${meta.badgeClass}`}
                                    >
                                      {info
                                        ? info.nameTh
                                        : formatSignalEnglishName(d.label)}{" "}
                                      · {meta.pct}%
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
    </section>
  );
};
