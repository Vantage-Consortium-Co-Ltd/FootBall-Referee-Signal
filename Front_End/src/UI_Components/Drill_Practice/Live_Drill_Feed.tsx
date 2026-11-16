"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ModalDetection } from "../../Data_Types/Referee_Types";
import {
  captureVideoFrameAsJpeg,
  checkModalHealth,
  fetchWebcamWsConfig,
  findRuleByLabel,
  predictImageAnnotatedUrl,
} from "../../Core_Lib/Api_Client";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

export interface LiveDrillFeedProps {
  onDetectionsUpdate?: (detections: ModalDetection[], latencyMs: number | null) => void;
}

type WsConnectionStatus =
  | "idle"
  | "warming"
  | "connecting"
  | "connected"
  | "closed"
  | "error";

export const Live_Drill_Feed: React.FC<LiveDrillFeedProps> = ({
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

  // Modal WebSocket /ws/webcam states
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>("idle");
  const [wsError, setWsError] = useState<string | null>(null);
  const [wsLatencyMs, setWsLatencyMs] = useState<number | null>(null);
  const [frameCount, setFrameCount] = useState<number>(0);
  const [latestDetections, setLatestDetections] = useState<ModalDetection[]>([]);
  const [wsReconnectNonce, setWsReconnectNonce] = useState<number>(0);

  // YOLO Server Annotated Stream (?annotated=true) + single snapshot modal
  const [serverAnnotatedMode, setServerAnnotatedMode] = useState<boolean>(false);
  const [serverStreamUrl, setServerStreamUrl] = useState<string | null>(null);
  const [isCapturingAnnotated, setIsCapturingAnnotated] = useState<boolean>(false);
  const [annotatedSnapshotUrl, setAnnotatedSnapshotUrl] = useState<string | null>(null);
  const [annotatedError, setAnnotatedError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (annotatedSnapshotUrl) URL.revokeObjectURL(annotatedSnapshotUrl);
    };
  }, [annotatedSnapshotUrl]);

  useEffect(() => {
    return () => {
      if (serverStreamUrl) URL.revokeObjectURL(serverStreamUrl);
    };
  }, [serverStreamUrl]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้องเว็บแคม");
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
          ? `ไม่สามารถเข้าถึงกล้องเว็บแคมได้ (${err.message}) — สามารถใช้โหมดอัปโหลดรูปภาพหรือวิดีโอแทนได้`
          : "ไม่สามารถเข้าถึงกล้องเว็บแคมได้ — สามารถใช้โหมดอัปโหลดรูปภาพหรือวิดีโอแทนได้"
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
    setFrameCount(0);
    setLatestDetections([]);
    onDetectionsUpdateRef.current?.([], null);
  }, []);

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Lock-step WebSocket streaming to Modal WS /ws/webcam (apiSpec.md Section 2.4)
  // Paused automatically when serverAnnotatedMode streams /predict/image?annotated=true to avoid doubling Modal CPU load
  useEffect(() => {
    if (!cameraActive || serverAnnotatedMode) {
      if (pumpTimerRef.current !== null) {
        window.clearTimeout(pumpTimerRef.current);
        pumpTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "camera stopped");
        wsRef.current = null;
      }
      awaitingReplyRef.current = false;
      setWsStatus("idle");
      setWsError(null);
      setLatestDetections([]);
      return;
    }

    let cancelled = false;

    const scheduleNextFrame = (delayMs: number) => {
      if (cancelled) return;
      if (pumpTimerRef.current !== null) {
        window.clearTimeout(pumpTimerRef.current);
      }
      pumpTimerRef.current = window.setTimeout(() => {
        void sendNextFrame();
      }, delayMs);
    };

    const sendNextFrame = async () => {
      if (cancelled) return;
      const ws = wsRef.current;
      const video = videoRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      if (awaitingReplyRef.current) return;

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

    const connectWs = async () => {
      try {
        setWsError(null);
        setWsStatus("warming");

        const health = await checkModalHealth();
        if (cancelled) return;
        if (health.status !== "ok") {
          setWsStatus("error");
          setWsError(health.detail || "Modal API ไม่ตอบสนอง กรุณาลองเชื่อมต่อใหม่");
          return;
        }

        setWsStatus("connecting");
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
          setWsStatus("connected");
          setWsError(null);
          scheduleNextFrame(40);
        };

        ws.onmessage = (event) => {
          if (cancelled) return;
          const rtt = Math.round(performance.now() - sendTimeRef.current);
          setWsLatencyMs(rtt);
          setFrameCount((c) => c + 1);
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
          setWsStatus("error");
          setWsError("เกิดข้อผิดพลาดในการเชื่อมต่อ WebSocket /ws/webcam");
        };

        ws.onclose = (ev) => {
          if (cancelled) return;
          awaitingReplyRef.current = false;
          wsRef.current = null;
          if (ev.code === 1008) {
            setWsStatus("error");
            setWsError("API Key ไม่ถูกต้องหรือถูกปฏิเสธ (WebSocket Code 1008)");
          } else if (ev.code === 1001) {
            setWsStatus("closed");
            setWsError("เซิร์ฟเวอร์ตัดการเชื่อมต่อเนื่องจากไม่มีเฟรมส่งมานาน 30s (Code 1001)");
          } else if (ev.code !== 1000) {
            setWsStatus("closed");
            setWsError(`WebSocket ปิดการเชื่อมต่อ (Code ${ev.code})`);
          } else {
            setWsStatus("idle");
          }
        };
      } catch (err: unknown) {
        if (cancelled) return;
        setWsStatus("error");
        setWsError(err instanceof Error ? err.message : "เชื่อมต่อ WebSocket ไม่สำเร็จ");
      }
    };

    void connectWs();

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
  }, [cameraActive, serverAnnotatedMode, wsReconnectNonce]);

  // Continuous YOLO Annotated Skeleton Stream via POST /predict/image?annotated=true
  useEffect(() => {
    if (!cameraActive || !serverAnnotatedMode) {
      setServerStreamUrl((prev) => {
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
            setServerStreamUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return url;
            });
          }
        } catch {
          // Retain last successfully annotated frame on transient error
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
  }, [cameraActive, serverAnnotatedMode]);

  const handleCaptureAnnotatedPlot = async () => {
    if (!videoRef.current || isCapturingAnnotated) return;
    setIsCapturingAnnotated(true);
    setAnnotatedError(null);
    triggerCausalFeedback("tap");

    try {
      const blob = await captureVideoFrameAsJpeg(videoRef.current, 640, 0.9);
      if (!blob) {
        throw new Error("กล้องยังไม่พร้อมสำหรับการแคปภาพ");
      }
      const nextUrl = await predictImageAnnotatedUrl(blob, "webcam-plot.jpg");
      setAnnotatedSnapshotUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return nextUrl;
      });
      triggerCausalFeedback("success");
    } catch (err: unknown) {
      setAnnotatedError(
        err instanceof Error ? err.message : "ไม่สามารถสร้างภาพวาดโครงกระดูกได้"
      );
      triggerCausalFeedback("warning");
    } finally {
      setIsCapturingAnnotated(false);
    }
  };

  const isLiveAiStreaming = cameraActive && wsStatus === "connected";

  return (
    <div className="relative apple-material-dark rounded-[22px] overflow-hidden flex flex-col">
      {/* Top Header */}
      <div className="px-5 py-3 bg-[#1C1C1E]/90 border-b border-white/[0.08] flex flex-wrap justify-between items-center gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Google_Icon name="videocam" size={16} className="text-[#0A84FF]" />
          <span className="font-semibold text-[#F5F5F7]">
            {serverAnnotatedMode && cameraActive
              ? "YOLO26n-pose Annotated Stream (?annotated=true)"
              : isLiveAiStreaming
              ? "WS /ws/webcam · Live Inference"
              : cameraActive
              ? "Connecting Modal /ws/webcam..."
              : "Webcam Standby"}
          </span>
          {isLiveAiStreaming && wsLatencyMs !== null && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#30D158]/15 border border-[#30D158]/40 text-[#30D158] font-mono apple-tabular">
              RTT {wsLatencyMs}ms · Frame #{frameCount}
            </span>
          )}
        </div>

        <button
          type="button"
          onPointerDown={() => triggerCausalFeedback("tap")}
          onClick={() => (cameraActive ? stopCamera() : void startCamera())}
          className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 apple-pressable ${
            cameraActive
              ? "bg-[#2C2C2E] border-white/[0.1] text-[#F5F5F7]"
              : "bg-[#0A84FF] border-[#0A84FF] text-white font-semibold"
          }`}
        >
          {cameraActive ? (
            <>
              <Google_Icon name="videocam_off" size={14} /> ปิดกล้อง
            </>
          ) : (
            <>
              <Google_Icon name="videocam" size={14} /> เปิดกล้อง
            </>
          )}
        </button>
      </div>

      {/* Live Detections Strip */}
      <div className="px-4 py-2.5 bg-[#141416]/90 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#A1A1A6] font-medium flex items-center gap-1">
            <Google_Icon name="monitoring" size={14} className="text-[#0A84FF]" />
            detections ({latestDetections.length}):
          </span>

          {latestDetections.length === 0 ? (
            <span className="text-[11px] text-[#6E6E73]">
              {serverAnnotatedMode
                ? "กำลังสตรีมภาพวาดโครงกระดูก YOLO (?annotated=true)"
                : isLiveAiStreaming
                ? "[] — ไม่พบคลาสที่ confidence ≥ 0.25"
                : "เปิดกล้องเพื่อส่งเฟรม JPEG เข้า WS /ws/webcam"}
            </span>
          ) : (
            latestDetections.map((det, idx) => {
              const info = findRuleByLabel(det.label);
              return (
                <span
                  key={`${det.label}-${idx}`}
                  className="px-2.5 py-1 rounded-xl font-medium text-[11px] flex items-center gap-1.5 border bg-[#30D158]/15 border-[#30D158]/50 text-[#30D158]"
                >
                  <span>{info ? `${info.nameTh} (${det.label})` : det.label}</span>
                  <span className="font-mono text-[10px] apple-tabular">
                    {det.confidence.toFixed(4)} ({Math.round(det.confidence * 100)}%)
                  </span>
                  {info?.isF1ZeroLimited && (
                    <span className="px-1.5 py-0.2 rounded bg-[#FF9F0A]/20 text-[#FF9F0A] text-[9px] font-bold">
                      F1=0
                    </span>
                  )}
                </span>
              );
            })
          )}
        </div>

        {cameraActive && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onPointerDown={() => triggerCausalFeedback("snap")}
              onClick={() => setServerAnnotatedMode((prev) => !prev)}
              className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold apple-pressable flex items-center gap-1.5 ${
                serverAnnotatedMode
                  ? "bg-[#30D158]/20 border-[#30D158]/60 text-[#30D158]"
                  : "bg-[#1C1C1E] border-white/[0.1] text-[#A1A1A6] hover:text-[#F5F5F7]"
              }`}
              title="สตรีมภาพวาดกล่อง+โครงกระดูกจริงจาก YOLO26n-pose (?annotated=true)"
            >
              <Google_Icon name="crop_free" size={13} />
              <span>
                ภาพโครงกระดูก YOLO สด: {serverAnnotatedMode ? "ON" : "OFF"}
              </span>
            </button>

            <button
              type="button"
              disabled={isCapturingAnnotated}
              onClick={handleCaptureAnnotatedPlot}
              className="px-2.5 py-1 rounded-xl border border-[#64D2FF]/40 bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 text-[#64D2FF] text-[11px] font-semibold apple-pressable flex items-center gap-1.5 disabled:opacity-50"
            >
              <Google_Icon name="crop_free" size={13} />
              <span>
                {isCapturingAnnotated ? "กำลังวาด..." : "แคปภาพ ?annotated=true"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Video & YOLO Annotated Output Viewport */}
      <div className="relative w-full h-[440px] bg-[#060608] flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-contain z-0 transition-opacity duration-200 ${
            cameraActive && !(serverAnnotatedMode && serverStreamUrl)
              ? "opacity-95"
              : "opacity-0"
          } ${mirror ? "scale-x-[-1]" : ""}`}
        />

        {cameraActive && serverAnnotatedMode && serverStreamUrl && (
          <img
            src={serverStreamUrl}
            alt="YOLO26n-pose annotated output"
            className="absolute inset-0 w-full h-full object-contain z-10"
          />
        )}

        {!cameraActive && (
          <div className="relative z-20 max-w-md mx-auto p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0A84FF]/15 border border-[#0A84FF]/40 flex items-center justify-center text-[#0A84FF]">
              <Google_Icon name="videocam" size={24} />
            </div>
            <div className="text-sm font-bold text-[#F5F5F7]">
              กล้องเว็บแคมยังไม่เปิดใช้งาน
            </div>
            <p className="text-xs text-[#A1A1A6] leading-relaxed">
              {cameraError ||
                "เปิดกล้องเพื่อส่งเฟรม JPEG แบบ Lock-step ไปยัง Modal FastAPI (/ws/webcam) หรือเปิดสวิตช์ภาพโครงกระดูก YOLO สด"}
            </p>
            <button
              type="button"
              onClick={() => void startCamera()}
              className="px-4 py-2 rounded-xl bg-[#0A84FF] hover:bg-[#3B9CFF] text-white text-xs font-semibold inline-flex items-center gap-1.5 apple-pressable"
            >
              <Google_Icon name="videocam" size={15} />
              <span>เปิดกล้องเว็บแคม</span>
            </button>
          </div>
        )}

        {/* Floating Status Badges */}
        {cameraActive && (
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 max-w-[90%] pointer-events-none">
            <div className="apple-material-dark rounded-xl px-3 py-1.5 text-xs flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  serverAnnotatedMode || isLiveAiStreaming
                    ? "bg-[#30D158] animate-ping"
                    : wsStatus === "warming" || wsStatus === "connecting"
                    ? "bg-[#FF9F0A] animate-pulse"
                    : "bg-[#FF453A]"
                }`}
              />
              <span className="font-mono text-[#F5F5F7]">
                {serverAnnotatedMode
                  ? "STREAMING ?annotated=true"
                  : isLiveAiStreaming
                  ? "WS /ws/webcam CONNECTED"
                  : wsStatus === "warming"
                  ? "WARMING MODAL CPU (อาจใช้เวลา 10-30s รอบแรก)..."
                  : wsStatus === "connecting"
                  ? "CONNECTING /ws/webcam..."
                  : "WS DISCONNECTED"}
              </span>
            </div>

            {(wsStatus === "error" || wsStatus === "closed") && (
              <div className="pointer-events-auto bg-[#2B0B0D]/95 border border-[#FF453A]/50 rounded-xl px-3 py-2 text-[11px] text-[#FFD6D4] flex flex-wrap items-center gap-2">
                <span>{wsError || "WebSocket ขาดการเชื่อมต่อ"}</span>
                <button
                  type="button"
                  onClick={() => setWsReconnectNonce((n) => n + 1)}
                  className="px-2.5 py-0.5 rounded-lg bg-[#FF453A] text-white font-semibold hover:bg-[#FF6961] apple-pressable"
                >
                  เชื่อมต่อใหม่ (Reconnect)
                </button>
              </div>
            )}

            {annotatedError && (
              <div className="bg-[#2B0B0D]/95 border border-[#FF453A]/50 rounded-xl px-3 py-1 text-[11px] text-[#FFD6D4]">
                {annotatedError}
              </div>
            )}
          </div>
        )}

        {/* Single Snapshot Overlay (/predict/image?annotated=true) */}
        {annotatedSnapshotUrl && (
          <div className="absolute inset-3 z-30 bg-[#141416]/95 border border-white/[0.15] rounded-2xl p-3 flex flex-col gap-2 shadow-2xl">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-semibold text-[#F5F5F7]">
                <Google_Icon name="monitoring" size={15} className="text-[#30D158]" />
                <span>ผลวาดกล่องและโครงกระดูกจาก YOLO26n-pose (?annotated=true)</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={annotatedSnapshotUrl}
                  download="yolo-annotated-frame.jpg"
                  className="px-2.5 py-1 rounded-lg bg-[#0A84FF] text-white text-[11px] font-semibold"
                >
                  ดาวน์โหลด JPEG
                </a>
                <button
                  type="button"
                  onClick={() => setAnnotatedSnapshotUrl(null)}
                  className="p-1 rounded-lg bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[#F5F5F7]"
                >
                  <Google_Icon name="close" size={15} />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center bg-black rounded-xl overflow-hidden">
              <img
                src={annotatedSnapshotUrl}
                alt="YOLO26n-pose annotated snapshot"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="px-5 py-3 bg-[#1C1C1E]/90 border-t border-white/[0.08] flex flex-wrap justify-between items-center gap-3 text-xs">
        <button
          type="button"
          onPointerDown={() => triggerCausalFeedback("tap")}
          onClick={() => setMirror(!mirror)}
          className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 apple-pressable ${
            mirror
              ? "bg-[#0A84FF]/15 border-[#0A84FF]/45 text-[#0A84FF]"
              : "bg-[#2C2C2E]/70 border-white/[0.08] text-[#A1A1A6]"
          }`}
        >
          <Google_Icon name="flip" size={14} />
          Mirror View: {mirror ? "ON" : "OFF"}
        </button>

        <span className="text-[11px] text-[#A1A1A6]">
          Lock-step JPEG frame streaming · Idle timeout 30s (Code 1001)
        </span>
      </div>
    </div>
  );
};
