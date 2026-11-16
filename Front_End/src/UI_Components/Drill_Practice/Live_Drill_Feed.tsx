"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ModalDetection, SignalClassInfo } from "../../Data_Types/Referee_Types";
import {
  captureVideoFrameAsJpeg,
  fetchWebcamWsConfig,
  findRuleByLabel,
  predictImageAnnotatedUrl,
} from "../../Core_Lib/Api_Client";
import {
  formatSignalEnglishName,
  getConfidenceVisualMeta,
} from "../../Core_Lib/Ifab_Rules_Catalog";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

export interface LiveDrillFeedProps {
  targetSignal?: SignalClassInfo | null;
  onDetectionsUpdate?: (
    detections: ModalDetection[],
    latencyMs: number | null
  ) => void;
}

type StreamConnectionState =
  | "idle"
  | "warming"
  | "connecting"
  | "connected"
  | "closed"
  | "error";

export const Live_Drill_Feed: React.FC<LiveDrillFeedProps> = ({
  targetSignal,
  onDetectionsUpdate,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const awaitingReplyRef = useRef<boolean>(false);
  const sendTimeRef = useRef<number>(0);
  const pumpTimerRef = useRef<number | null>(null);
  const onDetectionsUpdateRef = useRef(onDetectionsUpdate);

  useEffect(() => {
    onDetectionsUpdateRef.current = onDetectionsUpdate;
  }, [onDetectionsUpdate]);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mirror, setMirror] = useState<boolean>(true);
  const [streamState, setStreamState] = useState<StreamConnectionState>("idle");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [latestDetections, setLatestDetections] = useState<ModalDetection[]>([]);
  const [reconnectNonce, setReconnectNonce] = useState<number>(0);

  const [skeletonViewMode, setSkeletonViewMode] = useState<boolean>(false);
  const [skeletonStreamUrl, setSkeletonStreamUrl] = useState<string | null>(null);
  const [isCapturingSnapshot, setIsCapturingSnapshot] = useState<boolean>(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (snapshotUrl) URL.revokeObjectURL(snapshotUrl);
    };
  }, [snapshotUrl]);

  useEffect(() => {
    return () => {
      if (skeletonStreamUrl) URL.revokeObjectURL(skeletonStreamUrl);
    };
  }, [skeletonStreamUrl]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("เบราว์เซอร์ไม่รองรับกล้อง");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: unknown) {
      setCameraError(
        err instanceof Error ? err.message : "ไม่สามารถเปิดกล้องได้"
      );
      setCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setLatestDetections([]);
    onDetectionsUpdateRef.current?.([], null);
  }, []);

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Lock-step WebSocket stream; paused when Skeleton View uses annotated JPEG frames
  useEffect(() => {
    if (!cameraActive || skeletonViewMode) {
      if (pumpTimerRef.current !== null) {
        window.clearTimeout(pumpTimerRef.current);
        pumpTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "camera stopped");
        wsRef.current = null;
      }
      awaitingReplyRef.current = false;
      setStreamState("idle");
      setStreamError(null);
      setLatestDetections([]);
      return;
    }

    let cancelled = false;

    const scheduleNextFrame = (delayMs: number) => {
      if (cancelled) return;
      if (pumpTimerRef.current !== null) window.clearTimeout(pumpTimerRef.current);
      pumpTimerRef.current = window.setTimeout(() => {
        void sendNextFrame();
      }, delayMs);
    };

    const sendNextFrame = async () => {
      if (cancelled) return;
      const ws = wsRef.current;
      const video = videoRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN || awaitingReplyRef.current) {
        return;
      }
      if (!video || video.readyState < 2) {
        scheduleNextFrame(150);
        return;
      }

      const blob = await captureVideoFrameAsJpeg(video, 640, 0.8);
      if (cancelled || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }
      if (!blob) {
        scheduleNextFrame(150);
        return;
      }

      try {
        const buffer = await blob.arrayBuffer();
        if (cancelled || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }
        awaitingReplyRef.current = true;
        sendTimeRef.current = performance.now();
        wsRef.current.send(buffer);
      } catch {
        awaitingReplyRef.current = false;
        scheduleNextFrame(300);
      }
    };

    const connectStream = async () => {
      try {
        setStreamError(null);
        setStreamState("connecting");
        const config = await fetchWebcamWsConfig();
        if (cancelled) return;

        const ws = new WebSocket(config.wsUrl);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) {
            ws.close(1000);
            return;
          }
          awaitingReplyRef.current = false;
          setStreamState("connected");
          setStreamError(null);
          scheduleNextFrame(40);
        };

        ws.onmessage = (event) => {
          if (cancelled) return;
          const rtt = Math.round(performance.now() - sendTimeRef.current);
          awaitingReplyRef.current = false;

          let dets: ModalDetection[] = [];
          try {
            const payload = JSON.parse(String(event.data)) as {
              detections?: ModalDetection[];
            };
            dets = Array.isArray(payload.detections) ? payload.detections : [];
          } catch {
            dets = [];
          }

          setLatestDetections(dets);
          onDetectionsUpdateRef.current?.(dets, rtt);
          scheduleNextFrame(40);
        };

        ws.onerror = () => {
          if (cancelled) return;
          awaitingReplyRef.current = false;
          setStreamState("error");
          setStreamError("การเชื่อมต่อกล้องสดขัดข้อง");
        };

        ws.onclose = (ev) => {
          if (cancelled) return;
          awaitingReplyRef.current = false;
          wsRef.current = null;
          if (ev.code === 1008) {
            setStreamState("error");
            setStreamError("สิทธิ์เชื่อมต่อไม่ถูกต้อง");
          } else if (ev.code === 1001) {
            setStreamState("closed");
            setStreamError("พักการเชื่อมต่อชั่วคราว");
          } else if (ev.code !== 1000) {
            setStreamState("closed");
            setStreamError("ขาดการเชื่อมต่อ");
          } else {
            setStreamState("idle");
          }
        };
      } catch {
        if (cancelled) return;
        setStreamState("error");
        setStreamError("เชื่อมต่อกล้องสดไม่สำเร็จ");
      }
    };

    void connectStream();

    return () => {
      cancelled = true;
      if (pumpTimerRef.current !== null) {
        window.clearTimeout(pumpTimerRef.current);
        pumpTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "cleanup");
        wsRef.current = null;
      }
      awaitingReplyRef.current = false;
    };
  }, [cameraActive, skeletonViewMode, reconnectNonce]);

  useEffect(() => {
    if (!cameraActive || !skeletonViewMode) {
      setSkeletonStreamUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let cancelled = false;
    let timerId: number | null = null;

    const pumpAnnotated = async () => {
      if (cancelled) return;
      if (videoRef.current && videoRef.current.readyState >= 2) {
        try {
          const blob = await captureVideoFrameAsJpeg(videoRef.current, 640, 0.78);
          if (blob && !cancelled) {
            const url = await predictImageAnnotatedUrl(blob, "live-annotated.jpg");
            if (cancelled) {
              URL.revokeObjectURL(url);
              return;
            }
            setSkeletonStreamUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return url;
            });
          }
        } catch {
          // Retain last annotated frame
        }
      }
      if (!cancelled) {
        timerId = window.setTimeout(() => {
          void pumpAnnotated();
        }, 120);
      }
    };

    void pumpAnnotated();

    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [cameraActive, skeletonViewMode]);

  const handleSaveSnapshot = async () => {
    if (!videoRef.current || isCapturingSnapshot) return;
    setIsCapturingSnapshot(true);
    setSnapshotError(null);
    triggerCausalFeedback("tap");

    try {
      const blob = await captureVideoFrameAsJpeg(videoRef.current, 640, 0.9);
      if (!blob) throw new Error("กล้องยังไม่พร้อม");
      const nextUrl = await predictImageAnnotatedUrl(blob, "referee-snapshot.jpg");
      setSnapshotUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
      triggerCausalFeedback("success");
    } catch {
      setSnapshotError("บันทึกภาพไม่สำเร็จ");
      triggerCausalFeedback("warning");
    } finally {
      setIsCapturingSnapshot(false);
    }
  };

  const sortedDetections = [...latestDetections].sort(
    (a, b) => b.confidence - a.confidence
  );
  const topDetection = sortedDetections[0] ?? null;
  const topRule = topDetection ? findRuleByLabel(topDetection.label) : undefined;
  const topConfidenceMeta = topDetection
    ? getConfidenceVisualMeta(topDetection.confidence)
    : null;
  const isTargetMatched = Boolean(
    targetSignal &&
      topDetection &&
      topDetection.label.toLowerCase() === targetSignal.name.toLowerCase()
  );
  const isLiveStreaming = cameraActive && streamState === "connected";
  const isWarmingUp =
    cameraActive &&
    ((!skeletonViewMode && (streamState === "warming" || streamState === "connecting")) ||
      (skeletonViewMode && !skeletonStreamUrl));

  return (
    <section
      aria-label="กล้องวิเคราะห์สด"
      className="rounded-2xl bg-[#0D131A] border border-white/[0.08] overflow-hidden flex flex-col"
    >
      {/* Compact Toolbar: Target Signal Badge + Camera Controls */}
      <div className="px-4 py-3 bg-white/[0.02] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="sr-only">กล้องวิเคราะห์สด</h2>
          {targetSignal ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-xs font-semibold truncate">
                {targetSignal.nameTh}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-[11px] text-slate-300">
                {targetSignal.ifabLaw.split(" - ")[0]}
              </span>
            </div>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-medium text-slate-200">
              ตรวจจับอิสระ
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onPointerDown={() => triggerCausalFeedback("tap")}
            onClick={() => (cameraActive ? stopCamera() : void startCamera())}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              cameraActive
                ? "bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 text-white"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
            }`}
          >
            <Google_Icon name={cameraActive ? "videocam_off" : "videocam"} size={15} />
            <span>{cameraActive ? "หยุดกล้อง" : "เปิดกล้อง"}</span>
          </button>

          {cameraActive && (
            <button
              type="button"
              aria-pressed={skeletonViewMode}
              onPointerDown={() => triggerCausalFeedback("snap")}
              onClick={() => setSkeletonViewMode((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                skeletonViewMode
                  ? "bg-emerald-500/20 border-emerald-400/45 text-emerald-300"
                  : "bg-white/[0.04] border-white/10 text-slate-200 hover:bg-white/[0.08]"
              }`}
            >
              <Google_Icon name="crop_free" size={14} />
              <span>โครงกระดูก AI</span>
            </button>
          )}

          <button
            type="button"
            aria-pressed={mirror}
            onPointerDown={() => triggerCausalFeedback("tap")}
            onClick={() => setMirror((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              mirror
                ? "bg-sky-500/15 border-sky-400/35 text-sky-300"
                : "bg-white/[0.04] border-white/10 text-slate-300 hover:text-white"
            }`}
          >
            <Google_Icon name="flip" size={14} />
            <span>กระจก</span>
          </button>

          {cameraActive && (
            <button
              type="button"
              disabled={isCapturingSnapshot}
              onClick={() => void handleSaveSnapshot()}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-medium flex items-center gap-1.5 apple-pressable disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Google_Icon name="photo_camera" size={14} />
              <span>{isCapturingSnapshot ? "กำลังบันทึก..." : "บันทึกภาพ"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Camera Viewport */}
      <div className="relative w-full h-[380px] md:h-[430px] bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-contain z-0 transition-opacity duration-200 ${
            cameraActive && !(skeletonViewMode && skeletonStreamUrl)
              ? "opacity-100"
              : "opacity-0"
          } ${mirror ? "scale-x-[-1]" : ""}`}
        />

        {cameraActive && skeletonViewMode && skeletonStreamUrl && (
          <img
            src={skeletonStreamUrl}
            alt="โครงกระดูกท่าผู้ตัดสิน"
            className="absolute inset-0 w-full h-full object-contain z-10"
          />
        )}

        {!cameraActive && (
          <div className="relative z-20 flex flex-col items-center gap-3 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-400">
              <Google_Icon name="videocam" size={24} />
            </div>
            <div className="text-sm font-semibold text-white">
              พร้อมใช้งานกล้องวิเคราะห์สด
            </div>
            {cameraError && (
              <span className="px-3 py-1 rounded-full bg-rose-500/15 border border-rose-400/35 text-xs text-rose-200">
                {cameraError}
              </span>
            )}
            <button
              type="button"
              onClick={() => void startCamera()}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 apple-pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Google_Icon name="videocam" size={15} />
              <span>เปิดกล้อง</span>
            </button>
          </div>
        )}

        {/* Top-Left Live Status Pill */}
        {cameraActive && (
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
            <div
              role="status"
              aria-live="polite"
              className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-xs flex items-center gap-2 text-slate-100"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isWarmingUp
                    ? "bg-amber-400 animate-pulse"
                    : skeletonViewMode || isLiveStreaming
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-rose-400"
                }`}
              />
              <span>
                {isWarmingUp
                  ? "กำลังเตรียมระบบ..."
                  : skeletonViewMode
                  ? "โครงกระดูก AI"
                  : isLiveStreaming
                  ? "วิเคราะห์สด"
                  : "หยุดชั่วคราว"}
              </span>
            </div>

            {!skeletonViewMode &&
              (streamState === "error" || streamState === "closed") && (
                <div className="bg-rose-950/90 border border-rose-400/40 rounded-full px-3 py-1 text-xs text-rose-100 flex items-center gap-2">
                  <span>{streamError || "ขาดการเชื่อมต่อ"}</span>
                  <button
                    type="button"
                    onClick={() => setReconnectNonce((n) => n + 1)}
                    className="px-2 py-0.5 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-semibold text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    เชื่อมต่อใหม่
                  </button>
                </div>
              )}

            {snapshotError && (
              <div className="bg-rose-950/90 border border-rose-400/40 rounded-full px-3 py-1 text-xs text-rose-100">
                {snapshotError}
              </div>
            )}
          </div>
        )}

        {/* Snapshot Dialog */}
        {snapshotUrl && (
          <div
            role="dialog"
            aria-label="ภาพผลวิเคราะห์"
            className="absolute inset-3 z-30 bg-[#0A0F14]/95 border border-white/15 rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-white">ภาพผลวิเคราะห์</span>
              <div className="flex items-center gap-2">
                <a
                  href={snapshotUrl}
                  download="referee-signal-analysis.jpg"
                  className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <Google_Icon name="download" size={14} />
                  <span>ดาวน์โหลด</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSnapshotUrl(null)}
                  aria-label="ปิดหน้าต่าง"
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <Google_Icon name="close" size={15} />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center bg-black rounded-xl overflow-hidden">
              <img
                src={snapshotUrl}
                alt="ภาพผลวิเคราะห์โครงกระดูก"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Live Signal Bar */}
      <div
        aria-live="polite"
        className="px-4 py-3.5 bg-white/[0.02] border-t border-white/[0.08]"
      >
        {topDetection && topConfidenceMeta ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-base font-bold text-white">
                {topRule ? topRule.nameTh : formatSignalEnglishName(topDetection.label)}
              </span>
              <span className="text-xs text-slate-400">
                {formatSignalEnglishName(topDetection.label)}
              </span>
              {topRule && (
                <span className="px-2 py-0.5 rounded-md text-[11px] bg-white/[0.05] border border-white/10 text-slate-300">
                  {topRule.ifabLaw.split(" - ")[0]}
                </span>
              )}
              {isTargetMatched && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 border border-emerald-400/45 text-emerald-300 inline-flex items-center gap-1">
                  <Google_Icon name="verified" size={12} />
                  <span>ตรงกับท่าที่เลือก</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 sm:w-44 shrink-0 apple-tabular">
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${topConfidenceMeta.barClass}`}
                  style={{ width: `${topConfidenceMeta.pct}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${topConfidenceMeta.textClass}`}>
                {topConfidenceMeta.pct}%
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Google_Icon name="person" size={15} />
            <span>รอตรวจจับท่าสัญญาณ</span>
          </div>
        )}
      </div>
    </section>
  );
};
