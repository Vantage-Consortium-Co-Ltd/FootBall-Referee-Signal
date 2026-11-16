import {
  GestureRule,
  Keypoint,
  PostureAngles,
  ScenarioExamPack,
} from "../Data_Types/Referee_Types";
import ifabSignalsData from "../Data_Sources/Ifab_Signals.json";

export const IFAB_RULES: GestureRule[] = ifabSignalsData as GestureRule[];

/**
 * Deterministic static COCO-17 reference keypoints & angles for the IFAB Ghost Target Guide.
 * Used purely as a static biomechanical alignment guide over live video.
 */
export function getReferencePostureForRule(gestureId: number): {
  keypoints: Keypoint[];
  angles: PostureAngles;
} {
  const kps: Keypoint[] = [
    { x: 0.5, y: 0.22, confidence: 1.0 }, // 0: nose
    { x: 0.485, y: 0.205, confidence: 1.0 }, // 1: l_eye
    { x: 0.515, y: 0.205, confidence: 1.0 }, // 2: r_eye
    { x: 0.465, y: 0.215, confidence: 1.0 }, // 3: l_ear
    { x: 0.535, y: 0.215, confidence: 1.0 }, // 4: r_ear
    { x: 0.42, y: 0.32, confidence: 1.0 }, // 5: l_shoulder
    { x: 0.58, y: 0.32, confidence: 1.0 }, // 6: r_shoulder
    { x: 0.4, y: 0.46, confidence: 1.0 }, // 7: l_elbow
    { x: 0.6, y: 0.46, confidence: 1.0 }, // 8: r_elbow
    { x: 0.39, y: 0.6, confidence: 1.0 }, // 9: l_wrist
    { x: 0.61, y: 0.6, confidence: 1.0 }, // 10: r_wrist
    { x: 0.45, y: 0.56, confidence: 1.0 }, // 11: l_hip
    { x: 0.55, y: 0.56, confidence: 1.0 }, // 12: r_hip
    { x: 0.44, y: 0.74, confidence: 1.0 }, // 13: l_knee
    { x: 0.56, y: 0.74, confidence: 1.0 }, // 14: r_knee
    { x: 0.44, y: 0.92, confidence: 1.0 }, // 15: l_ankle
    { x: 0.56, y: 0.92, confidence: 1.0 }, // 16: r_ankle
  ];

  let rElbowAngle = 175;
  let lElbowAngle = 175;
  let rElevationAngle = 18;
  let lElevationAngle = 18;
  let armSeparationAngle = 30;

  switch (gestureId) {
    case 1: // Indirect_Free_Kick
    case 6: // Offside
      kps[8] = { x: 0.59, y: 0.2, confidence: 1.0 };
      kps[10] = { x: 0.6, y: 0.08, confidence: 1.0 };
      rElevationAngle = 175;
      rElbowAngle = 176;
      break;

    case 2: // Direct_Free_Kick
    case 7: // Offside_Location
    case 9: // Goal
      kps[8] = { x: 0.72, y: 0.32, confidence: 1.0 };
      kps[10] = { x: 0.85, y: 0.32, confidence: 1.0 };
      rElevationAngle = 90;
      rElbowAngle = 178;
      break;

    case 3: // Card
      kps[8] = { x: 0.6, y: 0.22, confidence: 1.0 };
      kps[10] = { x: 0.62, y: 0.1, confidence: 1.0 };
      rElevationAngle = 170;
      rElbowAngle = 170;
      break;

    case 4: // Play_On
      kps[7] = { x: 0.32, y: 0.26, confidence: 1.0 };
      kps[9] = { x: 0.24, y: 0.22, confidence: 1.0 };
      kps[8] = { x: 0.68, y: 0.26, confidence: 1.0 };
      kps[10] = { x: 0.76, y: 0.22, confidence: 1.0 };
      lElevationAngle = 75;
      rElevationAngle = 75;
      armSeparationAngle = 90;
      break;

    case 5: // Penalty_Kick
      kps[8] = { x: 0.64, y: 0.39, confidence: 1.0 };
      kps[10] = { x: 0.72, y: 0.48, confidence: 1.0 };
      rElevationAngle = 45;
      rElbowAngle = 175;
      break;

    case 10: // Disallowed_Goal
      kps[7] = { x: 0.35, y: 0.36, confidence: 1.0 };
      kps[9] = { x: 0.54, y: 0.33, confidence: 1.0 };
      kps[8] = { x: 0.65, y: 0.36, confidence: 1.0 };
      kps[10] = { x: 0.46, y: 0.33, confidence: 1.0 };
      rElevationAngle = 85;
      lElevationAngle = 85;
      rElbowAngle = 158;
      lElbowAngle = 158;
      break;

    case 12: // Corner_Kick
      kps[8] = { x: 0.68, y: 0.24, confidence: 1.0 };
      kps[10] = { x: 0.78, y: 0.15, confidence: 1.0 };
      rElevationAngle = 122;
      rElbowAngle = 175;
      break;

    case 14: // Obstruction
    case 15: // Pushing
      kps[7] = { x: 0.31, y: 0.32, confidence: 1.0 };
      kps[9] = { x: 0.22, y: 0.3, confidence: 1.0 };
      kps[8] = { x: 0.69, y: 0.32, confidence: 1.0 };
      kps[10] = { x: 0.78, y: 0.3, confidence: 1.0 };
      rElevationAngle = 88;
      lElevationAngle = 88;
      rElbowAngle = 160;
      lElbowAngle = 160;
      break;

    default:
      break;
  }

  return {
    keypoints: kps,
    angles: {
      rElbowAngle,
      lElbowAngle,
      rElevationAngle,
      lElevationAngle,
      armSeparationAngle,
      torsoInclination: 0,
    },
  };
}

/**
 * Curated 5-question Instructional Scenario Exam Pack for Trainee Referees (IFAB Laws 11-17)
 */
export const SCENARIO_EXAM_PACK: ScenarioExamPack = {
  packId: "PACK-IFAB-2026-L12",
  titleTh: "ชุดข้อสอบสถานการณ์: การทำฟาวล์และการเริ่มเล่นใหม่ (IFAB Laws 11-17)",
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
