import {
  COCO_SKELETON_PAIRS,
  GestureRule,
  Keypoint,
  PostureAngles,
} from "../../Data_Types/Referee_Types";
import { generateMockKeypoints } from "../../Core_Lib/Microservices_Mock";

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
  const { keypoints: ghostKps } = generateMockKeypoints(targetRule.id, 0);

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
