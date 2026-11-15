"use client";

import React from "react";
import Link from "next/link";
import { WeaknessDiagnosticItem } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";

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
      className={`h-full rounded-2xl border p-5 shadow-xs flex flex-col justify-between gap-4 ${
        isLightMode
          ? "bg-white border-slate-200 text-slate-900"
          : "bg-slate-900 border-slate-800 text-slate-100"
      }`}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Google_Icon
            name="lightbulb"
            size={18}
            className={isLightMode ? "text-amber-600" : "text-amber-400"}
          />
          <h2 className="text-sm font-bold">
            วินิจฉัยจุดอ่อนรายบุคคล (AI Action Plan)
          </h2>
        </div>

        {/* Weaknesses List */}
        <div className="space-y-2.5">
          {weaknesses.map((item) => {
            const isError = item.severity === "error";
            const boxStyle = isLightMode
              ? isError
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
              : isError
              ? "bg-rose-950/35 border-rose-500/40 text-rose-200"
              : "bg-amber-950/35 border-amber-500/40 text-amber-200";

            const iconColor = isError
              ? isLightMode
                ? "text-rose-600"
                : "text-rose-400"
              : isLightMode
              ? "text-amber-600"
              : "text-amber-400";

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-3.5 flex items-start justify-between gap-3 ${boxStyle}`}
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
                        isLightMode ? "text-slate-600" : "text-slate-300"
                      }`}
                    >
                      {item.detailTh}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/drills?signalId=${item.targetGestureId}`}
                  className={`shrink-0 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                    isLightMode
                      ? "bg-white border-slate-200 hover:border-cyan-600 text-cyan-800"
                      : "bg-slate-900 border-slate-700 hover:border-cyan-400 text-cyan-300"
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
        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm ${
          isLightMode
            ? "bg-cyan-700 hover:bg-cyan-800 text-white"
            : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
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
