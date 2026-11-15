import {
  AssessmentReport,
  FrameFeedbackPayload,
  GestureRule,
  Keypoint,
  PostureAngles,
  SystemHealth,
  TaggedPerson,
} from "../Data_Types/Referee_Types";
import ifabSignalsData from "../Data_Sources/Ifab_Signals.json";

export const MOCK_IFAB_RULES: GestureRule[] = ifabSignalsData as GestureRule[];

/**
 * Returns mock microservices system health
 */
export function getMockSystemHealth(): SystemHealth {
  return {
    isSimulated: true,
    lastChecked: new Date().toLocaleTimeString("th-TH"),
    services: [
      {
        name: "API Gateway (BFF)",
        serviceId: "gateway",
        status: "simulated",
        latencyMs: 4,
        endpoint: "http://localhost:8000",
      },
      {
        name: "Vision Inference Service (YOLO26-Pose)",
        serviceId: "vision",
        status: "simulated",
        latencyMs: 24,
        endpoint: "grpc://localhost:50051",
      },
      {
        name: "Referee Coaching & XAI Engine",
        serviceId: "coaching",
        status: "simulated",
        latencyMs: 8,
        endpoint: "http://localhost:8001",
      },
      {
        name: "IFAB Rules & Catalog Service",
        serviceId: "rules",
        status: "simulated",
        latencyMs: 2,
        endpoint: "http://localhost:8002",
      },
      {
        name: "Match Assessment & Analytics",
        serviceId: "assessment",
        status: "simulated",
        latencyMs: 6,
        endpoint: "http://localhost:8003",
      },
    ],
  };
}

/**
 * Generates synthetic COCO-17 keypoints for a given gesture and tick
 */
export function generateMockKeypoints(
  gestureId: number,
  frameTick: number
): { keypoints: Keypoint[]; angles: PostureAngles } {
  const sway = Math.sin(frameTick * 0.08) * 0.008;
  const breathe = Math.cos(frameTick * 0.05) * 0.005;

  // Base human standing coordinates (normalized 0..1, person centered around x=0.5, y=0.5)
  // 0: Nose, 1: L_Eye, 2: R_Eye, 3: L_Ear, 4: R_Ear
  // 5: L_Sho, 6: R_Sho, 7: L_Elb, 8: R_Elb, 9: L_Wri, 10: R_Wri
  // 11: L_Hip, 12: R_Hip, 13: L_Kne, 14: R_Kne, 15: L_Ank, 16: R_Ank
  const kps: Keypoint[] = [
    { x: 0.5 + sway, y: 0.22 + breathe, confidence: 0.96 }, // 0: nose
    { x: 0.485 + sway, y: 0.205 + breathe, confidence: 0.94 }, // 1: l_eye
    { x: 0.515 + sway, y: 0.205 + breathe, confidence: 0.95 }, // 2: r_eye
    { x: 0.465 + sway, y: 0.215 + breathe, confidence: 0.91 }, // 3: l_ear
    { x: 0.535 + sway, y: 0.215 + breathe, confidence: 0.92 }, // 4: r_ear
    { x: 0.42 + sway, y: 0.32 + breathe, confidence: 0.97 }, // 5: l_shoulder
    { x: 0.58 + sway, y: 0.32 + breathe, confidence: 0.97 }, // 6: r_shoulder
    { x: 0.40 + sway, y: 0.46, confidence: 0.95 }, // 7: l_elbow (default down)
    { x: 0.60 + sway, y: 0.46, confidence: 0.95 }, // 8: r_elbow (default down)
    { x: 0.39 + sway, y: 0.60, confidence: 0.94 }, // 9: l_wrist (default down)
    { x: 0.61 + sway, y: 0.60, confidence: 0.94 }, // 10: r_wrist (default down)
    { x: 0.45 + sway * 0.5, y: 0.56, confidence: 0.98 }, // 11: l_hip
    { x: 0.55 + sway * 0.5, y: 0.56, confidence: 0.98 }, // 12: r_hip
    { x: 0.44 + sway * 0.3, y: 0.74, confidence: 0.95 }, // 13: l_knee
    { x: 0.56 + sway * 0.3, y: 0.74, confidence: 0.95 }, // 14: r_knee
    { x: 0.44, y: 0.92, confidence: 0.93 }, // 15: l_ankle
    { x: 0.56, y: 0.92, confidence: 0.93 }, // 16: r_ankle
  ];

  let rElbowAngle = 175;
  let lElbowAngle = 175;
  let rElevationAngle = 15;
  let lElevationAngle = 15;
  let armSeparationAngle = 30;

  // Custom arm positioning based on target gesture
  switch (gestureId) {
    case 1: // Indirect_Free_Kick: Right arm straight UP
      kps[8] = { x: 0.59 + sway, y: 0.20, confidence: 0.96 }; // r_elbow up
      kps[10] = { x: 0.60 + sway, y: 0.08, confidence: 0.95 }; // r_wrist high above head
      rElevationAngle = 174 + Math.sin(frameTick * 0.1) * 3;
      rElbowAngle = 176 + Math.cos(frameTick * 0.1) * 2;
      break;

    case 2: // Direct_Free_Kick: Right arm extended HORIZONTALLY
      kps[8] = { x: 0.72 + sway, y: 0.32, confidence: 0.96 }; // r_elbow right
      kps[10] = { x: 0.85 + sway, y: 0.32, confidence: 0.95 }; // r_wrist right
      rElevationAngle = 90 + Math.sin(frameTick * 0.1) * 2;
      rElbowAngle = 178 + Math.cos(frameTick * 0.1) * 2;
      break;

    case 3: // Card: Right arm raised high
      kps[8] = { x: 0.60 + sway, y: 0.22, confidence: 0.96 };
      kps[10] = { x: 0.62 + sway, y: 0.10, confidence: 0.95 };
      rElevationAngle = 168 + Math.sin(frameTick * 0.1) * 2;
      rElbowAngle = 165 + Math.cos(frameTick * 0.1) * 2;
      break;

    case 4: // Play_On (Advantage): Both arms extended forward/up
      kps[7] = { x: 0.32 + sway, y: 0.26, confidence: 0.95 }; // l_elbow
      kps[9] = { x: 0.24 + sway, y: 0.22, confidence: 0.94 }; // l_wrist
      kps[8] = { x: 0.68 + sway, y: 0.26, confidence: 0.95 }; // r_elbow
      kps[10] = { x: 0.76 + sway, y: 0.22, confidence: 0.94 }; // r_wrist
      lElevationAngle = 76;
      rElevationAngle = 76;
      armSeparationAngle = 88;
      break;

    case 5: // Penalty_Kick: Arm pointing down towards 12-yard spot
      kps[8] = { x: 0.64 + sway, y: 0.39, confidence: 0.96 };
      kps[10] = { x: 0.72 + sway, y: 0.48, confidence: 0.95 };
      rElevationAngle = 44 + Math.sin(frameTick * 0.1) * 2;
      rElbowAngle = 176;
      break;

    case 12: // Corner_Kick: Arm pointing 45 deg upwards
      kps[8] = { x: 0.68 + sway, y: 0.24, confidence: 0.96 };
      kps[10] = { x: 0.78 + sway, y: 0.15, confidence: 0.95 };
      rElevationAngle = 122 + Math.sin(frameTick * 0.1) * 2;
      rElbowAngle = 174;
      break;

    default:
      // Neutral stance
      rElevationAngle = 18;
      lElevationAngle = 18;
      rElbowAngle = 170;
      lElbowAngle = 170;
      break;
  }

  return {
    keypoints: kps,
    angles: {
      rElbowAngle: Math.round(rElbowAngle),
      lElbowAngle: Math.round(lElbowAngle),
      rElevationAngle: Math.round(rElevationAngle),
      lElevationAngle: Math.round(lElevationAngle),
      armSeparationAngle: Math.round(armSeparationAngle),
      torsoInclination: 2,
    },
  };
}

/**
 * Simulates real-time coaching evaluation for drill mode
 */
export function evaluateMockPosture(
  targetRule: GestureRule,
  frameTick: number,
  holdDurationSeconds: number
): FrameFeedbackPayload {
  const { keypoints, angles } = generateMockKeypoints(targetRule.id, frameTick);

  // Active arm check
  const activeArm = targetRule.activeArm;
  const currentElev =
    activeArm === "left" ? angles.lElevationAngle : angles.rElevationAngle;
  const currentStraight =
    activeArm === "left" ? angles.lElbowAngle : angles.rElbowAngle;

  // Compute score based on closeness to target
  const elevDiff = Math.abs(currentElev - targetRule.targetElevationDeg);
  const straightDiff = Math.abs(currentStraight - targetRule.targetStraightnessDeg);

  const elevScore = Math.max(0, 40 - elevDiff * 0.6);
  const straightScore = Math.max(0, 30 - straightDiff * 0.5);
  const baseScore = Math.round(elevScore + straightScore + 28); // 0..100
  const score = Math.min(100, Math.max(20, baseScore));

  const isAcceptable = score >= 75;

  let state: FrameFeedbackPayload["state"] = "DETECTED";
  let feedbackTip = "กำลังตรวจจับสัญญาณ...";
  let progress = 0;

  if (isAcceptable) {
    progress = Math.min(1.0, holdDurationSeconds / targetRule.minHoldSeconds);
    if (progress >= 1.0) {
      state = "COMPLETED";
      feedbackTip = "ยอดเยี่ยมมาก! การให้สัญญาณถูกต้องตามกติกา IFAB";
    } else {
      state = "HOLDING";
      feedbackTip = `ค้างท่าไว้... ${holdDurationSeconds.toFixed(1)}s / ${targetRule.minHoldSeconds.toFixed(1)}s`;
    }
  } else {
    state = "LOST_POSTURE";
    if (currentElev < targetRule.minElevationDeg) {
      feedbackTip = `ยกแขนขึ้นอีก ${Math.round(targetRule.targetElevationDeg - currentElev)}° ให้ตรงตามมาตรฐาน`;
    } else if (currentStraight < targetRule.minStraightnessDeg) {
      feedbackTip = "เหยียดข้อศอกให้ตรง ไม่งอแขน";
    } else {
      feedbackTip = "ปรับปรุงความชัดเจนของสัญญาณมือ";
    }
  }

  return {
    detected: true,
    timestamp: Date.now(),
    keypoints,
    activeArm,
    angles,
    score,
    state,
    holdProgress: progress,
    holdDuration: holdDurationSeconds,
    feedbackTip,
    gestureName: targetRule.name,
    gestureNameTh: targetRule.nameTh,
    isAcceptable,
  };
}

/**
 * Generates sample match assessment report for demonstration
 */
export function generateMockAssessmentReport(): AssessmentReport {
  return {
    sessionId: "SES-20261115-01",
    traineeName: "ภูริภัทร เหมกุล (ผู้ตัดสินฝึกหัด Class 2)",
    matchTitle: "PIM Academy League 2026 - Matchday 8",
    date: "15 พ.ย. 2026",
    totalCalls: 18,
    averageScore: 88.4,
    overallRating: "A",
    categoryScores: {
      restarts: 92.1,
      fouls: 84.5,
      match_control: 89.2,
      offside: 91.0,
    },
    topImprovementTips: [
      "จังหวะเป่า Advantage (ได้เปรียบ) ควรกางแขนให้กว้างขึ้นอีก 10 องศา",
      "การให้สัญญาณ Direct Free Kick นาทีที่ 54:12 แขนลดระดับเร็วเกินไป (ค้างเพียง 0.8s)",
      "รักษาท่าทางให้สง่างาม มั่นใจในทุกการเป่าหยุดเกม",
    ],
    events: [
      {
        id: "EV-01",
        timestampSeconds: 142,
        displayTime: "02:22",
        gestureId: 2,
        gestureName: "Direct_Free_Kick",
        gestureNameTh: "ฟรีคิกทางตรง",
        score: 95,
        holdDuration: 1.8,
        status: "excellent",
        angles: { rElbowAngle: 178, lElbowAngle: 170, rElevationAngle: 89, lElevationAngle: 18 },
        feedback: ["แขนเหยียดตรง ขนานพื้นชัดเจน"],
      },
      {
        id: "EV-02",
        timestampSeconds: 840,
        displayTime: "14:00",
        gestureId: 1,
        gestureName: "Indirect_Free_Kick",
        gestureNameTh: "ฟรีคิกทางอ้อม",
        score: 92,
        holdDuration: 2.1,
        status: "excellent",
        angles: { rElbowAngle: 174, lElbowAngle: 168, rElevationAngle: 172, lElevationAngle: 16 },
        feedback: ["ยกแขนตรงเหนือศีรษะ ค้างท่านานตามกติกา"],
      },
      {
        id: "EV-03",
        timestampSeconds: 1690,
        displayTime: "28:10",
        gestureId: 4,
        gestureName: "Play_On",
        gestureNameTh: "การให้สัญญาณได้เปรียบ",
        score: 72,
        holdDuration: 1.1,
        status: "needs_improvement",
        angles: { rElbowAngle: 155, lElbowAngle: 152, rElevationAngle: 62, lElevationAngle: 60, armSeparationAngle: 64 },
        feedback: ["กางแขนแคบเกินไป (64° ควรเป็น 80°-100°)", "ยื่นแขนไปข้างหน้าให้ชัดเจนกว่านี้"],
      },
      {
        id: "EV-04",
        timestampSeconds: 2540,
        displayTime: "42:20",
        gestureId: 3,
        gestureName: "Card",
        gestureNameTh: "การแจกใบเหลือง",
        score: 98,
        holdDuration: 2.4,
        status: "excellent",
        angles: { rElbowAngle: 176, lElbowAngle: 168, rElevationAngle: 170, lElevationAngle: 15 },
        feedback: ["การชูการ์ดเด็ดขาด สง่างาม สายตาสื่อสารชัดเจน"],
      },
      {
        id: "EV-05",
        timestampSeconds: 3820,
        displayTime: "63:40",
        gestureId: 5,
        gestureName: "Penalty_Kick",
        gestureNameTh: "การให้ลูกโทษ",
        score: 94,
        holdDuration: 1.9,
        status: "excellent",
        angles: { rElbowAngle: 176, lElbowAngle: 170, rElevationAngle: 42, lElevationAngle: 18 },
        feedback: ["ชี้ชัดเจนไปยังจุดโทษ 12 หลา"],
      },
    ],
  };
}

/**
 * Generates simulated multi-person detection for camera tagging
 */
export function generateMockPersons(
  targetGestureId: number,
  frameTick: number,
  activePersonId: string = "person-1"
): TaggedPerson[] {
  // Person 1: Primary referee performing the signal
  const p1Data = generateMockKeypoints(targetGestureId, frameTick);

  // Compute bounding box around keypoints [minX, minY, width, height]
  const xs1 = p1Data.keypoints.map((k) => k.x);
  const ys1 = p1Data.keypoints.map((k) => k.y);
  const minX1 = Math.max(0.05, Math.min(...xs1) - 0.08);
  const maxX1 = Math.min(0.95, Math.max(...xs1) + 0.08);
  const minY1 = Math.max(0.05, Math.min(...ys1) - 0.06);
  const maxY1 = Math.min(0.98, Math.max(...ys1) + 0.06);

  const person1: TaggedPerson = {
    id: "person-1",
    label: "Referee",
    labelTh: "ผู้ตัดสินหลัก (Main Referee)",
    bbox: [minX1, minY1, maxX1 - minX1, maxY1 - minY1],
    confidence: 0.98,
    isTagged: activePersonId === "person-1",
    keypoints: p1Data.keypoints,
    angles: p1Data.angles,
  };

  // Person 2: Nearby player standing on the right
  const sway2 = Math.cos(frameTick * 0.07) * 0.006;
  const p2Keypoints: Keypoint[] = p1Data.keypoints.map((k) => ({
    x: Math.min(0.94, k.x + 0.32 + sway2),
    y: Math.min(0.96, k.y + 0.05),
    confidence: 0.88,
  }));
  const xs2 = p2Keypoints.map((k) => k.x);
  const ys2 = p2Keypoints.map((k) => k.y);
  const minX2 = Math.max(0.05, Math.min(...xs2) - 0.06);
  const maxX2 = Math.min(0.98, Math.max(...xs2) + 0.06);
  const minY2 = Math.max(0.05, Math.min(...ys2) - 0.05);
  const maxY2 = Math.min(0.98, Math.max(...ys2) + 0.05);

  const person2: TaggedPerson = {
    id: "person-2",
    label: "Player",
    labelTh: "ผู้เล่น #10 (Player)",
    bbox: [minX2, minY2, maxX2 - minX2, maxY2 - minY2],
    confidence: 0.89,
    isTagged: activePersonId === "person-2",
    keypoints: p2Keypoints,
    angles: {
      rElbowAngle: 165,
      lElbowAngle: 168,
      rElevationAngle: 18,
      lElevationAngle: 20,
    },
  };

  return [person1, person2];
}

