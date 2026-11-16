# Modal FastAPI Backend & Next.js Frontend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Save this plan both as an artifact (`<artifactDir>/implementation_plan.md`) and in the repository at `docs/superpowers/plans/2026-11-16-modal-backend-frontend-integration.md`. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** ผสานระบบ Backend FastAPI บน Modal (`https://kitkhachon-xx--web.us-east.modal.run/`) เข้ากับ Next.js Frontend (`Front_End/`) ครบทั้ง 4 Endpoints (`GET /health`, `POST /predict/image`, `POST /predict/video`, `WS /ws/webcam`) พร้อมรวม Branch `origin/main` เข้าสู่ `dev/phuriphat`, สร้าง Next.js BFF API Proxy เพื่อแก้ปัญหา CORS และซ่อน API Key, และเชื่อมต่อแบบ Hybrid Mode ในหน้า `/drills`, `/examination`, และ `Nav_Bar`

**Architecture:**
- **Git Branch Unification:** Merge `origin/main` (ที่มี `Inference/` และ `docs/api_spce/apiSpec.md`) เข้าสู่ `dev/phuriphat` (ที่มี `Front_End/`) เพื่อให้มีโค้ดครบวงจรใน Branch เดียว
- **Next.js BFF Proxy (`/api/inference/*`):** เนื่องจาก `Inference/app/service.py` บน Modal ไม่มี `CORSMiddleware` การส่ง Header `X-API-Key` จาก Browser โดยตรงจะติด CORS Preflight จึงใช้ Next.js Route Handlers (`/api/inference/health`, `/api/inference/image`, `/api/inference/video`, `/api/inference/ws-config`) ยิงแบบ Server-to-Server พร้อมแนบ `X-API-Key` จาก `.env.local`
- **Lock-Step WebSocket & Hybrid Posture Adapter:** เชื่อมต่อ `wss://kitkhachon-xx--web.us-east.modal.run/ws/webcam?api_key=...` จาก Browser โดยตรง (WebSocket ไม่มี CORS preflight) ส่งภาพ JPEG binary ทีละเฟรมและรอผล JSON `{"detections": [{"label", "confidence"}]}` ก่อนส่งเฟรมถัดไป (ป้องกันคิวค้างบน CPU ตาม `apiSpec.md`) แล้วแปลงผลทำนายเป็น `FrameFeedbackPayload` + ซิงค์ Skeleton Overlay

**Tech Stack:** Next.js 14 (App Router), TypeScript, React 18, Tailwind CSS, FastAPI (Modal CPU Deployment), WebSockets, HTML5 Canvas / Video API

**Spec:** `docs/api_spce/apiSpec.md` (จาก `origin/main`)

**Equipped Skills (`automated-task-workflow` Step 3):**
- `brainstorming` & `writing-plans`: วิเคราะห์ความต้องการและวางแผนโครงสร้างระดับไฟล์และอินเทอร์เฟซ
- `api-and-interface-design`: ออกแบบ Next.js BFF Proxy Routes และ TypeScript Contracts ให้ตรงกับ `apiSpec.md`
- `frontend-ui-engineering` & `apple-design`: พัฒนา UI สำหรับโหมดกล้องสด `/ws/webcam`, อัปโหลดรูป `/predict/image`, และอัปโหลดวิดีโอ `/predict/video` ตามมาตรฐาน Apple HIG
- `executing-plans` & `verification-before-completion`: รันงานตามแผนและตรวจสอบด้วย Build, Typecheck และการยิง API จริง

---

## Global Constraints
- **Modal API Base URL:** `https://kitkhachon-xx--web.us-east.modal.run`
- **Modal WebSocket URL:** `wss://kitkhachon-xx--web.us-east.modal.run/ws/webcam`
- **Authentication:** Header `X-API-Key: <FOOTBALL_API_KEY>` สำหรับ `/predict/image`, `/predict/video` และ Query Param `?api_key=<FOOTBALL_API_KEY>` สำหรับ `/ws/webcam` (`/health` ไม่ต้องใช้คีย์)
- **CPU Cold Start & Latency:** การยิงครั้งแรกหลัง Container Idle อาจใช้เวลา Warmup 10–30 วินาที และความเร็วต่อเฟรมบน CPU อยู่ที่ ~0.1–1.0 วินาที ต้องแสดงสถานะ Warmup ชัดเจนและห้ามส่งเฟรม WebSocket รัวแบบไม่รอผลตอบกลับ (Lock-step frame sending)
- **Known Model Limitations (จาก `apiSpec.md` ข้อ 4):** คลาส `Offside`, `Goal`, `Elbowing` มีค่า F1 = 0 ในโมเดลชุดปัจจุบัน ต้องแสดงป้ายแจ้งเตือนให้ผู้ใช้ทราบเมื่อเลือกฝึก 3 ท่านี้ในโหมด Live AI
- **Secret Safety:** ห้าม Commit ค่า API key จริงลงในไฟล์ที่ถูก Track โดย Git เด็ดขาด ให้เก็บไว้ใน `Front_End/.env.local` (ซึ่งถูก Ignore โดย `Front_End/.gitignore`) และใส่เฉพาะ Placeholder ใน `.env.example`

## Review Focus
- **CORS Preflight Failure on Direct Browser Fetch:** Browser ที่ยิง `fetch("https://...modal.run/predict/image", { headers: { "X-API-Key": ... } })` จะติด CORS `OPTIONS` 405 ดังนั้นทุกการเรียก REST จากฝั่ง Client ต้องเรียกผ่าน `/api/inference/*` ของ Next.js เท่านั้น
- **WebSocket Frame Queue Buildup on CPU:** หากส่งเฟรมจากกล้องทุก 16ms (60 FPS) เข้า `/ws/webcam` บน CPU คิวจะค้างและทำให้เซิร์ฟเวอร์ช้าหรือหลุด ต้องใช้ตัวแปร `awaitingResponseRef` เพื่อส่งเฟรมใหม่เมื่อได้รับ JSON จากเฟรมก่อนหน้าแล้วเท่านั้น
- **WebSocket 30-Second Idle Timeout (Code `1001`):** เซิร์ฟเวอร์ Modal จะตัดการเชื่อมต่อด้วยโค้ด `1001` หากไม่มีเฟรมส่งไปนานเกิน 30 วินาที UI ต้องดักจับ `onclose` และมีปุ่ม Reconnect / เชื่อมต่อใหม่อัตโนมัติเมื่อกล้องยังเปิดอยู่
- **Binary Image Proxy Handling (`?annotated=true`):** เมื่อเรียก `/api/inference/image?annotated=true` Next.js Route Handler ต้องส่งคืน `arrayBuffer` พร้อม Header `Content-Type: image/jpeg` โดยไม่พยายามแปลงเป็น JSON
- **Empty Detections (`{"detections": []}`):** เมื่อไม่มีคนในภาพหรือ Confidence < 0.25 โมเดลจะส่ง `{"detections": []}` โค้ดแปลงผลต้องไม่เกิด `TypeError: Cannot read properties of undefined` และต้องรีเซ็ตสถานะเป็น `WAITING`

---

## Tasks

### Task 1: Merge `origin/main` into `dev/phuriphat` & Configure Environment Files
- [x] **Step 1: Save the implementation plan artifact and repo plan document**
- [x] **Step 2: Merge `origin/main` into `dev/phuriphat`**
- [x] **Step 3: Create `Front_End/.env.example` and `Front_End/.env.local`**
- [x] **Step 4: Verify merge and git status**
- [x] **Step 5: Commit the merge and plan**

### Task 2: Backend API Types & Next.js BFF Proxy Routes (`/api/inference/*`)
- [x] **Step 1: Append Modal API types to `Front_End/src/Data_Types/Referee_Types.ts`**
- [x] **Step 2: Implement `Front_End/src/app/api/inference/health/route.ts`**
- [x] **Step 3: Implement `Front_End/src/app/api/inference/image/route.ts`**
- [x] **Step 4: Implement `Front_End/src/app/api/inference/video/route.ts` and `Front_End/src/app/api/inference/ws-config/route.ts`**
- [x] **Step 5: Run TypeScript check and commit**

### Task 3: Frontend API Client & Hybrid Posture Adapter (`Front_End/src/Core_Lib/Api_Client.ts`)
- [x] **Step 1: Implement REST & WebSocket helper functions in `Front_End/src/Core_Lib/Api_Client.ts`**
- [x] **Step 2: Implement `evaluateHybridPostureFromDetections` in `Front_End/src/Core_Lib/Api_Client.ts`**
- [x] **Step 3: Run TypeScript check and commit**

### Task 4: Live `/health` Status Indicator on `Nav_Bar.tsx` and Home (`page.tsx`)
- [x] **Step 1: Update `Nav_Bar.tsx` to check `/api/inference/health` on mount and on click**
- [x] **Step 2: Update `Front_End/src/app/page.tsx` to display real `/health` status**
- [x] **Step 3: Run TypeScript check and commit**

### Task 5: Integrate `/ws/webcam`, `/predict/image`, and `/predict/video` in `/drills`
- [x] **Step 1: Upgrade `Front_End/src/UI_Components/Drill_Practice/Live_Drill_Feed.tsx` with `/ws/webcam` and Snapshot Annotation**
- [x] **Step 2: Create `Front_End/src/UI_Components/Drill_Practice/Media_Upload_Analyzer.tsx`**
- [x] **Step 3: Export `Media_Upload_Analyzer` in `Front_End/src/UI_Components/Drill_Practice/index.ts` and add the 3-mode switcher in `Front_End/src/app/drills/page.tsx`**
- [x] **Step 4: Run TypeScript check and commit**

### Task 6: Integrate `/ws/webcam` & `/predict/image` into Scenario Examination (`Exam_Live_Detector.tsx`)
- [x] **Step 1: Wire `/ws/webcam` and `/predict/image` photo check into `Exam_Live_Detector.tsx`**
- [x] **Step 2: Run TypeScript check and commit**

### Task 7: End-to-End Verification Against Live Modal Backend (`verification-before-completion`)
- [x] **Step 1: Create and run `Front_End/scripts/verify-modal-api.mjs`**
- [x] **Step 2: Run `npm run typecheck` and `npm run build` in `Front_End/`**
- [x] **Step 3: Commit verification script and update plan checkboxes**

---

### Follow-up Phase: Remove All Mockups & Convert to 100% Real System
- [x] **Task A: Delete `Microservices_Mock.ts` & Create `Ifab_Rules_Catalog.ts` + `Session_Store.ts`**
- [x] **Task B: Update `Api_Client.ts` (`evaluateRealDetections`) & `Canvas_Utils.ts` (`getReferencePostureForRule`)**
- [x] **Task C: Convert `/drills` (`Live_Drill_Feed.tsx`, `Coaching_HUD.tsx`, `Drill_Selector.tsx`, `Media_Upload_Analyzer.tsx`, `drills/page.tsx`) to 100% real Modal detection + session recording**
- [x] **Task D: Convert `/examination` (`Exam_Live_Detector.tsx`, `Exam_Result_Inspector.tsx`, `examination/page.tsx`) to 100% real Modal detection + session recording**
- [x] **Task E: Convert `/gradebook`, `/handbook`, `Nav_Bar.tsx`, and Home (`page.tsx`, `Educational_Hero.tsx`, `Curriculum_Quick_Launch.tsx`) to 100% real system**
- [x] **Task F: Verify zero mock references, `tsc --noEmit`, `next build`, and commit**
