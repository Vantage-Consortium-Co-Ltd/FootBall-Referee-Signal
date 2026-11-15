"use client";

import React from "react";
import { TraineeEvaluationReport } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";

export interface CompetencyRadarChartProps {
  competency: TraineeEvaluationReport["categoryCompetency"];
  isLightMode: boolean;
}

const IFAB_STANDARD_TARGET = 80;

export const Competency_Radar_Chart: React.FC<CompetencyRadarChartProps> = ({
  competency,
  isLightMode,
}) => {
  const axes = [
    {
      key: "restarts" as const,
      labelShort: "ลูกตั้งเตะ",
      labelFull: "ลูกตั้งเตะ (Restarts)",
      score: competency.restarts,
      angleRad: -Math.PI / 2, // Top
      barColor: "bg-cyan-600",
    },
    {
      key: "fouls" as const,
      labelShort: "ฟาวล์",
      labelFull: "การทำฟาวล์ (Fouls)",
      score: competency.fouls,
      angleRad: 0, // Right
      barColor: "bg-emerald-500",
    },
    {
      key: "match_control" as const,
      labelShort: "ควบคุมเกม",
      labelFull: "การควบคุมเกม (Game Control)",
      score: competency.match_control,
      angleRad: Math.PI / 2, // Bottom
      barColor: "bg-amber-500",
    },
    {
      key: "offside" as const,
      labelShort: "ล้ำหน้า",
      labelFull: "การล้ำหน้า (Offside)",
      score: competency.offside,
      angleRad: Math.PI, // Left
      barColor: "bg-blue-600",
    },
  ];

  const cx = 120;
  const cy = 105;
  const maxR = 72;

  const polygonPoints = (values: number[]) =>
    axes
      .map((axis, idx) => {
        const r = (values[idx] / 100) * maxR;
        const x = cx + Math.cos(axis.angleRad) * r;
        const y = cy + Math.sin(axis.angleRad) * r;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  const ringLevels = [25, 50, 75, 100];
  const standardPolygon = polygonPoints(axes.map(() => IFAB_STANDARD_TARGET));
  const traineePolygon = polygonPoints(axes.map((a) => a.score));

  return (
    <div
      className={`h-full rounded-2xl border p-5 shadow-xs flex flex-col justify-between gap-4 ${
        isLightMode
          ? "bg-white border-slate-200 text-slate-900"
          : "bg-slate-900 border-slate-800 text-slate-100"
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Google_Icon
            name="radar"
            size={18}
            className={isLightMode ? "text-cyan-700" : "text-cyan-400"}
          />
          <h2 className="text-sm font-bold">
            สมรรถนะ 4 มิติ (Competency Radar)
          </h2>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${
            isLightMode
              ? "bg-amber-50 border-amber-200 text-amber-700"
              : "bg-amber-950/50 border-amber-500/40 text-amber-300"
          }`}
        >
          เกณฑ์ IFAB {IFAB_STANDARD_TARGET}%
        </span>
      </div>

      {/* Radar SVG + Category Bars */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* SVG Radar */}
        <div className="md:col-span-5 flex flex-col items-center">
          <svg
            viewBox="0 0 240 215"
            className="w-full max-w-[240px] h-auto select-none"
            role="img"
            aria-label="กราฟเรดาร์สมรรถนะ 4 มิติ"
          >
            {/* Concentric Grid Diamonds */}
            {ringLevels.map((lvl) => (
              <polygon
                key={lvl}
                points={polygonPoints([lvl, lvl, lvl, lvl])}
                fill="none"
                stroke={isLightMode ? "#E2E8F0" : "#334155"}
                strokeWidth="1"
              />
            ))}

            {/* Axis Spokes */}
            {axes.map((axis) => (
              <line
                key={axis.key}
                x1={cx}
                y1={cy}
                x2={cx + Math.cos(axis.angleRad) * maxR}
                y2={cy + Math.sin(axis.angleRad) * maxR}
                stroke={isLightMode ? "#CBD5E1" : "#334155"}
                strokeWidth="1"
              />
            ))}

            {/* IFAB 80% Benchmark Dashed Polygon */}
            <polygon
              points={standardPolygon}
              fill="none"
              stroke="#D97706"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />

            {/* Trainee Competency Filled Polygon */}
            <polygon
              points={traineePolygon}
              fill={isLightMode ? "#0E749033" : "#22D3EE33"}
              stroke={isLightMode ? "#0E7490" : "#22D3EE"}
              strokeWidth="2.5"
            />

            {/* Vertex Dots & Axis Labels */}
            {axes.map((axis) => {
              const r = (axis.score / 100) * maxR;
              const vx = cx + Math.cos(axis.angleRad) * r;
              const vy = cy + Math.sin(axis.angleRad) * r;
              const lx = cx + Math.cos(axis.angleRad) * (maxR + 18);
              const ly = cy + Math.sin(axis.angleRad) * (maxR + 14);
              const anchor =
                axis.angleRad === 0
                  ? "start"
                  : axis.angleRad === Math.PI
                  ? "end"
                  : "middle";

              return (
                <g key={axis.key}>
                  <circle
                    cx={vx}
                    cy={vy}
                    r="3.8"
                    fill={isLightMode ? "#0E7490" : "#22D3EE"}
                    stroke={isLightMode ? "#FFFFFF" : "#0F172A"}
                    strokeWidth="1.5"
                  />
                  <text
                    x={lx}
                    y={ly + 3}
                    textAnchor={anchor}
                    fill={isLightMode ? "#475467" : "#CBD5E1"}
                    fontSize="10.5"
                    fontWeight="600"
                  >
                    {axis.labelShort}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Category Progress Bars */}
        <div className="md:col-span-7 space-y-3">
          {axes.map((axis) => (
            <div key={axis.key} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${axis.barColor}`} />
                  <span>{axis.labelFull}</span>
                </span>
                <span
                  className={`font-mono font-bold ${
                    axis.score >= IFAB_STANDARD_TARGET
                      ? isLightMode
                        ? "text-cyan-700"
                        : "text-cyan-400"
                      : isLightMode
                      ? "text-amber-700"
                      : "text-amber-400"
                  }`}
                >
                  {axis.score}%
                </span>
              </div>
              <div
                className={`w-full h-2 rounded-full overflow-hidden ${
                  isLightMode ? "bg-slate-100" : "bg-slate-800"
                }`}
              >
                <div
                  className={`h-full rounded-full ${axis.barColor} transition-all duration-300`}
                  style={{ width: `${Math.min(100, axis.score)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
