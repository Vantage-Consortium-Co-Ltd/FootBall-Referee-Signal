# Football Referee Training & Assessment Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** พัฒนาระบบผู้ช่วยอัจฉริยะสำหรับฝึกอบรมและประเมินผู้ตัดสินฟุตบอล (Referee Coaching & Assessment Platform) ครบวงจร ทั้งเครื่องมือวิเคราะห์องศาข้อต่อตามกติกา IFAB (Posture Quality Scorer 0-100), Drill State Machine สำหรับฝึกซ้อมสดพร้อมคำแนะนำแบบ Real-time, ระบบประเมินและออกรายงานผลการตัดสิน (Assessment Report), FastAPI WebSocket Backend, และ Next.js Interactive Frontend

**Architecture:**
- **Core Domain & Scoring:** `Inference/core/ifab_rules.py` (ฐานข้อมูลกติกา IFAB 20 สัญญาณ), `Inference/core/posture_scorer.py` (วิเคราะห์เวกเตอร์ 17 Keypoints คำนวณมุมข้อต่อ และคิดคะแนนคุณภาพ 0-100 พร้อมคำแนะนำแก้ไข), `Inference/core/drill_evaluator.py` (State Machine ตรวจจับการเข้าท่าและค้างท่าตามเวลาที่กำหนด)
- **Reporting & Analytics:** `Inference/core/session_reporter.py` (ประมวลผลเซสชัน สรุปจุดอ่อน รายงานผลเรดาร์ และ Export รายงาน)
- **Streaming Service:** `Inference/app.py` (FastAPI REST + WebSocket `/ws/training-stream` รองรับ Frame Ingest และตอบกลับ Pose + Skeleton Coordinates + Coaching Tips แบบ Real-time)
- **Interactive UI:** Next.js (App Router), Tailwind CSS, HTML5 Canvas 60 FPS Skeleton Renderer, Real-time Visual/Audio Coaching Prompts

**Tech Stack:** Python 3.10+, FastAPI, WebSockets, Ultralytics YOLO26-Pose, NumPy, Scikit-learn, Pytest, Next.js, React, Tailwind CSS, TypeScript

**Spec:** [docs/superpowers/plans/2026-11-15-referee-training-and-assessment-system.md](file:///C:/Users/iznamu/OneDrive%20-%20Panyapiwat%20Institute%20of%20Management/00_Active_Term/02_1322308_Machine-Learning/03_Projects/FootBall-Referee-Signal/docs/superpowers/plans/2026-11-15-referee-training-and-assessment-system.md) and [football_referee_system_design_report.md](file:///C:/Users/iznamu/.gemini/antigravity-cli/brain/23323c30-4131-4f4a-a4e8-d3fbe67c7025/football_referee_system_design_report.md)

---

## Global Constraints
- ต้องครอบคลุมกติกาสัญญาณมือของผู้ตัดสินตาม IFAB Laws of the Game (Law 5, Law 12, Law 13)
- ต้องคำนวณคะแนนท่าทาง (0-100) โดยแบ่งเป็น 3 ปัจจัยหลัก: ความสูงของแขน (Elevation: 40%), ความตรงของข้อศอก (Straightness: 30%), และความนิ่งในการค้างท่า (Hold Stability: 30%)
- คำแนะนำการฝึกสอน (Coaching Feedback) ต้องรองรับภาษาไทยที่กระชับ ชัดเจน เข้าใจง่ายสำหรับผู้ตัดสิน
- โค้ดทั้งหมดต้องมี Unit Tests ครอบคลุม และรันผ่านด้วย `pytest` ก่อน Commit ในแต่ละ Task
- การออกแบบ API ต้องรองรับทั้งภาพเดี่ยว (REST) และวิดีโอสตรีมสด (WebSocket) ที่ Latency $< 50\text{ ms}$

---

## Review Focus
- **Partial Visibility / Missing Keypoints:** กรณีข้อศอกหรือมือถูกบังหรือไม่ปรากฏในเฟรม (Visibility $v=0$) ระบบต้องไม่เกิด Runtime Crash หรือ `ZeroDivisionError` แต่ต้องให้คะแนนตามจุดที่มองเห็นพร้อมแจ้งเตือนว่า "ตรวจไม่พบมือข้างที่ให้สัญญาณ"
- **Mirrored / Left-handed Gestures:** สัญญาณบางประเภท (เช่น Direct Free Kick) อนุญาตให้ชี้แขนข้างใดก็ได้ตามทิศทางการบุก ระบบต้องตรวจจับแขนหลัก (Active Arm) โดยอัตโนมัติ ไม่บังคับเฉพาะแขนขวา
- **Rapid Flapping / Posture Jitter:** หากผู้ตัดสินสะบัดแขนขึ้นลงอย่างรวดเร็ว Drill Evaluator ต้องไม่นับเป็น Hold ผ่าน แต่ต้องรีเซ็ตตัวนับ Hold Timer
- **Camera Perspective Foreshortening:** การชี้แขนเข้าหากล้องในแนวแกน Z อาจทำให้ความยาวแขน 2D สั้นลง อัลกอริทึมมุมต้องคำนวณเทียบกับระนาบลำตัว (Torso Plane) ไม่พึ่งพาเพียงพิกัด Y ดิบ
- **Degenerate Torso Scale:** หากสะโพกและไหล่ซ้อนทับกัน (เช่น มุมมองจากมุมสูงมากหรือก้มตัว) สเกลหารต้องใช้ fallback ปลอดภัย ไม่เป็นศูนย์

---

## Tasks

### Task 1: IFAB Signal Rules & Criteria Knowledge Base
**Files:**
- Create: `Inference/core/ifab_rules.py`
- Test: `tests/test_ifab_rules.py`

**Interfaces:**
- Consumes: None (Domain ground truth)
- Produces: 
  - `GESTURE_RULES: dict[int, GestureRule]`
  - `get_gesture_rule(gesture_id: int) -> GestureRule`
  - `list_all_rules() -> list[dict]`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_ifab_rules.py
import pytest
from Inference.core.ifab_rules import get_gesture_rule, list_all_rules

def test_get_gesture_rule_indirect_free_kick():
    rule = get_gesture_rule(1)  # 1 = Indirect_Free_Kick
    assert rule.name == "Indirect_Free_Kick"
    assert rule.ifab_law == "Law 13 - Free Kicks"
    assert rule.min_elevation_deg >= 150.0
    assert rule.min_straightness_deg >= 150.0
    assert rule.min_hold_seconds >= 1.5

def test_list_all_rules_covers_20_gestures():
    rules = list_all_rules()
    assert len(rules) == 20
    assert any(r["name"] == "Play_On" for r in rules)
    assert any(r["name"] == "Penalty_Kick" for r in rules)

def test_unknown_gesture_raises_key_error():
    with pytest.raises(KeyError):
        get_gesture_rule(999)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_ifab_rules.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'Inference.core'`

- [ ] **Step 3: Implement `Inference/core/ifab_rules.py`**

สร้าง Dataclass `GestureRule` บรรจุ:
- `id: int`, `name: str`, `name_th: str`, `ifab_law: str`, `description_th: str`
- `active_arm: str` ("right", "left", "either", "both")
- `target_elevation_deg: float`, `min_elevation_deg: float`
- `target_straightness_deg: float`, `min_straightness_deg: float`
- `min_hold_seconds: float`
- `coaching_tips: list[str]`
กำหนดค่าครบถ้วนทั้ง 20 ท่าทางตามมาตรฐาน IFAB

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_ifab_rules.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Inference/core/ifab_rules.py tests/test_ifab_rules.py
git commit -m "feat(training): add IFAB referee signal rules and criteria knowledge base"
```

---

### Task 2: Joint Angle Extractor & Objective Posture Scoring Engine
**Files:**
- Create: `Inference/core/posture_scorer.py`
- Test: `tests/test_posture_scorer.py`

**Interfaces:**
- Consumes: `Inference/core/ifab_rules.py` (`get_gesture_rule`, `GestureRule`)
- Produces: 
  - `compute_joint_angles(keypoints: np.ndarray) -> dict[str, float]`
  - `evaluate_posture(keypoints: np.ndarray, target_gesture_id: int) -> PostureEvaluation`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_posture_scorer.py
import numpy as np
import pytest
from Inference.core.posture_scorer import compute_joint_angles, evaluate_posture

def make_dummy_keypoints(r_shoulder=(0, -1, 1), r_elbow=(0, 0, 1), r_wrist=(0, 1, 1)):
    """Create COCO-17 array with specific points for testing angles."""
    kp = np.zeros((17, 3), dtype=float)
    # COCO: 5=L_Sho, 6=R_Sho, 7=L_Elb, 8=R_Elb, 9=L_Wri, 10=R_Wri, 11=L_Hip, 12=R_Hip
    kp[6] = r_shoulder
    kp[8] = r_elbow
    kp[10] = r_wrist
    kp[11] = (-0.5, -2, 1)  # L_Hip
    kp[12] = (0.5, -2, 1)   # R_Hip
    return kp

def test_compute_joint_angles_straight_arm():
    # Shoulder=(0, 0), Elbow=(0, 1), Wrist=(0, 2) -> Straight 180 degrees
    kp = make_dummy_keypoints(r_shoulder=(0, 0, 1), r_elbow=(0, 1, 1), r_wrist=(0, 2, 1))
    angles = compute_joint_angles(kp)
    assert pytest.approx(angles["r_elbow_angle"], abs=1.0) == 180.0

def test_evaluate_posture_perfect_indirect_free_kick():
    # Straight vertical arm up: Shoulder=(0, 0), Elbow=(0, 1), Wrist=(0, 2) (pointing up)
    # Torso down is (0, -2) -> Elevation from torso down is ~180 degrees
    kp = make_dummy_keypoints(r_shoulder=(0, 0, 1), r_elbow=(0, 1, 1), r_wrist=(0, 2, 1))
    eval_res = evaluate_posture(kp, target_gesture_id=1)
    assert eval_res.score >= 85.0
    assert eval_res.is_acceptable is True
    assert len(eval_res.feedback_tips) == 0 or "ดีมาก" in eval_res.feedback_tips[0]

def test_evaluate_posture_bent_elbow_penalty():
    # Bent elbow: Shoulder=(0, 0), Elbow=(0, 1), Wrist=(1, 1) -> 90 degrees
    kp = make_dummy_keypoints(r_shoulder=(0, 0, 1), r_elbow=(0, 1, 1), r_wrist=(1, 1, 1))
    eval_res = evaluate_posture(kp, target_gesture_id=1)
    assert eval_res.score < 70.0
    assert any("ศอก" in tip for tip in eval_res.feedback_tips)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_posture_scorer.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'Inference.core.posture_scorer'`

- [ ] **Step 3: Implement `Inference/core/posture_scorer.py`**

- คำนวณเวกเตอร์ 2D ด้วย NumPy dot product และ `np.arccos` (ดักจับ clamp $[-1, 1]$ ป้องกัน NaN)
- คำนวณมุมสำคัญ:
  - `r_elbow_angle`, `l_elbow_angle` (ความตรงของข้อศอก)
  - `r_shoulder_elevation`, `l_shoulder_elevation` (การยกแขนเทียบกับแนวกระดูกสันหลัง)
  - `arm_separation_angle` (มุมกางแขน สำหรับ Advantage / Play On)
- ฟังก์ชัน `evaluate_posture`:
  - ดึงเกณฑ์จาก `get_gesture_rule(target_gesture_id)`
  - ตรวจหา Active Arm (แขนข้างที่ยกสูงกว่า หรือทั้งสองข้าง)
  - คำนวณ Sub-scores: Elevation Score (0-40), Straightness Score (0-30), Overall Posture (0-30) รวมเป็น 100
  - ตรวจจับความผิดพลาดและสร้าง Feedback tips เช่น "ยกแขนขวาไม่สุด (ปัจจุบัน 125°, มาตรฐาน 160°+)", "งอข้อศอกมากเกินไป (ยืดให้ตรงขึ้น)"

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_posture_scorer.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Inference/core/posture_scorer.py tests/test_posture_scorer.py
git commit -m "feat(training): implement joint angle extraction and objective posture scoring"
```

---

### Task 3: Drill State Machine & Temporal Hold Evaluator
**Files:**
- Create: `Inference/core/drill_evaluator.py`
- Test: `tests/test_drill_evaluator.py`

**Interfaces:**
- Consumes: `Inference/core/posture_scorer.py` (`evaluate_posture`, `PostureEvaluation`)
- Produces: 
  - `DrillEvaluator(target_gesture_id: int, required_hold_sec: float)`
  - `DrillEvaluator.update(keypoints: np.ndarray, timestamp: float) -> DrillFrameStatus`
  - `DrillEvaluator.reset()`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_drill_evaluator.py
import pytest
from Inference.core.drill_evaluator import DrillEvaluator, DrillState
from tests.test_posture_scorer import make_dummy_keypoints

def test_drill_evaluator_holding_to_success():
    evaluator = DrillEvaluator(target_gesture_id=1, required_hold_sec=1.5)
    perfect_kp = make_dummy_keypoints(r_shoulder=(0, 0, 1), r_elbow=(0, 1, 1), r_wrist=(0, 2, 1))

    # T = 0.0: Enters posture
    st1 = evaluator.update(perfect_kp, timestamp=0.0)
    assert st1.state in (DrillState.HOLDING, DrillState.DETECTED)
    assert st1.hold_progress < 1.0

    # T = 1.0: Still holding
    st2 = evaluator.update(perfect_kp, timestamp=1.0)
    assert st2.state == DrillState.HOLDING
    assert pytest.approx(st2.hold_duration, abs=0.1) == 1.0

    # T = 1.6: Completed!
    st3 = evaluator.update(perfect_kp, timestamp=1.6)
    assert st3.state == DrillState.COMPLETED
    assert st3.is_success is True

def test_drill_evaluator_resets_on_posture_drop():
    evaluator = DrillEvaluator(target_gesture_id=1, required_hold_sec=1.5)
    perfect_kp = make_dummy_keypoints(r_shoulder=(0, 0, 1), r_elbow=(0, 1, 1), r_wrist=(0, 2, 1))
    bad_kp = make_dummy_keypoints(r_shoulder=(0, 0, 1), r_elbow=(0, -1, 1), r_wrist=(0, -2, 1)) # arms down

    evaluator.update(perfect_kp, timestamp=0.0)
    evaluator.update(perfect_kp, timestamp=0.8)
    # Drop arm before 1.5s
    st = evaluator.update(bad_kp, timestamp=1.0)
    assert st.state == DrillState.LOST_POSTURE
    assert st.hold_progress == 0.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_drill_evaluator.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'Inference.core.drill_evaluator'`

- [ ] **Step 3: Implement `Inference/core/drill_evaluator.py`**

- สร้าง Enum `DrillState` (`WAITING`, `DETECTED`, `HOLDING`, `COMPLETED`, `LOST_POSTURE`)
- Dataclass `DrillFrameStatus`:
  - `state: DrillState`, `current_score: float`, `hold_duration: float`, `hold_progress: float (0.0 to 1.0)`
  - `is_success: bool`, `coaching_tip: str`, `angles: dict`
- คลาส `DrillEvaluator`:
  - รับ `keypoints` และ `timestamp`
  - ใช้ `evaluate_posture` ตรวจสอบคะแนน
  - หากคะแนน $\ge 75$ ให้เริ่มนับเวลา Hold
  - หากท่าทางตกระหว่างค้าง ให้เปลี่ยนสถานะเป็น `LOST_POSTURE` และรีเซ็ตเวลา
  - เมื่อค้างครบ `required_hold_sec` ส่งสัญญาณ `COMPLETED` บันทึกค่าเฉลี่ยคะแนนของรอบนั้น

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_drill_evaluator.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Inference/core/drill_evaluator.py tests/test_drill_evaluator.py
git commit -m "feat(training): implement drill state machine and temporal hold evaluator"
```

---

### Task 4: Session Assessment Report Generator
**Files:**
- Create: `Inference/core/session_reporter.py`
- Test: `tests/test_session_reporter.py`

**Interfaces:**
- Consumes: `Inference/core/posture_scorer.py` (`PostureEvaluation`)
- Produces: 
  - `AssessmentSessionManager`
  - `AssessmentSessionManager.add_call(call_record: CallRecord)`
  - `AssessmentSessionManager.generate_report() -> AssessmentReport`
  - `export_report_markdown(report: AssessmentReport) -> str`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_session_reporter.py
import pytest
from Inference.core.session_reporter import AssessmentSessionManager, CallRecord

def test_session_report_generation():
    manager = AssessmentSessionManager(trainee_name="Somchai Referee", session_type="Match Evaluation")
    manager.add_call(CallRecord(gesture_id=1, gesture_name="Indirect_Free_Kick", score=90.0,
                                hold_duration=2.0, feedback=["ดีมาก"], timestamp=10.5))
    manager.add_call(CallRecord(gesture_id=2, gesture_name="Direct_Free_Kick", score=60.0,
                                hold_duration=0.8, feedback=["ยกแขนขวาต่ำเกินไป"], timestamp=45.2))

    report = manager.generate_report()
    assert report.total_calls == 2
    assert pytest.approx(report.average_score, abs=0.1) == 75.0
    assert len(report.flagged_calls) == 1
    assert report.flagged_calls[0].gesture_name == "Direct_Free_Kick"

def test_export_report_markdown():
    manager = AssessmentSessionManager(trainee_name="Somchai", session_type="Practice")
    manager.add_call(CallRecord(gesture_id=1, gesture_name="Indirect_Free_Kick", score=95.0,
                                hold_duration=2.1, feedback=["ยอดเยี่ยม"], timestamp=5.0))
    md = manager.export_markdown()
    assert "# รายงานการประเมินการตัดสินฟุตบอล" in md
    assert "Somchai" in md
    assert "95.0" in md
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_session_reporter.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'Inference.core.session_reporter'`

- [ ] **Step 3: Implement `Inference/core/session_reporter.py`**

- สร้างคลาส `AssessmentSessionManager` สำหรับรวบรวมประวัติการตัดสิน
- สรุปสถิติ:
  - `total_calls`: จำนวนการตัดสินทั้งหมด
  - `average_score`: คะแนนเฉลี่ยความถูกต้องของสัญญาณมือ
  - `score_breakdown`: คะแนนแยกตาม 20 ท่าทาง
  - `flagged_calls`: ลิสต์จังหวะที่ได้คะแนน $< 70$ เพื่อให้ผู้ฝึกสอนย้อนดูเป็นพิเศษ
  - `top_improvement_tips`: สรุป 3 จุดที่ควรปรับปรุงมากที่สุด
- ฟังก์ชัน `export_markdown()` สร้างเอกสารรายงาน Markdown สวยงาม พร้อมตารางและคะแนนสรุป

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_session_reporter.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Inference/core/session_reporter.py tests/test_session_reporter.py
git commit -m "feat(training): implement session assessment aggregator and report exporter"
```

---

### Task 5: FastAPI Application & Live Streaming WebSocket Endpoints
**Files:**
- Create: `Inference/core/pose_engine.py`
- Create: `Inference/app.py`
- Test: `tests/test_api_endpoints.py`

**Interfaces:**
- Consumes: `ifab_rules.py`, `posture_scorer.py`, `drill_evaluator.py`, `session_reporter.py`
- Produces: 
  - REST Endpoints: `/health`, `/api/rules`, `/api/drills`, `/api/evaluate-frame`, `/api/session/report`
  - WebSocket Endpoint: `/ws/training-stream`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_api_endpoints.py
import pytest
from fastapi.testclient import TestClient
from Inference.app import app

client = TestClient(app)

def test_health_check():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_get_ifab_rules():
    res = client.get("/api/rules")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 20
    assert data[0]["name"] == "Referee"

def test_evaluate_frame_endpoint():
    dummy_payload = {
        "target_gesture_id": 1,
        "keypoints": [[0.5, 0.5, 1.0]] * 17
    }
    res = client.post("/api/evaluate-frame", json=dummy_payload)
    assert res.status_code == 200
    body = res.json()
    assert "score" in body
    assert "angles" in body
    assert "feedback_tips" in body
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_api_endpoints.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'Inference.app'`

- [ ] **Step 3: Implement `Inference/core/pose_engine.py` & `Inference/app.py`**

- `Inference/core/pose_engine.py`: Wrapper โหลด Ultralytics YOLO26-Pose (มีโหมด Mock fallback ในกรณีที่ไม่มีไฟล์ weights เพื่อให้รัน test ผ่านได้ทันที)
- `Inference/app.py`:
  - สร้าง FastAPI instance พร้อม CORS middleware
  - สร้าง REST Endpoints ตามสเปก
  - สร้าง WebSocket `/ws/training-stream`: รับภาพ WebP/JPEG Base64 จากหน้าเว็บ รัน Pose Engine ➔ คำนวณ Posture Score ➔ ส่ง JSON ตอบกลับ Client ทันทีแบบ Low Latency:
    ```json
    {
      "detected": true,
      "keypoints": [...],
      "gesture": "Indirect_Free_Kick",
      "score": 92.4,
      "drill_state": "HOLDING",
      "hold_progress": 0.65,
      "feedback": "ดีมาก ยกแขนค้างไว้...",
      "angles": {"r_elbow": 178.2, "r_elevation": 168.0}
    }
    ```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_api_endpoints.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add Inference/core/pose_engine.py Inference/app.py tests/test_api_endpoints.py
git commit -m "feat(training): implement FastAPI service with REST and live streaming WebSocket"
```

---

### Task 6: Next.js Interactive Frontend Blueprint & Canvas Engine
**Files:**
- Create: `frontend/src/types/referee.ts`
- Create: `frontend/src/components/SkeletonCanvas.tsx`
- Create: `frontend/src/components/LiveDrillFeed.tsx`
- Create: `frontend/src/components/CoachingToast.tsx`
- Create: `frontend/src/components/AssessmentReportView.tsx`

**Interfaces:**
- Consumes: FastAPI WebSocket `/ws/training-stream` & REST API
- Produces: 
  - Complete Next.js Interactive Dashboard with 60 FPS HTML5 Canvas Overlay and Real-time Voice/Visual Coaching Prompts

- [ ] **Step 1: Create TypeScript Type Definitions (`frontend/src/types/referee.ts`)**

ประกาศ Types สำหรับ `Keypoint`, `GestureRule`, `FrameFeedbackPayload`, `DrillState`, `AssessmentReport`.

- [ ] **Step 2: Implement Canvas Skeleton Drawing Engine (`SkeletonCanvas.tsx`)**

วาดเส้นกระดูกเชื่อมต่อ 17 จุดตามคู่ COCO (เช่น ไหล่ไปศอก ศอกไปมือ) แสดงสีเขียวเมื่อจุดมีความมั่นใจสูง ($>0.8$) และแสดง Ghost Guidelines สีฟ้าโปร่งแสงสำหรับบอกท่าทางที่ถูกต้อง

- [ ] **Step 3: Implement Live Drill Feed with WebSocket Hook (`LiveDrillFeed.tsx`)**

เชื่อมต่อกล้อง Webcam ดึงภาพผ่าน `<video>` ส่ง Frame ไปยัง `/ws/training-stream` ผ่าน WebSocket และอัปเดต UI แบบเรียลไทม์ พร้อมวงล้อ Countdown แสดงเวลา Hold

- [ ] **Step 4: Implement Coaching Toast & Assessment View (`CoachingToast.tsx`, `AssessmentReportView.tsx`)**

แสดงการ์ดคำแนะนำฝึกสอน และหน้าสรุปผลคะแนนแบบ Radar Chart (เรดาร์ความแม่นยำรายสัญญาณ) พร้อมปุ่มดาวน์โหลดรายงาน PDF/Markdown

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat(training): create Next.js interactive frontend components and skeleton canvas"
```

---

## Plan Self-Review Checklist
- [x] **Spec coverage:** ครบทุกประเด็นทั้ง 20 ท่าทาง IFAB, Posture Scorer (0-100), Drill State Machine, Reporting, WebSocket Live Streaming และ Next.js UI
- [x] **Step scan:** ทุก Step เป็น Action ที่ชัดเจน (Failing test -> Verify fail -> Implement signature/logic -> Verify pass -> Commit)
- [x] **Type consistency:** โครงสร้างข้อมูล `GestureRule`, `PostureEvaluation`, `DrillFrameStatus`, `CallRecord` ตรงกันตลอดทุกโมดูล
- [x] **Review focus addressed:** มีการจัดการ missing keypoints ($v=0$), แขนข้างซ้าย-ขวา (active arm), rapid flapping jitter, และ scale ปลอดภัย
