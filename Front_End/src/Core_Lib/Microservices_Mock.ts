import {
  AssessmentReport,
  FrameFeedbackPayload,
  GestureRule,
  Keypoint,
  PostureAngles,
  ScenarioExamPack,
  SystemHealth,
  TaggedPerson,
  TraineeEvaluationReport,
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
        name: "Trainee Evaluation & Gradebook Service",
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

    case 6: // Offside: Right arm straight UP
      kps[8] = { x: 0.59 + sway, y: 0.20, confidence: 0.96 };
      kps[10] = { x: 0.60 + sway, y: 0.08, confidence: 0.95 };
      rElevationAngle = 171 + Math.sin(frameTick * 0.1) * 2;
      rElbowAngle = 176;
      break;

    case 9: // Goal: Pointing towards center circle horizontally
    case 7: // Offside Location
      kps[8] = { x: 0.72 + sway, y: 0.33, confidence: 0.96 };
      kps[10] = { x: 0.84 + sway, y: 0.34, confidence: 0.95 };
      rElevationAngle = 86 + Math.sin(frameTick * 0.1) * 2;
      rElbowAngle = 174;
      break;

    case 10: // Disallowed Goal: Arms crossed across chest
      kps[7] = { x: 0.35 + sway, y: 0.36, confidence: 0.95 };
      kps[9] = { x: 0.54 + sway, y: 0.33, confidence: 0.94 };
      kps[8] = { x: 0.65 + sway, y: 0.36, confidence: 0.95 };
      kps[10] = { x: 0.46 + sway, y: 0.33, confidence: 0.94 };
      rElevationAngle = 85;
      lElevationAngle = 85;
      rElbowAngle = 158;
      lElbowAngle = 158;
      break;

    case 12: // Corner_Kick: Arm pointing 45 deg upwards
      kps[8] = { x: 0.68 + sway, y: 0.24, confidence: 0.96 };
      kps[10] = { x: 0.78 + sway, y: 0.15, confidence: 0.95 };
      rElevationAngle = 122 + Math.sin(frameTick * 0.1) * 2;
      rElbowAngle = 174;
      break;

    case 14: // Obstruction / Pushing
    case 15:
      kps[7] = { x: 0.31 + sway, y: 0.32, confidence: 0.95 };
      kps[9] = { x: 0.22 + sway, y: 0.30, confidence: 0.94 };
      kps[8] = { x: 0.69 + sway, y: 0.32, confidence: 0.95 };
      kps[10] = { x: 0.78 + sway, y: 0.30, confidence: 0.94 };
      rElevationAngle = 88;
      lElevationAngle = 88;
      rElbowAngle = 160;
      lElbowAngle = 160;
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

/**
 * Curated 5-question Instructional Scenario Exam Pack for Trainee Referees
 * Used purely for academy classroom testing & biomechanical evaluation.
 */
export const MOCK_SCENARIO_EXAM_PACK: ScenarioExamPack = {
  packId: "PACK-IFAB-2026-L12",
  titleTh: "ชุดข้อสอบสถานการณ์จำลอง: การทำฟาวล์และการเริ่มเล่นใหม่ (IFAB Laws 11-17)",
  levelTh: "ผู้ตัดสินฝึกหัด Class 2 -> Class 3",
  passingScore: 75,
  questions: [
    {
      id: "Q-01",
      questionNumber: 1,
      titleTh: "สถานการณ์ที่ 1: การเข้าสกัดขาในเขตโทษฝั่งรับ",
      situationSummaryTh:
        "กองหน้าหมายเลข #9 เลี้ยงบอลหลุดเข้าสู่เขตโทษ กองหลังหมายเลข #4 พยายามสไลด์แย่งบอลจากด้านข้างแต่โดนข้อเท้าของ #9 ล้มลงโดยไม่สัมผัสบอล",
      clipDurationSeconds: 8,
      decisionWindowSeconds: 5,
      pitchZoneTh: "เขตโทษ (Penalty Area · 18-Yard Box)",
      correctOptionId: "C",
      targetGestureId: 5, // Penalty_Kick
      ifabLawReference: "IFAB Law 12 & Law 14 (Fouls Inside Penalty Area)",
      explanationTh:
        "การสกัดขาโดยประมาท (Careless/Reckless Trip) ภายในเขตโทษของฝ่ายรับ ถือเป็นความผิดโทษโดยตรงและต้องให้จุดโทษทันที พร้อมชี้แขนตรงเฉียงลง 45° ไปยังจุด 12 หลาอย่างเด็ดขาด",
      options: [
        {
          id: "A",
          labelTh: "ฟรีคิกทางตรง (Direct Free Kick)",
          labelEn: "จุดเกิดเหตุอยู่นอกเขต หรือตั้งเตะจากเส้นประตู",
          linkedGestureId: 2,
          ifabLaw: "Law 13",
        },
        {
          id: "B",
          labelTh: "ฟรีคิกทางอ้อม (Indirect Free Kick)",
          labelEn: "การขัดขวางการเคลื่อนที่โดยไม่ปะทะ",
          linkedGestureId: 1,
          ifabLaw: "Law 13",
        },
        {
          id: "C",
          labelTh: "การให้จุดโทษ (Penalty Kick)",
          labelEn: "ฟาวล์ในเขตโทษฝ่ายรับ IFAB Law 12/14",
          linkedGestureId: 5,
          ifabLaw: "Law 14",
        },
        {
          id: "D",
          labelTh: "ให้ได้เปรียบ (Advantage)",
          labelEn: "ปล่อยเกมเล่นต่อเพราะฝ่ายรุกเสียการครอบครองบอลทันที",
          linkedGestureId: 4,
          ifabLaw: "Law 5",
        },
      ],
    },
    {
      id: "Q-02",
      questionNumber: 2,
      titleTh: "สถานการณ์ที่ 2: การตัดเกมกลางสนามแต่เพื่อนร่วมทีมหลุดเดี่ยว",
      situationSummaryTh:
        "มิดฟิลด์ฝ่ายรับดึงเสื้อผู้เล่นฝ่ายรุกกลางสนามเพื่อหวังตัดเกมสวนกลับ แต่บอลยังไหลไปเข้าเท้าปีกขวาฝ่ายรุกที่มีพื้นที่เปิดกว้างหน้าประตู",
      clipDurationSeconds: 8,
      decisionWindowSeconds: 5,
      pitchZoneTh: "กึ่งกลางสนามฝั่งบุก (Transition Zone)",
      correctOptionId: "B",
      targetGestureId: 4, // Play_On
      ifabLawReference: "IFAB Law 5 - The Referee (Advantage Clause)",
      explanationTh:
        "ฝ่ายรุกยังคงได้ประโยชน์อย่างชัดเจนจากเกมรุกต่อเนื่อง ผู้ตัดสินต้องยื่นแขนทั้งสองข้างไปข้างหน้าพร้อมตะโกน 'Play on!' เพื่อคงจังหวะได้เปรียบไว้",
      options: [
        {
          id: "A",
          labelTh: "เป่าหยุดเกมให้ฟรีคิกทางตรงทันที",
          labelEn: "Direct Free Kick ทันทีกลางสนาม",
          linkedGestureId: 2,
          ifabLaw: "Law 13",
        },
        {
          id: "B",
          labelTh: "ให้สัญญาณได้เปรียบ (Play On / Advantage)",
          labelEn: "ยื่นสองแขนไปข้างหน้าปล่อยเกมไหลต่อเนื่อง",
          linkedGestureId: 4,
          ifabLaw: "Law 5",
        },
        {
          id: "C",
          labelTh: "ยกแขนให้ฟรีคิกทางอ้อม",
          labelEn: "Indirect Free Kick",
          linkedGestureId: 1,
          ifabLaw: "Law 13",
        },
        {
          id: "D",
          labelTh: "แจกใบเหลืองทันทีและหยุดบอล",
          labelEn: "Caution & Stop Play",
          linkedGestureId: 3,
          ifabLaw: "Law 12",
        },
      ],
    },
    {
      id: "Q-03",
      questionNumber: 3,
      titleTh: "สถานการณ์ที่ 3: การผลักคู่ต่อสู้นอกเขตโทษริมเส้น",
      situationSummaryTh:
        "ผู้เล่นริมเส้นฝ่ายรับใช้มือผลักด้านหลังของผู้เล่นฝ่ายรุกจนเสียหลักล้มลงห่างจากเส้นเขตโทษประมาณ 4 เมตร ทำให้ฝ่ายรุกเสียการครอบครองบอล",
      clipDurationSeconds: 8,
      decisionWindowSeconds: 5,
      pitchZoneTh: "พื้นที่ริมเส้นนอกเขตโทษ (Attacking Third)",
      correctOptionId: "A",
      targetGestureId: 2, // Direct_Free_Kick
      ifabLawReference: "IFAB Law 12 & Law 13 (Direct Free Kick)",
      explanationTh:
        "การผลัก (Pushing) เป็นความผิดโทษโดยตรง เมื่อเกิดนอกเขตโทษให้เป่านกหวีดและเหยียดแขนขนานพื้น (90°) ชี้ไปยังทิศทางการบุกของทีมที่ได้ฟาวล์",
      options: [
        {
          id: "A",
          labelTh: "ฟรีคิกทางตรง (Direct Free Kick)",
          labelEn: "เหยียดแขนขนานพื้นชี้ทิศทางบุก",
          linkedGestureId: 2,
          ifabLaw: "Law 13",
        },
        {
          id: "B",
          labelTh: "ฟรีคิกทางอ้อม (Indirect Free Kick)",
          labelEn: "ยกแขนตรงเหนือศีรษะ 180°",
          linkedGestureId: 1,
          ifabLaw: "Law 13",
        },
        {
          id: "C",
          labelTh: "การเตะมุม (Corner Kick)",
          labelEn: "ชี้เฉียงขึ้นมุมธง 45°",
          linkedGestureId: 12,
          ifabLaw: "Law 17",
        },
        {
          id: "D",
          labelTh: "การให้จุดโทษ (Penalty Kick)",
          labelEn: "ชี้ลงจุด 12 หลา",
          linkedGestureId: 5,
          ifabLaw: "Law 14",
        },
      ],
    },
    {
      id: "Q-04",
      questionNumber: 4,
      titleTh: "สถานการณ์ที่ 4: ผู้ช่วยผู้ตัดสินยกธงล้ำหน้าจากบอลวางยาว",
      situationSummaryTh:
        "กองกลางวางบอลยาวข้ามแนวรับ กองหน้า #11 ยืนเหลื่อมแนวรับคนสุดท้ายในขณะที่บอลออกจากเท้าเพื่อน และวิ่งเข้าไปเล่นบอลจนผู้ช่วยผู้ตัดสินยกธงขึ้นตรง",
      clipDurationSeconds: 8,
      decisionWindowSeconds: 5,
      pitchZoneTh: "พื้นที่เขตล้ำหน้าฝั่งรับ (Defensive Third)",
      correctOptionId: "B",
      targetGestureId: 6, // Offside
      ifabLawReference: "IFAB Law 11 - Offside (Indirect Free Kick)",
      explanationTh:
        "เมื่อยืนยันการล้ำหน้าแล้ว ผู้ตัดสินต้องเป่าหยุดเกมและชูแขนเหยียดตรงขึ้นเหนือศีรษะ (170°-180°) เพื่อระบุว่าเป็นฟรีคิกทางอ้อมจากการล้ำหน้า",
      options: [
        {
          id: "A",
          labelTh: "ชี้แขนขนานพื้นให้ฟรีคิกทางตรง",
          labelEn: "Direct Free Kick Signal",
          linkedGestureId: 2,
          ifabLaw: "Law 13",
        },
        {
          id: "B",
          labelTh: "ชูแขนตรงเหนือศีรษะ (สัญญาณล้ำหน้า / ฟรีคิกทางอ้อม)",
          labelEn: "Offside / Indirect Free Kick Signal",
          linkedGestureId: 6,
          ifabLaw: "Law 11",
        },
        {
          id: "C",
          labelTh: "ชี้มุมธงให้เตะมุม",
          labelEn: "Corner Kick Signal",
          linkedGestureId: 12,
          ifabLaw: "Law 17",
        },
        {
          id: "D",
          labelTh: "กวาดสองแขนให้ได้เปรียบ",
          labelEn: "Play On Advantage",
          linkedGestureId: 4,
          ifabLaw: "Law 5",
        },
      ],
    },
    {
      id: "Q-05",
      questionNumber: 5,
      titleTh: "สถานการณ์ที่ 5: ผู้รักษาประตูทีมรับปัดลูกยิงออกหลังเส้นประตู",
      situationSummaryTh:
        "ปีกฝ่ายรุกยิงไกลเต็มข้อ บอลพุ่งจะเสียบสามเหลี่ยมแต่ผู้รักษาประตูฝ่ายรับพุ่งปัดปลายมือทำให้บอลหลุดข้ามเส้นหลังออกนอกสนามข้างเสา",
      clipDurationSeconds: 8,
      decisionWindowSeconds: 5,
      pitchZoneTh: "เส้นหลังเขตประตู (Goal Line · Corner Arc)",
      correctOptionId: "D",
      targetGestureId: 12, // Corner_Kick
      ifabLawReference: "IFAB Law 17 - The Corner Kick",
      explanationTh:
        "ลูกบอลออกหลังเส้นประตูโดยผู้สัมผัสคนสุดท้ายเป็นฝ่ายรับ ผู้ตัดสินต้องชี้แขนเฉียงขึ้นประมาณ 45° ไปยังธงมุมสนามฝั่งที่บอลออกอย่างชัดเจน",
      options: [
        {
          id: "A",
          labelTh: "ชี้ไปที่จุดโทษ 12 หลา",
          labelEn: "Penalty Kick",
          linkedGestureId: 5,
          ifabLaw: "Law 14",
        },
        {
          id: "B",
          labelTh: "ชูแขนเหนือศีรษะให้ฟรีคิกทางอ้อม",
          labelEn: "Indirect Free Kick",
          linkedGestureId: 1,
          ifabLaw: "Law 13",
        },
        {
          id: "C",
          labelTh: "ชี้แขนเข้าหาจุดกึ่งกลางสนาม (ได้ประตู)",
          labelEn: "Goal Signal",
          linkedGestureId: 9,
          ifabLaw: "Law 10",
        },
        {
          id: "D",
          labelTh: "ชี้แขนเฉียงขึ้น 45° ไปยังเสาธงมุม (Corner Kick)",
          labelEn: "Corner Kick Signal",
          linkedGestureId: 12,
          ifabLaw: "Law 17",
        },
      ],
    },
  ],
};

/**
 * Generates sample educational Trainee Gradebook & Competency Analytics report
 */
export function generateMockTraineeEvaluationReport(): TraineeEvaluationReport {
  return {
    reportId: "GRD-2026-0092",
    traineeName: "อัศวิน พิทักษ์ธรรม",
    traineeCode: "REF-2026-092",
    classTierTh: "หลักสูตรผู้ตัดสินฝึกหัด Class 3",
    evaluationDate: "15 พ.ย. 2026",
    overallPostureAccuracy: 88.4,
    accuracyTrendDelta: "+4.2% จากสัปดาห์ก่อน",
    completedPacks: 28,
    passedPacks: 24,
    averageReactionSeconds: 1.35,
    overallGrade: "A",
    categoryCompetency: {
      restarts: 92,
      fouls: 84,
      match_control: 76,
      offside: 90,
    },
    weaknessDiagnostics: [
      {
        id: "WK-01",
        titleTh: "สัญญาณได้เปรียบ: กางแขนแคบเกินไป (32° จากเกณฑ์ 45°)",
        detailTh:
          "ผู้เล่นอาจมองไม่เห็นสัญญาณในจังหวะเกมสวนกลับเร็ว ควรฝึกยื่นแขนทั้งสองข้างไปข้างหน้าให้กว้าง 80°-100°",
        targetGestureId: 4,
        severity: "error",
        recommendedDrillLabelTh: "ฝึกซ้อมสัญญาณได้เปรียบ (Play On)",
      },
      {
        id: "WK-02",
        titleTh: "ฟรีคิกทางอ้อม: ค้างสัญญาณสั้นกว่าเกณฑ์ (0.8s จาก 1.5s)",
        detailTh:
          "ชูแขนค้างไว้จนกว่าบอลจะถูกเล่นหรือออกนอกสนาม อย่าลดแขนทันทีหลังเป่านกหวีด",
        targetGestureId: 1,
        severity: "warning",
        recommendedDrillLabelTh: "ฝึกซ้อมฟรีคิกทางอ้อม (Hold 1.5s)",
      },
    ],
    examHistory: [
      {
        sessionId: "EXAM-2026-104",
        date: "15 พ.ย. 2026 · 11:20",
        examTitleTh: "ชุดข้อสอบ Law 12: ฟาวล์ในเขตโทษและลูกตั้งเตะ",
        postureAccuracy: 92,
        reactionLatencySeconds: 1.18,
        passedCount: 5,
        totalQuestions: 5,
        passed: true,
      },
      {
        sessionId: "DRILL-2026-098",
        date: "14 พ.ย. 2026 · 16:45",
        examTitleTh: "ฝึกซ้อมสด: ฟรีคิกทางอ้อม (Law 13)",
        postureAccuracy: 94,
        reactionLatencySeconds: 1.05,
        passedCount: 10,
        totalQuestions: 10,
        passed: true,
      },
      {
        sessionId: "DRILL-2026-089",
        date: "14 พ.ย. 2026 · 10:15",
        examTitleTh: "ฝึกซ้อมสด: สัญญาณได้เปรียบ (Advantage Law 5)",
        postureAccuracy: 74,
        reactionLatencySeconds: 1.82,
        passedCount: 7,
        totalQuestions: 10,
        passed: false,
      },
      {
        sessionId: "EXAM-2026-075",
        date: "12 พ.ย. 2026 · 14:30",
        examTitleTh: "ชุดข้อสอบ Law 11: การประเมินจังหวะล้ำหน้า",
        postureAccuracy: 88,
        reactionLatencySeconds: 1.25,
        passedCount: 4,
        totalQuestions: 5,
        passed: true,
      },
      {
        sessionId: "DRILL-2026-064",
        date: "10 พ.ย. 2026 · 09:00",
        examTitleTh: "ฝึกซ้อมสด: การให้จุดโทษ (Penalty Kick Law 14)",
        postureAccuracy: 90,
        reactionLatencySeconds: 1.2,
        passedCount: 9,
        totalQuestions: 10,
        passed: true,
      },
    ],
    instructorNotes: [
      "การจัดระเบียบข้อศอกและท่ายืนตั้งตรงในหมวดลูกตั้งเตะ (Law 13-17) มีความสง่างามและแม่นยำสูง",
      "ควรเพิ่มระยะเวลาค้างสัญญาณ Advantage และ Indirect Free Kick ให้ครบตามเกณฑ์มาตรฐาน IFAB (1.5 วินาทีขึ้นไป)",
      "พร้อมสำหรับการทดสอบภาคสนามระดับ Academy ประจำภาคเรียนที่ 2",
    ],
  };
}

