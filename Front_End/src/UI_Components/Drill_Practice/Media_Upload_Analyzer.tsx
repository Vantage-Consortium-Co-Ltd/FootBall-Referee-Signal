"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ModalDetection,
  ModalVideoPredictResponse,
} from "../../Data_Types/Referee_Types";
import {
  findRuleByLabel,
  predictImageBoth,
  predictVideoFile,
} from "../../Core_Lib/Api_Client";
import { MODEL_SPEC_INFO } from "../../Core_Lib/Ifab_Rules_Catalog";
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

  // Image mode results
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const [imageDetections, setImageDetections] = useState<ModalDetection[]>([]);

  // Video mode results
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<ModalVideoPredictResponse | null>(null);
  const [activeFrameIdx, setActiveFrameIdx] = useState<number | null>(null);

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
        setImageDetections(res.detections);
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

        const res = await predictVideoFile(file);
        setVideoResult(res);
        triggerCausalFeedback("success");
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "เกิดข้อผิดพลาดระหว่างประมวลผลไฟล์กับ Modal API"
      );
      triggerCausalFeedback("warning");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleAnalyzeFile(file);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleAnalyzeFile(file);
    }
  };

  const handleSeekVideo = (frameNumber: number, timeSec: number) => {
    triggerCausalFeedback("snap");
    setActiveFrameIdx(frameNumber);
    if (videoPreviewRef.current) {
      videoPreviewRef.current.currentTime = timeSec;
      void videoPreviewRef.current.play().catch(() => {});
    }
  };

  const totalVideoDetections = videoResult
    ? videoResult.results.reduce((sum, item) => sum + item.detections.length, 0)
    : 0;

  return (
    <div className="apple-material-dark rounded-[22px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 bg-[#1C1C1E]/90 border-b border-white/[0.08] flex flex-wrap justify-between items-center gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Google_Icon
            name={mode === "image" ? "crop_free" : "videocam"}
            size={16}
            className="text-[#0A84FF]"
          />
          <span className="font-semibold text-[#F5F5F7]">
            {mode === "image"
              ? "POST /predict/image (JSON + ?annotated=true)"
              : "POST /predict/video (Frame-by-Frame JSON)"}
          </span>
        </div>

        <button
          type="button"
          onPointerDown={() => triggerCausalFeedback("tap")}
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="px-3.5 py-1.5 rounded-xl bg-[#0A84FF] hover:bg-[#3B9CFF] text-white font-semibold flex items-center gap-1.5 apple-pressable disabled:opacity-50"
        >
          <Google_Icon name="layers" size={14} />
          <span>{mode === "image" ? "เลือกรูปภาพ" : "เลือกคลิปวิดีโอ"}</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={mode === "image" ? "image/*" : "video/*"}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Dropzone & Results Body */}
      <div className="p-5 space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isLoading && fileInputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-5 text-center cursor-pointer transition ${
            isDragging
              ? "border-[#0A84FF] bg-[#0A84FF]/10"
              : "border-white/[0.14] bg-[#141416]/80 hover:border-[#0A84FF]/60"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-[#0A84FF]/15 border border-[#0A84FF]/40 flex items-center justify-center text-[#0A84FF]">
              <Google_Icon name={mode === "image" ? "crop_free" : "play_arrow"} size={20} />
            </div>
            <div className="text-xs font-semibold text-[#F5F5F7]">
              {isLoading
                ? mode === "image"
                  ? "กำลังส่งภาพไปยัง YOLO26n-pose บน Modal CPU..."
                  : `กำลังสแกนคลิปวิดีโอทุกๆ ${MODEL_SPEC_INFO.videoStride} เฟรม (สูงสุด ${MODEL_SPEC_INFO.videoMaxSeconds}s)...`
                : fileName
                ? `ไฟล์ล่าสุด: ${fileName} (คลิกหรือวางไฟล์ใหม่เพื่อทดสอบ)`
                : mode === "image"
                ? `คลิกหรือลากไฟล์ภาพ (JPG, PNG, WebP · สูงสุด ${MODEL_SPEC_INFO.maxUploadMb} MB)`
                : `คลิกหรือลากไฟล์วิดีโอ (MP4, MOV, AVI · สูงสุด ${MODEL_SPEC_INFO.maxUploadMb} MB / ${MODEL_SPEC_INFO.videoMaxSeconds}s)`}
            </div>
            <div className="text-[11px] text-[#A1A1A6]">
              {mode === "image"
                ? "เรียกใช้ทั้ง JSON detections และ JPEG ที่วาดกล่อง+โครงกระดูก 17 จุดจาก Backend"
                : `Backend อ่านวิดีโอสูงสุด ${MODEL_SPEC_INFO.videoMaxSeconds} วินาที และประมวลผลทุกๆ ${MODEL_SPEC_INFO.videoStride} เฟรม`}
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="px-4 py-3 rounded-2xl bg-[#0A84FF]/15 border border-[#0A84FF]/40 text-xs text-[#64D2FF] flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0A84FF] animate-ping shrink-0" />
            <span>
              กำลังประมวลผลบน Modal CPU (หากเป็นคำขอแรกหลัง Idle อาจใช้เวลา Warmup 10–30 วินาที)...
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="px-4 py-3 rounded-2xl bg-[#2B0B0D]/90 border border-[#FF453A]/50 text-xs text-[#FFD6D4] flex items-center gap-2">
            <Google_Icon name="warning" size={16} className="text-[#FF453A] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* IMAGE MODE RESULTS */}
        {mode === "image" && (originalImageUrl || annotatedImageUrl) && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-3 space-y-2">
                <div className="text-[11px] font-semibold text-[#A1A1A6]">
                  ภาพต้นฉบับ (Input Image)
                </div>
                <div className="h-[260px] bg-black rounded-xl overflow-hidden flex items-center justify-center">
                  {originalImageUrl && (
                    <img
                      src={originalImageUrl}
                      alt="Original upload"
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </div>
              </div>

              <div className="bg-[#141416] border border-[#30D158]/30 rounded-2xl p-3 space-y-2">
                <div className="text-[11px] font-semibold text-[#30D158] flex items-center justify-between gap-2">
                  <span>ผลลัพธ์จาก YOLO (?annotated=true)</span>
                  {annotatedImageUrl && (
                    <a
                      href={annotatedImageUrl}
                      download={`annotated-${fileName || "result"}.jpg`}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#30D158]/15 border border-[#30D158]/40 text-[#30D158] hover:bg-[#30D158]/25"
                    >
                      ดาวน์โหลด JPEG
                    </a>
                  )}
                </div>
                <div className="h-[260px] bg-black rounded-xl overflow-hidden flex items-center justify-center">
                  {annotatedImageUrl ? (
                    <img
                      src={annotatedImageUrl}
                      alt="Annotated YOLO output"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-[#6E6E73]">รอผลลัพธ์จากเซิร์ฟเวอร์...</span>
                  )}
                </div>
              </div>
            </div>

            {/* Detection List */}
            <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                <span className="font-semibold text-[#F5F5F7]">
                  JSON Detections ({imageDetections.length} รายการ)
                </span>
                <span className="text-[11px] text-[#A1A1A6]">
                  conf threshold ≥ 0.25
                </span>
              </div>

              {imageDetections.length === 0 ? (
                <div className="text-xs text-[#A1A1A6] py-2 font-mono">
                  {`{"detections": []}`} — ไม่พบบุคคลหรือสัญญาณที่ความมั่นใจ ≥ 0.25
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {imageDetections.map((det, idx) => {
                    const info = findRuleByLabel(det.label);
                    const pct = Math.round(det.confidence * 100);

                    return (
                      <div
                        key={`${det.label}-${idx}`}
                        className="p-3 rounded-xl border bg-[#1C1C1E] border-white/[0.08] space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-[#F5F5F7]">
                              {info ? info.nameTh : det.label}
                            </div>
                            <div className="text-[10px] font-mono text-[#A1A1A6]">
                              {det.label} {info ? `· ${info.ifabLaw}` : ""}
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-[#30D158] apple-tabular">
                            {det.confidence.toFixed(4)} ({pct}%)
                          </span>
                        </div>

                        <div className="w-full h-1.5 bg-[#2C2C2E] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0A84FF] rounded-full"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>

                        {info?.isF1ZeroLimited && (
                          <div className="text-[10px] text-[#FF9F0A]">
                            หมายเหตุ: คลาสนี้มี F1 = 0 ในชุดทดสอบของโมเดลปัจจุบัน
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIDEO MODE RESULTS */}
        {mode === "video" && videoPreviewUrl && (
          <div className="space-y-4">
            <div className="bg-black rounded-2xl border border-white/[0.1] overflow-hidden">
              <video
                ref={videoPreviewRef}
                src={videoPreviewUrl}
                controls
                className="w-full max-h-[320px] object-contain"
              />
            </div>

            {videoResult && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs apple-tabular">
                  <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-3">
                    <div className="text-[#A1A1A6] text-[10px]">Video FPS</div>
                    <div className="text-base font-mono font-bold text-[#F5F5F7] mt-0.5">
                      {videoResult.fps.toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-3">
                    <div className="text-[#A1A1A6] text-[10px]">frames_read</div>
                    <div className="text-base font-mono font-bold text-[#0A84FF] mt-0.5">
                      {videoResult.frames_read}
                    </div>
                  </div>
                  <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-3">
                    <div className="text-[#A1A1A6] text-[10px]">Sampled Frames</div>
                    <div className="text-base font-mono font-bold text-[#64D2FF] mt-0.5">
                      {videoResult.results.length}
                    </div>
                  </div>
                  <div className="bg-[#141416] border border-white/[0.08] rounded-xl p-3">
                    <div className="text-[#A1A1A6] text-[10px]">Total Detections</div>
                    <div className="text-base font-mono font-bold text-[#30D158] mt-0.5">
                      {totalVideoDetections}
                    </div>
                  </div>
                </div>

                <div className="bg-[#141416] border border-white/[0.08] rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#1C1C1E] border-b border-white/[0.08] flex flex-wrap justify-between items-center gap-2 text-xs">
                    <span className="font-semibold text-[#F5F5F7]">
                      ผลตรวจจับรายเฟรม (คลิกแถวเพื่อเลื่อนดูช่วงเวลานั้นในวิดีโอ)
                    </span>
                    <span className="text-[11px] text-[#A1A1A6]">
                      Stride = {MODEL_SPEC_INFO.videoStride} · Max{" "}
                      {MODEL_SPEC_INFO.videoMaxSeconds}s
                    </span>
                  </div>

                  <div className="max-h-[280px] overflow-y-auto divide-y divide-white/[0.06] text-xs apple-tabular">
                    {videoResult.results.map((row) => {
                      const isActive = activeFrameIdx === row.frame;
                      return (
                        <button
                          key={row.frame}
                          type="button"
                          onClick={() => handleSeekVideo(row.frame, row.time)}
                          className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition ${
                            isActive
                              ? "bg-[#0A84FF]/15 text-[#F5F5F7]"
                              : "hover:bg-[#1C1C1E]/80 text-[#A1A1A6]"
                          }`}
                        >
                          <div className="flex items-center gap-3 shrink-0 font-mono">
                            <span className="text-[#0A84FF] font-semibold">
                              frame {row.frame}
                            </span>
                            <span className="text-[#F5F5F7]">{row.time.toFixed(2)}s</span>
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {row.detections.length === 0 ? (
                              <span className="text-[11px] text-[#6E6E73]">
                                detections: []
                              </span>
                            ) : (
                              row.detections.map((d, idx) => {
                                const info = findRuleByLabel(d.label);
                                return (
                                  <span
                                    key={`${row.frame}-${d.label}-${idx}`}
                                    className="px-2 py-0.5 rounded-full bg-[#30D158]/15 border border-[#30D158]/40 text-[#30D158] text-[11px] font-medium"
                                  >
                                    {info ? `${info.nameTh} (${d.label})` : d.label} ·{" "}
                                    {d.confidence.toFixed(4)}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
