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
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
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

  // Target match causal audio feedback trigger
  const prevMatchedRef = useRef<boolean>(false);

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

  // Enumerate video devices
  const enumerateCameras = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setVideoDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch {
      // Enumeration non-fatal fallback
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    void enumerateCameras();
  }, [enumerateCameras]);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      try {
        setCameraError(null);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("เบราว์เซอร์ไม่รองรับกล้อง");
        }

        if (videoRef.current?.srcObject) {
          const existing = videoRef.current.srcObject as MediaStream;
          existing.getTracks().forEach((track) => track.stop());
        }

        const activeId = deviceId ?? selectedDeviceId;
        const videoConstraints: MediaTrackConstraints = activeId
          ? {
              deviceId: { exact: activeId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);
        }

        // Re-enumerate to get device labels once permission is granted
        void enumerateCameras();
      } catch (err: unknown) {
        setCameraError(
          err instanceof Error ? err.message : "ไม่สามารถเปิดกล้องได้"
        );
        setCameraActive(false);
      }
    },
    [selectedDeviceId, enumerateCameras]
  );

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

  const handleSwitchCamera = useCallback(() => {
    if (videoDevices.length <= 1) return;
    triggerCausalFeedback("snap");
    const currentIndex = videoDevices.findIndex(
      (d) => d.deviceId === selectedDeviceId
    );
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIndex];
    setSelectedDeviceId(nextDevice.deviceId);
    if (cameraActive) {
      void startCamera(nextDevice.deviceId);
    }
  }, [videoDevices, selectedDeviceId, cameraActive, startCamera]);

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

  // Annotated Skeleton pump
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

  const handleClearTarget = () => {
    triggerCausalFeedback("tap");
    window.dispatchEvent(new CustomEvent("ifab-reset-target-signal"));
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

  // Trigger Apple-style audio feedback once upon matching target
  useEffect(() => {
    if (isTargetMatched && !prevMatchedRef.current) {
      triggerCausalFeedback("success");
    }
    prevMatchedRef.current = isTargetMatched;
  }, [isTargetMatched]);

  const isLiveStreaming = cameraActive && streamState === "connected";
  const isWarmingUp =
    cameraActive &&
    ((!skeletonViewMode && (streamState === "warming" || streamState === "connecting")) ||
      (skeletonViewMode && !skeletonStreamUrl));

  return (
    <section
      aria-label="สตูดิโอกล้องฝึกซ้อมสด"
      className={`relative w-full aspect-video min-h-[460px] md:min-h-[540px] bg-[#0A0E14] rounded-3xl overflow-hidden transition-all duration-300 shadow-2xl flex items-center justify-center ${
        isTargetMatched
          ? "border-2 border-emerald-400 shadow-[0_0_60px_rgba(16,185,129,0.35)] ring-4 ring-emerald-500/20"
          : "border border-white/10"
      }`}
    >
      {/* 1. Underlying Live Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-200 ${
          cameraActive && !(skeletonViewMode && skeletonStreamUrl)
            ? "opacity-100"
            : "opacity-0"
        } ${mirror ? "scale-x-[-1]" : ""}`}
      />

      {/* 2. AI Skeleton Stream Overlay */}
      {cameraActive && skeletonViewMode && skeletonStreamUrl && (
        <img
          src={skeletonStreamUrl}
          alt="โครงกระดูกท่าผู้ตัดสิน"
          className="absolute inset-0 w-full h-full object-cover z-10"
        />
      )}

      {/* 3. Top and Bottom Studio Vignette Gradients for Text Legibility */}
      {cameraActive && (
        <>
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/85 via-black/35 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />
        </>
      )}

      {/* 4. Inactive Camera Empty State */}
      {!cameraActive && (
        <div className="relative z-20 flex flex-col items-center gap-3.5 text-center px-6 py-12 max-w-sm">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <Google_Icon name="videocam" size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              พร้อมใช้งานกล้องวิเคราะห์สด
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              เปิดกล้องเพื่อฝึกซ้อมสัญญาณผู้ตัดสิน IFAB ด้วยระบบ AI ตรวจจับท่าทาง
            </p>
          </div>
          {cameraError && (
            <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/35 text-xs text-rose-200">
              {cameraError}
            </span>
          )}
          <button
            type="button"
            onClick={() => void startCamera()}
            className="mt-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-2 apple-pressable shadow-lg shadow-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 transition"
          >
            <Google_Icon name="videocam" size={16} />
            <span>เปิดกล้องเพื่อเริ่มซ้อม</span>
          </button>
        </div>
      )}

      {/* 5. Top-Left Floating Studio Status Pill */}
      {cameraActive && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 max-w-[calc(100%-16rem)]">
          <div className="backdrop-blur-md bg-black/65 border border-white/15 rounded-2xl px-3.5 py-1.5 flex items-center gap-2.5 shadow-lg">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isWarmingUp
                  ? "bg-amber-400 animate-pulse"
                  : skeletonViewMode || isLiveStreaming
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-rose-400"
              }`}
            />
            <span className="text-xs font-medium text-slate-200">
              {isWarmingUp
                ? "กำลังเตรียม AI..."
                : skeletonViewMode
                ? "โครงกระดูก AI"
                : isLiveStreaming
                ? "วิเคราะห์สด"
                : "พักชั่วคราว"}
            </span>

            <span className="w-px h-3.5 bg-white/20" />

            {targetSignal ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-semibold text-emerald-300 truncate">
                  เป้าหมาย: {targetSignal.nameTh}
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-slate-300">
                  {targetSignal.ifabLaw.split(" - ")[0]}
                </span>
                <button
                  type="button"
                  onClick={handleClearTarget}
                  title="ยกเลิกเป้าหมาย"
                  aria-label="ยกเลิกเป้าหมาย"
                  className="p-0.5 rounded hover:bg-white/15 text-slate-400 hover:text-white transition focus-visible:outline-none"
                >
                  <Google_Icon name="close" size={12} />
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-400">ตรวจจับอิสระ</span>
            )}
          </div>

          {!skeletonViewMode &&
            (streamState === "error" || streamState === "closed") && (
              <button
                type="button"
                onClick={() => setReconnectNonce((n) => n + 1)}
                className="backdrop-blur-md bg-rose-950/85 border border-rose-400/40 rounded-2xl px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-900/90 inline-flex items-center gap-1.5 shadow-lg transition"
              >
                <Google_Icon name="refresh" size={13} />
                <span>เชื่อมต่อใหม่</span>
              </button>
            )}
        </div>
      )}

      {/* 6. Top-Right Floating Island (Control Dock) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 backdrop-blur-md bg-black/65 border border-white/15 rounded-2xl p-1.5 shadow-lg">
        {/* Toggle Camera Button */}
        <button
          type="button"
          onPointerDown={() => triggerCausalFeedback("tap")}
          onClick={() => (cameraActive ? stopCamera() : void startCamera())}
          title={cameraActive ? "หยุดกล้อง" : "เปิดกล้อง"}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
            cameraActive
              ? "bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white"
              : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
          }`}
        >
          <Google_Icon
            name={cameraActive ? "videocam_off" : "videocam"}
            size={15}
          />
          <span className="hidden sm:inline">
            {cameraActive ? "หยุดกล้อง" : "เปิดกล้อง"}
          </span>
        </button>

        {/* Switch Camera Button (Visible if multiple cameras present) */}
        {videoDevices.length > 1 && (
          <button
            type="button"
            onPointerDown={() => triggerCausalFeedback("tap")}
            onClick={handleSwitchCamera}
            title="สลับอุปกรณ์กล้อง"
            aria-label="สลับอุปกรณ์กล้อง"
            className="p-1.5 rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <Google_Icon name="switch_video" size={15} />
          </button>
        )}

        {/* Skeleton AI Toggle Button */}
        {cameraActive && (
          <button
            type="button"
            aria-pressed={skeletonViewMode}
            onPointerDown={() => triggerCausalFeedback("snap")}
            onClick={() => setSkeletonViewMode((prev) => !prev)}
            title="เปิด/ปิดการแสดงโครงกระดูก AI"
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              skeletonViewMode
                ? "bg-emerald-500/25 border-emerald-400/50 text-emerald-300"
                : "bg-white/[0.06] border-white/10 text-slate-200 hover:bg-white/[0.12]"
            }`}
          >
            <Google_Icon name="crop_free" size={15} />
            <span className="hidden md:inline">โครงกระดูก AI</span>
          </button>
        )}

        {/* Mirror Toggle Button */}
        <button
          type="button"
          aria-pressed={mirror}
          onPointerDown={() => triggerCausalFeedback("tap")}
          onClick={() => setMirror((prev) => !prev)}
          title="สลับมุมมองกระจกเงา"
          aria-label="สลับมุมมองกระจกเงา"
          className={`p-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 apple-pressable transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
            mirror
              ? "bg-sky-500/20 border-sky-400/40 text-sky-300"
              : "bg-white/[0.06] border-white/10 text-slate-300 hover:text-white"
          }`}
        >
          <Google_Icon name="flip" size={15} />
        </button>

        {/* Snapshot Capture Button */}
        {cameraActive && (
          <button
            type="button"
            disabled={isCapturingSnapshot}
            onClick={() => void handleSaveSnapshot()}
            title="บันทึกภาพถ่ายทอดสด"
            aria-label="บันทึกภาพถ่ายทอดสด"
            className="p-1.5 rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 apple-pressable disabled:opacity-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <Google_Icon name="photo_camera" size={15} />
          </button>
        )}
      </div>

      {/* 7. Bottom Detection & Verification HUD (Clean Primary Focus) */}
      <div className="absolute bottom-4 inset-x-4 z-20">
        <div className="backdrop-blur-xl bg-black/75 border border-white/15 rounded-2xl p-4 md:p-5 shadow-2xl transition-all duration-300">
          {topDetection && topConfidenceMeta ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left Column: Pose Titles and Target Match Status */}
              <div className="space-y-1 min-w-0">
                {isTargetMatched && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider mb-1 animate-pulse">
                    <Google_Icon name="verified" size={13} />
                    <span>✓ ท่าทางถูกต้องสมบูรณ์</span>
                  </div>
                )}

                <div className="flex flex-wrap items-baseline gap-2.5">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    {topRule
                      ? topRule.nameTh
                      : formatSignalEnglishName(topDetection.label)}
                  </h2>
                  <span className="text-xs md:text-sm text-slate-300 font-medium">
                    {formatSignalEnglishName(topDetection.label)}
                  </span>
                  {topRule && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] bg-white/10 border border-white/15 text-slate-200 font-medium">
                      {topRule.ifabLaw.split(" - ")[0]}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Column: High-Visibility Confidence Meter */}
              <div className="flex items-center gap-4 shrink-0 apple-tabular self-end md:self-auto">
                <div className="w-36 sm:w-48 h-2.5 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${topConfidenceMeta.barClass}`}
                    style={{ width: `${topConfidenceMeta.pct}%` }}
                  />
                </div>
                <div className="text-right min-w-[3.5rem]">
                  <span
                    className={`text-2xl md:text-3xl font-extrabold ${topConfidenceMeta.textClass}`}
                  >
                    {topConfidenceMeta.pct}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 text-xs md:text-sm text-slate-300">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>รอตรวจจับท่าทางสัญญาณ... กรุณายืนเข้าสู่ตำแหน่งกล้อง</span>
              </div>
              <span className="hidden sm:inline text-xs text-slate-400">
                {targetSignal
                  ? `เป้าหมายปัจจุบัน: ${targetSignal.nameTh}`
                  : "เลือกท่าทางจากรายการด้านข้างเพื่อกำหนดเป้าหมาย"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 8. Snapshot Preview Dialog */}
      {snapshotUrl && (
        <div
          role="dialog"
          aria-label="ภาพผลวิเคราะห์โครงกระดูก"
          className="absolute inset-4 z-30 backdrop-blur-2xl bg-[#0A0F14]/95 border border-white/15 rounded-2xl p-4 flex flex-col gap-3 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Google_Icon name="photo_camera" size={16} className="text-emerald-400" />
              <span>ภาพผลวิเคราะห์โครงกระดูก</span>
            </span>
            <div className="flex items-center gap-2">
              <a
                href={snapshotUrl}
                download="ifab-referee-signal-analysis.jpg"
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 transition"
              >
                <Google_Icon name="download" size={15} />
                <span>ดาวน์โหลดภาพ</span>
              </a>
              <button
                type="button"
                onClick={() => setSnapshotUrl(null)}
                aria-label="ปิดหน้าต่าง"
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 transition"
              >
                <Google_Icon name="close" size={16} />
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
    </section>
  );
};
