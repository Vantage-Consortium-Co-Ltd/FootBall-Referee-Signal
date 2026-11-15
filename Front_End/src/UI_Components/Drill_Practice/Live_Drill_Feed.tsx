"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  FrameFeedbackPayload,
  GestureRule,
  Keypoint,
  PostureAngles,
} from "../../Data_Types/Referee_Types";
import { Skeleton_Canvas } from "../Canvas_Engine/Skeleton_Canvas";
import {
  evaluateMockPosture,
  generateMockKeypoints,
} from "../../Core_Lib/Microservices_Mock";
import {
  Camera,
  CameraOff,
  FlipHorizontal,
  RefreshCw,
  Sparkles,
  Video,
} from "lucide-react";

export interface LiveDrillFeedProps {
  targetRule: GestureRule;
  onFeedbackUpdate: (feedback: FrameFeedbackPayload) => void;
  onDrillSuccess?: () => void;
}

export const Live_Drill_Feed: React.FC<LiveDrillFeedProps> = ({
  targetRule,
  onFeedbackUpdate,
  onDrillSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [mirror, setMirror] = useState<boolean>(true);
  const [showGhost, setShowGhost] = useState<boolean>(true);
  const [showAngles, setShowAngles] = useState<boolean>(true);

  // Simulation fallback states
  const [frameTick, setFrameTick] = useState<number>(0);
  const [holdTimer, setHoldTimer] = useState<number>(0);
  const [hasTriggeredSuccess, setHasTriggeredSuccess] = useState<boolean>(false);

  // Start webcam
  const startCamera = async () => {
    try {
      setCameraError(null);
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
      console.warn("Camera access failed or denied, using simulation mode:", err);
      setCameraError(
        "ไม่สามารถเข้าถึงกล้องเว็บแคมได้ ระบบกำลังสลับเข้าสู่โหมดจำลองท่าทางอัตโนมัติ"
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    // Attempt camera start on mount
    startCamera();
    return () => stopCamera();
  }, []);

  // Reset hold timer when target rule changes
  useEffect(() => {
    setHoldTimer(0);
    setHasTriggeredSuccess(false);
  }, [targetRule.id]);

  // Main 60 FPS loop (Evaluator Engine)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const deltaSec = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setFrameTick((prev) => (prev + 1) % 1000);

      // Advance hold timer
      setHoldTimer((prev) => {
        const next = prev + deltaSec;
        return next;
      });

      // Compute posture evaluation
      const feedback = evaluateMockPosture(targetRule, frameTick, holdTimer);
      onFeedbackUpdate(feedback);

      if (feedback.state === "COMPLETED" && !hasTriggeredSuccess) {
        setHasTriggeredSuccess(true);
        if (onDrillSuccess) onDrillSuccess();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [targetRule, frameTick, holdTimer, hasTriggeredSuccess, onFeedbackUpdate, onDrillSuccess]);

  const { keypoints, angles } = generateMockKeypoints(targetRule.id, frameTick);

  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Top Controls Bar */}
      <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200">
            {cameraActive ? "Live Webcam Feed" : "Interactive Simulation Viewport"}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            640x440
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => (cameraActive ? stopCamera() : startCamera())}
            className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 transition ${
              cameraActive
                ? "bg-slate-800 border-slate-700 text-slate-300"
                : "bg-cyan-950 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900"
            }`}
          >
            {cameraActive ? (
              <>
                <CameraOff className="w-3.5 h-3.5" /> ปิดกล้อง
              </>
            ) : (
              <>
                <Camera className="w-3.5 h-3.5" /> เปิดกล้อง
              </>
            )}
          </button>
        </div>
      </div>

      {/* Video & Canvas Viewport Layer */}
      <div className="relative w-full h-[440px] bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Background Video Element (if camera active) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-300 ${
            cameraActive ? "opacity-75" : "opacity-0"
          } ${mirror ? "scale-x-[-1]" : ""}`}
        />

        {/* Pitch grid lines (if camera off) */}
        {!cameraActive && (
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        )}

        {/* Skeleton Canvas Overlay (Task 2 Engine) */}
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Skeleton_Canvas
            keypoints={keypoints}
            targetRule={targetRule}
            angles={angles}
            width={640}
            height={440}
            mirror={mirror}
            showGhost={showGhost}
            showAngles={showAngles}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Floating Indicator Status */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5">
          <div className="bg-slate-900/85 backdrop-blur border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                cameraActive ? "bg-emerald-500 animate-ping" : "bg-cyan-400"
              }`}
            ></span>
            <span className="font-mono text-slate-200">
              {cameraActive ? "WEBCAM STREAM" : "OFFLINE AI SIMULATION"}
            </span>
          </div>

          {cameraError && (
            <div className="bg-amber-950/80 border border-amber-600/50 rounded-lg px-3 py-1 text-[11px] text-amber-200">
              ⚠️ {cameraError}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Display Controls */}
      <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex flex-wrap justify-between items-center gap-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMirror(!mirror)}
            className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition ${
              mirror
                ? "bg-slate-800 border-slate-700 text-cyan-400"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            Mirror View: {mirror ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => setShowGhost(!showGhost)}
            className={`px-3 py-1.5 rounded-lg border text-xs transition ${
              showGhost
                ? "bg-slate-800 border-slate-700 text-cyan-400"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            Ghost Guide: {showGhost ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => setShowAngles(!showAngles)}
            className={`px-3 py-1.5 rounded-lg border text-xs transition ${
              showAngles
                ? "bg-slate-800 border-slate-700 text-emerald-400"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            Angle Badges: {showAngles ? "ON" : "OFF"}
          </button>
        </div>

        <button
          onClick={() => {
            setHoldTimer(0);
            setHasTriggeredSuccess(false);
          }}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
        >
          <RefreshCw className="w-3 h-3" /> รีเซ็ตตัวนับ Hold
        </button>
      </div>
    </div>
  );
};
