import {
  ExamAttemptResult,
  ExamSessionHistoryItem,
  GestureCategory,
  GestureRule,
  ScenarioExamPack,
  TraineeEvaluationReport,
  WeaknessDiagnosticItem,
} from "../Data_Types/Referee_Types";
import { IFAB_RULES } from "./Ifab_Rules_Catalog";

const STORAGE_KEY = "referee_academy_sessions_v1";
export const SESSIONS_UPDATED_EVENT = "referee-sessions-updated";

interface StoredGestureMetric {
  gestureId: number;
  gestureNameTh: string;
  category: GestureCategory;
  score: number;
  holdDuration: number;
}

interface StoredSessionRecord {
  item: ExamSessionHistoryItem;
  metrics: StoredGestureMetric[];
}

function readRecords(): StoredSessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredSessionRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRecords(records: StoredSessionRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(SESSIONS_UPDATED_EVENT));
}

function formatThaiTimestamp(d: Date): string {
  return d.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function recordDrillSession(params: {
  rule: GestureRule;
  confidenceScore: number;
  holdDurationSeconds: number;
  mode: "webcam" | "image" | "video";
}): ExamSessionHistoryItem {
  const accuracy = Math.min(100, Math.max(0, Math.round(params.confidenceScore)));
  const passed = accuracy >= 75;
  const now = new Date();
  const modeLabel =
    params.mode === "webcam"
      ? "ฝึกซ้อมสด (/ws/webcam)"
      : params.mode === "image"
      ? "ตรวจภาพถ่าย (/predict/image)"
      : "ตรวจวิดีโอ (/predict/video)";

  const item: ExamSessionHistoryItem = {
    sessionId: `DRILL-${now.getTime().toString().slice(-6)}`,
    date: formatThaiTimestamp(now),
    examTitleTh: `${modeLabel}: ${params.rule.nameTh} (${params.rule.ifabLaw.split(" - ")[0]})`,
    postureAccuracy: accuracy,
    reactionLatencySeconds: Number(Math.max(0.2, params.holdDurationSeconds).toFixed(2)),
    passedCount: passed ? 1 : 0,
    totalQuestions: 1,
    passed,
  };

  const record: StoredSessionRecord = {
    item,
    metrics: [
      {
        gestureId: params.rule.id,
        gestureNameTh: params.rule.nameTh,
        category: params.rule.category,
        score: accuracy,
        holdDuration: params.holdDurationSeconds,
      },
    ],
  };

  const existing = readRecords();
  writeRecords([record, ...existing].slice(0, 50));
  return item;
}

export function recordExamPackSession(params: {
  pack: ScenarioExamPack;
  results: ExamAttemptResult[];
}): ExamSessionHistoryItem {
  const now = new Date();
  const count = Math.max(1, params.results.length);
  const avgScore = Math.round(
    params.results.reduce((sum, r) => sum + r.totalQuestionScore, 0) / count
  );
  const avgReaction = Number(
    (
      params.results.reduce((sum, r) => sum + r.reactionTimeSeconds, 0) / count
    ).toFixed(2)
  );
  const passedCount = params.results.filter((r) => r.passed).length;
  const passed = avgScore >= params.pack.passingScore;

  const item: ExamSessionHistoryItem = {
    sessionId: `EXAM-${now.getTime().toString().slice(-6)}`,
    date: formatThaiTimestamp(now),
    examTitleTh: params.pack.titleTh,
    postureAccuracy: avgScore,
    reactionLatencySeconds: avgReaction,
    passedCount,
    totalQuestions: params.pack.questions.length,
    passed,
  };

  const metrics: StoredGestureMetric[] = params.results.map((r) => {
    const q = params.pack.questions.find((itemQ) => itemQ.id === r.questionId);
    const rule = IFAB_RULES.find((rl) => rl.id === q?.targetGestureId) ?? IFAB_RULES[0];
    return {
      gestureId: rule.id,
      gestureNameTh: rule.nameTh,
      category: rule.category,
      score: r.postureScore,
      holdDuration: r.holdDurationSeconds,
    };
  });

  const existing = readRecords();
  writeRecords([{ item, metrics }, ...existing].slice(0, 50));
  return item;
}

export function getSessionHistory(): ExamSessionHistoryItem[] {
  return readRecords().map((r) => r.item);
}

export function clearAllSessions(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(SESSIONS_UPDATED_EVENT));
}

export function computeTraineeEvaluationReport(): TraineeEvaluationReport {
  const records = readRecords();
  const history = records.map((r) => r.item);
  const todayStr = new Date().toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (records.length === 0) {
    return {
      reportId: "GRD-LIVE-EMPTY",
      traineeName: "ผู้ตัดสินฝึกหัด (Active Session)",
      traineeCode: "LIVE-MODEL-2026",
      classTierTh: "YOLO26n-pose Real Assessment",
      evaluationDate: todayStr,
      overallPostureAccuracy: 0,
      accuracyTrendDelta: "ยังไม่มีข้อมูล — เริ่มฝึกหรือสอบเพื่อบันทึกผลจริง",
      completedPacks: 0,
      passedPacks: 0,
      averageReactionSeconds: 0,
      overallGrade: "D",
      categoryCompetency: {
        restarts: 0,
        fouls: 0,
        match_control: 0,
        offside: 0,
      },
      weaknessDiagnostics: [
        {
          id: "WK-INIT",
          titleTh: "ยังไม่มีประวัติการตรวจจับด้วย Modal AI",
          detailTh:
            "เข้าสู่ห้องฝึกซ้อมสด (/drills) หรือห้องสอบสถานการณ์ (/examination) เพื่อส่งภาพ/วิดีโอจริงไปยังโมเดล YOLO26n-pose แล้วผลลัพธ์จะบันทึกที่นี่โดยอัตโนมัติ",
          targetGestureId: 1,
          severity: "warning",
          recommendedDrillLabelTh: "เริ่มฝึกซ้อมท่าแรก (Indirect Free Kick)",
        },
      ],
      examHistory: [],
      instructorNotes: [
        "ยังไม่มีเซสชันที่บันทึกไว้ในระบบ กรุณาทดสอบผ่านกล้องเว็บแคม รูปภาพ หรือข้อสอบสถานการณ์เพื่อสร้างรายงานสมรรถนะจริง",
      ],
    };
  }

  const completedPacks = records.length;
  const passedPacks = records.filter((r) => r.item.passed).length;
  const overallPostureAccuracy = Number(
    (
      records.reduce((sum, r) => sum + r.item.postureAccuracy, 0) / completedPacks
    ).toFixed(1)
  );
  const averageReactionSeconds = Number(
    (
      records.reduce((sum, r) => sum + r.item.reactionLatencySeconds, 0) / completedPacks
    ).toFixed(2)
  );

  const overallGrade: TraineeEvaluationReport["overallGrade"] =
    overallPostureAccuracy >= 85
      ? "A"
      : overallPostureAccuracy >= 75
      ? "B"
      : overallPostureAccuracy >= 60
      ? "C"
      : "D";

  const deltaFromPrev =
    records.length >= 2
      ? records[0].item.postureAccuracy - records[1].item.postureAccuracy
      : 0;
  const accuracyTrendDelta =
    records.length >= 2
      ? `${deltaFromPrev >= 0 ? "+" : ""}${deltaFromPrev.toFixed(1)}% เทียบกับครั้งก่อน`
      : `บันทึกล่าสุด ${records[0].item.postureAccuracy}%`;

  const allMetrics = records.flatMap((r) => r.metrics);
  const avgForCat = (cat: GestureCategory): number => {
    const items = allMetrics.filter((m) => m.category === cat);
    if (items.length === 0) return 0;
    return Math.round(items.reduce((s, m) => s + m.score, 0) / items.length);
  };

  const categoryCompetency = {
    restarts: avgForCat("restarts"),
    fouls: avgForCat("fouls"),
    match_control: avgForCat("match_control"),
    offside: avgForCat("offside"),
  };

  const lowMetrics = [...allMetrics]
    .filter((m) => m.score < 80)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  const weaknessDiagnostics: WeaknessDiagnosticItem[] =
    lowMetrics.length > 0
      ? lowMetrics.map((m, idx) => ({
          id: `WK-${idx + 1}`,
          titleTh: `${m.gestureNameTh}: คะแนนความมั่นใจจากโมเดล ${m.score}% (ต่ำกว่าเกณฑ์ 80%)`,
          detailTh:
            "แนะนำให้จัดตำแหน่งร่างกายให้อยู่กลางเฟรมกล้อง แสงสว่างเพียงพอ และค้างท่าสัญญาณให้นิ่งตามเกณฑ์ IFAB",
          targetGestureId: m.gestureId,
          severity: m.score < 65 ? "error" : "warning",
          recommendedDrillLabelTh: `ฝึกซ้อมท่า ${m.gestureNameTh}`,
        }))
      : [
          {
            id: "WK-TOP",
            titleTh: "ผลประเมินรวมทุกท่าที่ทดสอบผ่านเกณฑ์มาตรฐาน (≥ 80%)",
            detailTh:
              "สามารถเลือกฝึกท่าเพิ่มเติมจากคลัง 20 สัญญาณ IFAB เพื่อเพิ่มความครอบคลุมในทุกหมวดหมู่",
            targetGestureId: allMetrics[0]?.gestureId ?? 1,
            severity: "warning",
            recommendedDrillLabelTh: "ฝึกทบทวนเพิ่มเติมใน /drills",
          },
        ];

  return {
    reportId: `GRD-LIVE-${completedPacks}`,
    traineeName: "ผู้ตัดสินฝึกหัด (Active Session)",
    traineeCode: "LIVE-MODEL-2026",
    classTierTh: "YOLO26n-pose Real Assessment",
    evaluationDate: todayStr,
    overallPostureAccuracy,
    accuracyTrendDelta,
    completedPacks,
    passedPacks,
    averageReactionSeconds,
    overallGrade,
    categoryCompetency,
    weaknessDiagnostics,
    examHistory: history,
    instructorNotes: [
      `คำนวณจากประวัติการประเมินจริงทั้งหมด ${completedPacks} เซสชัน (ผ่านเกณฑ์ ${passedPacks} เซสชัน)`,
      `ความแม่นยำเฉลี่ยของสัญญาณจากโมเดล YOLO26n-pose อยู่ที่ ${overallPostureAccuracy}%`,
    ],
  };
}
