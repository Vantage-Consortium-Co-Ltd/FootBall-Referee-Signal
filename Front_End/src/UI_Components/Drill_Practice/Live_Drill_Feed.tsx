"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  FrameFeedbackPayload,
  GestureRule,
  TaggedPerson,
} from "../../Data_Types/Referee_Types";
import { Skeleton_Canvas } from "../Canvas_Engine/Skeleton_Canvas";
import {
  evaluateMockPosture,
  generateMockPersons,
} from "../../Core_Lib/Microservices_Mock";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

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
  const [showBBoxes, setShowBBoxes] = useState<boolean>(true);

  // Person Tagging States
  const [activePersonId, setActivePersonId] = useState<string>("person-1");
  const [autoTagReferee, setAutoTagReferee] = useState<boolean>(true);
  const [lastTaggedAlert, setLastTaggedAlert] = useState<string | null>(null);

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
    startCamera();
    return () => stopCamera();
  }, []);

  // Reset hold timer when target rule changes
  useEffect(() => {
    setHoldTimer(0);
    setHasTriggeredSuccess(false);
  }, [targetRule.id]);

  // Handle Tagging Person
  const handleTagPerson = (personId: string) => {
    triggerCausalFeedback("snap");
    setActivePersonId(personId);
    setAutoTagReferee(false);
    const personName = personId === "person-1" ? "ผู้ตัดสิน (Referee)" : "ผู้เล่น #10 (Player)";
    setLastTaggedAlert(`ล็อคเป้าหมาย: ${personName}`);
    setTimeout(() => setLastTaggedAlert(null), 3000);
  };

  // Main 60 FPS loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const deltaSec = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setFrameTick((prev) => (prev + 1) % 1000);

      // Advance hold timer
      setHoldTimer((prev) => prev + deltaSec);

      // Compute posture evaluation for active tagged person
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

  // Detected Persons list
  const detectedPersons: TaggedPerson[] = generateMockPersons(
    targetRule.id,
    frameTick,
    activePersonId
  );
  const activeTaggedPerson =
    detectedPersons.find((p) => p.isTagged) || detectedPersons[0];

  return (
    <div className="relative apple-material-dark rounded-[22px] overflow-hidden flex flex-col">
      {/* Top Viewport Header */}
      <div className="px-5 py-3 bg-[#1C1C1E]/90 border-b border-white/[0.08] flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <Google_Icon name="videocam" size={16} className="text-[#0A84FF]" />
          <span className="font-semibold text-[#F5F5F7]">
            {cameraActive ? "Live Camera AI Tagging" : "Camera AI Tagging Simulation"}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2C2C2E] text-[#A1A1A6] apple-tabular">
            640×440
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onPointerDown={() => triggerCausalFeedback("tap")}
            onClick={() => (cameraActive ? stopCamera() : startCamera())}
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

      {/* Person Tagging Control Bar */}
      <div className="px-4 py-2 bg-[#141416]/90 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#A1A1A6] font-medium flex items-center gap-1">
            <Google_Icon name="group" size={14} className="text-[#0A84FF]" /> ตรวจพบบุคคล ({detectedPersons.length}):
          </span>

          {/* Quick Tagging Buttons for each person */}
          {detectedPersons.map((person) => {
            const isSelected = person.isTagged;
            return (
              <button
                key={person.id}
                onClick={() => handleTagPerson(person.id)}
                className={`px-2.5 py-1 rounded-xl font-medium text-[11px] apple-pressable flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-[#0A84FF]/20 border-[#0A84FF]/70 text-[#F5F5F7] shadow-sm"
                    : "bg-[#1C1C1E] border-white/[0.08] text-[#A1A1A6] hover:text-[#F5F5F7]"
                }`}
              >
                <Google_Icon name="my_location" size={12} className={isSelected ? "text-[#0A84FF]" : "text-[#6E6E73]"} />
                <span>{person.labelTh}</span>
                <span className="font-mono text-[9px] text-[#6E6E73] apple-tabular">
                  {Math.round(person.confidence * 100)}%
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onPointerDown={() => triggerCausalFeedback("snap")}
            onClick={() => {
              setAutoTagReferee(!autoTagReferee);
              if (!autoTagReferee) setActivePersonId("person-1");
            }}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-medium apple-pressable flex items-center gap-1.5 ${
              autoTagReferee
                ? "bg-[#30D158]/15 border-[#30D158]/45 text-[#30D158]"
                : "bg-[#1C1C1E] border-white/[0.08] text-[#A1A1A6]"
            }`}
          >
            <Google_Icon name="how_to_reg" size={14} className="text-[#30D158]" />
            Auto-Tag ผู้ตัดสิน: {autoTagReferee ? "เปิด" : "ปิด"}
          </button>
        </div>
      </div>

      {/* Video & Interactive Canvas Viewport Layer */}
      <div className="relative w-full h-[440px] bg-[#060608] flex items-center justify-center overflow-hidden">
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
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#2C2C2E33_1px,transparent_1px),linear-gradient(to_bottom,#2C2C2E33_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        )}

        {/* Skeleton & Tagging Canvas Overlay */}
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <Skeleton_Canvas
            keypoints={activeTaggedPerson.keypoints}
            persons={detectedPersons}
            targetRule={targetRule}
            angles={activeTaggedPerson.angles}
            width={640}
            height={440}
            mirror={mirror}
            showGhost={showGhost}
            showAngles={showAngles}
            showBBoxes={showBBoxes}
            onTagPerson={handleTagPerson}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Floating Tagging Instructions & Status */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5">
          <div className="apple-material-dark rounded-xl px-3 py-1.5 text-xs flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                cameraActive ? "bg-[#30D158] animate-ping" : "bg-[#0A84FF]"
              }`}
            ></span>
            <span className="font-mono text-[#F5F5F7]">
              {cameraActive ? "LIVE CAMERA STREAM" : "AI CAMERA SIMULATION"}
            </span>
          </div>

          {/* Click to Tag Hint */}
          <div className="apple-material-dark rounded-xl px-2.5 py-1 text-[11px] text-[#64D2FF] flex items-center gap-1.5">
            <Google_Icon name="crop_free" size={14} className="text-[#0A84FF]" />
            <span>คลิกที่กรอบตัวบุคคลบนจอเพื่อสลับเป้าหมาย Tagging</span>
          </div>

          {lastTaggedAlert && (
            <div className="bg-[#062614]/95 border border-[#30D158]/60 rounded-xl px-3 py-1.5 text-xs text-[#30D158] font-semibold flex items-center gap-1.5 shadow-lg">
              <Google_Icon name="my_location" size={14} className="text-[#30D158]" />
              <span>{lastTaggedAlert}</span>
            </div>
          )}

          {cameraError && (
            <div className="bg-[#2C1A04]/95 border border-[#FF9F0A]/50 rounded-xl px-3 py-1 text-[11px] text-[#FF9F0A]">
              {cameraError}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Display Controls */}
      <div className="px-5 py-3 bg-[#1C1C1E]/90 border-t border-white/[0.08] flex flex-wrap justify-between items-center gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
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
            onPointerDown={() => triggerCausalFeedback("tap")}
            onClick={() => setShowGhost(!showGhost)}
            className={`px-3 py-1.5 rounded-xl border text-xs apple-pressable ${
              showGhost
                ? "bg-[#0A84FF]/15 border-[#0A84FF]/45 text-[#0A84FF]"
                : "bg-[#2C2C2E]/70 border-white/[0.08] text-[#A1A1A6]"
            }`}
          >
            Ghost Guide: {showGhost ? "ON" : "OFF"}
          </button>
          <button
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
          onPointerDown={() => triggerCausalFeedback("tap")}
          onClick={() => {
            setHoldTimer(0);
            setHasTriggeredSuccess(false);
          }}
          className="text-xs text-[#A1A1A6] hover:text-[#F5F5F7] flex items-center gap-1 apple-pressable"
        >
          <Google_Icon name="refresh" size={13} /> รีเซ็ตตัวนับ Hold
        </button>
      </div>
    </div>
  );
};
