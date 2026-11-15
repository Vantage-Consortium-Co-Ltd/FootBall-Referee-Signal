"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ExamAttemptResult,
  GestureRule,
  ScenarioExamQuestion,
} from "../../Data_Types/Referee_Types";
import { Skeleton_Canvas } from "../Canvas_Engine/Skeleton_Canvas";
import {
  MOCK_IFAB_RULES,
  evaluateMockPosture,
  generateMockKeypoints,
} from "../../Core_Lib/Microservices_Mock";
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
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [simFormQuality, setSimFormQuality] = useState<"optimal" | "weak">("optimal");
  const [frameTick, setFrameTick] = useState<number>(0);
  const [holdDuration, setHoldDuration] = useState<number>(0);

  const targetRule: GestureRule =
    MOCK_IFAB_RULES.find((r) => r.id === question.targetGestureId) ||
    MOCK_IFAB_RULES[5];

  const selectedOption = question.options.find((o) => o.id === selectedOptionId);
  const performedGestureId =
    isDecisionLocked && selectedOption ? selectedOption.linkedGestureId : 0;
  const performedRule: GestureRule =
    MOCK_IFAB_RULES.find((r) => r.id === performedGestureId) || targetRule;

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
    initCam();

    return () => {
      mounted = false;
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  // Reset hold duration on question change or unlock
  useEffect(() => {
    setHoldDuration(0);
  }, [question.id, isDecisionLocked]);

  // Accurate FPS-independent RAF timer via performance.now()
  useEffect(() => {
    if (hasCompletedResult) return;
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      setFrameTick((prev) => (prev + 1) % 1000);
      if (isDecisionLocked) {
        setHoldDuration((prev) => Math.min(3.0, prev + dt));
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isDecisionLocked, hasCompletedResult]);

  // Compute simulated keypoints & posture metrics
  const rawPose = generateMockKeypoints(performedGestureId, frameTick);
  const weakOffset = simFormQuality === "weak" ? 24 : 0;
  const adjustedAngles = {
    ...rawPose.angles,
    rElevationAngle: Math.max(12, rawPose.angles.rElevationAngle - weakOffset),
    rElbowAngle: Math.max(115, rawPose.angles.rElbowAngle - (simFormQuality === "weak" ? 28 : 0)),
  };

  const baseEval = evaluateMockPosture(performedRule, frameTick, holdDuration);
  const livePostureScore =
    simFormQuality === "weak"
      ? Math.max(48, Math.min(68, baseEval.score - 28))
      : baseEval.score;

  const holdTarget = targetRule.minHoldSeconds || 1.5;
  const holdPct = Math.min(100, (holdDuration / holdTarget) * 100);
  const animatedHoldSpring = useAppleSpring(holdPct, { dampingRatio: 1.0, response: 0.24, precision: 0.2 });
  const animatedScoreSpring = useAppleSpring(livePostureScore, { dampingRatio: 1.0, response: 0.34, precision: 0.25 });

  const handleRecordAndGrade = () => {
    if (!selectedOptionId) return;
    const isDecisionCorrect = selectedOptionId === question.correctOptionId;
    const gestureMatched =
      selectedOption?.linkedGestureId === question.targetGestureId;

    const finalPostureScore = gestureMatched
      ? livePostureScore
      : Math.min(55, Math.round(livePostureScore * 0.55));

    const finalHoldDuration = Number(
      Math.max(holdDuration, isDecisionLocked ? holdTarget + 0.25 : 0.8).toFixed(1)
    );

    // 3D Grading Rubric: Decision (40) + Posture (40) + Reaction Speed (20)
    const decisionPoints = isDecisionCorrect ? 40 : 0;
    const posturePoints = Math.round(finalPostureScore * 0.4);
    const maxWindow = question.decisionWindowSeconds || 5;
    const reactionRatio = Math.max(0, 1 - Math.max(0, reactionSeconds - 1.5) / maxWindow);
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
            cameraActive
              ? "bg-[#30D158]/15 border-[#30D158]/40 text-[#30D158]"
              : "bg-[#0A84FF]/15 border-[#0A84FF]/40 text-[#64D2FF]"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              cameraActive ? "bg-[#30D158] animate-pulse" : "bg-[#64D2FF]"
            }`}
          />
          {cameraActive ? "Webcam Live" : "Interactive Simulation Mode"}
        </span>
      </div>

      {/* Camera / Skeleton Canvas Area */}
      <div className="p-4">
        <div className="relative h-[260px] bg-[#060608] rounded-2xl border border-white/[0.08] overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover z-0 scale-x-[-1] transition-opacity ${
              cameraActive ? "opacity-70" : "opacity-0"
            }`}
          />

          {!cameraActive && (
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#2C2C2E33_1px,transparent_1px),linear-gradient(to_bottom,#2C2C2E33_1px,transparent_1px)] bg-[size:28px_28px]" />
          )}

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

          {/* Floating Status Badges */}
          <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-[#2B0B0D]/90 border border-[#FF453A]/50 text-[#FFD6D4] text-[10px] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF453A] animate-pulse" />
            <span>{isDecisionLocked ? "RECORDING POSTURE" : "STANDBY"}</span>
          </div>

          <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-[#1C1C1E]/90 border border-white/[0.1] text-[#64D2FF] text-[10px] font-mono apple-tabular">
            {isDecisionLocked
              ? `Latency ${reactionSeconds.toFixed(2)}s`
              : "รอการยืนยันคำตัดสิน"}
          </div>

          <div className="absolute bottom-3 left-3 z-20 px-3 py-1 rounded-full bg-[#062614]/90 border border-[#30D158]/40 text-[#30D158] text-[11px] font-semibold apple-tabular flex items-center gap-1.5">
            <Google_Icon name="my_location" size={13} className="text-[#30D158]" />
            <span>
              {isDecisionLocked
                ? `ตรวจพบ: ${performedRule.name.replace(/_/g, " ")} · ${Math.round(animatedScoreSpring.value)}%`
                : "เลือกข้อ A–D แล้วกดยืนยันคำตัดสิน"}
            </span>
          </div>
        </div>

        {/* Hold Progress & Interactive Simulation Quality Selector */}
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
                  style={{ width: `${Math.min(100, Math.max(0, animatedHoldSpring.value))}%` }}
                />
              </div>
            </div>

            {/* Simulation Quality Toggle when testing without physical camera pose */}
            {!cameraActive && (
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
