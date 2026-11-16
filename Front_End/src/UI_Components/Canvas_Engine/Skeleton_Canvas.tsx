"use client";

import React, { useEffect, useRef } from "react";
import {
  GestureRule,
  Keypoint,
  PostureAngles,
  TaggedPerson,
} from "../../Data_Types/Referee_Types";
import {
  drawActiveArmHighlight,
  drawAngleArc,
  drawBones,
  drawJoints,
  drawPersonBoundingBox,
  toCanvasCoords,
} from "./Canvas_Utils";

export interface SkeletonCanvasProps {
  keypoints?: Keypoint[];
  targetRule?: GestureRule;
  angles?: PostureAngles;
  persons?: TaggedPerson[];
  width?: number;
  height?: number;
  showAngles?: boolean;
  showBBoxes?: boolean;
  mirror?: boolean;
  className?: string;
  onTagPerson?: (personId: string) => void;
}

export const Skeleton_Canvas: React.FC<SkeletonCanvasProps> = ({
  keypoints = [],
  targetRule,
  angles,
  persons = [],
  width = 640,
  height = 480,
  showAngles = true,
  showBBoxes = true,
  mirror = true,
  className = "",
  onTagPerson,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Handle click on canvas to select/tag a detected person
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onTagPerson || persons.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * width;
    const clickY = ((e.clientY - rect.top) / rect.height) * height;

    // Hit-test persons bounding boxes
    for (const p of persons) {
      const [normX, normY, normW, normH] = p.bbox;
      const rawX = mirror ? 1.0 - normX - normW : normX;
      const px = rawX * width;
      const py = normY * height;
      const pw = normW * width;
      const ph = normH * height;

      if (
        clickX >= px &&
        clickX <= px + pw &&
        clickY >= py &&
        clickY <= py + ph
      ) {
        onTagPerson(p.id);
        break;
      }
    }
  };

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

    // 1. Draw Person Bounding Boxes & Tagging Labels
    if (showBBoxes && persons && persons.length > 0) {
      persons.forEach((person) => {
        drawPersonBoundingBox(ctx, person, width, height, mirror);
      });
    }

    // Determine which keypoints to render (use active tagged person's keypoints if available)
    const activePerson = persons.find((p) => p.isTagged);
    const activeKps = activePerson ? activePerson.keypoints : keypoints;
    const activeAngles = activePerson ? activePerson.angles : angles;

    // 3. Draw Detected User Skeleton for the tagged person
    if (activeKps && activeKps.length >= 17) {
      drawBones(ctx, activeKps, width, height, mirror);
      drawJoints(ctx, activeKps, width, height, mirror);

      // 4. Draw Angle Arcs & Direction Vectors
      if (showAngles && activeAngles) {
        // Right arm angles: Sho=6, Elb=8, Wri=10
        const rSho = activeKps[6];
        const rElb = activeKps[8];
        const rWri = activeKps[10];

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

          drawAngleArc(
            ctx,
            cElb,
            cSho,
            cWri,
            activeAngles.rElbowAngle,
            "R-Elbow",
            targetRule?.targetStraightnessDeg
          );

          if (
            targetRule?.activeArm === "right" ||
            targetRule?.activeArm === "either"
          ) {
            drawActiveArmHighlight(ctx, cSho, cWri);
          }
        }

        // Left arm angles: Sho=5, Elb=7, Wri=9
        const lSho = activeKps[5];
        const lElb = activeKps[7];
        const lWri = activeKps[9];

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
            activeAngles.lElbowAngle,
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
  }, [
    keypoints,
    persons,
    targetRule,
    angles,
    width,
    height,
    showAngles,
    showBBoxes,
    mirror,
  ]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${width}px`, height: `${height}px` }}
      onClick={handleCanvasClick}
      className={`cursor-crosshair ${className}`}
    />
  );
};
