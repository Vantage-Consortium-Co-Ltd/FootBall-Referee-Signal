"use client";

import React, { useEffect, useRef } from "react";
import {
  GestureRule,
  Keypoint,
  PostureAngles,
} from "../../Data_Types/Referee_Types";
import {
  drawActiveArmHighlight,
  drawAngleArc,
  drawBones,
  drawGhostSkeleton,
  drawJoints,
  toCanvasCoords,
} from "./Canvas_Utils";

export interface SkeletonCanvasProps {
  keypoints?: Keypoint[];
  targetRule?: GestureRule;
  angles?: PostureAngles;
  width?: number;
  height?: number;
  showGhost?: boolean;
  showAngles?: boolean;
  mirror?: boolean;
  className?: string;
}

export const Skeleton_Canvas: React.FC<SkeletonCanvasProps> = ({
  keypoints = [],
  targetRule,
  angles,
  width = 640,
  height = 480,
  showGhost = true,
  showAngles = true,
  mirror = true,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear previous frame
    ctx.clearRect(0, 0, width, height);

    // 1. Draw Ghost Target Skeleton if targetRule is provided
    if (showGhost && targetRule) {
      drawGhostSkeleton(ctx, targetRule, width, height, mirror);
    }

    // 2. Draw Detected User Skeleton
    if (keypoints && keypoints.length >= 17) {
      drawBones(ctx, keypoints, width, height, mirror);
      drawJoints(ctx, keypoints, width, height, mirror);

      // 3. Draw Angle Arcs & Direction Vectors
      if (showAngles && angles) {
        // Right arm angles: Sho=6, Elb=8, Wri=10
        const rSho = keypoints[6];
        const rElb = keypoints[8];
        const rWri = keypoints[10];

        if (
          rSho &&
          rElb &&
          rWri &&
          rSho.confidence >= 0.4 &&
          rElb.confidence >= 0.4 &&
          rWri.confidence >= 0.4
        ) {
          const cSho = toCanvasCoords(rSho, width, height, mirror);
          const cElb = toCanvasCoords(rElb, width, height, mirror);
          const cWri = toCanvasCoords(rWri, width, height, mirror);

          // Elbow straightness arc
          drawAngleArc(
            ctx,
            cElb,
            cSho,
            cWri,
            angles.rElbowAngle,
            "R-Elbow",
            targetRule?.targetStraightnessDeg
          );

          // Highlight arrow if active arm is right or either
          if (
            targetRule?.activeArm === "right" ||
            targetRule?.activeArm === "either"
          ) {
            drawActiveArmHighlight(ctx, cSho, cWri);
          }
        }

        // Left arm angles: Sho=5, Elb=7, Wri=9
        const lSho = keypoints[5];
        const lElb = keypoints[7];
        const lWri = keypoints[9];

        if (
          lSho &&
          lElb &&
          lWri &&
          lSho.confidence >= 0.4 &&
          lElb.confidence >= 0.4 &&
          lWri.confidence >= 0.4
        ) {
          const cSho = toCanvasCoords(lSho, width, height, mirror);
          const cElb = toCanvasCoords(lElb, width, height, mirror);
          const cWri = toCanvasCoords(lWri, width, height, mirror);

          drawAngleArc(
            ctx,
            cElb,
            cSho,
            cWri,
            angles.lElbowAngle,
            "L-Elbow",
            targetRule?.targetStraightnessDeg
          );

          if (
            targetRule?.activeArm === "left" ||
            targetRule?.activeArm === "both"
          ) {
            drawActiveArmHighlight(ctx, cSho, cWri);
          }
        }
      }
    }

    ctx.restore();
  }, [keypoints, targetRule, angles, width, height, showGhost, showAngles, mirror]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${width}px`, height: `${height}px` }}
      className={`pointer-events-none ${className}`}
    />
  );
};
