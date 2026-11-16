"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ExamAttemptResult,
  GestureRule,
  ModalDetection,
  PostureAngles,
  ScenarioExamQuestion,
  TaggedPerson,
} from "../../Data_Types/Referee_Types";
import { Skeleton_Canvas } from "../Canvas_Engine/Skeleton_Canvas";
import { IFAB_RULES } from "../../Core_Lib/Ifab_Rules_Catalog";
import {
  captureVideoFrameAsJpeg,
  checkModalHealth,
  fetchWebcamWsConfig,
  findRuleByLabel,
  predictImageBoth,
} from "../../Core_Lib/Api_Client";
import {
  detectRealPosesFromVideo,
  ensurePoseDetectorLoaded,
} from "../../Core_Lib/Real_Pose_Tracker";
import { Google_Icon } from "../Common/Google_Icon";
import {
  triggerCausalFeedback,
  useAppleSpring,
} from "../../Core_Lib/Apple_Spring_Engine";

export interface ExamLiveDetectorProps {
  question: ScenarioExamQuestion;
  selectedOptionId: "A" | "B" | "C" | "D" | null;
  isDecisionLocked: boolean;
  reactionSeconds: number;
  hasCompletedResult: boolean;
  onSubmitAttempt: (result: ExamAttemptResult) => void;
}

const ZERO_ANGLES: PostureAngles = {
  rElbowAngle: 0,
  lElbowAngle: 0,
  rElevationAngle: 0,
  lElevationAngle: 0,
};

export const Exam_Live_Detector: React.FC<ExamLiveDetectorProps> = ({
  question,
  selectedOptionId,
  isDecisionLocked,
  reactionSeconds,
  hasCompletedResult,
  onSubmitAttempt,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const awaitingReplyRef = useRef<boolean>(false);
  const sendTimeRef = useRef<number>(0);
  const pumpTimerRef = useRef<number | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [holdDuration, setHoldDuration] = useState<number>(0);
  const [livePerson, setLivePerson] = useState<TaggedPerson | null>(null);

  // Modal AI WebSocket & Image Upload States
  const [liveDetections, setLiveDetections] = useState<ModalDetection[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [wsWarming, setWsWarming] = useState<boolean>(false);
  const [wsLatencyMs, setWsLatencyMs] = useState<number | null>(null);
  const [uploadedExamImageUrl, setUploadedExamImageUrl] = useState<string | null>(null);
  const [uploadedDetections, setUploadedDetections] = useState<ModalDetection[]>([]);
  const [isUploadingExamImage, setIsUploadingExamImage] = useState<boolean>(false);
  const [examAiError, setExamAiError] = useState<string | null>(null);

  const targetRule: GestureRule =
    IFAB_RULES.find((r) => r.id === question.targetGestureId) || IFAB_RULES[5];

  const selectedOption = question.options.find((o) => o.id === selectedOptionId);
  const performedGestureId =
    isDecisionLocked && selectedOption ? selectedOption.linkedGestureId : 0;
  const performedRule: GestureRule =
    IFAB_RULES.find((r) => r.id === performedGestureId) || targetRule;

  const matchedWsDet =
    liveDetections.find((d) => d.label.toLowerCase() === performedRule.name.toLowerCase()) ||
    liveDetections.find((d) => d.label.toLowerCase() === targetRule.name.toLowerCase()) ||
    null;

  const matchedPhotoDet =
    uploadedDetections.find((d) => d.label.toLowerCase() === performedRule.name.toLowerCase()) ||
    uploadedDetections.find((d) => d.label.toLowerCase() === targetRule.name.toLowerCase()) ||
    null;

  const liveDetectionsRef = useRef<ModalDetection[]>([]);
  useEffect(() => {
    liveDetectionsRef.current = liveDetections;
  }, [liveDetections]);

  const isHoldMatchedRef = useRef<boolean>(false);
  isHoldMatchedRef.current = Boolean(cameraActive && wsConnected && matchedWsDet);

  // Revoke photo object URL on change/unmount
  useEffect(() => {
    return () => {
      if (uploadedExamImageUrl) {
        URL.revokeObjectURL(uploadedExamImageUrl);
      }
    };
  }, [uploadedExamImageUrl]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("เบราว์เซอร์ไม่รองรับกล้องเว็บแคม");
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
    } catch {
      setCameraError("ไม่สามารถเปิดกล้องได้ — สามารถอัปโหลดภาพถ่ายจริงด้านล่างเพื่อตรวจแทน");
      setCameraActive(false);
    }
  }, []);

  useEffect(() => {
    void startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [startCamera]);

  // Reset hold duration and uploaded photo on question change or unlock
  useEffect(() => {
    setHoldDuration(0);
    setLiveDetections([]);
    setExamAiError(null);
    setUploadedDetections([]);
    setUploadedExamImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [question.id, isDecisionLocked]);

  // Real-time MoveNet 17-keypoint tracking loop while camera is active
  useEffect(() => {
    if (!cameraActive || uploadedExamImageUrl || hasCompletedResult) {
      setLivePerson(null);
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let running = false;

    const run = async () => {
      const ok = await ensurePoseDetectorLoaded();
      if (cancelled || !ok) return;

      const tick = async () => {
        if (cancelled) return;
        if (!running && videoRef.current && videoRef.current.readyState >= 2) {
          running = true;
          try {
            const res = await detectRealPosesFromVideo(
              videoRef.current,
              liveDetectionsRef.current,
              "person-1",
              true
            );
            if (!cancelled) {
              setLivePerson(res.activePerson);
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

    void run();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [cameraActive, uploadedExamImageUrl, hasCompletedResult]);

  // Lock-step WebSocket connection during active exam recording
  useEffect(() => {
    const shouldConnect =
      cameraActive && isDecisionLocked && !hasCompletedResult && !uploadedExamImageUrl;

    if (!shouldConnect) {
      if (pumpTimerRef.current !== null) {
        window.clearTimeout(pumpTimerRef.current);
        pumpTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "exam detector idle");
        wsRef.current = null;
      }
      awaitingReplyRef.current = false;
      setWsConnected(false);
      setWsWarming(false);
      return;
    }

    let cancelled = false;

    const scheduleFrame = (delayMs: number) => {
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
      if (!ws || ws.readyState !== WebSocket.OPEN || awaitingReplyRef.current) return;

      if (!video || video.readyState < 2) {
        scheduleFrame(150);
        return;
      }

      const blob = await captureVideoFrameAsJpeg(video, 640, 0.8);
      if (cancelled || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }
      if (!blob) {
        scheduleFrame(150);
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
        scheduleFrame(300);
      }
    };

    const startWs = async () => {
      try {
        setExamAiError(null);
        setWsWarming(true);
        const health = await checkModalHealth();
        if (cancelled) return;
        if (health.status !== "ok") {
          setWsWarming(false);
          setWsConnected(false);
          setExamAiError(health.detail || "Modal API ไม่ตอบสนอง");
          return;
        }

        const cfg = await fetchWebcamWsConfig();
        if (cancelled) return;

        const ws = new WebSocket(cfg.wsUrl);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) {
            ws.close(1000);
            return;
          }
          awaitingReplyRef.current = false;
          setWsWarming(false);
          setWsConnected(true);
          scheduleFrame(40);
        };

        ws.onmessage = (ev) => {
          if (cancelled) return;
          setWsLatencyMs(Math.round(performance.now() - sendTimeRef.current));
          awaitingReplyRef.current = false;
          try {
            const parsed = JSON.parse(String(ev.data)) as { detections?: ModalDetection[] };
            setLiveDetections(Array.isArray(parsed.detections) ? parsed.detections : []);
          } catch {
            setLiveDetections([]);
          }
          scheduleFrame(50);
        };

        ws.onerror = () => {
          if (cancelled) return;
          awaitingReplyRef.current = false;
          setWsWarming(false);
          setWsConnected(false);
          setExamAiError("เกิดข้อผิดพลาดระหว่างเชื่อมต่อ /ws/webcam");
        };

        ws.onclose = () => {
          if (cancelled) return;
          awaitingReplyRef.current = false;
          wsRef.current = null;
          setWsWarming(false);
          setWsConnected(false);
        };
      } catch (err: unknown) {
        if (!cancelled) {
          setWsWarming(false);
          setWsConnected(false);
          setExamAiError(
            err instanceof Error ? err.message : "เชื่อมต่อ /ws/webcam ไม่สำเร็จ"
          );
        }
      }
    };

    void startWs();

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
  }, [cameraActive, isDecisionLocked, hasCompletedResult, uploadedExamImageUrl]);

  // Hold timer loop driven strictly by live WebSocket matches
  useEffect(() => {
    if (hasCompletedResult || !isDecisionLocked) return;
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      if (isHoldMatchedRef.current) {
        setHoldDuration((prev) => Math.min(3.0, prev + dt));
      } else {
        setHoldDuration(0);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isDecisionLocked, hasCompletedResult]);

  // Handle photo upload for Modal /predict/image verification
  const handleExamPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploadingExamImage(true);
    setExamAiError(null);
    triggerCausalFeedback("tap");

    try {
      const res = await predictImageBoth(file, file.name);
      setUploadedDetections(res.detections);
      setUploadedExamImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return res.annotatedImageUrl;
      });
      triggerCausalFeedback("success");
    } catch (err: unknown) {
      setExamAiError(
        err instanceof Error ? err.message : "ไม่สามารถส่งภาพเข้า Modal API ได้"
      );
      triggerCausalFeedback("warning");
    } finally {
      setIsUploadingExamImage(false);
    }
  };

  const activeDetections = uploadedExamImageUrl ? uploadedDetections : liveDetections;
  const topActiveDet = activeDetections[0] ?? null;
  const topActiveRule = topActiveDet ? findRuleByLabel(topActiveDet.label) : undefined;

  let livePostureScore = 0;
  if (uploadedExamImageUrl) {
    if (matchedPhotoDet) {
      livePostureScore = Math.round(matchedPhotoDet.confidence * 100);
    } else if (topActiveDet) {
      livePostureScore = Math.round(topActiveDet.confidence * 50);
    } else {
      livePostureScore = 0;
    }
  } else if (cameraActive && wsConnected) {
    if (matchedWsDet) {
      livePostureScore = Math.round(matchedWsDet.confidence * 100);
    } else if (topActiveDet) {
      livePostureScore = Math.round(topActiveDet.confidence * 50);
    } else {
      livePostureScore = 0;
    }
  }

  const holdTarget = targetRule.minHoldSeconds || 1.5;
  const holdPct = Math.min(100, (holdDuration / holdTarget) * 100);
  const animatedHoldSpring = useAppleSpring(holdPct, {
    dampingRatio: 1.0,
    response: 0.24,
    precision: 0.2,
  });
  const animatedScoreSpring = useAppleSpring(livePostureScore, {
    dampingRatio: 1.0,
    response: 0.34,
    precision: 0.25,
  });

  const canSubmit = Boolean(
    uploadedExamImageUrl || (cameraActive && wsConnected && liveDetections.length > 0)
  );

  const handleRecordAndGrade = () => {
    if (!selectedOptionId || !canSubmit) return;
    const isDecisionCorrect = selectedOptionId === question.correctOptionId;
    const gestureMatched =
      selectedOption?.linkedGestureId === question.targetGestureId;

    const finalPostureScore = gestureMatched
      ? livePostureScore
      : Math.min(55, Math.round(livePostureScore * 0.55));

    const finalHoldDuration = Number(
      (uploadedExamImageUrl && matchedPhotoDet ? holdTarget : holdDuration).toFixed(1)
    );

    // 3D Grading Rubric: Decision (40) + Model Posture Confidence (40) + Reaction Speed (20)
    const decisionPoints = isDecisionCorrect ? 40 : 0;
    const posturePoints = Math.round(finalPostureScore * 0.4);
    const maxWindow = question.decisionWindowSeconds || 5;
    const reactionRatio = Math.max(
      0,
      1 - Math.max(0, reactionSeconds - 1.5) / maxWindow
    );
    const reactionPoints = Math.round(8 + reactionRatio * 12);

    const totalQuestionScore = Math.min(
      100,
      decisionPoints + posturePoints + reactionPoints
    );
    const passed =
      isDecisionCorrect && finalPostureScore >= 70 && totalQuestionScore >= 75;

    triggerCausalFeedback(passed ? "success" : "warning");

    onSubmitAttempt({
      questionId: question.id,
      selectedOptionId,
      isDecisionCorrect,
      postureScore: finalPostureScore,
      reactionTimeSeconds: reactionSeconds,
      holdDurationSeconds: finalHoldDuration,
      totalQuestionScore,
      passed,
      recordedAngles: livePerson?.angles || ZERO_ANGLES,
    });
  };

  return (
    <div className="apple-material-dark rounded-[22px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 bg-[#1C1C1E]/90 border-b border-white/[0.08] flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Google_Icon name="person" size={18} className="text-[#0A84FF]" />
          <h2 className="text-sm font-bold apple-title text-[#F5F5F7]">
            ตรวจจับท่าทางผู้เรียนจริง (17-KP + Modal YOLO26n-pose)
          </h2>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium flex items-center gap-1.5 ${
            uploadedExamImageUrl
              ? "bg-[#30D158]/15 border-[#30D158]/40 text-[#30D158]"
              : cameraActive && wsConnected
              ? "bg-[#30D158]/15 border-[#30D158]/40 text-[#30D158]"
              : wsWarming
              ? "bg-[#FF9F0A]/15 border-[#FF9F0A]/40 text-[#FF9F0A]"
              : "bg-[#141416] border-white/[0.12] text-[#A1A1A6]"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              uploadedExamImageUrl || (cameraActive && wsConnected)
                ? "bg-[#30D158] animate-pulse"
                : wsWarming
                ? "bg-[#FF9F0A] animate-pulse"
                : "bg-[#6E6E73]"
            }`}
          />
          {uploadedExamImageUrl
            ? "Modal Photo AI (/predict/image)"
            : cameraActive && wsConnected
            ? `Modal WS Live${wsLatencyMs !== null ? ` (${wsLatencyMs}ms)` : ""}`
            : wsWarming
            ? "Warming Modal CPU..."
            : cameraActive
            ? "17-KP Skeleton Ready"
            : "No Camera (Use Photo Upload)"}
        </span>
      </div>

      {/* Camera / Real Skeleton Canvas / Uploaded Photo Area */}
      <div className="p-4">
        <div className="relative h-[260px] bg-[#060608] rounded-2xl border border-white/[0.08] overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-contain z-0 scale-x-[-1] transition-opacity ${
              cameraActive && !uploadedExamImageUrl ? "opacity-85" : "opacity-0"
            }`}
          />

          {!cameraActive && !uploadedExamImageUrl && (
            <div className="relative z-10 px-6 text-center space-y-2">
              <Google_Icon name="videocam_off" size={26} className="mx-auto text-[#6E6E73]" />
              <div className="text-xs font-semibold text-[#F5F5F7]">
                ยังไม่ได้เชื่อมต่อกล้องเว็บแคม
              </div>
              <p className="text-[11px] text-[#A1A1A6]">
                {cameraError ||
                  "เปิดกล้องเว็บแคมเพื่อวาดโครงกระดูก 17 จุดและสตรีมเข้า /ws/webcam หรืออัปโหลดภาพถ่ายจริงด้านล่าง"}
              </p>
              <button
                type="button"
                onClick={() => void startCamera()}
                className="px-3 py-1 rounded-xl bg-[#0A84FF] text-white text-[11px] font-semibold apple-pressable"
              >
                ลองเปิดกล้องอีกครั้ง
              </button>
            </div>
          )}

          {uploadedExamImageUrl ? (
            <div className="relative z-10 w-full h-full flex items-center justify-center bg-black">
              <img
                src={uploadedExamImageUrl}
                alt="Exam uploaded annotated pose"
                className="max-h-full max-w-full object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setUploadedDetections([]);
                  setUploadedExamImageUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return null;
                  });
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-[#1C1C1E]/90 border border-white/[0.15] text-[#F5F5F7] hover:bg-[#2C2C2E]"
                title="ล้างภาพที่อัปโหลด"
              >
                <Google_Icon name="close" size={14} />
              </button>
            </div>
          ) : (
            cameraActive && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <Skeleton_Canvas
                  keypoints={livePerson?.keypoints || []}
                  targetRule={isDecisionLocked ? targetRule : undefined}
                  angles={livePerson?.angles}
                  width={440}
                  height={330}
                  mirror={true}
                  showAngles={isDecisionLocked && Boolean(livePerson)}
                  showBBoxes={false}
                  className="w-full h-full object-contain"
                />
              </div>
            )
          )}

          {/* Floating Status Badges */}
          <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-[#2B0B0D]/90 border border-[#FF453A]/50 text-[#FFD6D4] text-[10px] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF453A] animate-pulse" />
            <span>{isDecisionLocked ? "RECORDING POSTURE" : "STANDBY"}</span>
          </div>

          {!uploadedExamImageUrl && (
            <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-[#1C1C1E]/90 border border-white/[0.1] text-[#64D2FF] text-[10px] font-mono apple-tabular">
              {isDecisionLocked
                ? `Latency ${reactionSeconds.toFixed(2)}s`
                : "รอการยืนยันคำตัดสิน"}
            </div>
          )}

          <div className="absolute bottom-3 left-3 z-20 px-3 py-1 rounded-full bg-[#062614]/90 border border-[#30D158]/40 text-[#30D158] text-[11px] font-semibold apple-tabular flex items-center gap-1.5">
            <Google_Icon name="my_location" size={13} className="text-[#30D158]" />
            <span>
              {uploadedExamImageUrl
                ? topActiveDet
                  ? `Modal AI ตรวจพบ: ${topActiveRule?.nameTh || topActiveDet.label} (${Math.round(
                      topActiveDet.confidence * 100
                    )}%) · ${Math.round(animatedScoreSpring.value)}%`
                  : "ไม่พบท่าสัญญาณในภาพที่อัปโหลด (0%)"
                : isDecisionLocked
                ? wsConnected
                  ? topActiveDet
                    ? `Live WS: ${topActiveRule?.nameTh || topActiveDet.label} · ${Math.round(
                        animatedScoreSpring.value
                      )}%`
                    : "กำลังรอตรวจจับสัญญาณจากกล้อง..."
                  : "กำลังเชื่อมต่อ Modal /ws/webcam..."
                : "เลือกข้อ A–D แล้วกดยืนยันคำตัดสิน"}
            </span>
          </div>
        </div>

        {/* Hold Progress & Modal AI Photo Upload */}
        {isDecisionLocked && !hasCompletedResult && (
          <div className="mt-3 space-y-3">
            {/* Hold bar */}
            <div className="bg-[#141416] border border-white/[0.08] rounded-2xl p-3">
              <div className="flex justify-between items-center text-xs mb-1.5 apple-tabular">
                <span className="text-[#F5F5F7] font-medium flex items-center gap-1.5">
                  <Google_Icon name="schedule" size={14} className="text-[#0A84FF]" />
                  ค้างสัญญาณตามมาตรฐาน IFAB ({holdDuration.toFixed(1)}s / {holdTarget}s)
                </span>
                <span className="font-mono font-bold text-[#30D158]">
                  {Math.round(animatedHoldSpring.value)}%
                </span>
              </div>
              <div className="w-full h-2 bg-[#2C2C2E] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0A84FF] to-[#30D158]"
                  style={{
                    width: `${Math.min(100, Math.max(0, animatedHoldSpring.value))}%`,
                  }}
                />
              </div>
            </div>

            {/* Real Modal /predict/image Exam Photo Verification */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-[#141416] border border-white/[0.08] text-[11px]">
              <span className="text-[#A1A1A6]">
                ตรวจด้วยภาพถ่ายจริง (/predict/image):
              </span>
              <button
                type="button"
                disabled={isUploadingExamImage}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1 rounded-xl border border-[#0A84FF]/50 bg-[#0A84FF]/15 hover:bg-[#0A84FF]/25 text-[#64D2FF] font-semibold flex items-center gap-1.5 apple-pressable disabled:opacity-50"
              >
                <Google_Icon name="crop_free" size={13} />
                <span>
                  {isUploadingExamImage
                    ? "กำลังตรวจภาพกับ Modal AI..."
                    : "อัปโหลดรูปท่าตัดสินจริง (Modal AI)"}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleExamPhotoUpload}
                className="hidden"
              />
            </div>

            {examAiError && (
              <div className="px-3 py-2 rounded-xl bg-[#2B0B0D]/90 border border-[#FF453A]/50 text-[11px] text-[#FFD6D4]">
                {examAiError}
              </div>
            )}

            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleRecordAndGrade}
              className={`w-full py-2.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 apple-pressable ${
                canSubmit
                  ? "bg-[#30D158] hover:bg-[#42DF69] text-black shadow-lg shadow-[#30D158]/20"
                  : "bg-[#2C2C2E] text-[#6E6E73] cursor-not-allowed"
              }`}
            >
              <Google_Icon name="check_circle" size={18} />
              <span>
                {canSubmit
                  ? "บันทึกท่าสัญญาณและตรวจผลคะแนนข้อนี้"
                  : "รอผลตรวจจับจากกล้อง /ws/webcam หรืออัปโหลดภาพถ่ายจริงก่อนบันทึกผล"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
