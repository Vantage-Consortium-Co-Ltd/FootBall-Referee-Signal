import {
  COCO_SKELETON_PAIRS,
  GestureRule,
  Keypoint,
  PostureAngles,
  TaggedPerson,
} from "../../Data_Types/Referee_Types";
import { getReferencePostureForRule } from "../../Core_Lib/Ifab_Rules_Catalog";

export interface DrawOptions {
  showGhost?: boolean;
  showAngles?: boolean;
  mirror?: boolean;
  activeArmHighlight?: boolean;
}

/**
 * Returns color hex according to keypoint confidence
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "#10B981"; // Emerald green
  if (confidence >= 0.5) return "#F59E0B"; // Amber yellow
  return "#EF4444"; // Red
}

/**
 * Transforms normalized coordinates (0..1) to canvas pixel space
 */
export function toCanvasCoords(
  kp: Keypoint,
  width: number,
  height: number,
  mirror: boolean = false
): { x: number; y: number } {
  const normX = mirror ? 1.0 - kp.x : kp.x;
  return {
    x: normX * width,
    y: kp.y * height,
  };
}

/**
 * Draws COCO-17 connecting bones with confidence gradients
 */
export function drawBones(
  ctx: CanvasRenderingContext2D,
  keypoints: Keypoint[],
  width: number,
  height: number,
  mirror: boolean = false
): void {
  ctx.save();
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";

  for (const [idx1, idx2] of COCO_SKELETON_PAIRS) {
    const kp1 = keypoints[idx1];
    const kp2 = keypoints[idx2];

    if (!kp1 || !kp2 || kp1.confidence < 0.25 || kp2.confidence < 0.25) {
      continue;
    }

    const p1 = toCanvasCoords(kp1, width, height, mirror);
    const p2 = toCanvasCoords(kp2, width, height, mirror);

    // Create linear gradient along bone
    const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
    grad.addColorStop(0, getConfidenceColor(kp1.confidence));
    grad.addColorStop(1, getConfidenceColor(kp2.confidence));

    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws joint circles with glow effect
 */
export function drawJoints(
  ctx: CanvasRenderingContext2D,
  keypoints: Keypoint[],
  width: number,
  height: number,
  mirror: boolean = false
): void {
  ctx.save();

  keypoints.forEach((kp, idx) => {
    if (kp.confidence < 0.25) return;

    const p = toCanvasCoords(kp, width, height, mirror);
    const color = getConfidenceColor(kp.confidence);

    // Outer glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    // Outer circle
    ctx.fillStyle = color;
    ctx.beginPath();
    const radius = idx === 0 ? 5 : 4.5; // Slightly larger for nose/head
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright center dot
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

/**
 * Draws Ghost Target Guideline Skeleton (ideal posture)
 */
export function drawGhostSkeleton(
  ctx: CanvasRenderingContext2D,
  targetRule: GestureRule,
  width: number,
  height: number,
  mirror: boolean = false
): void {
  const { keypoints: ghostKps } = getReferencePostureForRule(targetRule.id);

  ctx.save();
  ctx.lineWidth = 4;
  ctx.setLineDash([6, 6]); // Dashed line for ghost guide
  ctx.strokeStyle = "rgba(6, 182, 212, 0.45)"; // Cyan glow
  ctx.fillStyle = "rgba(6, 182, 212, 0.6)";

  // Bones
  for (const [idx1, idx2] of COCO_SKELETON_PAIRS) {
    const p1 = toCanvasCoords(ghostKps[idx1], width, height, mirror);
    const p2 = toCanvasCoords(ghostKps[idx2], width, height, mirror);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // Joints
  ctx.setLineDash([]);
  ghostKps.forEach((kp) => {
    const p = toCanvasCoords(kp, width, height, mirror);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Ghost label banner at top
  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = "rgba(6, 182, 212, 0.9)";
  ctx.shadowColor = "#000000";
  ctx.shadowBlur = 4;
  ctx.fillText(`🎯 เป้าหมาย IFAB: ${targetRule.nameTh}`, 16, 26);

  ctx.restore();
}

/**
 * Draws visual angle arc and degrees badge at a joint
 */
export function drawAngleArc(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  angleDeg: number,
  label: string,
  targetDeg?: number
): void {
  ctx.save();

  const radius = 24;
  const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
  const endAngle = Math.atan2(p2.y - center.y, p2.x - center.x);

  const isGood = targetDeg ? Math.abs(angleDeg - targetDeg) <= 15 : true;
  const arcColor = isGood ? "#38BDF8" : "#F59E0B";

  // Arc line
  ctx.strokeStyle = arcColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, startAngle, endAngle);
  ctx.stroke();

  // Label badge
  ctx.font = "bold 11px sans-serif";
  const badgeText = `${Math.round(angleDeg)}°`;
  const textWidth = ctx.measureText(badgeText).width;

  const badgeX = center.x + 28;
  const badgeY = center.y - 8;

  // Background pill
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.strokeStyle = arcColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(badgeX - 4, badgeY - 12, textWidth + 8, 16, 4);
  ctx.fill();
  ctx.stroke();

  // Text
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(badgeText, badgeX, badgeY);

  ctx.restore();
}

/**
 * Draws highlighting arrow on active arm indicating the gesture direction
 */
export function drawActiveArmHighlight(
  ctx: CanvasRenderingContext2D,
  shoulder: { x: number; y: number },
  wrist: { x: number; y: number }
): void {
  ctx.save();

  const angle = Math.atan2(wrist.y - shoulder.y, wrist.x - shoulder.x);
  const arrowDist = 20;
  const arrowX = wrist.x + Math.cos(angle) * arrowDist;
  const arrowY = wrist.y + Math.sin(angle) * arrowDist;

  // Direction arrow
  ctx.strokeStyle = "#38BDF8";
  ctx.fillStyle = "#38BDF8";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#0284C7";
  ctx.shadowBlur = 8;

  ctx.beginPath();
  ctx.moveTo(wrist.x, wrist.y);
  ctx.lineTo(arrowX, arrowY);
  ctx.stroke();

  // Arrowhead
  const headLen = 8;
  ctx.beginPath();
  ctx.moveTo(arrowX, arrowY);
  ctx.lineTo(
    arrowX - headLen * Math.cos(angle - Math.PI / 6),
    arrowY - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    arrowX - headLen * Math.cos(angle + Math.PI / 6),
    arrowY - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws AI person detection bounding box with tactical corner brackets and Tagging badge
 */
export function drawPersonBoundingBox(
  ctx: CanvasRenderingContext2D,
  person: TaggedPerson,
  width: number,
  height: number,
  mirror: boolean = false
): void {
  ctx.save();

  const [normX, normY, normW, normH] = person.bbox;
  const rawX = mirror ? 1.0 - normX - normW : normX;
  const x = rawX * width;
  const y = normY * height;
  const w = normW * width;
  const h = normH * height;

  const isTagged = person.isTagged;
  const primaryColor = isTagged ? "#06B6D4" : "rgba(148, 163, 184, 0.5)"; // Cyan if tagged, slate if untagged
  const accentColor = isTagged ? "#22C55E" : "#94A3B8";

  // Box borders
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = isTagged ? 2.5 : 1.2;
  if (!isTagged) {
    ctx.setLineDash([4, 4]);
  }

  // Draw tactical corner brackets
  const cornerLen = Math.min(18, Math.min(w, h) * 0.25);

  ctx.beginPath();
  // Top-left
  ctx.moveTo(x, y + cornerLen);
  ctx.lineTo(x, y);
  ctx.lineTo(x + cornerLen, y);

  // Top-right
  ctx.moveTo(x + w - cornerLen, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + cornerLen);

  // Bottom-left
  ctx.moveTo(x, y + h - cornerLen);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + cornerLen, y + h);

  // Bottom-right
  ctx.moveTo(x + w - cornerLen, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - cornerLen);
  ctx.stroke();

  // Subtle connecting rect
  ctx.setLineDash([]);
  ctx.strokeStyle = isTagged ? "rgba(6, 182, 212, 0.3)" : "rgba(148, 163, 184, 0.2)";
  ctx.strokeRect(x, y, w, h);

  // Tag Badge at top of box
  ctx.font = "bold 11px sans-serif";
  const badgeText = isTagged
    ? `🎯 TAGGED: ${person.label.toUpperCase()} (${Math.round(person.confidence * 100)}%)`
    : `👤 ${person.label} - คลิกเพื่อ Tag`;
  const textWidth = ctx.measureText(badgeText).width;

  const badgeH = 18;
  const badgeY = Math.max(0, y - badgeH - 2);

  // Badge background pill
  ctx.fillStyle = isTagged ? "rgba(6, 182, 212, 0.9)" : "rgba(15, 23, 42, 0.85)";
  ctx.beginPath();
  ctx.roundRect(x, badgeY, textWidth + 12, badgeH, 4);
  ctx.fill();

  if (!isTagged) {
    ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
    ctx.stroke();
  }

  // Badge text
  ctx.fillStyle = isTagged ? "#042F2E" : "#E2E8F0";
  ctx.fillText(badgeText, x + 6, badgeY + 13);

  ctx.restore();
}

