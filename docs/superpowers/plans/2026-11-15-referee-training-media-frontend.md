# Football Referee Educational & Training Media Platform (Front_End) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** พัฒนาระบบ Web Application ส่วนหน้า (Front_End) สื่อการเรียนการสอนและระบบฝึกอบรมประเมินผลผู้ตัดสินฟุตบอล (Interactive Instructional & Trainee Assessment Platform) ตามมาตรฐาน IFAB 20 ท่าทาง โดยใช้ Next.js 14/15 (App Router), React, TypeScript, Tailwind CSS และ Untitled UI React Design System ซึ่งเป็นระบบสำหรับ **การเรียนการสอน การฝึกปฏิบัติ และการทดสอบวัดผลผู้เรียนผู้ตัดสินเท่านั้น** (ไม่มีการตรวจแมตช์จริงหรือ VAR)

**Architecture:**
- **Decoupled Microservices-Aware Frontend:** เชื่อมต่อกับ Backend ผ่าน API Gateway (WebSocket `/ws/training-stream` และ REST `/api/v1/*`) พร้อมมี `Microservices_Mock.ts` แบบ In-browser จำลองการทำงานของ Vision Service, Coaching Engine, Rules Catalog และ Trainee Evaluation Engine 100% แบบ Standalone
- **4 Core Educational Modules (App Router):**
  1. `/drills` (Interactive Lesson & Live Practice Studio): ห้องเรียนฝึกปฏิบัติสัญญาณสดผ่านกล้อง พร้อม Ghost Guideline, Angle Gauges, Hold Countdown Timer, และ Instant Coaching HUD
  2. `/examination` (Instructional Scenario Exam Studio): ห้องทดสอบภาคปฏิบัติผ่านสถานการณ์จำลอง (Scenario Clips) วัดผลการตัดสิน ความแม่นยำของท่าทาง และเวลาตอบสนอง (Reaction Time)
  3. `/handbook` (IFAB Digital Learning Handbook & Signals Curriculum): คลังสื่อการเรียนการสอนดิจิทัล 20 ท่าทาง พร้อมไดอะแกรมมุมข้อต่อ, ข้อผิดพลาดที่พบบ่อย (Common Mistakes), และปุ่มลัดเริ่มฝึกซ้อม
  4. `/gradebook` (Trainee Performance Gradebook & Analytics): สมุดบันทึกผลการประเมินผู้เรียน, เรดาร์ชาร์ตสมรรถนะ 4 ด้าน, วิเคราะห์จุดอ่อนรายบุคคล, และใบรับรองผลการฝึกอบรม (Certificate / Report Summary)
- **High-Performance Canvas Rendering:** `Skeleton_Canvas.tsx` วาดโครงกระดูก 17 จุด (COCO) อัตรา 60 FPS พร้อมวงกลมวัดองศาข้อต่อ, เส้นไกด์เป้าหมายโปร่งแสง (Ghost Guide), และ Tactical Tagging Reticle เล็งเป้าหมายผู้ตัดสิน

**Tech Stack:** Next.js (App Router), React 18/19, TypeScript, Tailwind CSS, Lucide React, HTML5 Canvas API, SVG Gauges & Charts (Untitled UI Design System)

**Spec:**
- [docs/superpowers/specs/2026-11-15-referee-ui-design-untitledui-figcraft.md](file:///C:/Users/iznamu/OneDrive - Panyapiwat Institute of Management/00_Active_Term/02_1322308_Machine-Learning/03_Projects/FootBall-Referee-Signal/docs/superpowers/specs/2026-11-15-referee-ui-design-untitledui-figcraft.md)
- [brain/referee_ui_design_untitledui_spec.md](file:///C:/Users/iznamu/.gemini/antigravity-cli/brain/23323c30-4131-4f4a-a4e8-d3fbe67c7025/referee_ui_design_untitledui_spec.md)

---

## Global Constraints

- โค้ด Frontend ทั้งหมดต้องอยู่ในโฟลเดอร์ `Front_End/` เท่านั้น
- ทุกชื่อไฟล์และโฟลเดอร์ใหม่ต้องใช้รูปแบบ **Pascal_Snake_Case** (เช่น `Front_End/src/UI_Components/Scenario_Exam/Scenario_Player.tsx`)
- ระบบนี้คือ **สื่อการเรียนการสอนและประเมินผลผู้เรียนผู้ตัดสินเท่านั้น** ห้ามมีฟังก์ชัน VAR หรือ Match Review ของการแข่งขันจริง 90 นาที
- ต้องรองรับการทำงานแบบ **Offline Standalone Demo** ผ่าน `Microservices_Mock.ts` ได้อย่างสมบูรณ์แบบโดยไม่ต้องพึ่งพาเซิร์ฟเวอร์ภายนอก
- ดีไซน์ UI ต้องสอดคล้องกับ **Untitled UI React Components System** และรองรับ Adaptive Dual Theme (Pitch Dark Mode สำหรับห้องฝึกซ้อม/สอบสด และ Clean Light Mode สำหรับคู่มือ/สมุดบันทึกผล)
- ทุก Task ต้องคอมไพล์ผ่าน `npm run build` โดยไม่มี TypeScript หรือ ESLint Errors (0 Warnings/Errors)

---

## Review Focus

1. **Strict Educational Framing:** ตรวจสอบว่าไม่มีหน้าหรือคำศัพท์เกี่ยวกับ "Live Match Review" หรือ "VAR 90-minute Scrubber" หลงเหลืออยู่ใน UI หรือ Data Types ทั้งหมดต้องถูกปรับเป็น "Instructional Scenario Examination", "Trainee Gradebook", "Drill Studio" และ "Curriculum Handbook"
2. **Webcam Fallback in Examination:** เมื่อเข้าห้องสอบสถานการณ์จำลอง (`/examination`) หากเครื่องผู้เรียนไม่มีเว็บแคมหรือปฏิเสธสิทธิ์กล้อง ระบบต้องเปิดโหมด "Interactive Video Simulation" ให้ผู้เรียนกดเลือกคำตัดสินและดูการจำลองท่าทางได้ทันทีโดยไม่ติดขัด
3. **Reaction Time & Hold Countdown Fidelity:** ในการสอบวัดผล ตัวจับเวลาตอบสนอง (Reaction Latency) และตัวนับเวลาค้างท่าทาง (Hold Timer 1.0 - 2.0s) ต้องคำนวณอย่างเที่ยงตรง ไม่แกว่งตาม FPS ของหน้าจอ
4. **Adaptive Dark/Light Theme Switching:** หน้าห้องฝึกซ้อม (`/drills`) และห้องสอบ (`/examination`) ต้องใช้ธีม Pitch Dark (`bg-slate-950`) เพื่อความชัดเจนของกล้องและ Canvas ขณะที่หน้าคู่มือ (`/handbook`) และสมุดคะแนน (`/gradebook`) ต้องเป็น Untitled UI Clean Minimalist
5. **Multi-Person Tagging Disambiguation:** ในกรณีที่กล้องตรวจพบมากกว่า 1 คนในห้องเรียน (เช่น วิทยากรและผู้เรียน) ต้องสามารถคลิกเลือก Tag ตัวบุคคลที่ต้องการประเมินได้ชัดเจนผ่าน Reticle

---

## Tasks

### Task 1: Scaffolding, Core Types & Educational Microservices Mock Adapter (Completed & Refined)
**Files:**
- Existing: `Front_End/package.json`
- Existing: `Front_End/tsconfig.json`
- Existing: `Front_End/tailwind.config.ts`
- Modify: `Front_End/src/Data_Types/Referee_Types.ts`
- Modify: `Front_End/src/Core_Lib/Microservices_Mock.ts`
- Existing: `Front_End/src/Data_Sources/Ifab_Signals.json`

**Interfaces:**
- Consumes: None
- Produces: 
  - Educational TypeScript Interfaces: `TraineeProfile`, `ScenarioExamPack`, `ExamQuestion`, `ExamAttemptResult`, `TraineeGradebookReport`, `TaggedPerson`
  - Refactored `Microservices_Mock.ts` ที่มี Scenario Question Banks และ Mock Trainee Assessment Reports

- [x] **Step 1: Setup Next.js Project Structure in `Front_End/`**
- [x] **Step 2: Define Core TypeScript Interfaces (`Referee_Types.ts`)**
- [ ] **Step 3: Refine Types for Educational Examination (`Referee_Types.ts`)**
  - เปลี่ยนจาก `AssessmentReport` แบบเดิมเป็น `TraineeEvaluationReport` และเพิ่ม `ScenarioExamQuestion` สำหรับชุดข้อสอบภาคปฏิบัติ
- [ ] **Step 4: Update Mock Adapter with Instructional Scenario Clips & Exam Packs (`Microservices_Mock.ts`)**
- [ ] **Step 5: Verify Typecheck & Commit**

```bash
cd Front_End && npm run build
git add Front_End/src/Data_Types/ Front_End/src/Core_Lib/
git commit -m "feat(types): refine data models and mock adapter for referee educational media platform"
```

---

### Task 2: 60 FPS HTML5 Canvas Skeleton & Ghost Target Guideline Engine (Completed)
**Files:**
- Existing: `Front_End/src/UI_Components/Canvas_Engine/Canvas_Utils.ts`
- Existing: `Front_End/src/UI_Components/Canvas_Engine/Skeleton_Canvas.tsx`
- Existing: `Front_End/src/UI_Components/Canvas_Engine/index.ts`

**Interfaces:**
- Consumes: `Keypoint[]`, `GestureRule`, `PostureAngles`, `TaggedPerson[]`
- Produces: `<Skeleton_Canvas />` รองรับ 60 FPS Canvas overlay, Ghost Target Guide, Angle Arc Badge, และ Tactical Reticle Selection

- [x] **Step 1: Implement Canvas Utilities (`Canvas_Utils.ts`)**
- [x] **Step 2: Implement `Skeleton_Canvas.tsx` with Ghost Guideline and Reticle**
- [x] **Step 3: Verification with Component Rendering**
- [x] **Step 4: Commit**

```bash
git add Front_End/src/UI_Components/Canvas_Engine/
git commit -m "feat(canvas): implement high-dpi skeleton canvas with ghost target guideline"
```

---

### Task 3: Interactive Signal Practice Drill Studio with Real-Time Coaching HUD (Completed)
**Files:**
- Existing: `Front_End/src/UI_Components/Drill_Practice/Coaching_HUD.tsx`
- Existing: `Front_End/src/UI_Components/Drill_Practice/Drill_Selector.tsx`
- Existing: `Front_End/src/UI_Components/Drill_Practice/Live_Drill_Feed.tsx`
- Existing: `Front_End/src/UI_Components/Drill_Practice/index.ts`
- Existing: `Front_End/src/app/drills/page.tsx`

**Interfaces:**
- Consumes: `Microservices_Mock`, `Skeleton_Canvas`, `Ifab_Signals.json`
- Produces: Interactive Drill Studio at route `/drills` with Circular Hold Timer, Dynamic Coaching Toast, and Person Tagging Bar

- [x] **Step 1: Implement Drill Selector Accordion (`Drill_Selector.tsx`)**
- [x] **Step 2: Implement Real-Time Coaching HUD (`Coaching_HUD.tsx`)**
- [x] **Step 3: Implement Live Video/Webcam Stream & Person Tagging (`Live_Drill_Feed.tsx`)**
- [x] **Step 4: Build Practice Studio Page (`src/app/drills/page.tsx`) & Verify Build**
- [x] **Step 5: Commit**

```bash
git add Front_End/src/UI_Components/Drill_Practice/ Front_End/src/app/drills/
git commit -m "feat(drills): build live practice drill studio with camera tagging and coaching HUD"
```

---

### Task 4: Instructional Scenario Examination & Trainee Practical Evaluation Studio (`/examination`)
**Files:**
- Create: `Front_End/src/UI_Components/Scenario_Exam/Scenario_Player.tsx`
- Create: `Front_End/src/UI_Components/Scenario_Exam/Exam_Question_Prompt.tsx`
- Create: `Front_End/src/UI_Components/Scenario_Exam/Exam_Live_Detector.tsx`
- Create: `Front_End/src/UI_Components/Scenario_Exam/Exam_Result_Inspector.tsx`
- Create: `Front_End/src/UI_Components/Scenario_Exam/index.ts`
- Create: `Front_End/src/app/examination/page.tsx`

**Interfaces:**
- Consumes: `ScenarioExamPack`, `Microservices_Mock`, `Skeleton_Canvas`
- Produces: Complete Scenario Practical Examination Studio at route `/examination`

- [ ] **Step 1: Implement Instructional Scenario Video Player (`Scenario_Player.tsx`)**
  - แสดงคลิปวิดีโอตัวอย่างสถานการณ์การแข่งขันสั้น (10-15 วินาที) สำหรับใช้เป็นโจทย์ทดสอบ (เช่น จังหวะแฮนด์บอล, สกัดฟาวล์ตัดเกม, ลูกล้ำหน้า)
  - มีแถบ Progress และตัวนับถอยหลังก่อนหมดจังหวะคลิปเพื่อเตือนผู้เรียนให้เตรียมตัวให้สัญญาณ
  - รองรับทั้งการเล่นคลิปวิดีโอจริงและการจำลองสถานการณ์กราฟิก (Scenario Graphics Preview)
- [ ] **Step 2: Implement Exam Question Prompt & Decision Panel (`Exam_Question_Prompt.tsx`)**
  - แสดงคำถามประจำสถานการณ์: "จากเหตุการณ์ในคลิป ในฐานะผู้ตัดสิน ท่านต้องให้สัญญาณใด?"
  - ตัวนับเวลาถอยหลังการตัดสินใจ (5 วินาที Reaction Window) สไตล์ Untitled UI Countdown Bar
  - ตัวเลือกคำตัดสิน 4 ตัวเลือก (สำหรับโหมด Interactive Selection) พร้อมปุ่ม "ยืนยันและเริ่มทำท่าทางหน้ากล้อง"
- [ ] **Step 3: Implement Practical Posture Detector in Exam Mode (`Exam_Live_Detector.tsx`)**
  - ดึงภาพจากกล้องหรือโหมดจำลอง ตรวจวัดความเหยียดตรงของข้อศอก, องศาการยกแขน, และการค้างสัญญาณ
  - บันทึกคะแนน 3 มิติ: (1) ความถูกต้องของคำตัดสิน, (2) ความถูกต้องของสรีระท่าทาง (0-100), (3) เวลาตอบสนอง (Reaction Latency)
- [ ] **Step 4: Implement Exam Result Breakdown Modal (`Exam_Result_Inspector.tsx`)**
  - หน้าต่างสรุปผลรายข้อ: แสดงภาพ Freeze Frame จังหวะที่ผู้เรียนทำท่าทาง พร้อมโครงกระดูกและองศาข้อต่อ
  - สรุปผลผ่าน/ไม่ผ่านตามเกณฑ์ IFAB พร้อมคำอธิบายเฉลยและกฎข้อที่เกี่ยวข้อง (IFAB Law Reference)
- [ ] **Step 5: Assemble Full Examination Page (`src/app/examination/page.tsx`) & Verify Build**
  - รันการสอบเป็นชุด (Exam Pack: 5-10 ข้อ) พร้อมแถบความคืบหน้า (Question Progress 1/5)
  - เมื่อสอบครบทุกข้อ มีปุ่ม "ดูสมุดบันทึกผลการประเมิน (Go to Gradebook)"
  - Verify ด้วย `npm run build`

```bash
cd Front_End && npm run build
git add Front_End/src/UI_Components/Scenario_Exam/ Front_End/src/app/examination/
git commit -m "feat(exam): implement interactive scenario examination studio for trainee referees"
```

---

### Task 5: IFAB Interactive Digital Learning Handbook & 20 Signals Curriculum (`/handbook`)
**Files:**
- Create: `Front_End/src/UI_Components/Instructional_Handbook/Curriculum_Header.tsx`
- Create: `Front_End/src/UI_Components/Instructional_Handbook/Signal_Curriculum_Card.tsx`
- Create: `Front_End/src/UI_Components/Instructional_Handbook/Curriculum_Filter_Tabs.tsx`
- Create: `Front_End/src/UI_Components/Instructional_Handbook/Signal_Deep_Dive_Drawer.tsx`
- Create: `Front_End/src/UI_Components/Instructional_Handbook/index.ts`
- Create: `Front_End/src/app/handbook/page.tsx`

**Interfaces:**
- Consumes: `Ifab_Signals.json`, `GestureRule`
- Produces: Complete Interactive Educational Handbook & Curriculum at route `/handbook` (Clean Minimalist Theme)

- [ ] **Step 1: Implement Curriculum Header & Filter Controls (`Curriculum_Header.tsx`, `Curriculum_Filter_Tabs.tsx`)**
  - Untitled UI Header พร้อมคำอธิบายหลักสูตรสื่อการสอนผู้ตัดสิน
  - ช่องค้นหาท่าสัญญาณ (Search Input) ด้วยชื่อไทย/อังกฤษ/กฎข้อบังคับ
  - แท็บแยกหมวดหมู่ตามกติกา IFAB: ทั้งหมด (20), ลูกตั้งเตะ (Restarts), การทำฟาวล์ (Fouls), การควบคุมเกม (Game Control), การล้ำหน้า (Offside)
- [ ] **Step 2: Implement Signal Curriculum Cards Grid (`Signal_Curriculum_Card.tsx`)**
  - การ์ดสื่อการสอน 3 คอลัมน์ ดีไซน์ Untitled UI Elevated Cards:
    - หมายเลขท่าและชื่อทางการ (เช่น "ท่าที่ 1: ฟรีคิกทางตรง - Direct Free Kick")
    - ป้ายกำกับกติกา (Badge: `Law 13 - Free Kicks`, `Primary Arm: Right/Either`)
    - เกณฑ์มาตรฐาน IFAB: องศาการยกแขน `90°`, ความตรงของศอก `170°+`, เวลาค้างสัญญาณ `1.2s`
    - สรุปสาระสำคัญของสัญญาณและวัตถุประสงค์ในการสื่อสารในสนาม
    - ปุ่ม Action 2 ปุ่ม: "📖 ดูรายละเอียดสื่อการสอน" และ "🎯 เข้าห้องฝึกซ้อมท่านี้ทันที" (Link to `/drills?signalId=X`)
- [ ] **Step 3: Implement Signal Deep-Dive Drawer (`Signal_Deep_Dive_Drawer.tsx`)**
  - Slide-over Drawer เลื่อนจากขวาเมื่อคลิกดูรายละเอียด:
    - ภาพและไดอะแกรมกายวิภาคศาสตร์ (Anatomical Vector Skeleton) แสดงจุดข้อต่อสำคัญ
    - ช่วงองศาที่ยอมรับได้ (Tolerance Range: Min-Max Degrees)
    - รายการ "ข้อผิดพลาดที่พบบ่อย (Common Mistakes to Avoid)" เช่น แขนงอ, ยกไม่ถึงแนวขนาน, ลดแขนเร็วเกินไป
    - เคล็ดลับการปฏิบัติจริงจากวิทยากรผู้ตัดสินระดับชาติ
- [ ] **Step 4: Build Educational Handbook Page (`src/app/handbook/page.tsx`) & Verify Build**
  - Verify ด้วย `npm run build`

```bash
cd Front_End && npm run build
git add Front_End/src/UI_Components/Instructional_Handbook/ Front_End/src/app/handbook/
git commit -m "feat(handbook): build IFAB interactive digital learning handbook and 20 signals curriculum"
```

---

### Task 6: Trainee Performance Gradebook & Evaluation Analytics Dashboard (`/gradebook`)
**Files:**
- Create: `Front_End/src/UI_Components/Trainee_Gradebook/Trainee_Metric_Cards.tsx`
- Create: `Front_End/src/UI_Components/Trainee_Gradebook/Competency_Radar_Chart.tsx`
- Create: `Front_End/src/UI_Components/Trainee_Gradebook/Weakness_Diagnostics_Panel.tsx`
- Create: `Front_End/src/UI_Components/Trainee_Gradebook/Exam_History_Table.tsx`
- Create: `Front_End/src/UI_Components/Trainee_Gradebook/Certificate_Preview_Modal.tsx`
- Create: `Front_End/src/UI_Components/Trainee_Gradebook/index.ts`
- Create: `Front_End/src/app/gradebook/page.tsx`

**Interfaces:**
- Consumes: `TraineeEvaluationReport`, `Microservices_Mock`
- Produces: Comprehensive Trainee Evaluation Gradebook at route `/gradebook`

- [ ] **Step 1: Implement Trainee Metric Summary Cards (`Trainee_Metric_Cards.tsx`)**
  - 4 Untitled UI Stat Cards:
    1. Overall Posture Accuracy (`88.4%` พร้อม Badge ทิศทางพัฒนาการ)
    2. Total Scenario Tests Completed (`24 ชุด` ผ่านเกณฑ์ 22 ชุด)
    3. Average Reaction Latency (`1.35 วินาที` - ดีเยี่ยม)
    4. Officiating Competency Tier (`ระดับ 3: ผู้ตัดสินฝึกหัดขั้นก้าวหน้า`)
- [ ] **Step 2: Implement Competency Radar & Historical Chart (`Competency_Radar_Chart.tsx`)**
  - SVG Radar Chart แสดงสมรรถนะ 4 ด้าน: ลูกตั้งเตะ (92%), การทำฟาวล์ (84%), การควบคุมเกม (76%), การล้ำหน้า (90%)
  - เส้นเปรียบเทียบกับค่ามาตรฐาน IFAB Standard Target (80%)
- [ ] **Step 3: Implement Weakness & Diagnostic Panel (`Weakness_Diagnostics_Panel.tsx`)**
  - วิเคราะห์ข้อผิดพลาดซ้ำๆ ของผู้เรียนรายบุคคล:
    - "หมวดการควบคุมเกม: มักลดแขนก่อนเวลาที่กำหนด (เฉลี่ยค้าง 0.8s จากเกณฑ์ 1.5s)"
    - "ท่าสัญญาณได้เปรียบ: มุมกางแขนแคบเกินไป (ควรฝึกขยายมุมเพิ่มอีก 15°)"
    - ปุ่ม "🎯 ฝึกซ้อมแก้ไขจุดอ่อนนี้" เพื่อกระโดดไปหน้า `/drills` โดยตรง
- [ ] **Step 4: Implement Exam History Table & Certificate Preview (`Exam_History_Table.tsx`, `Certificate_Preview_Modal.tsx`)**
  - Untitled UI Table แสดงประวัติการทำแบบทดสอบสถานการณ์: วันที่, ชุดข้อสอบ, คะแนน, เวลาตอบสนอง, ผลการประเมิน (Badge: ผ่าน / ปรับปรุง)
  - ปุ่ม "📜 ดูใบรายงานผลการฝึกอบรม (Certificate / Grade Summary)" แสดงป๊อปอัปผลการเรียนพร้อมสั่งพิมพ์/บันทึก PDF
- [ ] **Step 5: Build Gradebook Page (`src/app/gradebook/page.tsx`) & Verify Build**
  - Verify ด้วย `npm run build`

```bash
cd Front_End && npm run build
git add Front_End/src/UI_Components/Trainee_Gradebook/ Front_End/src/app/gradebook/
git commit -m "feat(gradebook): implement trainee performance gradebook and competency diagnostics"
```

---

### Task 7: Educational Navigation Portal, System Status & Home Landing Page
**Files:**
- Create: `Front_End/src/UI_Components/App_Layout/Nav_Bar.tsx`
- Create: `Front_End/src/UI_Components/App_Layout/Educational_Hero.tsx`
- Create: `Front_End/src/UI_Components/App_Layout/Curriculum_Quick_Launch.tsx`
- Modify: `Front_End/src/app/layout.tsx`
- Modify: `Front_End/src/app/page.tsx`

**Interfaces:**
- Consumes: Tasks 1-6
- Produces: Integrated Educational Portal Layout, Universal Navigation Bar, and Interactive Homepage

- [ ] **Step 1: Implement Universal Educational Navbar (`Nav_Bar.tsx`)**
  - Untitled UI Header พร้อม Logo `⚽ IFAB Referee Academy AI`
  - เมนูหลัก 4 ห้องเรียน:
    - 🎯 `ห้องฝึกซ้อมสด (/drills)`
    - 📝 `ห้องสอบสถานการณ์ (/examination)`
    - 📖 `คู่มือสื่อการสอน 20 ท่า (/handbook)`
    - 📊 `สมุดผลการประเมิน (/gradebook)`
  - Status Pill: 🟢 `ระบบสื่อการสอนพร้อมใช้งาน (Offline Demo)` / 🌐 `เชื่อมต่อ API Gateway`
  - ปุ่ม Theme Switcher สลับระหว่างโหมดสตูดิโอ (Dark) และโหมดอ่านหนังสือ (Light)
- [ ] **Step 2: Update App Layout with Navigation (`Front_End/src/app/layout.tsx`)**
  - ฝัง `Nav_Bar.tsx` ใน Root Layout อย่างสวยงาม
- [ ] **Step 3: Redesign Home Landing Page (`Front_End/src/app/page.tsx`)**
  - Hero Section สื่อการสอนอัจฉริยะสำหรับผู้ตัดสินฟุตบอล
  - 4 Cards ทางลัดเข้าสู่ห้องเรียนแต่ละโมดูล
  - ภาพรวมกระบวนการเรียนรู้: "1. ศึกษาคู่มือ -> 2. ซ้อมหน้ากล้อง -> 3. ทำแบบทดสอบสถานการณ์ -> 4. รับผลประเมินและเกรด"
- [ ] **Step 4: End-to-End Build and Verification**
  - รัน `npm run build` ตรวจสอบความถูกต้องของทุก Route (`/`, `/drills`, `/examination`, `/handbook`, `/gradebook`)
- [ ] **Step 5: Final Commit**

```bash
cd Front_End && npm run build
git add Front_End/
git commit -m "feat(portal): complete referee educational media platform with all 4 learning modules"
```

---

## Plan Self-Review Checklist

1. **Spec Coverage:**
   - [x] ห้องฝึกซ้อมสัญญาณสดพร้อมกล้องและ Skeleton (Task 2 & 3)
   - [x] ห้องสอบสถานการณ์จำลองเพื่อวัดผลผู้เรียนผู้ตัดสิน (Task 4)
   - [x] คลังสื่อการสอนและคู่มือ 20 สัญญาณ IFAB (Task 5)
   - [x] สมุดผลการประเมินผู้เรียนและเรดาร์ชาร์ตสมรรถนะ (Task 6)
   - [x] หน้าพอร์ทัลและแถบนำทางระบบสื่อการสอน (Task 7)
2. **Zero Match Review / Pure Educational Framing:**
   - ตรวจสอบแล้ว ไม่มีหน้า 90-minute Live Match Review หรือ VAR ใดๆ ทุกโมดูลถูกปรับเป็นสื่อการสอน (Educational Media) และระบบประเมินผู้เรียน (Trainee Evaluation) 100%
3. **Step Granularity & Executability:**
   - ทุกขั้นตอนระบุไฟล์ พิกัดการเปลี่ยนแปลง คอมมานด์ทดสอบ และข้อความ commit ชัดเจน
4. **Naming Consistency:**
   - โฟลเดอร์และไฟล์ทุกไฟล์ใช้ Pascal_Snake_Case ตามกฎเกณฑ์อย่างเคร่งครัด
5. **Proportion:**
   - โครงสร้างแผนงานกระชับ ครอบคลุม และตรงตามวัตถุประสงค์ของผู้ใช้