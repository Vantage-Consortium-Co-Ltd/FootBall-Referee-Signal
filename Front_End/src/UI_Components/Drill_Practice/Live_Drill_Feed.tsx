"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ModalDetection, SignalClassInfo } from "../../Data_Types/Referee_Types";
import {
  captureVideoFrameAsJpeg,
  checkModalHealth,
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
        throw new Error("เบราว์เซอร์นี้ไม่รองรับการเปิดใช้งานกล้อง");
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
        err instanceof Error
          ? `ไม่สามารถเปิดกล้องได้ในขณะนี้ (${err.message}) — คุณยังสามารถใช้งานโหมดวิเคราะห์รูปภาพหรือคลิปวิดีโอได้`
          : "ไม่สามารถเปิดกล้องได้ในขณะนี้ — คุณยังสามารถใช้งานโหมดวิเคราะห์รูปภาพหรือคลิปวิดีโอได้"
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

  // Continuous low-latency WebSocket stream; pauses automatically in Skeleton View
  // so only one inference stream runs at a time.
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
        setStreamState("warming");

        const health = await checkModalHealth();
        if (cancelled) return;
        if (health.status !== "ok") {
          setStreamState("error");
          setStreamError("ระบบวิเคราะห์ AI ยังไม่พร้อมใช้งานในขณะนี้ กรุณาลองเชื่อมต่อใหม่");
          return;
        }

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
          setStreamError("การเชื่อมต่อกล้องวิเคราะห์สดขัดข้องชั่วคราว");
        };

        ws.onclose = (ev) => {
          if (cancelled) return;
          awaitingReplyRef.current = false;
          wsRef.current = null;
          if (ev.code === 1008) {
            setStreamState("error");
            setStreamError("การยืนยันสิทธิ์เชื่อมต่อไม่สมบูรณ์ กรุณารีเฟรชหน้าเว็บแล้วลองใหม่");
          } else if (ev.code === 1001) {
            setStreamState("closed");
            setStreamError("พักการเชื่อมต่อเนื่องจากไม่ได้ใช้งานกล้องต่อเนื่อง");
          } else if (ev.code !== 1000) {
            setStreamState("closed");
            setStreamError("การเชื่อมต่อกับระบบวิเคราะห์ AI สิ้นสุดลง กรุณาเชื่อมต่อใหม่");
          } else {
            setStreamState("idle");
          }
        };
      } catch {
        if (cancelled) return;
        setStreamState("error");
        setStreamError("ไม่สามารถเชื่อมต่อกล้องวิเคราะห์สดได้ กรุณาลองใหม่อีกครั้ง");
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

  // Live Skeleton Overlay stream using backend annotated frames
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
          // Keep last valid skeleton frame while waiting
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
      if (!blob) throw new Error("กล้องยังไม่พร้อมสำหรับการบันทึกภาพ");
      const nextUrl = await predictImageAnnotatedUrl(blob, "referee-snapshot.jpg");
      setSnapshotUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
      triggerCausalFeedback("success");
    } catch {
      setSnapshotError("ไม่สามารถบันทึกภาพผลลัพธ์ได้ กรุณาลองใหม่อีกครั้ง");
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
      aria-label="กล้องฝึกซ้อมและวิเคราะห์ท่าสัญญาณสด"
      className="rounded-3xl bg-slate-900/80 border border-white/10 overflow-hidden shadow-2xl shadow-black/50 flex flex-col"
    >
      {/* Target Practice Card */}
      <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border-b border-white/10">
        {targetSignal ? (
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 border border-emerald-400/35 text-emerald-300">
                  ท่าฝึกซ้อมที่เลือก
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-slate-300">
                  {targetSignal.ifabLaw}
                </span>
                {targetSignal.isF1ZeroLimited && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 border border-amber-400/35 text-amber-300">
                    อยู่ระหว่างเพิ่มข้อมูลฝึกสอน
                  </span>
                )}
              </div>
              <h2 className="text-base md:text-lg font-bold text-white">
                {targetSignal.nameTh}{" "}
                <span className="text-sm font-normal text-slate-300">
                  · {formatSignalEnglishName(targetSignal.name)}
                </span>
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {targetSignal.descriptionTh}
              </p>
            </div>

            {targetSignal.coachingTips.length > 0 && (
              <div className="sm:max-w-[260px] shrink-0 rounded-2xl bg-black/35 border border-white/10 p-3 space-y-1">
                <div className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Google_Icon name="lightbulb" size={14} />
                  <span>คำแนะนำการแสดงท่าทาง</span>
                </div>
                <ul className="space-y-1 text-[11px] text-slate-300 list-disc pl-4">
                  {targetSignal.coachingTips.slice(0, 2).map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-xs text-slate-200">
            <h2 className="sr-only">โหมดกล้องวิเคราะห์สดแบบอิสระ</h2>
            <Google_Icon name="explore" size={18} className="text-emerald-400 shrink-0" />
            <span>
              <strong>โหมดตรวจจับอิสระ:</strong> แสดงท่าสัญญาณผู้ตัดสินหน้ากล้อง
              หรือเลือกท่าจากคู่มือด้านขวาเพื่อฝึกซ้อมเฉพาะท่า
            </span>
          </div>
        )}
      </div>

      {/* Studio Control Toolbar */}
      <div className="px-5 py-3 bg-slate-950/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onPointerDown={() => triggerCausalFeedback("tap")}
            onClick={() => (cameraActive ? stopCamera() : void startCamera())}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              cameraActive
                ? "bg-slate-800 hover:bg-slate-700 border border-white/15 text-white"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
            }`}
          >
            <Google_Icon name={cameraActive ? "videocam_off" : "videocam"} size={16} />
            <span>
              {cameraActive ? "หยุดกล้อง" : "เปิดกล้องเริ่มวิเคราะห์สด"}
            </span>
          </button>

          {cameraActive && (
            <button
              type="button"
              aria-pressed={skeletonViewMode}
              onPointerDown={() => triggerCausalFeedback("snap")}
              onClick={() => setSkeletonViewMode((prev) => !prev)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                skeletonViewMode
                  ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                  : "bg-slate-900 border-white/10 text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Google_Icon name="crop_free" size={15} />
              <span>
                {skeletonViewMode
                  ? "แสดงเส้นโครงกระดูก AI: เปิด"
                  : "โหมดกล้องปกติ (ความหน่วงต่ำ)"}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={mirror}
            onPointerDown={() => triggerCausalFeedback("tap")}
            onClick={() => setMirror((prev) => !prev)}
            className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              mirror
                ? "bg-sky-500/15 border-sky-400/40 text-sky-300"
                : "bg-slate-900 border-white/10 text-slate-300 hover:text-white"
            }`}
          >
            <Google_Icon name="flip" size={15} />
            <span>กลับด้านกระจก</span>
          </button>

          {cameraActive && (
            <button
              type="button"
              disabled={isCapturingSnapshot}
              onClick={() => void handleSaveSnapshot()}
              className="px-3 py-2 rounded-xl border border-emerald-400/35 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 apple-pressable disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Google_Icon name="photo_camera" size={15} />
              <span>
                {isCapturingSnapshot ? "กำลังบันทึกภาพ..." : "บันทึกภาพหน้าจอ"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Camera Viewport */}
      <div className="relative w-full h-[380px] md:h-[440px] bg-slate-950 flex items-center justify-center overflow-hidden">
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
            alt="ภาพโครงกระดูกและกรอบตรวจจับท่าผู้ตัดสินจาก AI"
            className="absolute inset-0 w-full h-full object-contain z-10"
          />
        )}

        {!cameraActive && (
          <div className="relative z-20 max-w-md mx-auto p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-400">
              <Google_Icon name="videocam" size={28} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">
                พร้อมฝึกซ้อมและวิเคราะห์ท่าทางผู้ตัดสิน
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {cameraError ||
                  "เปิดกล้องเพื่อให้ AI ช่วยวิเคราะห์ท่าสัญญาณผู้ตัดสินแบบเรียลไทม์ แนะนำให้ถอยห่างจากกล้องจนเห็นช่วงตัวและแขนทั้งสองข้างชัดเจน"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void startCamera()}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-2 apple-pressable shadow-lg shadow-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Google_Icon name="videocam" size={16} />
              <span>เปิดกล้องเริ่มวิเคราะห์สด</span>
            </button>
          </div>
        )}

        {/* Top-Left Live Status Overlay */}
        {cameraActive && (
          <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[92%]">
            <div
              role="status"
              aria-live="polite"
              className="px-3.5 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/15 text-xs flex items-center gap-2 text-slate-100"
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
                  ? "กำลังเตรียมระบบวิเคราะห์ภาพครั้งแรก (ใช้เวลาประมาณ 10–20 วินาที)..."
                  : skeletonViewMode
                  ? "กำลังแสดงเส้นโครงกระดูกและกรอบตรวจจับ AI"
                  : isLiveStreaming
                  ? "กำลังวิเคราะห์ท่าสัญญาณสด"
                  : "การเชื่อมต่อระบบวิเคราะห์ถูกหยุดชั่วคราว"}
              </span>
            </div>

            {!skeletonViewMode &&
              (streamState === "error" || streamState === "closed") && (
                <div className="bg-rose-950/90 border border-rose-400/45 rounded-2xl px-3.5 py-2 text-xs text-rose-100 flex flex-wrap items-center gap-2.5">
                  <span>{streamError || "การเชื่อมต่อระบบวิเคราะห์ขัดข้อง"}</span>
                  <button
                    type="button"
                    onClick={() => setReconnectNonce((n) => n + 1)}
                    className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-semibold text-[11px] apple-pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    เชื่อมต่อใหม่
                  </button>
                </div>
              )}

            {snapshotError && (
              <div className="bg-rose-950/90 border border-rose-400/45 rounded-xl px-3 py-1.5 text-xs text-rose-100">
                {snapshotError}
              </div>
            )}
          </div>
        )}

        {/* Saved Snapshot Preview Dialog */}
        {snapshotUrl && (
          <div
            role="dialog"
            aria-label="ภาพบันทึกผลวิเคราะห์ท่าสัญญาณ"
            className="absolute inset-3 z-30 bg-slate-950/95 border border-white/15 rounded-2xl p-3.5 flex flex-col gap-3 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Google_Icon name="photo_camera" size={16} className="text-emerald-400" />
                <span>ภาพผลวิเคราะห์โครงกระดูกและท่าสัญญาณที่บันทึกไว้</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={snapshotUrl}
                  download="referee-signal-analysis.jpg"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <Google_Icon name="download" size={14} />
                  <span>ดาวน์โหลดภาพผลลัพธ์</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSnapshotUrl(null)}
                  aria-label="ปิดหน้าต่างตัวอย่างภาพ"
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <Google_Icon name="close" size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center bg-black rounded-xl overflow-hidden">
              <img
                src={snapshotUrl}
                alt="ภาพผลวิเคราะห์โครงกระดูกผู้ตัดสิน"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {/* Live Signal Result Banner */}
      <div
        aria-live="polite"
        className="px-5 py-4 bg-slate-950/80 border-t border-white/10"
      >
        {topDetection && topConfidenceMeta ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-400">
                    สัญญาณที่ AI ตรวจพบขณะนี้
                  </span>
                  {topRule && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/5 border border-white/10 text-slate-200">
                      {topRule.ifabLaw}
                    </span>
                  )}
                  {isTargetMatched && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 inline-flex items-center gap-1">
                      <Google_Icon name="verified" size={13} />
                      <span>ตรงกับท่าที่ฝึกซ้อม</span>
                    </span>
                  )}
                  {topRule?.isF1ZeroLimited && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-500/15 border border-amber-400/35 text-amber-300">
                      อยู่ระหว่างเพิ่มข้อมูลฝึกสอน
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-lg font-bold text-white">
                    {topRule ? topRule.nameTh : formatSignalEnglishName(topDetection.label)}
                  </span>
                  <span className="text-xs text-slate-300">
                    {formatSignalEnglishName(topDetection.label)}
                  </span>
                </div>
              </div>

              <div className="sm:w-52 shrink-0 space-y-1.5 apple-tabular">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">ระดับความเชื่อมั่น</span>
                  <span className={`font-bold ${topConfidenceMeta.textClass}`}>
                    {topConfidenceMeta.pct}% ({topConfidenceMeta.tierLabel})
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${topConfidenceMeta.barClass}`}
                    style={{ width: `${topConfidenceMeta.pct}%` }}
                  />
                </div>
              </div>
            </div>

            {sortedDetections.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 text-xs">
                <span className="text-slate-400 text-[11px]">สัญญาณอื่นที่พบในภาพ:</span>
                {sortedDetections.slice(1).map((det, idx) => {
                  const info = findRuleByLabel(det.label);
                  const meta = getConfidenceVisualMeta(det.confidence);
                  return (
                    <span
                      key={`${det.label}-${idx}`}
                      className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${meta.badgeClass}`}
                    >
                      {info ? info.nameTh : formatSignalEnglishName(det.label)} ·{" "}
                      {meta.pct}%
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <Google_Icon name="person" size={16} className="text-slate-400 shrink-0" />
            <span>
              {skeletonViewMode && cameraActive
                ? "โหมดเส้นโครงกระดูกกำลังแสดงภาพวิเคราะห์ท่าทางจาก AI — กดบันทึกภาพหน้าจอได้ทุกเมื่อ"
                : cameraActive
                ? "กำลังรอจับท่าสัญญาณ — กรุณายืนให้เห็นลำตัวและแขนชัดเจนในกรอบกล้อง"
                : "เปิดกล้องเพื่อเริ่มต้นวิเคราะห์ท่าสัญญาณผู้ตัดสินแบบเรียลไทม์"}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};
