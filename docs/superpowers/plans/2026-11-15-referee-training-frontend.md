# Football Referee Training & Assessment Web App (Frontend - Microservices Ready) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** พัฒนาระบบ Web Application ส่วน Frontend แบบครบวงจรสำหรับ "ผู้ช่วยอัจฉริยะในการฝึกอบรมและประเมินผู้ตัดสินฟุตบอล" (Referee Training & Officiating Assessment) ที่ออกแบบตามสถาปัตยกรรม **Microservices Architecture** ด้วย Next.js, React, Tailwind CSS และ TypeScript โดยเชื่อมต่อผ่าน API Gateway (WebSocket & REST) พร้อมมี In-browser Microservices Mock Adapter, 60 FPS HTML5 Canvas Skeleton Overlay, Real-time Coaching HUD, Match Video Review Timeline, และ IFAB Digital Rulebook

**Architecture:**
- **Microservices-Aware Frontend:** สื่อสารกับระบบ Backend ผ่าน **API Gateway / BFF** (REST สำหรับ Rules/Assessment และ WebSocket `/ws/training-stream` สำหรับ Vision & Coaching Stream)
- **Decoupled Architecture & Mock Adapter:** มี `src/lib/microservicesMock.ts` จำลองการทำงานของ Microservices ทั้ง 4 ตัว (Vision Service, Coaching Engine, Rules Service, Assessment Service) ทำให้สามารถรัน, พัฒนา, และทดสอบระบบได้ทั้งแบบ **Offline Standalone Mode** และ **Live Microservices Cluster Mode**
- **App Layout & Router:** Next.js (App Router) ประกอบด้วย 3 หน้าหลัก: `/drills` (โหมดฝึกซ้อมสดผ่านกล้องพร้อมคำแนะนำแบบเรียลไทม์), `/assessment` (โหมดตรวจประเมินวิดีโอแมตช์การตัดสินพร้อม Interactive Timeline), และ `/rules` (คลังกติกาและท่าทางมาตรฐาน 20 สัญญาณ IFAB)
- **Canvas Rendering Engine:** `SkeletonCanvas.tsx` วาดโครงกระดูก 17 จุดตามมาตรฐาน COCO ด้วยสีตามค่า Confidence พร้อมระบบ Ghost Guideline แสดงโครงร่างเป้าหมายที่ถูกต้อง และ Angle Arc แสดงองศาข้อต่อ

**Tech Stack:** Next.js 14/15 (App Router), React 18/19, TypeScript, Tailwind CSS, Lucide React, HTML5 Canvas API, Recharts

**Spec:** [football_referee_system_design_report.md](file:///C:/Users/iznamu/.gemini/antigravity-cli/brain/23323c30-4131-4f4a-a4e8-d3fbe67c7025/football_referee_system_design_report.md)

---

## Global Constraints
- โค้ด Frontend ทั้งหมดต้องอยู่ในโฟลเดอร์ `Front_End/` ของ Workspace
- ต้องรองรับการเชื่อมต่อแบบ Single-Entrypoint ผ่านตัวแปรสภาพแวดล้อม: `NEXT_PUBLIC_API_GATEWAY_URL` และ `NEXT_PUBLIC_WS_GATEWAY_URL`
- ต้องรองรับการทำงานแบบ **Offline / Standalone Demo Mode** ผ่าน Microservices Mock Adapter ในกรณีที่คลัสเตอร์ Backend ยังไม่เปิดทำงาน
- ต้องแสดงผลโครงร่าง Skeleton บน HTML5 Canvas ที่เฟรมเรต 60 FPS โดยไม่ทำให้หน้าเว็บกระตุก
- UI ต้องรองรับการแสดงผลภาษาไทยสำหรับคำแนะนำการฝึกสอน (Coaching Feedback) และภาษาอังกฤษสำหรับชื่อทางการของสัญญาณ IFAB
- ทุก Task ต้องคอมไพล์ผ่าน `npm run build` โดยไม่มี TypeScript หรือ ESLint Errors

---

## Review Focus
- **Gateway Failover & Auto-Mock Fallback:** เมื่อเริ่มแอป หากต่อ API Gateway ไม่ติดภายใน 3 วินาที ระบบต้องสลับเข้าสู่โหมด Standalone Mock Simulation โดยอัตโนมัติ พร้อมแสดง Notification เตือนผู้ใช้แบบนุ่มนวล โดยไม่ทำให้ UI Crash
- **Microservices Health Monitoring:** ใน Navbar ต้องมีตัวชี้วัดสถานะการเชื่อมต่อ (Microservices Health Modal) แสดงสถานะแยกรายบริการ (Gateway, Vision Engine, Coaching Engine, Rules Catalog)
- **Webcam Permission Denial & Fallback:** หากผู้ใช้ปฏิเสธการเข้าถึงกล้อง (Permission Denied) หรือเครื่องไม่มีกล้อง หน้าเว็บต้องมี UI แจ้งเตือนพร้อมปุ่ม "ใช้คลิปวิดีโอตัวอย่าง (Demo Video)" หรือ "เปิดโหมดจำลอง (Simulation Mode)"
- **Canvas Resize & Aspect Ratio Distortion:** เมื่อหน้าต่างเบราว์เซอร์เปลี่ยนขนาดหรือเปิดบนแท็บเล็ต พิกัด Skeleton ต้อง Scale ตามขนาดจริงของวิดีโออย่างแม่นยำ ไม่เลื่อนหลุดตำแหน่งข้อต่อ
- **Hold Timer Reset on Jitter:** ในหน้า Drill เมื่อผู้ใช้ยกแขนไม่ถึงองศาที่กำหนดหรือสะบัดแขน วงล้อ Hold Timer ต้องรีเซ็ตกลับเป็นศูนย์อย่างถูกต้องและแสดงข้อความแนะนำทันที

---

## Tasks

### Task 1: Next.js Project Scaffolding & Microservices Mock Adapter
**Files:**
- Create: `Front_End/package.json`
- Create: `Front_End/tsconfig.json`
- Create: `Front_End/tailwind.config.ts`
- Create: `Front_End/src/Data_Types/Referee_Types.ts`
- Create: `Front_End/src/Core_Lib/Microservices_Mock.ts`
- Create: `Front_End/src/Data_Sources/Ifab_Signals.json`

**Interfaces:**
- Consumes: None (Root frontend configuration)
- Produces: 
  - `Keypoint`, `GestureRule`, `DrillStatus`, `AssessmentEvent`, `AssessmentReport`, `ServiceHealth` (TypeScript Interfaces)
  - `MicroservicesMockAdapter`: จำลอง Vision Service, Coaching Engine, Rules Service, Assessment Service
  - `MOCK_IFAB_RULES: GestureRule[]`

- [x] **Step 1: Setup Next.js Project Structure in `Front_End/`**
- [x] **Step 2: Define Core TypeScript Interfaces (`Front_End/src/Data_Types/Referee_Types.ts`)**
- [x] **Step 3: Implement Microservices Mock Adapter (`Front_End/src/Core_Lib/Microservices_Mock.ts`)**
- [x] **Step 4: Verify Scaffolding with `npm install` and Type Check**
- [x] **Step 5: Commit**

```bash
git add Front_End/
git commit -m "feat(frontend): scaffold Next.js app with microservices types and mock adapter"
```

---

### Task 2: 60 FPS HTML5 Canvas Skeleton & Ghost Target Guide Engine
**Files:**
- Create: `Front_End/src/UI_Components/Canvas_Engine/Skeleton_Canvas.tsx`
- Create: `Front_End/src/UI_Components/Canvas_Engine/Canvas_Utils.ts`

**Interfaces:**
- Consumes: `Keypoint[]`, `GestureRule`, `angles`
- Produces: 
  - `<Skeleton_Canvas keypoints={keypoints} targetRule={selectedRule} angles={angles} width={w} height={h} />`

- [ ] **Step 1: Implement Canvas Utilities (`Front_End/src/UI_Components/Canvas_Engine/Canvas_Utils.ts`)**

- นิยามคู่กระดูก COCO-17 connections: ไหล่ไปศอก, ศอกไปมือ, ไหล่ไปสะโพก, สะโพกไปเข่า, เข่าไปข้อเท้า
- ฟังก์ชันวาดเส้น Gradient ตามความมั่นใจ (เขียว $>0.8$, เหลือง $0.5-0.8$, แดง $<0.5$)
- ฟังก์ชันวาดวงกลมมุมข้อต่อ (Angle Arc) และแสดงตัวเลของศาบน Canvas

- [ ] **Step 2: Implement `Skeleton_Canvas.tsx` with Ghost Guideline**

- รับ Prop `keypoints` (ตำแหน่งปัจจุบันของผู้ใช้) และ Prop `targetRule` (เป้าหมายของท่าฝึก)
- วาด **Ghost Skeleton** (โครงร่างสีฟ้าโปร่งแสง Cyan Opacity 35%) ซ้อนทับ เพื่อเป็นไกด์นำทางให้ผู้ตัดสินรู้ว่าต้องยกแขนไปที่ตำแหน่งไหน
- วาด Skeleton ของผู้ใช้ทับด้านบนแบบ Real-time ด้วย `requestAnimationFrame`

- [ ] **Step 3: Verification with Component Test**

Run: `cd Front_End && npx tsc --noEmit`
Expected: PASS with no type errors.

- [ ] **Step 4: Commit**

```bash
git add Front_End/src/UI_Components/Canvas_Engine/
git commit -m "feat(frontend): implement 60 FPS HTML5 skeleton canvas with ghost target guide"
```

---

### Task 3: Live Practice Drill & Real-Time Coaching HUD (`/drills`)
**Files:**
- Create: `Front_End/src/UI_Components/Drill_Practice/Live_Drill_Feed.tsx`
- Create: `Front_End/src/UI_Components/Drill_Practice/Coaching_HUD.tsx`
- Create: `Front_End/src/UI_Components/Drill_Practice/Drill_Selector.tsx`
- Create: `Front_End/src/app/drills/page.tsx`

**Interfaces:**
- Consumes: `useRefereeGatewaySocket`, `Skeleton_Canvas`, `MOCK_IFAB_RULES`
- Produces: Complete Interactive Drill Page at route `/drills`

- [ ] **Step 1: Implement Drill Selector & Settings (`Drill_Selector.tsx`)**

การ์ดเลือกท่าฝึกซ้อม แบ่งตามหมวดหมู่ พร้อมแสดงระดับความยาก และระยะเวลา Hold เป้าหมาย.

- [ ] **Step 2: Implement Real-Time Coaching HUD (`Coaching_HUD.tsx`)**

- แสดงวงล้อ Circular Countdown Timer เมื่อเข้าสู่สถานะ `HOLDING`
- เกจวัดมุมข้อต่อแบบไดนามิก: องศาการยกแขน (Arm Elevation) และความเหยียดตรงของข้อศอก (Elbow Straightness)
- ป้ายข้อความคำแนะนำแบบสด (Live Toast Banner) เช่น *"ยกแขนขวาขึ้นอีก 15°"*, *"ยอดเยี่ยม ค้างท่าไว้..."*

- [ ] **Step 3: Implement Live Video/Webcam Stream (`Live_Drill_Feed.tsx`)**

จัดการการเชื่อมต่อ Webcam ด้วย `navigator.mediaDevices.getUserMedia` พร้อมปุ่มสลับกล้องหน้า/หลัง, ปุ่ม Mirror View, และปุ่มเปิด/ปิด Ghost Guide Overlay.

- [ ] **Step 4: Build Drill Page (`src/app/drills/page.tsx`) & Verify Build**

Run: `cd Front_End && npm run build`
Expected: Build success with `/drills` generated.

- [ ] **Step 5: Commit**

```bash
git add Front_End/src/UI_Components/Drill_Practice/ Front_End/src/app/drills/
git commit -m "feat(frontend): build live practice drill page with real-time coaching HUD"
```

---

### Task 4: Match Video Review & Assessment Dashboard (`/assessment`)
**Files:**
- Create: `Front_End/src/UI_Components/Match_Assessment/Video_Scrubber.tsx`
- Create: `Front_End/src/UI_Components/Match_Assessment/Decision_Timeline.tsx`
- Create: `Front_End/src/UI_Components/Match_Assessment/Call_Detail_Inspector.tsx`
- Create: `Front_End/src/UI_Components/Match_Assessment/Scorecard_Radar.tsx`
- Create: `Front_End/src/app/assessment/page.tsx`

**Interfaces:**
- Consumes: Video input / preloaded match events
- Produces: Complete Assessment & Match Review Page at route `/assessment`

- [ ] **Step 1: Implement Video Scrubber & Decision Timeline**

- ไทม์ไลน์แสดงแถบเวลาของแมตช์ 90 นาที พร้อมหมุดเหตุการณ์ (Event Pins) ตามเวลาที่ผู้ตัดสินให้สัญญาณ
- คลิกที่หมุดเพื่อกระโดดข้ามไปยังวิดีโอเฟรมนั้นทันที (Jump to Timestamp)

- [ ] **Step 2: Implement Call Detail Inspector (`Call_Detail_Inspector.tsx`)**

แสดงภาพ Freeze Frame จังหวะตัดสิน, โครงร่างกระดูก Skeleton, คะแนนความถูกต้อง (0-100), ตารางมุมข้อต่อ, และกติกา IFAB ที่เกี่ยวข้อง.

- [ ] **Step 3: Implement Assessment Scorecard (`Scorecard_Radar.tsx`)**

สรุปผลคะแนนรวมของผู้ตัดสินในแมตช์: เรดาร์ชาร์ตความแม่นยำรายหมวดสัญญาณ, สถิติคะแนนเฉลี่ย, จุดผิดพลาดที่พบบ่อย 3 อันดับแรก, และปุ่ม Export สรุปรายงานการประเมิน.

- [ ] **Step 4: Build Assessment Page (`src/app/assessment/page.tsx`) & Verify Build**

Run: `cd Front_End && npm run build`
Expected: Build success with `/assessment` generated.

- [ ] **Step 5: Commit**

```bash
git add Front_End/src/UI_Components/Match_Assessment/ Front_End/src/app/assessment/
git commit -m "feat(frontend): build match review timeline and assessment scorecard dashboard"
```

---

### Task 5: IFAB Digital Rulebook & Interactive Signals Catalog (`/rules`)
**Files:**
- Create: `Front_End/src/Data_Sources/Ifab_Signals.json`
- Create: `Front_End/src/UI_Components/IFAB_Rules/Rule_Card.tsx`
- Create: `Front_End/src/UI_Components/IFAB_Rules/Rule_Filter.tsx`
- Create: `Front_End/src/UI_Components/IFAB_Rules/Rule_Modal.tsx`
- Create: `Front_End/src/app/rules/page.tsx`

**Interfaces:**
- Consumes: `Ifab_Signals.json`
- Produces: Interactive Rulebook Catalog at route `/rules`

- [ ] **Step 1: Compile Complete 20 IFAB Signals Knowledge Base (`Ifab_Signals.json`)**

รวบรวมข้อมูลสัญญาณผู้ตัดสิน 20 ท่าทาง พร้อมข้อความอธิบายกติกาภาษาไทยและอังกฤษ, กฎข้อที่เกี่ยวข้อง (Law 5, 12, 13), องศามาตรฐาน, รูปแบบการยกแขน, และข้อควรระวังในการตัดสิน.

- [ ] **Step 2: Implement Filterable Rule Catalog & Modal Inspector**

- แถบค้นหาและฟิลเตอร์แยกตามหมวดหมู่ (ลูกตั้งเตะ, การทำฟาวล์, การได้เปรียบ, การล้ำหน้า)
- การ์ดแสดงภาพท่าทางมาตรฐาน พร้อมปุ่มเปิดดูไดอะแกรมมุมข้อต่อแบบละเอียดใน Modal Popup

- [ ] **Step 3: Build Rules Page (`src/app/rules/page.tsx`) & Verify Build**

Run: `cd Front_End && npm run build`
Expected: Build success with `/rules` generated.

- [ ] **Step 4: Commit**

```bash
git add Front_End/src/Data_Sources/ Front_End/src/UI_Components/IFAB_Rules/ Front_End/src/app/rules/
git commit -m "feat(frontend): create IFAB digital rulebook catalog with 20 referee signals"
```

---

### Task 6: API Gateway Client, System Health Modal & Navigation Layout
**Files:**
- Create: `Front_End/src/Core_Lib/Use_Referee_Gateway_Socket.ts`
- Create: `Front_End/src/Core_Lib/Gateway_Client.ts`
- Create: `Front_End/src/UI_Components/App_Layout/Nav_Bar.tsx`
- Create: `Front_End/src/UI_Components/App_Layout/System_Health_Modal.tsx`
- Create: `Front_End/src/app/layout.tsx`
- Create: `Front_End/src/app/page.tsx`

**Interfaces:**
- Consumes: Tasks 1-5
- Produces: Complete runnable Web Application with responsive Navigation, Home Dashboard, and Microservices Health Modal

- [ ] **Step 1: Implement `Use_Referee_Gateway_Socket.ts` with Auto-Fallback**

เชื่อมต่อ WebSocket ไปยัง API Gateway `/ws/training-stream` หากต่อไม่ติดให้ Fallback เป็น `Microservices_Mock` อัตโนมัติ.

- [ ] **Step 2: Implement Gateway HTTP Client (`src/Core_Lib/Gateway_Client.ts`)**

ไคลเอนต์เรียก API Gateway REST endpoints (`/api/v1/rules`, `/api/v1/drills`, `/api/v1/assessment/*`) พร้อมจัดการ Timeout และ Fallback Data.

- [ ] **Step 3: Implement Global Navbar & System Health Modal (`Nav_Bar.tsx`, `System_Health_Modal.tsx`)**

- เมนูหลัก 3 หน้า: ฝึกซ้อมสด (`/drills`), ตรวจประเมินแมตช์ (`/assessment`), คลังกติกา IFAB (`/rules`)
- ป้ายแสดงสถานะการเชื่อมต่อ: 🟢 Microservices Online / 🟡 Simulation Mode พร้อมปุ่มคลิกเปิดดูสถานะรายบริการ (API Gateway, Vision Service, Coaching Engine, Rules Service)

- [ ] **Step 4: Implement Landing Page (`src/app/page.tsx`)**

หน้าแรกแนะนำระบบ นำเสนอ 3 ฟังก์ชันเด่น พร้อมปุ่ม Quick Start เริ่มฝึกซ้อมได้ในคลิกเดียว.

- [ ] **Step 5: End-to-End Build & Run Verification**

Run: `cd Front_End && npm run build`
Expected: PASS - All routes static/dynamic compiled successfully with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add Front_End/
git commit -m "feat(frontend): complete microservices-ready web app layout, health monitor and gateway client"
```

---

## Plan Self-Review Checklist
- [x] **Microservices alignment:** รองรับการเชื่อมต่อกับ API Gateway และมี Microservices Mock Adapter จำลองทั้ง 4 บริการ
- [x] **Scope precision:** โฟกัสเฉพาะงาน Frontend ตามที่คุณรับผิดชอบอย่างแท้จริง
- [x] **Step scan:** ทุก Step เป็น Action ที่ชัดเจนและมี Verification กำกับ
- [x] **Standalone viability:** หน้าเว็บสามารถรัน พรีเซนต์ และทดสอบได้ 100% ทันทีโดยไม่ต้องรอ Backend
