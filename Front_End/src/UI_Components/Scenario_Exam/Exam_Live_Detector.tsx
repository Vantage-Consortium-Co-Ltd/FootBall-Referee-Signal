"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ExamAttemptResult,
  GestureRule,
  ModalDetection,
  ScenarioExamQuestion,
} from "../../Data_Types/Referee_Types";
import { Skeleton_Canvas } from "../Canvas_Engine/Skeleton_Canvas";
import {
  MOCK_IFAB_RULES,
  evaluateMockPosture,
  generateMockKeypoints,
} from "../../Core_Lib/Microservices_Mock";
import {
  captureVideoFrameAsJpeg,
  checkModalHealth,
  fetchWebcamWsConfig,
  findRuleByLabel,
  predictImageBoth,
} from "../../Core_Lib/Api_Client";
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
  const [simFormQuality, setSimFormQuality] = useState<"optimal" | "weak">("optimal");
  const [frameTick, setFrameTick] = useState<number>(0);
  const [holdDuration, setHoldDuration] = useState<number>(0);

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
    MOCK_IFAB_RULES.find((r) => r.id === question.targetGestureId) ||
    MOCK_IFAB_RULES[5];

  const selectedOption = question.options.find((o) => o.id === selectedOptionId);
  const performedGestureId =
    isDecisionLocked && selectedOption ? selectedOption.linkedGestureId : 0;
  const performedRule: GestureRule =
    MOCK_IFAB_RULES.find((r) => r.id === performedGestureId) || targetRule;

  // Refs for RAF loop stability
  const frameTickRef = useRef<number>(0);
  const isHoldMatchedRef = useRef<boolean>(false);

  const matchedWsDet =
    liveDetections.find((d) => d.label.toLowerCase() === performedRule.name.toLowerCase()) ||
    liveDetections.find((d) => d.label.toLowerCase() === targetRule.name.toLowerCase()) ||
    null;

  const matchedPhotoDet =
    uploadedDetections.find((d) => d.label.toLowerCase() === performedRule.name.toLowerCase()) ||
    uploadedDetections.find((d) => d.label.toLowerCase() === targetRule.name.toLowerCase()) ||
    null;

  isHoldMatchedRef.current = Boolean(
    !cameraActive || !wsConnected || uploadedExamImageUrl || matchedWsDet
  );

  // Revoke photo object URL on change/unmount
  useEffect(() => {
    return () => {
      if (uploadedExamImageUrl) {
        URL.revokeObjectURL(uploadedExamImageUrl);
      }
    };
  }, [uploadedExamImageUrl]);

  // Attempt webcam startup with seamless Simulation fallback
  useEffect(() => {
    let mounted = true;
    const initCam = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraActive(true);
        }
      } catch {
        if (mounted) setCameraActive(false);
      }
    };
    void initCam();

    return () => {
      mounted = false;
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, []);

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
        };

        ws.onclose = () => {
          if (cancelled) return;
          awaitingReplyRef.current = false;
          wsRef.current = null;
          setWsWarming(false);
          setWsConnected(false);
        };
      } catch {
        if (!cancelled) {
          setWsWarming(false);
          setWsConnected(false);
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

  // Accurate FPS-independent RAF timer via performance.now()
  useEffect(() => {
    if (hasCompletedResult) return;
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      const nextTick = (frameTickRef.current + 1) % 1000;
      frameTickRef.current = nextTick;
      setFrameTick(nextTick);

      if (isDecisionLocked) {
        if (isHoldMatchedRef.current) {
          setHoldDuration((prev) => Math.min(3.0, prev + dt));
        } else {
          setHoldDuration(0);
        }
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

  // Compute keypoints & posture metrics (Hybrid Live AI / Photo AI / Simulation)
  const activeDetections = uploadedExamImageUrl ? uploadedDetections : liveDetections;
  const topActiveDet = activeDetections[0] ?? null;
  const topActiveRule = topActiveDet ? findRuleByLabel(topActiveDet.label) : undefined;
  const displayedGestureId =
    (uploadedExamImageUrl || wsConnected) && topActiveRule
      ? topActiveRule.id
      : performedGestureId;

  const rawPose = generateMockKeypoints(displayedGestureId, frameTick);
  const weakOffset = simFormQuality === "weak" ? 24 : 0;
  const adjustedAngles = {
    ...rawPose.angles,
    rElevationAngle: Math.max(12, rawPose.angles.rElevationAngle - weakOffset),
    rElbowAngle: Math.max(
      115,
      rawPose.angles.rElbowAngle - (simFormQuality === "weak" ? 28 : 0)
    ),
  };

  const baseEval = evaluateMockPosture(performedRule, frameTick, holdDuration);

  let livePostureScore: number;
  if (uploadedExamImageUrl) {
    if (matchedPhotoDet) {
      livePostureScore = Math.min(100, Math.max(75, Math.round(matchedPhotoDet.confidence * 100)));
    } else if (topActiveDet) {
      livePostureScore = Math.round(topActiveDet.confidence * 55);
    } else {
      livePostureScore = 30;
    }
  } else if (cameraActive && wsConnected) {
    if (matchedWsDet) {
      livePostureScore = Math.min(100, Math.max(75, Math.round(matchedWsDet.confidence * 100)));
    } else if (topActiveDet) {
      livePostureScore = Math.round(topActiveDet.confidence * 55);
    } else {
      livePostureScore = 0;
    }
  } else {
    livePostureScore =
      simFormQuality === "weak"
        ? Math.max(48, Math.min(68, baseEval.score - 28))
        : baseEval.score;
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

  const handleRecordAndGrade = () => {
    if (!selectedOptionId) return;
    const isDecisionCorrect = selectedOptionId === question.correctOptionId;
    const gestureMatched =
      selectedOption?.linkedGestureId === question.targetGestureId;

    const finalPostureScore = gestureMatched
      ? livePostureScore
      : Math.min(55, Math.round(livePostureScore * 0.55));

    const finalHoldDuration = Number(
      Math.max(
        holdDuration,
        uploadedExamImageUrl && matchedPhotoDet
          ? holdTarget + 0.1
          : isDecisionLocked && !wsConnected
          ? holdTarget + 0.25
          : 0.8
      ).toFixed(1)
    );

    // 3D Grading Rubric: Decision (40) + Posture (40) + Reaction Speed (20)
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
      recordedAngles: adjustedAngles,
    });
  };

  return (
    <div className="apple-material-dark rounded-[22px] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 bg-[#1C1C1E]/90 border-b border-white/[0.08] flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Google_Icon name="person" size={18} className="text-[#0A84FF]" />
          <h2 className="text-sm font-bold apple-title text-[#F5F5F7]">
            ท่าทางผู้เรียนสด (Live Trainee Posture)
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
              : "bg-[#0A84FF]/15 border-[#0A84FF]/40 text-[#64D2FF]"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              uploadedExamImageUrl || (cameraActive && wsConnected)
                ? "bg-[#30D158] animate-pulse"
                : wsWarming
                ? "bg-[#FF9F0A] animate-pulse"
                : "bg-[#64D2FF]"
            }`}
          />
          {uploadedExamImageUrl
            ? "Modal Photo AI (/predict/image)"
            : cameraActive && wsConnected
            ? `Modal WS Live${wsLatencyMs !== null ? ` (${wsLatencyMs}ms)` : ""}`
            : wsWarming
            ? "Warming Modal CPU..."
            : cameraActive
            ? "Webcam Simulation Fallback"
            : "Interactive Simulation Mode"}
        </span>
      </div>

      {/* Camera / Skeleton Canvas / Uploaded Photo Area */}
      <div className="p-4">
        <div className="relative h-[260px] bg-[#060608] rounded-2xl border border-white/[0.08] overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover z-0 scale-x-[-1] transition-opacity ${
              cameraActive && !uploadedExamImageUrl ? "opacity-70" : "opacity-0"
            }`}
          />

          {!cameraActive && !uploadedExamImageUrl && (
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#2C2C2E33_1px,transparent_1px),linear-gradient(to_bottom,#2C2C2E33_1px,transparent_1px)] bg-[size:28px_28px]" />
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
            <div className="relative z-10 flex items-center justify-center">
              <Skeleton_Canvas
                keypoints={rawPose.keypoints}
                targetRule={isDecisionLocked ? targetRule : undefined}
                angles={adjustedAngles}
                width={440}
                height={250}
                mirror={true}
                showGhost={isDecisionLocked}
                showAngles={isDecisionLocked}
                showBBoxes={false}
              />
            </div>
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
                  : "ไม่พบท่าสัญญาณในภาพที่อัปโหลด (30%)"
                : isDecisionLocked
                ? wsConnected
                  ? topActiveDet
                    ? `Live WS: ${topActiveDet.label.replace(/_/g, " ")} · ${Math.round(
                        animatedScoreSpring.value
                      )}%`
                    : "กำลังรอตรวจจับสัญญาณจากกล้อง..."
                  : `ตรวจพบ: ${performedRule.name.replace(/_/g, " ")} · ${Math.round(
                      animatedScoreSpring.value
                    )}%`
                : "เลือกข้อ A–D แล้วกดยืนยันคำตัดสิน"}
            </span>
          </div>
        </div>

        {/* Hold Progress & Modal AI Photo Upload Fallback */}
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

            {/* Simulation Quality Toggle when testing without physical camera pose or uploaded photo */}
            {!cameraActive && !uploadedExamImageUrl && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-[#141416] border border-white/[0.08] text-[11px]">
                <span className="text-[#A1A1A6]">จำลองสรีระในการทดสอบ:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onPointerDown={() => triggerCausalFeedback("tap")}
                    onClick={() => setSimFormQuality("optimal")}
                    className={`px-2.5 py-1 rounded-xl border font-medium apple-pressable ${
                      simFormQuality === "optimal"
                        ? "bg-[#30D158]/15 border-[#30D158]/55 text-[#30D158]"
                        : "bg-[#1C1C1E] border-white/[0.08] text-[#A1A1A6]"
                    }`}
                  >
                    ท่าตรงมาตรฐาน (95%+)
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => triggerCausalFeedback("tap")}
                    onClick={() => setSimFormQuality("weak")}
                    className={`px-2.5 py-1 rounded-xl border font-medium apple-pressable ${
                      simFormQuality === "weak"
                        ? "bg-[#FF9F0A]/15 border-[#FF9F0A]/55 text-[#FF9F0A]"
                        : "bg-[#1C1C1E] border-white/[0.08] text-[#A1A1A6]"
                    }`}
                  >
                    แขนงอ/ต่ำกว่าเกณฑ์
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleRecordAndGrade}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#30D158] hover:bg-[#42DF69] text-black font-bold text-xs flex items-center justify-center gap-2 apple-pressable shadow-lg shadow-[#30D158]/20"
            >
              <Google_Icon name="check_circle" size={18} />
              <span>บันทึกท่าสัญญาณและตรวจผลคะแนนข้อนี้</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
