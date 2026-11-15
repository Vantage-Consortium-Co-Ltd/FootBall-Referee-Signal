"use client";

import React from "react";
import Link from "next/link";
import { WeaknessDiagnosticItem } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";
import { triggerCausalFeedback } from "../../Core_Lib/Apple_Spring_Engine";

export interface WeaknessDiagnosticsPanelProps {
  weaknesses: WeaknessDiagnosticItem[];
  isLightMode: boolean;
}

export const Weakness_Diagnostics_Panel: React.FC<WeaknessDiagnosticsPanelProps> = ({
  weaknesses,
  isLightMode,
}) => {
  const primaryWeaknessTargetId =
    weaknesses.length > 0 ? weaknesses[0].targetGestureId : 4;

  return (
    <div
      className={`h-full rounded-[22px] border p-5 shadow-xs flex flex-col justify-between gap-4 ${
        isLightMode
          ? "apple-material-light border-black/[0.06] text-[#1D1D1F]"
          : "apple-material-dark border-white/[0.08] text-[#F5F5F7]"
      }`}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Google_Icon
            name="lightbulb"
            size={18}
            className={isLightMode ? "text-[#FF9500]" : "text-[#FF9F0A]"}
          />
          <h2 className="text-sm font-bold tracking-tight">
            วินิจฉัยจุดอ่อนรายบุคคล (AI Action Plan)
          </h2>
        </div>

        {/* Weaknesses List */}
        <div className="space-y-2.5">
          {weaknesses.map((item) => {
            const isError = item.severity === "error";
            const boxStyle = isLightMode
              ? isError
                ? "bg-[#FF3B30]/[0.08] border-[#FF3B30]/20 text-[#9B1C1C]"
                : "bg-[#FF9500]/10 border-[#FF9500]/25 text-[#8A4B00]"
              : isError
              ? "bg-[#FF453A]/15 border-[#FF453A]/30 text-[#FFD3D0]"
              : "bg-[#FF9F0A]/15 border-[#FF9F0A]/30 text-[#FFE4B5]";

            const iconColor = isError
              ? isLightMode
                ? "text-[#FF3B30]"
                : "text-[#FF453A]"
              : isLightMode
              ? "text-[#FF9500]"
              : "text-[#FF9F0A]";

            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-3.5 flex items-start justify-between gap-3 ${boxStyle}`}
              >
                <div className="flex items-start gap-2.5">
                  <Google_Icon
                    name={isError ? "warning" : "schedule"}
                    size={18}
                    className={`${iconColor} shrink-0 mt-0.5`}
                  />
                  <div>
                    <div className="text-xs font-bold leading-snug">
                      {item.titleTh}
                    </div>
                    <p
                      className={`text-[11px] mt-1 leading-relaxed ${
                        isLightMode ? "text-[#3A3A3C]" : "text-[#D1D1D6]"
                      }`}
                    >
                      {item.detailTh}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/drills?signalId=${item.targetGestureId}`}
                  onClick={() => triggerCausalFeedback("tap")}
                  className={`shrink-0 px-2.5 py-1 rounded-xl border text-[11px] font-semibold transition-colors duration-150 apple-pressable ${
                    isLightMode
                      ? "bg-white border-black/[0.08] hover:border-[#007AFF] text-[#007AFF]"
                      : "bg-[#2C2C2E] border-white/[0.1] hover:border-[#0A84FF] text-[#0A84FF]"
                  }`}
                >
                  แก้ไข
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Action Plan CTA */}
      <Link
        href={`/drills?signalId=${primaryWeaknessTargetId}`}
        onClick={() => triggerCausalFeedback("tap")}
        className={`w-full py-2.5 px-4 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors duration-150 shadow-sm apple-pressable ${
          isLightMode
            ? "bg-[#007AFF] hover:bg-[#0066D6] text-white"
            : "bg-[#0A84FF] hover:bg-[#3395FF] text-white"
        }`}
      >
        <Google_Icon name="videocam" size={16} />
        <span>
          เข้าห้องฝึกซ้อมเพื่อแก้ไขจุดอ่อน {weaknesses.length} ข้อนี้
        </span>
      </Link>
    </div>
  );
};
