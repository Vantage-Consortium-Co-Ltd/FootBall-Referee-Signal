"use client";

import React from "react";
import Link from "next/link";
import { GestureRule } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";
import { Signal_Anatomy_Svg } from "./Signal_Curriculum_Card";

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

  return (
    <aside
      className={`rounded-2xl border p-5 shadow-lg lg:sticky lg:top-20 flex flex-col gap-4 ${
        isLightMode
          ? "bg-white border-slate-200 text-slate-900"
          : "bg-slate-900 border-slate-800 text-slate-100"
      }`}
    >
      {/* Top Badge */}
      <div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold ${
            isLightMode
              ? "bg-sky-50 border-sky-200 text-sky-700"
              : "bg-blue-950/50 border-blue-500/40 text-blue-300"
          }`}
        >
          <Google_Icon name="menu_book" size={13} />
          <span>IFAB {shortLaw} · DEEP DIVE</span>
        </span>

        <h2 className="text-lg font-extrabold mt-2.5 leading-snug">
          ท่าที่ {rule.id + 1}: {rule.nameTh} ({rule.name.replace(/_/g, " ")})
        </h2>
        <p
          className={`text-xs mt-0.5 ${
            isLightMode ? "text-slate-500" : "text-slate-400"
          }`}
        >
          Official Instructional Guideline for Referees
        </p>
      </div>

      {/* Large Anatomical Posture Diagram */}
      <div
        className={`relative rounded-xl border p-4 flex items-center justify-center ${
          isLightMode
            ? "bg-slate-50 border-slate-200"
            : "bg-slate-950/70 border-slate-800"
        }`}
      >
        <span
          className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold inline-flex items-center gap-1 ${
            isLightMode
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
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
          isLightMode ? "text-slate-600" : "text-slate-300"
        }`}
      >
        {rule.descriptionTh}
      </p>

      {/* IFAB Biomechanical Criteria */}
      <div
        className={`space-y-2.5 pt-2 border-t ${
          isLightMode ? "border-slate-200" : "border-slate-800"
        }`}
      >
        <h3
          className={`text-xs font-bold uppercase tracking-wide ${
            isLightMode ? "text-cyan-800" : "text-cyan-400"
          }`}
        >
          เกณฑ์มาตรฐานตามกติกา (IFAB Criteria)
        </h3>

        <div className="space-y-2 text-xs">
          <div>
            <div className="font-semibold">มุมยกแขน (Shoulder Elevation)</div>
            <div className={`font-medium ${isLightMode ? "text-cyan-700" : "text-cyan-400"}`}>
              เป้าหมาย {rule.targetElevationDeg}° (ขั้นต่ำ {rule.minElevationDeg}°+)
            </div>
          </div>

          <div>
            <div className="font-semibold">ความเหยียดศอก (Elbow Straightness)</div>
            <div className={`font-medium ${isLightMode ? "text-cyan-700" : "text-cyan-400"}`}>
              เป้าหมาย {rule.targetStraightnessDeg}° (ไม่ต่ำกว่า {rule.minStraightnessDeg}°)
            </div>
          </div>

          <div>
            <div className="font-semibold">แขนที่ใช้ (Active Arm)</div>
            <div className={`font-medium ${isLightMode ? "text-cyan-700" : "text-cyan-400"}`}>
              {ARM_LABELS_TH[rule.activeArm]}
            </div>
          </div>

          <div>
            <div className="font-semibold">ระยะเวลาค้าง (Hold Duration)</div>
            <div className={`font-medium ${isLightMode ? "text-cyan-700" : "text-cyan-400"}`}>
              ค้างท่าอย่างน้อย {rule.minHoldSeconds.toFixed(1)} วินาทีจนผู้เล่นเห็นชัดเจน
            </div>
          </div>
        </div>
      </div>

      {/* Common Mistakes Callout */}
      <div
        className={`rounded-xl border p-3.5 ${
          isLightMode
            ? "bg-rose-50 border-rose-200 text-rose-800"
            : "bg-rose-950/30 border-rose-500/40 text-rose-200"
        }`}
      >
        <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
          <Google_Icon
            name="warning"
            size={15}
            className={isLightMode ? "text-rose-600" : "text-rose-400"}
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
          className={`rounded-xl border p-3.5 ${
            isLightMode
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-amber-950/25 border-amber-500/30 text-amber-200"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
            <Google_Icon
              name="lightbulb"
              size={15}
              className={isLightMode ? "text-amber-600" : "text-amber-400"}
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
        className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md ${
          isLightMode
            ? "bg-cyan-700 hover:bg-cyan-800 text-white"
            : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
        }`}
      >
        <Google_Icon name="videocam" size={16} />
        <span>เริ่มฝึกท่านี้ใน Live Studio</span>
      </Link>
    </aside>
  );
};
