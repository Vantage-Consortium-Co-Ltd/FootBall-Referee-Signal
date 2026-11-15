# Football Referee Training & Assessment Web App (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** พัฒนาระบบ Web Application ส่วน Frontend แบบครบวงจรสำหรับ "ผู้ช่วยอัจฉริยะในการฝึกอบรมและประเมินผู้ตัดสินฟุตบอล" (Referee Training & Officiating Assessment) ด้วย Next.js, React, Tailwind CSS และ TypeScript โดยรองรับ Live Camera พร้อม 60 FPS HTML5 Canvas Skeleton Overlay, Real-time Coaching HUD, Match Video Review Timeline, IFAB Digital Rulebook, และมี In-browser Mock Simulation Engine ให้ทดสอบและสาธิตได้ทันทีโดยไม่ต้องรอ Backend

**Architecture:**
- **App Layout & Router:** Next.js (App Router) ประกอบด้วย 3 หน้าหลัก: `/drills` (โหมดฝึกซ้อมสดผ่านกล้องพร้อมคำแนะนำแบบเรียลไทม์), `/assessment` (โหมดตรวจประเมินวิดีโอแมตช์การตัดสินพร้อม Interactive Timeline), และ `/rules` (คลังกติกาและท่าทางมาตรฐาน 20 สัญญาณ IFAB)
- **Canvas Rendering Engine:** `SkeletonCanvas.tsx` วาดโครงกระดูก 17 จุดตามมาตรฐาน COCO ด้วยสีตามค่า Confidence พร้อมระบบ Ghost Guideline แสดงโครงร่างเป้าหมายที่ถูกต้อง และ Angle Arc แสดงองศาข้อต่อ
- **Communication & Standalone Mocking:** `useRefereeSocket.ts` เชื่อมต่อ WebSocket กับ FastAPI `/ws/training-stream` โดยมีสวิตช์สลับเป็น `mockEngine.ts` (In-browser Pose Simulation) ทำให้ Frontend รันและเดโมเดี่ยวได้ทันทีอย่างสมบูรณ์แบบ

**Tech Stack:** Next.js 14/15 (App Router), React 18/19, TypeScript, Tailwind CSS, Lucide React, HTML5 Canvas API, Recharts

**Spec:** [football_referee_system_design_report.md](file:///C:/Users/iznamu/.gemini/antigravity-cli/brain/23323c30-4131-4f4a-a4e8-d3fbe67c7025/football_referee_system_design_report.md)

---

## Global Constraints
- โฟลเดอร์ของงาน Frontend ทั้งหมดต้องอยู่ภายใต้ไดเรกทอรี `frontend/` ของโปรเจกต์
- ต้องรองรับการทำงานแบบ **Offline / Standalone Demo Mode** ผ่าน Mock Engine ในกรณีที่ยังไม่ได้รัน FastAPI Backend
- ต้องแสดงผลโครงร่าง Skeleton บน HTML5 Canvas ที่เฟรมเรต 60 FPS โดยไม่ทำให้หน้าเว็บกระตุก
- UI ต้องรองรับการแสดงผลภาษาไทยสำหรับคำแนะนำการฝึกสอน (Coaching Feedback) และภาษาอังกฤษสำหรับชื่อทางการของสัญญาณ IFAB
- ทุก Task ต้องคอมไพล์ผ่าน `npm run build` โดยไม่มี TypeScript หรือ ESLint Errors

---

## Review Focus
- **Webcam Permission Denial & Fallback:** หากผู้ใช้ปฏิเสธการเข้าถึงกล้อง (Permission Denied) หรือเครื่องไม่มีกล้อง หน้าเว็บต้องไม่ค้างหรือเกิด White Screen of Death แต่ต้องมี UI แจ้งเตือนพร้อมปุ่ม "ใช้คลิปวิดีโอตัวอย่าง (Demo Video)" หรือ "เปิดโหมดจำลอง (Simulation Mode)"
- **Canvas Resize & Aspect Ratio Distortion:** เมื่อหน้าต่างเบราว์เซอร์เปลี่ยนขนาดหรือเปิดบนมือถือ พิกัด Skeleton ต้อง Scale ตามขนาดจริงของวิดีโออย่างแม่นยำ ไม่เลื่อนหลุดตำแหน่งข้อต่อ
- **WebSocket Disconnection & Auto-Reconnect:** หากสัญญาณเน็ตหลุดหรือ Backend รีสตาร์ท ระบบต้องมีสถานะแสดงบนแถบ Navigation (🟡 Reconnecting...) และพยายามเชื่อมต่อใหม่แบบ Exponential Backoff โดยไม่ทำให้ UI พัง
- **Hold Timer Reset on Jitter:** ในหน้า Drill เมื่อผู้ใช้ยกแขนไม่ถึงองศาที่กำหนดหรือสะบัดแขน วงล้อ Hold Timer ต้องรีเซ็ตกลับเป็นศูนย์อย่างถูกต้องและแสดงข้อความแนะนำทันที
- **Responsive Mobile / Tablet Layout:** หน้าจอต้องรองรับการเปิดใช้งานบนแท็บเล็ตข้างสนามของผู้ฝึกสอน (Referee Assessor) ได้อย่างสะดวก

---

## Tasks

### Task 1: Next.js Project Scaffolding & Standalone Mock Engine
**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/src/types/referee.ts`
- Create: `frontend/src/lib/mockEngine.ts`

**Interfaces:**
- Consumes: None (Root frontend configuration)
- Produces: 
  - `Keypoint`, `GestureRule`, `DrillStatus`, `AssessmentEvent`, `AssessmentReport` (TypeScript Interfaces)
  - `generateMockFrame(targetGestureId: int, frameCount: int) -> FrameFeedbackPayload`
  - `MOCK_IFAB_RULES: GestureRule[]`

- [ ] **Step 1: Setup Next.js Project Structure in `frontend/`**

สร้างไฟล์ตั้งค่า `package.json` (ติดตั้ง `next`, `react`, `react-dom`, `lucide-react`, `tailwindcss`, `clsx`, `tailwind-merge`), `tsconfig.json`, `tailwind.config.ts`, และ `postcss.config.js`.

- [ ] **Step 2: Define Core TypeScript Interfaces (`frontend/src/types/referee.ts`)**

ประกาศ Types:
```typescript
export interface Keypoint {
  x: number; // Normalized 0..1
  y: number; // Normalized 0..1
  confidence: number;
  name?: string;
}

export interface GestureRule {
  id: number;
  name: string;
  nameTh: string;
  ifabLaw: string;
  category: 'restarts' | 'fouls' | 'match_control' | 'offside';
  activeArm: 'right' | 'left' | 'either' | 'both';
  targetElevationDeg: number;
  minElevationDeg: number;
  targetStraightnessDeg: number;
  minStraightnessDeg: number;
  minHoldSeconds: number;
  descriptionTh: string;
  coachingTips: string[];
}

export interface FrameFeedbackPayload {
  detected: boolean;
  keypoints: Keypoint[];
  activeArm: 'right' | 'left' | 'both' | 'none';
  angles: {
    elbowAngle: number;
    elevationAngle: number;
    separationAngle?: number;
  };
  score: number; // 0..100
  state: 'WAITING' | 'DETECTED' | 'HOLDING' | 'COMPLETED' | 'LOST_POSTURE';
  holdProgress: number; // 0.0 .. 1.0
  holdDuration: number;
  feedbackTip: string;
  gestureName: string;
}
```

- [ ] **Step 3: Implement Standalone Mock Engine (`frontend/src/lib/mockEngine.ts`)**

สร้าง Mock Data ครบ 20 สัญญาณ IFAB และฟังก์ชันจำลองการเคลื่อนไหวของข้อต่อ (Kinematic Sine wave) พร้อมคำนวณคะแนนและสเตตัสเสมือน เพื่อให้หน้าเว็บทำงานได้เต็มรูปแบบแม้ไม่มี Backend.

- [ ] **Step 4: Verify Scaffolding with `npm install` and Type Check**

Run: `cd frontend && npm install && npx tsc --noEmit`
Expected: SUCCESS with 0 type errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): scaffold Next.js app with referee types and standalone mock engine"
```

---

### Task 2: 60 FPS HTML5 Canvas Skeleton & Ghost Guide Engine
**Files:**
- Create: `frontend/src/components/canvas/SkeletonCanvas.tsx`
- Create: `frontend/src/components/canvas/CanvasUtils.ts`

**Interfaces:**
- Consumes: `Keypoint[]`, `GestureRule`, `angles`
- Produces: 
  - `<SkeletonCanvas keypoints={keypoints} targetRule={selectedRule} angles={angles} width={w} height={h} />`

- [ ] **Step 1: Implement Canvas Utilities (`frontend/src/components/canvas/CanvasUtils.ts`)**

- นิยามคู่กระดูก COCO-17 connections: ไหล่ไปศอก, ศอกไปมือ, ไหล่ไปสะโพก, สะโพกไปเข่า, เข่าไปข้อเท้า
- ฟังก์ชันวาดเส้น Gradient ตามความมั่นใจ:
  - Confidence $> 0.8$: สีเขียวมรกต (`#10B981`)
  - Confidence $0.5 - 0.8$: สีเหลืองอำพัน (`#F59E0B`)
  - Confidence $< 0.5$: สีแดงอ่อน (`#EF4444`)
- ฟังก์ชันวาดวงกลมมุมข้อต่อ (Angle Arc) และแสดงตัวเลของศาบน Canvas

- [ ] **Step 2: Implement `SkeletonCanvas.tsx` with Ghost Guideline**

- รับ Prop `keypoints` (ตำแหน่งปัจจุบันของผู้ใช้) และ Prop `targetRule` (เป้าหมายของท่าฝึก)
- วาด **Ghost Skeleton** (โครงร่างสีฟ้าโปร่งแสง Cyan Opacity 35%) ซ้อนทับ เพื่อเป็นไกด์นำทางให้ผู้ตัดสินรู้ว่าต้องยกแขนไปที่ตำแหน่งไหน
- วาด Skeleton ของผู้ใช้ทับด้านบนแบบ Real-time ด้วย `requestAnimationFrame`

- [ ] **Step 3: Verification with Component Test**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS with no type errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/canvas/
git commit -m "feat(frontend): implement 60 FPS HTML5 skeleton canvas with ghost target guide"
```

---

### Task 5: Live Practice Drill & Real-Time Coaching HUD (`/drills`)
**Files:**
- Create: `frontend/src/components/drill/LiveDrillFeed.tsx`
- Create: `frontend/src/components/drill/CoachingHUD.tsx`
- Create: `frontend/src/components/drill/DrillSelector.tsx`
- Create: `frontend/src/app/drills/page.tsx`

**Interfaces:**
- Consumes: `useRefereeSocket`, `SkeletonCanvas`, `MOCK_IFAB_RULES`
- Produces: Complete Interactive Drill Page at route `/drills`

- [ ] **Step 1: Implement Drill Selector & Settings (`DrillSelector.tsx`)**

การ์ดเลือกท่าฝึกซ้อม แบ่งตามหมวดหมู่ (ฟรีคิก, การให้สัญญาณได้เปรียบ, การให้ใบเตือน, การล้ำหน้า) พร้อมแสดงระดับความยาก และระยะเวลา Hold เป้าหมาย.

- [ ] **Step 2: Implement Real-Time Coaching HUD (`CoachingHUD.tsx`)**

- แสดงวงล้อ Circular Countdown Timer เมื่อเข้าสู่สถานะ `HOLDING`
- เกจวัดมุมข้อต่อแบบไดนามิก: องศาการยกแขน (Arm Elevation) และความเหยียดตรงของข้อศอก (Elbow Straightness)
- ป้ายข้อความคำแนะนำแบบสด (Live Toast Banner) เช่น:
  - 🟢 "ยอดเยี่ยม ค้างท่าไว้... 1.5s"
  - 🟡 "ยกแขนขวาขึ้นอีก 15° (ปัจจุบัน 145°, เป้าหมาย 160°)"
  - 🔴 "งอข้อศอกมากเกินไป กรุณายืดแขนให้ตรง"

- [ ] **Step 3: Implement Live Video/Webcam Stream (`LiveDrillFeed.tsx`)**

จัดการการเชื่อมต่อ Webcam ด้วย `navigator.mediaDevices.getUserMedia` พร้อมปุ่มสลับกล้องหน้า/หลัง, ปุ่ม Mirror View, และปุ่มเปิด/ปิด Ghost Guide Overlay.

- [ ] **Step 4: Build Drill Page (`src/app/drills/page.tsx`) & Verify Build**

ประกอบคอมโพเนนต์เข้าด้วยกันในหน้า `/drills` และตรวจสอบการทำงาน
Run: `cd frontend && npm run build`
Expected: Build success with `/drills` generated.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/drill/ frontend/src/app/drills/
git commit -m "feat(frontend): build live practice drill page with real-time coaching HUD"
```

---

### Task 4: Match Video Review & Assessment Dashboard (`/assessment`)
**Files:**
- Create: `frontend/src/components/assessment/VideoScrubber.tsx`
- Create: `frontend/src/components/assessment/DecisionTimeline.tsx`
- Create: `frontend/src/components/assessment/CallDetailInspector.tsx`
- Create: `frontend/src/components/assessment/ScorecardRadar.tsx`
- Create: `frontend/src/app/assessment/page.tsx`

**Interfaces:**
- Consumes: Video input / preloaded match events
- Produces: Complete Assessment & Match Review Page at route `/assessment`

- [ ] **Step 1: Implement Video Scrubber & Decision Timeline**

- ไทม์ไลน์แสดงแถบเวลาของแมตช์ 90 นาที พร้อมหมุดเหตุการณ์ (Event Pins) ตามเวลาที่ผู้ตัดสินให้สัญญาณ (สีเขียว = ถูกต้องชัดเจน, สีเหลือง = ควรปรับปรุง, สีแดง = ผิดกติกา)
- คลิกที่หมุดเพื่อกระโดดข้ามไปยังวิดีโอเฟรมนั้นทันที (Jump to Timestamp)

- [ ] **Step 2: Implement Call Detail Inspector (`CallDetailInspector.tsx`)**

แสดงภาพ Freeze Frame จังหวะตัดสิน, โครงร่างกระดูก Skeleton, คะแนนความถูกต้อง (0-100), ตารางมุมข้อต่อ, และกติกา IFAB ที่เกี่ยวข้อง.

- [ ] **Step 3: Implement Assessment Scorecard (`ScorecardRadar.tsx`)**

สรุปผลคะแนนรวมของผู้ตัดสินในแมตช์:
- เรดาร์ชาร์ตความแม่นยำรายหมวดสัญญาณ
- สรุปสถิติ: จำนวนการเป่าหยุดเกมทั้งหมด, คะแนนเฉลี่ย, จุดผิดพลาดที่พบบ่อย 3 อันดับแรก
- ปุ่ม Export สรุปรายงานการประเมินเป็น PDF / พิมพ์ผล

- [ ] **Step 4: Build Assessment Page (`src/app/assessment/page.tsx`) & Verify Build**

Run: `cd frontend && npm run build`
Expected: Build success with `/assessment` generated.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/assessment/ frontend/src/app/assessment/
git commit -m "feat(frontend): build match review timeline and assessment scorecard dashboard"
```

---

### Task 5: IFAB Digital Rulebook & Interactive Signals Catalog (`/rules`)
**Files:**
- Create: `frontend/src/data/ifab_signals.json`
- Create: `frontend/src/components/rules/RuleCard.tsx`
- Create: `frontend/src/components/rules/RuleFilter.tsx`
- Create: `frontend/src/components/rules/RuleModal.tsx`
- Create: `frontend/src/app/rules/page.tsx`

**Interfaces:**
- Consumes: `ifab_signals.json`
- Produces: Interactive Rulebook Catalog at route `/rules`

- [ ] **Step 1: Compile Complete 20 IFAB Signals Knowledge Base (`ifab_signals.json`)**

รวบรวมข้อมูลสัญญาณผู้ตัดสิน 20 ท่าทาง พร้อมข้อความอธิบายกติกาภาษาไทยและอังกฤษ, กฎข้อที่เกี่ยวข้อง (Law 5, 12, 13), องศามาตรฐาน, รูปแบบการยกแขน, และข้อควรระวังในการตัดสิน.

- [ ] **Step 2: Implement Filterable Rule Catalog & Modal Inspector**

- แถบค้นหาและฟิลเตอร์แยกตามหมวดหมู่ (ลูกตั้งเตะ, การทำฟาวล์, การได้เปรียบ, การล้ำหน้า)
- การ์ดแสดงภาพท่าทางมาตรฐาน พร้อมปุ่มเปิดดูไดอะแกรมมุมข้อต่อแบบละเอียดใน Modal Popup

- [ ] **Step 3: Build Rules Page (`src/app/rules/page.tsx`) & Verify Build**

Run: `cd frontend && npm run build`
Expected: Build success with `/rules` generated.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/data/ frontend/src/components/rules/ frontend/src/app/rules/
git commit -m "feat(frontend): create IFAB digital rulebook catalog with 20 referee signals"
```

---

### Task 6: WebSocket Hook, Global Navigation & Landing Home View
**Files:**
- Create: `frontend/src/hooks/useRefereeSocket.ts`
- Create: `frontend/src/components/layout/Navbar.tsx`
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/page.tsx`

**Interfaces:**
- Consumes: Tasks 1-5
- Produces: Complete runnable Web Application with responsive Navigation, Home Dashboard, and Live Connection Status Indicator

- [ ] **Step 1: Implement `useRefereeSocket.ts` with Simulation Fallback**

- สลับโหมดอัตโนมัติ: หากต่อ WebSocket เข้ากับ FastAPI ติด ให้ใช้ Live Data จาก Server
- หากไม่ได้เปิด Server หรือต่อไม่ติด ให้สลับเข้าสู่โหมด Standalone Mock Simulation โดยอัตโนมัติ เพื่อให้หน้าเว็บใช้งานได้เสมอโดยไม่สะดุด

- [ ] **Step 2: Implement Global Navbar & App Layout**

- เมนูหลัก 3 หน้า: ฝึกซ้อมสด (`/drills`), ตรวจประเมินแมตช์ (`/assessment`), คลังกติกา IFAB (`/rules`)
- ป้ายแสดงสถานะการเชื่อมต่อ: 🟢 Live AI Connected / 🟡 Simulation Mode

- [ ] **Step 3: Implement Landing Page (`src/app/page.tsx`)**

หน้าแรกแนะนำระบบ นำเสนอ 3 ฟังก์ชันเด่น พร้อมปุ่ม Quick Start เริ่มฝึกซ้อมได้ในคลิกเดียว.

- [ ] **Step 4: End-to-End Build & Run Verification**

Run: `cd frontend && npm run build`
Expected: PASS - All routes static/dynamic compiled successfully with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): complete web app navigation, landing dashboard and socket hook"
```

---

## Plan Self-Review Checklist
- [x] **Spec coverage:** ครอบคลุมงาน Frontend 100% (หน้าซ้อมสด Live Drill, หน้าตรวจประเมิน Match Review, คลังกติกา IFAB, และ Canvas Overlay)
- [x] **Independence:** มี Mock Engine ทำให้พัฒนาและนำเสนอ Frontend ได้ทันทีโดยไม่ต้องผูกติดกับ Backend
- [x] **Step scan:** ทุก Step เป็น Action ที่ชัดเจนและมี Verification กำกับ
- [x] **No backend overlap:** ปรับขอบเขตออกจาก Train/ML Pipeline เหลือเฉพาะงาน Frontend ของคุณอย่างแม่นยำ
