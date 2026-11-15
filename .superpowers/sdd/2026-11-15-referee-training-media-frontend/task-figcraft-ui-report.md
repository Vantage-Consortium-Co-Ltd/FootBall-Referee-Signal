# Task Report: FigCraft UI Design & Prototype Generation

**Status:** DONE  
**Git Commit:** `85ea4eeea1a49d4faed9b1bef53feab05bbf2ee1`  
**Execution Timestamp:** 2026-11-15T12:20:08+07:00  

---

## 1. Executive Summary

In accordance with user instructions (*"ทำ ui ใน figcraft ก่อน"*), the complete high-fidelity UI/UX design prototype for the **Football Referee AI Assistant & Training Academy Platform** has been created using `figcraft-cli`. 

The design follows the **Untitled UI React Design System** and implements the **Adaptive Dual Theme** architecture specified in `docs/superpowers/specs/2026-11-15-referee-ui-design-untitledui-figcraft.md`.

All 4 target screens (1440x900 resolution each) have been constructed side by side with 100px gaps, exported to PNG renders, and saved into a native `.figcraft` project containing **620 design nodes**.

---

## 2. Generated Deliverables

| Deliverable | Path | Description / Node Count |
|---|---|---|
| **Native FigCraft Project** | `docs/figcraft/Referee_Academy_UI.figcraft` | 620 nodes across 4 top-level frames (1440x900) |
| **Generator Script** | `docs/figcraft/scripts/generate_figcraft_ui.py` | Python script building pixel-perfect command batches |
| **Command Script JSON** | `docs/figcraft/scripts/figcraft_commands.json` | 619 UTF-8 JSON commands executed by FigCraft CLI |
| **Screen 1 Render** | `docs/figcraft/renders/Screen1_Live_Drills.png` | Live Practice & Tagging Studio (Pitch Dark #090D16) |
| **Screen 2 Render** | `docs/figcraft/renders/Screen2_Scenario_Exam.png` | Scenario Examination Studio (Pitch Dark #090D16) |
| **Screen 3 Render** | `docs/figcraft/renders/Screen3_IFAB_Handbook.png` | IFAB Digital Learning Handbook (Clean Light #F9FAFB) |
| **Screen 4 Render** | `docs/figcraft/renders/Screen4_Trainee_Gradebook.png` | Trainee Performance Gradebook (Clean Light #F9FAFB) |

---

## 3. Screen Specifications & Design Details

### Frame 1: Screen 1 - Live Practice Studio (`/drills`)
- **Theme:** Pitch Dark (`#090D16`, cards `#0F172A`, borders `#1E293B`).
- **Header Bar:**
  - Logo `⚽ Referee Academy AI`, Breadcrumbs `หน้าหลัก / แบบฝึกหัดสด / ฟรีคิกทางอ้อม (IFAB Law 13)`.
  - Status Badge: `🟢 Microservices Online (31.4 FPS)`, `⚡ Latency: 14.2ms`, `⏱ 00:14:25 Session`.
  - Trainee profile: `อัศวิน (Level 2)` and dark theme toggle.
- **Main Viewport Area:**
  - 16:9 dark video canvas with `🔴 LIVE WEBCAM FEED (1080p 60FPS)` & `YOLOv8x-Pose (ONNX TensorRT)`.
  - **Tactical Person Tagging Reticle:** Cyan brackets around referee `[🎯 TAGGED: REFEREE (98.4% Confidence)]`.
  - Secondary untagged person bounding box: `[👤 Player #10 (คลิกเพื่อสลับ Tag)]`.
  - **COCO 17-Keypoint Skeleton Overlay:** Bones in cyan (`#22D3EE`), joints in emerald (`#34D399`), with raised right arm demonstrating 176° vertical extension.
  - **Ghost Guideline:** Translucent guide showing IFAB Law 13 180° ideal target elevation.
  - **Angle Badges:** `📐 176° (มุมยกแขน)`, `ศอกเหยียด 172° ✓`, `แขนซ้ายแนบลำตัว 24°`.
  - Floating action bar: camera toggle, mirror view, ghost toggle, angle toggle, auto-tag button.
  - Real-time telemetry waveform stream showing 98.2% stability across 40 continuous sampling bars.
- **Right Sidebar (Coaching HUD):**
  - **Circular Hold Progress Timer:** `1.2s / 1.5s` countdown with score `94 / 100` (`#10B981`) and `EXCELLENT POSTURE FORM`.
  - **Dynamic Live Coaching Toast:** Success banner explaining IFAB Law 13 compliance.
  - **Linear Progress Gauges:** Shoulder elevation (98%), elbow straightness (95%), torso vertical alignment (99%).
  - **Drill Selector Accordion:** 4 drills list with active status and category filters.

---

### Frame 2: Screen 2 - Scenario Examination Studio (`/examination`)
- **Theme:** Pitch Dark (`#090D16`, cards `#0F172A`).
- **Header Bar:**
  - Exam module: `ชุดข้อสอบ: IFAB Law 12 - การทำฟาวล์และการประพฤติผิด (Fouls & Misconduct)`.
  - Progress: `คำถามข้อที่ 1 / 5` with 20% progress indicator and countdown timer `⏳ เวลาสอบเหลือ: 04:32`.
- **Left Column:**
  - **Scenario Video Player:** Match clip playback at minute 73 (penalty area tackle), slow-motion 0.5x, with pitch lines, penalty spot, defender slide tackle, striker trip, and referee perspective.
  - **5-Second Reaction Timer:** Amber countdown progress bar showing remaining decision window (2.4s).
  - **Decision Panel:** 4 cards grid (Direct Free Kick, Indirect Free Kick, Penalty Kick [Selected with cyan border], Advantage).
- **Right Column:**
  - **Live Trainee Camera Posture HUD:** Live posture capture showing referee pointing arm down at 44° towards penalty spot, green skeleton overlay, and detection badge `🎯 ตรวจพบสัญญาณ: จุดโทษ (PENALTY KICK) [ความเชื่อมั่น 97.2%]`.
  - **Freeze Frame Result Inspector Modal:** Emerald card (`#022C22`) displaying score `92 / 100` (Grade A+), peak extension at 00:04.62, checklist verification (Law 12/14, 44° elevation, 1.8s hold, 95.4% stability), replay button, and next question button.

---

### Frame 3: Screen 3 - IFAB Digital Learning Handbook (`/handbook`)
- **Theme:** Clean Minimalist Light Mode (`#F9FAFB`, cards `#FFFFFF`, borders `#EAECF0`).
- **Header Bar:** Navigation links for Drills, Exam, Handbook (Active), and Gradebook.
- **Left Area:**
  - Heading: Official 20 Referee Signals catalog for 2025/2026.
  - Search box with magnifying glass and category filter pills (`ทั้งหมด 20`, `ลูกตั้งเตะ 6`, `การทำฟาวล์ 5`, `การควบคุมเกม 5`, `การล้ำหน้า & VAR 4`).
  - **3-Column Signal Cards Grid:**
    - Card 1: Direct Free Kick (Law 13)
    - Card 2: Indirect Free Kick (Law 13 - Inspected/Active)
    - Card 3: Penalty Kick (Law 14)
    - Card 4: Advantage Play-on (Law 5)
    - Card 5: Corner Kick (Law 17)
    - Card 6: VAR Review TV Signal (Law 5)
    - Each card includes Law badges, anatomical posture thumbnail, metric pills (angles, hold duration, body orientation), and CTA button.
- **Right Area (Slide-over Deep Dive Rule Inspector Drawer):**
  - Detailed anatomical diagram with tolerance specs (elevation 170°-180°, elbow straightness > 165°).
  - Common mistakes warning callout box.
  - Official IFAB rulebook quote.
  - AI scoring weights breakdown (40% elbow, 30% posture, 30% hold duration).
  - Primary CTA: *"เริ่มฝึกซ้อมท่านี้ใน Live Studio (/drills)"*.

---

### Frame 4: Screen 4 - Trainee Performance Gradebook (`/gradebook`)
- **Theme:** Clean Minimalist Light Mode (`#F9FAFB`, cards `#FFFFFF`, borders `#EAECF0`).
- **Header Bar:** Trainee profile `อัศวิน วิทักษ์ (REF-2026-092)`, PDF report export button, and certificate preview CTA.
- **Top Metrics Row (4 Untitled UI Stat Cards):**
  1. Overall Accuracy: `88.4%` (+4.2% trend, 142 drills).
  2. Scenarios Passed: `24 / 28` (85.7% pass rate, IFAB Category 2).
  3. Avg Reaction Time: `1.35s` (-0.22s faster, IFAB target < 1.50s).
  4. Readiness Tier: `ระดับ 3 (Class 3)` (Ready for national promotion, 884/1000 XP).
- **Middle Section:**
  - **4-Quadrant Competency Radar Chart:** Concentric diamond rings with 4 axes (Restarts 92%, Fouls 86%, Advantage 74%, Offside & VAR 94%), rendered with filled polygon (`#0E749033`) and individual competency progress bars.
  - **Weakness Diagnostics & Action Plan:** Warning callout for Advantage arm spread angle (32° vs 45° standard), success callout for Offside/Free Kicks (177° elbow straightness), and recommended drill CTA.
- **Bottom Section (Exam Attempts History Data Table):**
  - Table headers: Session ID, Date & Time, Exam Module, Questions, Score, Avg Latency, Status/Badge, Action.
  - 5 detailed assessment rows with green `PASSED (A+)` and amber `NEEDS REVIEW` badges.
  - Official Certificate validation banner: `CERT-IFAB-2026-THA-092`.

---

## 4. Verification & Validation Evidence

Running `figcraft-cli info docs/figcraft/Referee_Academy_UI.figcraft`:
```text
docs/figcraft/Referee_Academy_UI.figcraft — Referee_Academy_UI (620 nodes, 0 styles, 0 variables, 0 images)
page 1 "Page 1": 619 nodes, 4 top-level
  2 FRAME "Screen1_Live_Drills" 1440.0×900.0
  3 FRAME "Screen2_Scenario_Exam" 1440.0×900.0
  4 FRAME "Screen3_IFAB_Handbook" 1440.0×900.0
  5 FRAME "Screen4_Trainee_Gradebook" 1440.0×900.0
```

All 4 frames exported to high-resolution PNG images:
- `docs/figcraft/renders/Screen1_Live_Drills.png` (258 KB)
- `docs/figcraft/renders/Screen2_Scenario_Exam.png` (235 KB)
- `docs/figcraft/renders/Screen3_IFAB_Handbook.png` (345 KB)
- `docs/figcraft/renders/Screen4_Trainee_Gradebook.png` (327 KB)

---

## 5. Next Steps

The design prototype is ready for frontend implementation in `Front_End/` as outlined in `docs/superpowers/plans/2026-11-15-referee-training-media-frontend.md`:
1. Task 1: FastAPI Video Streaming & Scenario Engine endpoints.
2. Task 2: Video Drill Player & Examination components.
3. Task 3: Interactive Signal Rulebook Catalog.
4. Task 4: Trainee Gradebook & Radar Chart view.
