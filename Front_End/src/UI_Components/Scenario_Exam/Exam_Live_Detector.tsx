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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Google_Icon name="person" size={18} className="text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100">
            ท่าทางผู้เรียนสด (Live Trainee Posture)
          </h2>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium flex items-center gap-1.5 ${
            cameraActive
              ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
              : "bg-blue-950/50 border-blue-500/40 text-blue-300"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              cameraActive ? "bg-emerald-400 animate-pulse" : "bg-blue-400"
            }`}
          />
          {cameraActive ? "Webcam Live" : "Interactive Simulation Mode"}
        </span>
      </div>

      {/* Camera / Skeleton Canvas Area */}
      <div className="p-4">
        <div className="relative h-[260px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
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
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b1a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b1a_1px,transparent_1px)] bg-[size:28px_28px]" />
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
          <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-rose-950/85 border border-rose-500/50 text-rose-200 text-[10px] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>{isDecisionLocked ? "RECORDING POSTURE" : "STANDBY"}</span>
          </div>

          <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-cyan-300 text-[10px] font-mono">
            {isDecisionLocked
              ? `Latency ${reactionSeconds.toFixed(2)}s`
              : "รอการยืนยันคำตัดสิน"}
          </div>

          <div className="absolute bottom-3 left-3 z-20 px-3 py-1 rounded-full bg-emerald-950/85 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5">
            <Google_Icon name="my_location" size={13} className="text-emerald-400" />
            <span>
              {isDecisionLocked
                ? `ตรวจพบ: ${performedRule.name.replace(/_/g, " ")} · ${livePostureScore}%`
                : "เลือกข้อ A–D แล้วกดยืนยันคำตัดสิน"}
            </span>
          </div>
        </div>

        {/* Hold Progress & Interactive Simulation Quality Selector */}
        {isDecisionLocked && !hasCompletedResult && (
          <div className="mt-3 space-y-3">
            {/* Hold bar */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Google_Icon name="schedule" size={14} className="text-cyan-400" />
                  ค้างสัญญาณตามมาตรฐาน IFAB ({holdDuration.toFixed(1)}s / {holdTarget}s)
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {Math.round(holdPct)}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-100"
                  style={{ width: `${holdPct}%` }}
                />
              </div>
            </div>

            {/* Simulation Quality Toggle when testing without physical camera pose */}
            {!cameraActive && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px]">
                <span className="text-slate-400">จำลองสรีระในการทดสอบ:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSimFormQuality("optimal")}
                    className={`px-2.5 py-1 rounded-lg border font-medium transition ${
                      simFormQuality === "optimal"
                        ? "bg-emerald-950/50 border-emerald-500/60 text-emerald-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    ท่าตรงมาตรฐาน (95%+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimFormQuality("weak")}
                    className={`px-2.5 py-1 rounded-lg border font-medium transition ${
                      simFormQuality === "weak"
                        ? "bg-amber-950/50 border-amber-500/60 text-amber-300"
                        : "bg-slate-900 border-slate-800 text-slate-400"
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
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20"
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
