/**
 * Football Referee Signal & Assessment Types
 * Based on COCO-17 Keypoints & IFAB Laws of the Game
 */

export interface Keypoint {
  x: number; // Normalized coordinate (0.0 - 1.0)
  y: number; // Normalized coordinate (0.0 - 1.0)
  confidence: number; // 0.0 - 1.0
  name?: string;
}

export const COCO_KEYPOINT_NAMES = [
  "nose",           // 0
  "left_eye",       // 1
  "right_eye",      // 2
  "left_ear",       // 3
  "right_ear",      // 4
  "left_shoulder",  // 5
  "right_shoulder", // 6
  "left_elbow",     // 7
  "right_elbow",    // 8
  "left_wrist",     // 9
  "right_wrist",    // 10
  "left_hip",       // 11
  "right_hip",      // 12
  "left_knee",      // 13
  "right_knee",     // 14
  "left_ankle",     // 15
  "right_ankle",    // 16
] as const;

export const COCO_SKELETON_PAIRS: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4],       // Head
  [5, 6],                               // Shoulders
  [5, 7], [7, 9],                       // Left arm
  [6, 8], [8, 10],                      // Right arm
  [5, 11], [6, 12],                     // Torso sides
  [11, 12],                             // Hips
  [11, 13], [13, 15],                   // Left leg
  [12, 14], [14, 16],                   // Right leg
];

export type GestureCategory = "restarts" | "fouls" | "match_control" | "offside";
export type ActiveArmType = "right" | "left" | "either" | "both" | "none";
export type DrillStateType = "WAITING" | "DETECTED" | "HOLDING" | "COMPLETED" | "LOST_POSTURE";

export interface GestureRule {
  id: number;
  name: string;
  nameTh: string;
  ifabLaw: string;
  category: GestureCategory;
  activeArm: ActiveArmType;
  targetElevationDeg: number;
  minElevationDeg: number;
  targetStraightnessDeg: number;
  minStraightnessDeg: number;
  minHoldSeconds: number;
  descriptionTh: string;
  descriptionEn: string;
  coachingTips: string[];
  commonMistakes?: string[];
}

export interface PostureAngles {
  rElbowAngle: number;
  lElbowAngle: number;
  rElevationAngle: number;
  lElevationAngle: number;
  armSeparationAngle?: number;
  torsoInclination?: number;
}

export interface FrameFeedbackPayload {
  detected: boolean;
  timestamp: number;
  keypoints: Keypoint[];
  activeArm: ActiveArmType;
  angles: PostureAngles;
  score: number; // 0..100
  state: DrillStateType;
  holdProgress: number; // 0.0 .. 1.0
  holdDuration: number; // seconds
  feedbackTip: string;
  gestureName: string;
  gestureNameTh: string;
  isAcceptable: boolean;
}

export interface AssessmentEvent {
  id: string;
  timestampSeconds: number;
  displayTime: string; // e.g. "23:45"
  gestureId: number;
  gestureName: string;
  gestureNameTh: string;
  score: number;
  holdDuration: number;
  status: "excellent" | "needs_improvement" | "poor";
  angles: PostureAngles;
  feedback: string[];
  thumbnailUrl?: string;
}

export interface AssessmentReport {
  sessionId: string;
  traineeName: string;
  matchTitle: string;
  date: string;
  totalCalls: number;
  averageScore: number;
  overallRating: "A" | "B" | "C" | "D";
  categoryScores: {
    restarts: number;
    fouls: number;
    match_control: number;
    offside: number;
  };
  events: AssessmentEvent[];
  topImprovementTips: string[];
}

export interface MicroserviceStatus {
  name: string;
  serviceId: "gateway" | "vision" | "coaching" | "rules" | "assessment";
  status: "online" | "degraded" | "offline" | "simulated";
  latencyMs: number;
  endpoint: string;
}

export interface SystemHealth {
  isSimulated: boolean;
  services: MicroserviceStatus[];
  lastChecked: string;
}

export type PersonTagRole = "Referee" | "Assistant_Referee" | "Player" | "Coach" | "Unknown";

export interface TaggedPerson {
  id: string; // e.g. "person-1", "person-2"
  label: PersonTagRole;
  labelTh: string;
  bbox: [number, number, number, number]; // [normX, normY, normWidth, normHeight]
  confidence: number; // 0..1
  isTagged: boolean; // active subject for posture analysis
  keypoints: Keypoint[];
  angles: PostureAngles;
}

// ==============================================================================
// INSTRUCTIONAL SCENARIO EXAMINATION & TRAINEE GRADEBOOK TYPES
// ==============================================================================

export interface ScenarioDecisionOption {
  id: "A" | "B" | "C" | "D";
  labelTh: string;
  labelEn: string;
  linkedGestureId: number;
  ifabLaw: string;
}

export interface ScenarioExamQuestion {
  id: string;
  questionNumber: number;
  titleTh: string;
  situationSummaryTh: string;
  clipDurationSeconds: number;
  decisionWindowSeconds: number;
  pitchZoneTh: string;
  correctOptionId: "A" | "B" | "C" | "D";
  targetGestureId: number;
  ifabLawReference: string;
  explanationTh: string;
  options: ScenarioDecisionOption[];
}

export interface ScenarioExamPack {
  packId: string;
  titleTh: string;
  levelTh: string;
  passingScore: number;
  questions: ScenarioExamQuestion[];
}

export interface ExamAttemptResult {
  questionId: string;
  selectedOptionId: "A" | "B" | "C" | "D";
  isDecisionCorrect: boolean;
  postureScore: number;
  reactionTimeSeconds: number;
  holdDurationSeconds: number;
  totalQuestionScore: number;
  passed: boolean;
  recordedAngles: PostureAngles;
}

export interface WeaknessDiagnosticItem {
  id: string;
  titleTh: string;
  detailTh: string;
  targetGestureId: number;
  severity: "warning" | "error";
  recommendedDrillLabelTh: string;
}

export interface ExamSessionHistoryItem {
  sessionId: string;
  date: string;
  examTitleTh: string;
  postureAccuracy: number;
  reactionLatencySeconds: number;
  passedCount: number;
  totalQuestions: number;
  passed: boolean;
}

export interface TraineeEvaluationReport {
  reportId: string;
  traineeName: string;
  traineeCode: string;
  classTierTh: string;
  evaluationDate: string;
  overallPostureAccuracy: number;
  accuracyTrendDelta: string;
  completedPacks: number;
  passedPacks: number;
  averageReactionSeconds: number;
  overallGrade: "A" | "B" | "C" | "D";
  categoryCompetency: {
    restarts: number;
    fouls: number;
    match_control: number;
    offside: number;
  };
  weaknessDiagnostics: WeaknessDiagnosticItem[];
  examHistory: ExamSessionHistoryItem[];
  instructorNotes: string[];
}

// ==============================================================================
// MODAL FASTAPI INFERENCE SERVICE TYPES (docs/api_spce/apiSpec.md)
// ==============================================================================

export interface ModalDetection {
  label: string;
  confidence: number;
}

export interface ModalHealthResponse {
  status: "ok" | "error";
  model: string;
  device: string;
  fp16?: boolean;
  cuda?: boolean;
  conf: number;
  imgsz: number;
  latencyMs?: number;
  detail?: string;
}

export interface ModalImagePredictResponse {
  detections: ModalDetection[];
}

export interface ModalVideoFrameResult {
  frame: number;
  time: number;
  detections: ModalDetection[];
}

export interface ModalVideoPredictResponse {
  fps: number;
  frames_read: number;
  results: ModalVideoFrameResult[];
}

export interface ModalWsConfigResponse {
  wsUrl: string;
  baseUrl: string;
  hasApiKey: boolean;
}

export const F1_ZERO_LIMITED_CLASSES = ["Offside", "Goal", "Elbowing"] as const;


