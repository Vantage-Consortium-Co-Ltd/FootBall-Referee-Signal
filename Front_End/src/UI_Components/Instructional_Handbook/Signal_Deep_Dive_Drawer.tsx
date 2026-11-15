"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { GestureRule } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";
import { Signal_Anatomy_Svg } from "./Signal_Curriculum_Card";
import {
  createVelocityTracker,
  rubberband,
  triggerCausalFeedback,
  useAppleSpring,
} from "../../Core_Lib/Apple_Spring_Engine";

export interface SignalDeepDiveDrawerProps {
  rule: GestureRule;
  isLightMode: boolean;
}

const ARM_LABELS_TH: Record<GestureRule["activeArm"], string> = {
  right: "แขนขวาเป็นหลัก (Right Arm)",
  left: "แขนซ้ายเป็นหลัก (Left Arm)",
  either: "ข้างใดข้างหนึ่ง (แนะนำแขนขวา)",
  both: "ทั้งสองแขนพร้อมกัน (Both Arms)",
  none: "ท่าเตรียมพร้อม (Arms Relaxed)",
};

export const Signal_Deep_Dive_Drawer: React.FC<SignalDeepDiveDrawerProps> = ({
  rule,
  isLightMode,
}) => {
  const shortLaw = rule.ifabLaw.split(" - ")[0].toUpperCase();
  const commonMistakes =
    rule.commonMistakes && rule.commonMistakes.length > 0
      ? rule.commonMistakes
      : [
          `ยกแขนต่ำกว่าเกณฑ์ขั้นต่ำ (${rule.minElevationDeg}°) ทำให้ผู้เล่นมองไม่เห็นชัด`,
          `ข้อศอกงอต่ำกว่า ${rule.minStraightnessDeg}° หรือลดแขนลงก่อนครบ ${rule.minHoldSeconds} วินาที`,
        ];

  const [dragTargetY, setDragTargetY] = useState(0);
  const dragStartYRef = useRef<number | null>(null);
  const dragStartOffsetRef = useRef(0);
  const velocityTrackerRef = useRef(createVelocityTracker());
  const drawerSpring = useAppleSpring(dragTargetY, {
    dampingRatio: 0.8,
    response: 0.32,
  });

  const handleGrabDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartYRef.current = e.clientY;
    dragStartOffsetRef.current = drawerSpring.value;
    velocityTrackerRef.current.reset();
    velocityTrackerRef.current.push(0);
    drawerSpring.setImmediate(drawerSpring.value);
    triggerCausalFeedback("tap");
  };

  const handleGrabMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return;
    const rawDelta = dragStartOffsetRef.current + (e.clientY - dragStartYRef.current);
    const dampedY =
      rawDelta >= 0
        ? rubberband(rawDelta, 160, 0.55)
        : -rubberband(-rawDelta, 160, 0.55);
    velocityTrackerRef.current.push(dampedY);
    drawerSpring.setImmediate(dampedY);
    setDragTargetY(dampedY);
  };

  const handleGrabEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const vy = velocityTrackerRef.current.getVelocity();
    dragStartYRef.current = null;
    setDragTargetY(0);
    drawerSpring.injectVelocity(vy * 0.35);
    triggerCausalFeedback("snap");
  };

  return (
    <aside
      style={{ transform: `translate3d(0, ${drawerSpring.value}px, 0)` }}
      className={`rounded-[22px] border p-5 shadow-lg lg:sticky lg:top-20 flex flex-col gap-4 ${
        isLightMode
          ? "apple-material-light border-black/[0.06] text-[#1D1D1F]"
          : "apple-material-dark border-white/[0.1] text-[#F5F5F7]"
      }`}
    >
      {/* Interactive Rubber-Banding Grab Handle */}
      <div
        onPointerDown={handleGrabDown}
        onPointerMove={handleGrabMove}
        onPointerUp={handleGrabEnd}
        onPointerCancel={handleGrabEnd}
        className="touch-none cursor-grab active:cursor-grabbing py-1.5 -mt-2 -mb-1 flex items-center justify-center"
        title="ลากเพื่อทดสอบความหนืดและสปริงแบบ iOS Sheet"
      >
        <span
          className={`w-10 h-1 rounded-full ${
            isLightMode ? "bg-black/15" : "bg-white/25"
          }`}
        />
      </div>

      {/* Top Badge */}
      <div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold ${
            isLightMode
              ? "bg-[#007AFF]/10 border-[#007AFF]/20 text-[#007AFF]"
              : "bg-[#0A84FF]/15 border-[#0A84FF]/30 text-[#0A84FF]"
          }`}
        >
          <Google_Icon name="menu_book" size={13} />
          <span>IFAB {shortLaw} · DEEP DIVE</span>
        </span>

        <h2 className="apple-title text-lg font-bold mt-2.5 leading-snug tracking-tight">
          ท่าที่ {rule.id + 1}: {rule.nameTh} ({rule.name.replace(/_/g, " ")})
        </h2>
        <p
          className={`text-xs mt-0.5 ${
            isLightMode ? "text-[#6E6E73]" : "text-[#A1A1A6]"
          }`}
        >
          Official Instructional Guideline for Referees
        </p>
      </div>

      {/* Large Anatomical Posture Diagram */}
      <div
        className={`relative rounded-2xl border p-4 flex items-center justify-center ${
          isLightMode
            ? "bg-[#F2F2F7] border-black/[0.05]"
            : "bg-[#141416] border-white/[0.06]"
        }`}
      >
        <span
          className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold inline-flex items-center gap-1 apple-tabular ${
            isLightMode
              ? "bg-[#34C759]/12 border-[#34C759]/25 text-[#1E7E34]"
              : "bg-[#30D158]/15 border-[#30D158]/30 text-[#30D158]"
          }`}
        >
          <Google_Icon name="straighten" size={12} />
          <span>
            ช่วงที่ยอมรับ {rule.minElevationDeg}° – {rule.targetElevationDeg}°
          </span>
        </span>

        <Signal_Anatomy_Svg
          rule={rule}
          isLightMode={isLightMode}
          showGuide={true}
          className="w-full h-40 mt-2"
        />
      </div>

      {/* Description */}
      <p
        className={`text-xs leading-relaxed ${
          isLightMode ? "text-[#3A3A3C]" : "text-[#D1D1D6]"
        }`}
      >
        {rule.descriptionTh}
      </p>

      {/* IFAB Biomechanical Criteria */}
      <div
        className={`space-y-2.5 pt-2.5 border-t ${
          isLightMode ? "border-black/[0.06]" : "border-white/[0.08]"
        }`}
      >
        <h3
          className={`text-xs font-bold uppercase tracking-wide ${
            isLightMode ? "text-[#007AFF]" : "text-[#0A84FF]"
          }`}
        >
          เกณฑ์มาตรฐานตามกติกา (IFAB Criteria)
        </h3>

        <div className="space-y-2 text-xs apple-tabular">
          <div>
            <div className="font-semibold">มุมยกแขน (Shoulder Elevation)</div>
            <div className={`font-medium ${isLightMode ? "text-[#007AFF]" : "text-[#0A84FF]"}`}>
              เป้าหมาย {rule.targetElevationDeg}° (ขั้นต่ำ {rule.minElevationDeg}°+)
            </div>
          </div>

          <div>
            <div className="font-semibold">ความเหยียดศอก (Elbow Straightness)</div>
            <div className={`font-medium ${isLightMode ? "text-[#007AFF]" : "text-[#0A84FF]"}`}>
              เป้าหมาย {rule.targetStraightnessDeg}° (ไม่ต่ำกว่า {rule.minStraightnessDeg}°)
            </div>
          </div>

          <div>
            <div className="font-semibold">แขนที่ใช้ (Active Arm)</div>
            <div className={`font-medium ${isLightMode ? "text-[#007AFF]" : "text-[#0A84FF]"}`}>
              {ARM_LABELS_TH[rule.activeArm]}
            </div>
          </div>

          <div>
            <div className="font-semibold">ระยะเวลาค้าง (Hold Duration)</div>
            <div className={`font-medium ${isLightMode ? "text-[#007AFF]" : "text-[#0A84FF]"}`}>
              ค้างท่าอย่างน้อย {rule.minHoldSeconds.toFixed(1)} วินาทีจนผู้เล่นเห็นชัดเจน
            </div>
          </div>
        </div>
      </div>

      {/* Common Mistakes Callout */}
      <div
        className={`rounded-2xl border p-3.5 ${
          isLightMode
            ? "bg-[#FF3B30]/[0.08] border-[#FF3B30]/20 text-[#9B1C1C]"
            : "bg-[#FF453A]/15 border-[#FF453A]/30 text-[#FFD3D0]"
        }`}
      >
        <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
          <Google_Icon
            name="warning"
            size={15}
            className={isLightMode ? "text-[#FF3B30]" : "text-[#FF453A]"}
          />
          <span>ข้อผิดพลาดที่พบบ่อย (Common Mistakes)</span>
        </div>
        <ul className="list-disc pl-4 space-y-0.5 text-[11px] leading-relaxed">
          {commonMistakes.map((errText, idx) => (
            <li key={idx}>{errText}</li>
          ))}
        </ul>
      </div>

      {/* Coaching Tips */}
      {rule.coachingTips && rule.coachingTips.length > 0 && (
        <div
          className={`rounded-2xl border p-3.5 ${
            isLightMode
              ? "bg-[#FF9500]/10 border-[#FF9500]/25 text-[#8A4B00]"
              : "bg-[#FF9F0A]/15 border-[#FF9F0A]/30 text-[#FFE4B5]"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
            <Google_Icon
              name="lightbulb"
              size={15}
              className={isLightMode ? "text-[#FF9500]" : "text-[#FF9F0A]"}
            />
            <span>เคล็ดลับจากวิทยากรผู้ตัดสิน</span>
          </div>
          <ul className="list-disc pl-4 space-y-0.5 text-[11px] leading-relaxed">
            {rule.coachingTips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary Practice CTA */}
      <Link
        href={`/drills?signalId=${rule.id}`}
        onClick={() => triggerCausalFeedback("tap")}
        className={`w-full py-3 px-4 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors duration-150 shadow-md apple-pressable ${
          isLightMode
            ? "bg-[#007AFF] hover:bg-[#0066D6] text-white"
            : "bg-[#0A84FF] hover:bg-[#3395FF] text-white"
        }`}
      >
        <Google_Icon name="videocam" size={16} />
        <span>เริ่มฝึกท่านี้ใน Live Studio</span>
      </Link>
    </aside>
  );
};
