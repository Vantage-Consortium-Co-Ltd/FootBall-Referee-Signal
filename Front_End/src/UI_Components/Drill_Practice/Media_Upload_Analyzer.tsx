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
  mode: "image" | "video";
}

export const Media_Upload_Analyzer: React.FC<MediaUploadAnalyzerProps> = ({
  mode,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Photo Analysis state
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const [imageDetections, setImageDetections] = useState<ModalDetection[]>([]);

  // Video Analysis state
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
        `ไฟล์มีขนาด ${sizeMb} MB เกินขนาดสูงสุดที่รองรับ (${MODEL_SPEC_INFO.maxUploadMb} MB)`
      );
      triggerCausalFeedback("warning");
      return;
    }

    setFileName(file.name);
    setIsLoading(true);
    triggerCausalFeedback("tap");

    try {
      if (mode === "image") {
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
      } else {
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
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "ไม่สามารถวิเคราะห์ไฟล์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง"
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
        topSignalTh: "ไม่มีสัญญาณที่ตรวจพบ",
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
      : "ยังไม่มีสัญญาณที่ตรวจพบ";

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
      aria-label={mode === "image" ? "วิเคราะห์สัญญาณจากภาพถ่าย" : "วิเคราะห์ไทม์ไลน์วิดีโอการแข่งขัน"}
      className="rounded-3xl bg-slate-900/80 border border-white/10 overflow-hidden shadow-2xl shadow-black/50 flex flex-col"
    >
      {/* Header */}
      <div className="px-5 py-4 bg-slate-950/60 border-b border-white/10 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-400 shrink-0">
            <Google_Icon
              name={mode === "image" ? "photo_camera" : "movie"}
              size={18}
            />
          </span>
          <div>
            <h2 className="text-sm md:text-base font-bold text-white">
              {mode === "image"
                ? "วิเคราะห์ท่าสัญญาณจากภาพถ่าย"
                : "วิเคราะห์จังหวะสัญญาณจากคลิปวิดีโอ"}
            </h2>
            <p className="text-xs text-slate-300">
              {mode === "image"
                ? "อัปโหลดภาพผู้ตัดสินเพื่อวาดเส้นโครงกระดูกและจำแนกท่าตามกติกา IFAB"
                : `อัปโหลดคลิปการแข่งขันเพื่อค้นหาช่วงเวลาที่ผู้ตัดสินให้สัญญาณ (วิเคราะห์สูงสุด ${MODEL_SPEC_INFO.videoMaxSeconds} วินาที)`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onPointerDown={() => triggerCausalFeedback("tap")}
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 apple-pressable disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          <Google_Icon name="layers" size={15} />
          <span>{mode === "image" ? "เลือกรูปภาพ" : "เลือกคลิปวิดีโอ"}</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={
            mode === "image"
              ? "image/jpeg,image/png,image/webp,image/*"
              : "video/mp4,video/quicktime,video/webm,video/*"
          }
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="p-5 space-y-5">
        {/* Dropzone */}
        <div
          role="button"
          tabIndex={0}
          aria-label={
            mode === "image"
              ? "พื้นที่วางหรือเลือกไฟล์ภาพถ่ายผู้ตัดสิน"
              : "พื้นที่วางหรือเลือกไฟล์คลิปวิดีโอการแข่งขัน"
          }
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
          className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
            isDragging
              ? "border-emerald-400 bg-emerald-500/10"
              : "border-white/15 bg-slate-950/60 hover:border-emerald-400/50"
          }`}
        >
          <div className="flex flex-col items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-400">
              <Google_Icon
                name={mode === "image" ? "photo_camera" : "movie"}
                size={22}
              />
            </div>
            <div className="text-xs md:text-sm font-semibold text-white">
              {isLoading
                ? "กำลังวิเคราะห์ไฟล์ด้วยระบบ AI..."
                : fileName
                ? `ไฟล์ล่าสุด: ${fileName} — คลิกหรือวางไฟล์ใหม่เพื่อวิเคราะห์อีกครั้ง`
                : mode === "image"
                ? "คลิกเพื่อเลือกภาพ หรือวางไฟล์ที่นี่ (JPG, PNG, WebP)"
                : "คลิกเพื่อเลือกคลิป หรือวางไฟล์ที่นี่ (MP4, MOV, WebM)"}
            </div>
            <p className="text-xs text-slate-300">
              {mode === "image"
                ? `รองรับขนาดไฟล์สูงสุด ${MODEL_SPEC_INFO.maxUploadMb} MB · แนะนำภาพผู้ตัดสินเต็มตัวและเห็นแขนชัดเจน`
                : `รองรับขนาดสูงสุด ${MODEL_SPEC_INFO.maxUploadMb} MB · วิเคราะห์ความยาวสูงสุด ${MODEL_SPEC_INFO.videoMaxSeconds} วินาทีต่อคลิป`}
            </p>
          </div>
        </div>

        {isLoading && (
          <div
            role="status"
            aria-live="polite"
            className="px-4 py-3 rounded-2xl bg-sky-500/15 border border-sky-400/35 text-xs text-sky-200 flex items-center gap-3"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping shrink-0" />
            <span>
              กำลังวิเคราะห์ท่าสัญญาณด้วยระบบ AI (การประมวลผลครั้งแรกอาจใช้เวลาประมาณ 10–30 วินาที)...
            </span>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="px-4 py-3 rounded-2xl bg-rose-950/90 border border-rose-400/45 text-xs text-rose-100 flex items-center gap-2.5"
          >
            <Google_Icon name="warning" size={16} className="text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* PHOTO ANALYSIS RESULTS */}
        {mode === "image" && (originalImageUrl || annotatedImageUrl) && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/75 border border-white/10 rounded-2xl p-3.5 space-y-2.5">
                <div className="text-xs font-semibold text-slate-200">
                  ภาพต้นฉบับ
                </div>
                <div className="h-[260px] bg-black rounded-xl overflow-hidden flex items-center justify-center">
                  {originalImageUrl && (
                    <img
                      src={originalImageUrl}
                      alt="ภาพถ่ายผู้ตัดสินต้นฉบับ"
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
              </div>

              <div className="bg-slate-950/75 border border-emerald-400/30 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-emerald-300">
                    ภาพวิเคราะห์โครงกระดูกและท่าสัญญาณ (AI Pose)
                  </span>
                  {annotatedImageUrl && (
                    <a
                      href={annotatedImageUrl}
                      download={`referee-pose-${fileName || "result"}.jpg`}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/45 text-emerald-200 hover:bg-emerald-500/30 text-[11px] font-semibold inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                      <Google_Icon name="download" size={13} />
                      <span>ดาวน์โหลดภาพผลลัพธ์</span>
                    </a>
                  )}
                </div>
                <div className="h-[260px] bg-black rounded-xl overflow-hidden flex items-center justify-center">
                  {annotatedImageUrl ? (
                    <img
                      src={annotatedImageUrl}
                      alt="ภาพผลวิเคราะห์โครงกระดูกและท่าสัญญาณผู้ตัดสิน"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">
                      กำลังจัดทำภาพวิเคราะห์...
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Human-Friendly Signal Cards */}
            <div className="bg-slate-950/75 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">
                  ผลการจำแนกท่าสัญญาณผู้ตัดสิน
                </h3>
                <span className="text-xs text-slate-300 apple-tabular">
                  ตรวจพบ {imageDetections.length} สัญญาณ
                </span>
              </div>

              {imageDetections.length === 0 ? (
                <div className="rounded-xl bg-slate-900 border border-white/10 p-4 text-xs text-slate-300 leading-relaxed">
                  ยังไม่พบผู้ตัดสินหรือท่าสัญญาณที่ชัดเจนในภาพนี้ — แนะนำให้ใช้ภาพที่เห็นผู้ตัดสินตั้งแต่ศีรษะถึงลำตัวชัดเจน มีแสงสว่างเพียงพอ และไม่ถูกผู้เล่นบดบังช่วงแขน
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {imageDetections.map((det, idx) => {
                    const info = findRuleByLabel(det.label);
                    const meta = getConfidenceVisualMeta(det.confidence);

                    return (
                      <article
                        key={`${det.label}-${idx}`}
                        className="p-4 rounded-2xl border bg-slate-900/90 border-white/10 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {info && (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-slate-200">
                                  {info.ifabLaw}
                                </span>
                              )}
                              {info?.isF1ZeroLimited && (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-amber-500/15 border border-amber-400/35 text-amber-300">
                                  อยู่ระหว่างเพิ่มข้อมูลฝึกสอน
                                </span>
                              )}
                            </div>
                            <h4 className="text-base font-bold text-white">
                              {info ? info.nameTh : formatSignalEnglishName(det.label)}
                            </h4>
                            <div className="text-xs text-slate-300">
                              {formatSignalEnglishName(det.label)}
                            </div>
                          </div>

                          <div className="sm:text-right space-y-1 shrink-0 apple-tabular">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-bold ${meta.badgeClass}`}
                            >
                              ความเชื่อมั่น {meta.pct}% · {meta.tierLabel}
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${meta.barClass}`}
                            style={{ width: `${meta.pct}%` }}
                          />
                        </div>

                        {info && (
                          <div className="space-y-1.5 pt-1 text-xs text-slate-300">
                            <p className="leading-relaxed">{info.descriptionTh}</p>
                            {info.coachingTips.length > 0 && (
                              <p className="text-emerald-300/90">
                                <strong>จุดสังเกตท่าทาง:</strong> {info.coachingTips.join(" · ")}
                              </p>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIDEO ANALYSIS RESULTS */}
        {mode === "video" && videoPreviewUrl && (
          <div className="space-y-4">
            <div className="bg-black rounded-2xl border border-white/10 overflow-hidden">
              <video
                ref={videoPreviewRef}
                src={videoPreviewUrl}
                controls
                className="w-full max-h-[340px] object-contain"
              />
            </div>

            {videoResult && (
              <>
                {/* Plain-language Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 apple-tabular">
                  <div className="bg-slate-950/75 border border-white/10 rounded-2xl p-3.5">
                    <div className="text-xs text-slate-300">
                      จำนวนจังหวะที่ตรวจพบสัญญาณ
                    </div>
                    <div className="text-xl font-bold text-emerald-400 mt-1">
                      {videoStats.totalDetections} จังหวะ
                    </div>
                  </div>
                  <div className="bg-slate-950/75 border border-white/10 rounded-2xl p-3.5">
                    <div className="text-xs text-slate-300">
                      สัญญาณที่พบบ่อยที่สุด
                    </div>
                    <div className="text-base font-bold text-white mt-1.5 truncate">
                      {videoStats.topSignalTh}
                    </div>
                  </div>
                  <div className="bg-slate-950/75 border border-white/10 rounded-2xl p-3.5">
                    <div className="text-xs text-slate-300">
                      ความยาวคลิปที่วิเคราะห์
                    </div>
                    <div className="text-xl font-bold text-sky-300 mt-1">
                      {videoStats.analyzedDurationSec.toFixed(1)} วินาที
                    </div>
                  </div>
                </div>

                {/* Interactive Match Signal Timeline */}
                <div className="bg-slate-950/75 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 bg-slate-900 border-b border-white/10 space-y-2.5">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <h3 className="text-sm font-bold text-white">
                        ไทม์ไลน์การให้สัญญาณผู้ตัดสิน
                      </h3>
                      <span className="text-xs text-slate-300">
                        คลิกที่ช่วงเวลาเพื่อกระโดดไปยังจังหวะนั้นในวิดีโอทันที
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "detected", label: "เฉพาะจังหวะที่พบสัญญาณ" },
                        { id: "all", label: "ทุกช่วงเวลาที่ตรวจ" },
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
                                ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                                : "bg-slate-950 border-white/10 text-slate-300 hover:text-white"
                            }`}
                          >
                            {pill.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {filteredTimelineRows.length === 0 ? (
                    <div className="p-5 text-center text-xs text-slate-300">
                      ยังไม่พบท่าสัญญาณชัดเจนในช่วงที่เลือก — คุณสามารถกดดู &ldquo;ทุกช่วงเวลาที่ตรวจ&rdquo; หรือเลือกคลิปที่เห็นท่าทางผู้ตัดสินชัดเจนขึ้น
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-white/10 text-xs apple-tabular">
                      {filteredTimelineRows.map((row) => {
                        const isActive = activeFrameIdx === row.frame;
                        return (
                          <button
                            key={row.frame}
                            type="button"
                            onClick={() => handleSeekVideo(row.frame, row.time)}
                            className={`w-full text-left px-4 py-3 flex flex-wrap items-center justify-between gap-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                              isActive
                                ? "bg-emerald-500/15 text-white"
                                : "hover:bg-slate-900 text-slate-200"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 shrink-0">
                              <Google_Icon
                                name="play_arrow"
                                size={16}
                                className={
                                  isActive ? "text-emerald-400" : "text-slate-400"
                                }
                              />
                              <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 border border-white/10 font-semibold text-white">
                                {formatTimestampSec(row.time)}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {row.detections.length === 0 ? (
                                <span className="text-slate-400">
                                  ไม่พบสัญญาณในช่วงเวลานี้
                                </span>
                              ) : (
                                row.detections.map((d, idx) => {
                                  const info = findRuleByLabel(d.label);
                                  const meta = getConfidenceVisualMeta(d.confidence);
                                  return (
                                    <span
                                      key={`${row.frame}-${d.label}-${idx}`}
                                      className={`px-2.5 py-1 rounded-full border text-xs font-medium inline-flex items-center gap-1.5 ${meta.badgeClass}`}
                                    >
                                      <span>
                                        {info
                                          ? info.nameTh
                                          : formatSignalEnglishName(d.label)}
                                      </span>
                                      {info && (
                                        <span className="opacity-80">
                                          ({info.ifabLaw.split(" - ")[0]})
                                        </span>
                                      )}
                                      <span className="font-bold">· {meta.pct}%</span>
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
