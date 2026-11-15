"use client";

import React, { useEffect, useState } from "react";
import { TraineeEvaluationReport } from "../../Data_Types/Referee_Types";
import { Google_Icon } from "../Common/Google_Icon";
import { useAppleSpring } from "../../Core_Lib/Apple_Spring_Engine";

export interface CompetencyRadarChartProps {
  competency: TraineeEvaluationReport["categoryCompetency"];
  isLightMode: boolean;
}

const IFAB_STANDARD_TARGET = 80;

export const Competency_Radar_Chart: React.FC<CompetencyRadarChartProps> = ({
  competency,
  isLightMode,
}) => {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    setRevealed(true);
  }, []);

  const revealSpring = useAppleSpring(revealed ? 1 : 0, {
    dampingRatio: 1.0,
    response: 0.48,
  });

  const axes = [
    {
      key: "restarts" as const,
      labelShort: "ลูกตั้งเตะ",
      labelFull: "ลูกตั้งเตะ (Restarts)",
      score: competency.restarts,
      angleRad: -Math.PI / 2, // Top
      barColor: isLightMode ? "bg-[#007AFF]" : "bg-[#0A84FF]",
    },
    {
      key: "fouls" as const,
      labelShort: "ฟาวล์",
      labelFull: "การทำฟาวล์ (Fouls)",
      score: competency.fouls,
      angleRad: 0, // Right
      barColor: isLightMode ? "bg-[#34C759]" : "bg-[#30D158]",
    },
    {
      key: "match_control" as const,
      labelShort: "ควบคุมเกม",
      labelFull: "การควบคุมเกม (Game Control)",
      score: competency.match_control,
      angleRad: Math.PI / 2, // Bottom
      barColor: isLightMode ? "bg-[#FF9500]" : "bg-[#FF9F0A]",
    },
    {
      key: "offside" as const,
      labelShort: "ล้ำหน้า",
      labelFull: "การล้ำหน้า (Offside)",
      score: competency.offside,
      angleRad: Math.PI, // Left
      barColor: isLightMode ? "bg-[#5856D6]" : "bg-[#5E5CE6]",
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
  const animatedScores = axes.map((a) => a.score * revealSpring.value);
  const traineePolygon = polygonPoints(animatedScores);

  return (
    <div
      className={`h-full rounded-[22px] border p-5 shadow-xs flex flex-col justify-between gap-4 ${
        isLightMode
          ? "apple-material-light border-black/[0.06] text-[#1D1D1F]"
          : "apple-material-dark border-white/[0.08] text-[#F5F5F7]"
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Google_Icon
            name="radar"
            size={18}
            className={isLightMode ? "text-[#007AFF]" : "text-[#0A84FF]"}
          />
          <h2 className="text-sm font-bold tracking-tight">
            สมรรถนะ 4 มิติ (Competency Radar)
          </h2>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold apple-tabular ${
            isLightMode
              ? "bg-[#FF9500]/12 border-[#FF9500]/25 text-[#B25000]"
              : "bg-[#FF9F0A]/15 border-[#FF9F0A]/30 text-[#FF9F0A]"
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
                stroke={isLightMode ? "#E5E5EA" : "#2C2C2E"}
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
                stroke={isLightMode ? "#D1D1D6" : "#3A3A3C"}
                strokeWidth="1"
              />
            ))}

            {/* IFAB 80% Benchmark Dashed Polygon */}
            <polygon
              points={standardPolygon}
              fill="none"
              stroke={isLightMode ? "#FF9500" : "#FF9F0A"}
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />

            {/* Trainee Competency Filled Polygon */}
            <polygon
              points={traineePolygon}
              fill={isLightMode ? "#007AFF33" : "#0A84FF33"}
              stroke={isLightMode ? "#007AFF" : "#0A84FF"}
              strokeWidth="2.5"
            />

            {/* Vertex Dots & Axis Labels */}
            {axes.map((axis, idx) => {
              const r = (animatedScores[idx] / 100) * maxR;
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
                    fill={isLightMode ? "#007AFF" : "#0A84FF"}
                    stroke={isLightMode ? "#FFFFFF" : "#1C1C1E"}
                    strokeWidth="1.5"
                  />
                  <text
                    x={lx}
                    y={ly + 3}
                    textAnchor={anchor}
                    fill={isLightMode ? "#6E6E73" : "#A1A1A6"}
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
                  className={`font-mono font-bold apple-tabular ${
                    axis.score >= IFAB_STANDARD_TARGET
                      ? isLightMode
                        ? "text-[#007AFF]"
                        : "text-[#0A84FF]"
                      : isLightMode
                      ? "text-[#B25000]"
                      : "text-[#FF9F0A]"
                  }`}
                >
                  {axis.score}%
                </span>
              </div>
              <div
                className={`w-full h-2 rounded-full overflow-hidden ${
                  isLightMode ? "bg-[#E5E5EA]" : "bg-[#2C2C2E]"
                }`}
              >
                <div
                  className={`h-full rounded-full ${axis.barColor}`}
                  style={{ width: `${Math.min(100, axis.score * revealSpring.value)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
