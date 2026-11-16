"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  F1_ZERO_LIMITED_CLASSES,
  FrameFeedbackPayload,
  GestureRule,
  ModalDetection,
  TaggedPerson,
} from "../../Data_Types/Referee_Types";
import { Skeleton_Canvas } from "../Canvas_Engine/Skeleton_Canvas";
import {
  captureVideoFrameAsJpeg,
  checkModalHealth,
  evaluateRealDetections,
  fetchWebcamWsConfig,
  findRuleByLabel,
  predictImageAnnotatedUrl,
} from "../../Core_Lib/Api_Client";
import {
  detectRealPosesFromVideo,
  ensurePoseDetectorLoaded,
} from "../../Core_Lib/Real_Pose_Tracker";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

export interface LiveDrillFeedProps {
  targetRule: GestureRule;
  onFeedbackUpdate: (feedback: FrameFeedbackPayload) => void;
  onDrillSuccess?: (feedback: FrameFeedbackPayload) => void;
}

type WsConnectionStatus =
  | "idle"
  | "warming"
  | "connecting"
  | "connected"
  | "closed"
  | "error";

type PoseEngineState = "idle" | "loading" | "ready" | "error";

export const Live_Drill_Feed: React.FC<LiveDrillFeedProps> = ({
  targetRule,
  onFeedbackUpdate,
  onDrillSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const awaitingReplyRef = useRef<boolean>(false);
  const sendTimeRef = useRef<number>(0);
  const pumpTimerRef = useRef<number | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mirror, setMirror] = useState<boolean>(true);
  const [showAngles, setShowAngles] = useState<boolean>(true);
  const [showBBoxes, setShowBBoxes] = useState<boolean>(true);

  // Real-time browser MoveNet 17-keypoint tracker states
  const [poseEngineState, setPoseEngineState] = useState<PoseEngineState>("idle");
  const [livePersons, setLivePersons] = useState<TaggedPerson[]>([]);
  const [activePersonId, setActivePersonId] = useState<string>("person-1");
  const [autoTagReferee, setAutoTagReferee] = useState<boolean>(true);
  const [lastTaggedAlert, setLastTaggedAlert] = useState<string | null>(null);

  // Real Modal WebSocket states
  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>("idle");
  const [wsError, setWsError] = useState<string | null>(null);
  const [wsLatencyMs, setWsLatencyMs] = useState<number | null>(null);
  const [latestDetections, setLatestDetections] = useState<ModalDetection[]>([]);
  const [wsReconnectNonce, setWsReconnectNonce] = useState<number>(0);

  // YOLO Server Stream (?annotated=true continuous stream) + single snapshot modal
  const [serverAnnotatedMode, setServerAnnotatedMode] = useState<boolean>(false);
  const [serverStreamUrl, setServerStreamUrl] = useState<string | null>(null);
  const [isCapturingAnnotated, setIsCapturingAnnotated] = useState<boolean>(false);
  const [annotatedSnapshotUrl, setAnnotatedSnapshotUrl] = useState<string | null>(null);
  const [annotatedError, setAnnotatedError] = useState<string | null>(null);

  // Refs for real-time loops
  const holdTimerRef = useRef<number>(0);
  const hasTriggeredSuccessRef = useRef<boolean>(false);
  const latestDetectionsRef = useRef<ModalDetection[]>([]);
  const activePersonRef = useRef<TaggedPerson | null>(null);
  const activePersonIdRef = useRef<string>(activePersonId);
  const autoTagRefereeRef = useRef<boolean>(autoTagReferee);
  const targetRuleRef = useRef<GestureRule>(targetRule);
  const onFeedbackUpdateRef = useRef(onFeedbackUpdate);
  const onDrillSuccessRef = useRef(onDrillSuccess);

  useEffect(() => {
    targetRuleRef.current = targetRule;
  }, [targetRule]);

  useEffect(() => {
    activePersonIdRef.current = activePersonId;
  }, [activePersonId]);

  useEffect(() => {
    autoTagRefereeRef.current = autoTagReferee;
  }, [autoTagReferee]);

  useEffect(() => {
    onFeedbackUpdateRef.current = onFeedbackUpdate;
  }, [onFeedbackUpdate]);

  useEffect(() => {
    onDrillSuccessRef.current = onDrillSuccess;
  }, [onDrillSuccess]);

  useEffect(() => {
    latestDetectionsRef.current = latestDetections;
  }, [latestDetections]);

  // Revoke object URLs on change/unmount
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

  // Start webcam
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
          ? `ไม่สามารถเข้าถึงกล้องเว็บแคมได้ (${err.message}) — กรุณาอนุญาตสิทธิ์กล้อง หรือใช้แท็บอัปโหลดรูป/วิดีโอ`
          : "ไม่สามารถเข้าถึงกล้องเว็บแคมได้ กรุณาอนุญาตสิทธิ์กล้อง หรือใช้แท็บอัปโหลดรูป/วิดีโอ"
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
    setLivePersons([]);
    activePersonRef.current = null;
  }, []);

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Reset hold timer when target rule changes
  useEffect(() => {
    holdTimerRef.current = 0;
    hasTriggeredSuccessRef.current = false;
    onFeedbackUpdateRef.current(
      evaluateRealDetections(
        latestDetectionsRef.current,
        targetRule,
        0,
        activePersonRef.current
      ).feedback
    );
  }, [targetRule]);

  // Real-time 17-keypoint MoveNet tracking loop while camera is active
  useEffect(() => {
    if (!cameraActive) {
      setPoseEngineState("idle");
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let running = false;

    const initAndRun = async () => {
      setPoseEngineState("loading");
      const ok = await ensurePoseDetectorLoaded();
      if (cancelled) return;
      if (!ok) {
        setPoseEngineState("error");
        return;
      }
      setPoseEngineState("ready");

      const tick = async () => {
        if (cancelled) return;
        if (!running && videoRef.current && videoRef.current.readyState >= 2) {
          running = true;
          try {
            const result = await detectRealPosesFromVideo(
              videoRef.current,
              latestDetectionsRef.current,
              activePersonIdRef.current,
              autoTagRefereeRef.current
            );
            if (!cancelled) {
              activePersonRef.current = result.activePerson;
              setLivePersons(result.persons);
            }
          } finally {
            running = false;
          }
        }
        if (!cancelled) {
          rafId = requestAnimationFrame(() => {
            void tick();
          });
        }
      };

      rafId = requestAnimationFrame(() => {
        void tick();
      });
    };

    void initAndRun();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [cameraActive]);

  // Lock-step WebSocket streaming to Modal /ws/webcam
  useEffect(() => {
    if (!cameraActive) {
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
          awaitingReplyRef.current = false;

          try {
            const payload = JSON.parse(String(event.data)) as {
              detections?: ModalDetection[];
            };
            const dets = Array.isArray(payload.detections) ? payload.detections : [];
            setLatestDetections(dets);
          } catch {
            setLatestDetections([]);
          }

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
            setWsError("API Key ไม่ถูกต้องหรือถูกปฏิเสธ (WebSocket 1008)");
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
  }, [cameraActive, wsReconnectNonce]);

  // Continuous YOLO Server Annotated Stream (?annotated=true) when toggled on
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
            const url = await predictImageAnnotatedUrl(blob, "live-stream.jpg");
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
          // Keep last frame on transient error
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

  // Real-time evaluation loop combining Modal /ws/webcam detections + real joint angles
  useEffect(() => {
    if (!cameraActive) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const deltaSec = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const real = evaluateRealDetections(
        latestDetectionsRef.current,
        targetRuleRef.current,
        holdTimerRef.current,
        activePersonRef.current
      );

      if (real.isHoldActive) {
        holdTimerRef.current = holdTimerRef.current + deltaSec;
      } else {
        holdTimerRef.current = 0;
        hasTriggeredSuccessRef.current = false;
      }

      onFeedbackUpdateRef.current(real.feedback);

      if (real.feedback.state === "COMPLETED" && !hasTriggeredSuccessRef.current) {
        hasTriggeredSuccessRef.current = true;
        if (onDrillSuccessRef.current) onDrillSuccessRef.current(real.feedback);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [cameraActive]);

  const handleTagPerson = (personId: string) => {
    triggerCausalFeedback("snap");
    setActivePersonId(personId);
    setAutoTagReferee(false);
    const matched = livePersons.find((p) => p.id === personId);
    setLastTaggedAlert(`ล็อคเป้าหมาย: ${matched?.labelTh || personId}`);
    setTimeout(() => setLastTaggedAlert(null), 2500);
  };

  // Capture single webcam frame and call /api/inference/image?annotated=true
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
  const activeTaggedPerson =
    livePersons.find((p) => p.isTagged) || livePersons[0] || null;
  const isLimitedClass = (F1_ZERO_LIMITED_CLASSES as readonly string[]).includes(
    targetRule.name
  );
  const topDet = latestDetections.length > 0 ? latestDetections[0] : null;
  const topDetRule = topDet ? findRuleByLabel(topDet.label) : undefined;

  return (
    <div className="relative apple-material-dark rounded-[22px] overflow-hidden flex flex-col">
      {/* Top Viewport Header */}
      <div className="px-5 py-3 bg-[#1C1C1E]/90 border-b border-white/[0.08] flex flex-wrap justify-between items-center gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Google_Icon name="videocam" size={16} className="text-[#0A84FF]" />
          <span className="font-semibold text-[#F5F5F7]">
            {serverAnnotatedMode && cameraActive
              ? "YOLO26n-pose Server Skeleton Stream"
              : isLiveAiStreaming
              ? "Live 17-Keypoint + Modal AI (/ws/webcam)"
              : cameraActive
              ? "Live Camera & Pose Tracker"
              : "Webcam Standby"}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2C2C2E] text-[#A1A1A6] apple-tabular">
            640×480
          </span>
          {cameraActive && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${
                poseEngineState === "ready"
                  ? "bg-[#30D158]/15 border-[#30D158]/40 text-[#30D158]"
                  : poseEngineState === "loading"
                  ? "bg-[#FF9F0A]/15 border-[#FF9F0A]/40 text-[#FF9F0A]"
                  : "bg-[#2C2C2E] border-white/[0.1] text-[#A1A1A6]"
              }`}
            >
              {poseEngineState === "ready"
                ? "17-KP Skeleton Live"
                : poseEngineState === "loading"
                ? "กำลังโหลดตัวติดตามโครงกระดูก..."
                : "Pose Tracker Standby"}
            </span>
          )}
          {isLiveAiStreaming && wsLatencyMs !== null && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#30D158]/15 border border-[#30D158]/40 text-[#30D158] font-mono apple-tabular">
              CPU RTT {wsLatencyMs}ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
      </div>

      {/* Known F1=0 Class Limitation Notice (apiSpec.md Section 4) */}
      {isLimitedClass && (
        <div className="px-4 py-2 bg-[#2C1A04]/90 border-b border-[#FF9F0A]/35 flex items-center gap-2 text-[11px] text-[#FFD18A]">
          <Google_Icon name="warning" size={15} className="text-[#FF9F0A] shrink-0" />
          <span>
            <b>ข้อจำกัดของโมเดลชุดปัจจุบัน (apiSpec.md):</b> ท่า{" "}
            <code className="font-mono text-[#FF9F0A]">{targetRule.name}</code> มีค่า
            test F1 = 0 การตรวจจับจริงอาจยังไม่แม่นยำ (แนะนำทดลองท่า{" "}
            <code className="font-mono">Direct_Free_Kick</code>,{" "}
            <code className="font-mono">Indirect_Free_Kick</code>,{" "}
            <code className="font-mono">Card</code>, หรือ{" "}
            <code className="font-mono">Penalty_Kick</code>)
          </span>
        </div>
      )}

      {/* Real Person Tagging & YOLO Detections Control Bar */}
      <div className="px-4 py-2 bg-[#141416]/90 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#A1A1A6] font-medium flex items-center gap-1">
            <Google_Icon name="group" size={14} className="text-[#0A84FF]" /> ตรวจพบบุคคลจริง (
            {livePersons.length}):
          </span>

          {livePersons.length === 0 ? (
            <span className="text-[11px] text-[#6E6E73]">
              {cameraActive
                ? "กำลังสแกนโครงกระดูก 17 จุดจากกล้อง..."
                : "เปิดกล้องเพื่อเริ่มตรวจจับโครงกระดูกจริง"}
            </span>
          ) : (
            livePersons.map((person) => {
              const isSelected = person.isTagged;
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => handleTagPerson(person.id)}
                  className={`px-2.5 py-1 rounded-xl font-medium text-[11px] apple-pressable flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-[#0A84FF]/20 border-[#0A84FF]/70 text-[#F5F5F7] shadow-sm"
                      : "bg-[#1C1C1E] border-white/[0.08] text-[#A1A1A6] hover:text-[#F5F5F7]"
                  }`}
                >
                  <Google_Icon
                    name="my_location"
                    size={12}
                    className={isSelected ? "text-[#0A84FF]" : "text-[#6E6E73]"}
                  />
                  <span>{person.labelTh}</span>
                  <span className="font-mono text-[9px] text-[#6E6E73] apple-tabular">
                    {Math.round(person.confidence * 100)}%
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {cameraActive && (
            <button
              type="button"
              onPointerDown={() => triggerCausalFeedback("snap")}
              onClick={() => setServerAnnotatedMode((prev) => !prev)}
              className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold apple-pressable flex items-center gap-1.5 ${
                serverAnnotatedMode
                  ? "bg-[#30D158]/20 border-[#30D158]/60 text-[#30D158]"
                  : "bg-[#1C1C1E] border-white/[0.1] text-[#A1A1A6] hover:text-[#F5F5F7]"
              }`}
              title="สลับดูภาพโครงกระดูกที่วาดจากฝั่ง Modal Server (?annotated=true)"
            >
              <Google_Icon name="monitoring" size={13} />
              <span>
                YOLO Server Stream: {serverAnnotatedMode ? "ON" : "OFF"}
              </span>
            </button>
          )}

          {cameraActive && (
            <button
              type="button"
              disabled={isCapturingAnnotated}
              onClick={handleCaptureAnnotatedPlot}
              className="px-2.5 py-1 rounded-xl border border-[#64D2FF]/40 bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 text-[#64D2FF] text-[11px] font-semibold apple-pressable flex items-center gap-1.5 disabled:opacity-50"
            >
              <Google_Icon name="crop_free" size={13} />
              <span>
                {isCapturingAnnotated
                  ? "กำลังวาด..."
                  : "แคป YOLO Plot"}
              </span>
            </button>
          )}

          <button
            type="button"
            onPointerDown={() => triggerCausalFeedback("snap")}
            onClick={() => {
              setAutoTagReferee(!autoTagReferee);
            }}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-medium apple-pressable flex items-center gap-1.5 ${
              autoTagReferee
                ? "bg-[#30D158]/15 border-[#30D158]/45 text-[#30D158]"
                : "bg-[#1C1C1E] border-white/[0.08] text-[#A1A1A6]"
            }`}
          >
            <Google_Icon name="how_to_reg" size={14} className="text-[#30D158]" />
            Auto-Tag: {autoTagReferee ? "เปิด" : "ปิด"}
          </button>
        </div>
      </div>

      {/* Video & Real-Time Skeleton Canvas Viewport Layer */}
      <div className="relative w-full h-[440px] bg-[#060608] flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-contain z-0 transition-opacity duration-300 ${
            cameraActive && !(serverAnnotatedMode && serverStreamUrl)
              ? "opacity-90"
              : "opacity-0"
          } ${mirror ? "scale-x-[-1]" : ""}`}
        />

        {/* Continuous YOLO26n-pose Server Annotated Stream */}
        {cameraActive && serverAnnotatedMode && serverStreamUrl && (
          <img
            src={serverStreamUrl}
            alt="YOLO26n-pose live annotated stream"
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
                "อนุญาตสิทธิ์การใช้กล้องเว็บแคมเพื่อวาดโครงกระดูก 17 จุดจริงแบบ Real-time และส่งภาพไปยัง Modal FastAPI (/ws/webcam)"}
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

        {/* Real-Time HTML5 Canvas 17-Keypoint Skeleton Overlay */}
        {cameraActive && !(serverAnnotatedMode && serverStreamUrl) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <Skeleton_Canvas
              keypoints={activeTaggedPerson?.keypoints || []}
              persons={livePersons}
              targetRule={targetRule}
              angles={activeTaggedPerson?.angles}
              width={640}
              height={480}
              mirror={mirror}
              showAngles={showAngles}
              showBBoxes={showBBoxes}
              onTagPerson={handleTagPerson}
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Floating Status Badges */}
        {cameraActive && (
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 max-w-[90%] pointer-events-none">
            <div className="apple-material-dark rounded-xl px-3 py-1.5 text-xs flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isLiveAiStreaming
                    ? "bg-[#30D158] animate-ping"
                    : wsStatus === "warming" || wsStatus === "connecting"
                    ? "bg-[#FF9F0A] animate-pulse"
                    : "bg-[#FF453A]"
                }`}
              ></span>
              <span className="font-mono text-[#F5F5F7]">
                {isLiveAiStreaming
                  ? "LIVE MODAL WEBSOCKET"
                  : wsStatus === "warming"
                  ? "WARMING MODAL CPU (อาจใช้เวลา 10-30s รอบแรก)..."
                  : wsStatus === "connecting"
                  ? "CONNECTING /ws/webcam..."
                  : "WEBSOCKET DISCONNECTED"}
              </span>
            </div>

            {isLiveAiStreaming && topDet && (
              <div className="bg-[#062614]/90 border border-[#30D158]/50 rounded-xl px-3 py-1 text-[11px] text-[#30D158] font-semibold flex items-center gap-1.5">
                <Google_Icon name="bolt" size={14} className="text-[#30D158]" filled />
                <span>
                  YOLO26n-pose: {topDetRule?.nameTh || topDet.label} (
                  {Math.round(topDet.confidence * 100)}%)
                </span>
              </div>
            )}

            {lastTaggedAlert && (
              <div className="bg-[#062614]/95 border border-[#30D158]/60 rounded-xl px-3 py-1.5 text-xs text-[#30D158] font-semibold flex items-center gap-1.5 shadow-lg">
                <Google_Icon name="my_location" size={14} className="text-[#30D158]" />
                <span>{lastTaggedAlert}</span>
              </div>
            )}

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

        {/* One-Shot Annotated Snapshot Overlay (from /predict/image?annotated=true) */}
        {annotatedSnapshotUrl && (
          <div className="absolute inset-3 z-30 bg-[#141416]/95 border border-white/[0.15] rounded-2xl p-3 flex flex-col gap-2 shadow-2xl">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-semibold text-[#F5F5F7]">
                <Google_Icon name="monitoring" size={15} className="text-[#30D158]" />
                <span>ผลวาดโครงกระดูกจริงจาก Modal YOLO26n-pose (?annotated=true)</span>
              </div>
              <button
                type="button"
                onClick={() => setAnnotatedSnapshotUrl(null)}
                className="p-1 rounded-lg bg-[#2C2C2E] hover:bg-[#3A3A3C] text-[#F5F5F7]"
              >
                <Google_Icon name="close" size={15} />
              </button>
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

      {/* Bottom Display Controls */}
      <div className="px-5 py-3 bg-[#1C1C1E]/90 border-t border-white/[0.08] flex flex-wrap justify-between items-center gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onPointerDown={() => triggerCausalFeedback("tap")}
            onClick={() => setShowBBoxes(!showBBoxes)}
            className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 apple-pressable ${
              showBBoxes
                ? "bg-[#0A84FF]/15 border-[#0A84FF]/45 text-[#0A84FF]"
                : "bg-[#2C2C2E]/70 border-white/[0.08] text-[#A1A1A6]"
            }`}
          >
            <Google_Icon name="crop_free" size={14} />
            กรอบ Tagging: {showBBoxes ? "แสดง" : "ซ่อน"}
          </button>
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
          <button
            type="button"
            onPointerDown={() => triggerCausalFeedback("tap")}
            onClick={() => setShowAngles(!showAngles)}
            className={`px-3 py-1.5 rounded-xl border text-xs apple-pressable ${
              showAngles
                ? "bg-[#30D158]/15 border-[#30D158]/45 text-[#30D158]"
                : "bg-[#2C2C2E]/70 border-white/[0.08] text-[#A1A1A6]"
            }`}
          >
            Angle Badges: {showAngles ? "ON" : "OFF"}
          </button>
        </div>

        <button
          type="button"
          onPointerDown={() => triggerCausalFeedback("tap")}
          onClick={() => {
            holdTimerRef.current = 0;
            hasTriggeredSuccessRef.current = false;
            onFeedbackUpdateRef.current(
              evaluateRealDetections(
                latestDetectionsRef.current,
                targetRuleRef.current,
                0,
                activePersonRef.current
              ).feedback
            );
          }}
          className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] flex items-center gap-1 apple-pressable"
        >
          <Google_Icon name="refresh" size={13} /> รีเซ็ตตัวนับ Hold
        </button>
      </div>
    </div>
  );
};
