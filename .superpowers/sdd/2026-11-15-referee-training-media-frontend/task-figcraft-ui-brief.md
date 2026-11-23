# Task Brief: FigCraft UI Design & Prototype Generation

**Component:** FigCraft UI Design for Football Referee Academy (Educational & Trainee Assessment Platform)
**Files to Produce:**
- `docs/figcraft/Referee_Academy_UI.figcraft` (Native FigCraft project file)
- `docs/figcraft/renders/Screen1_Live_Drills.png`
- `docs/figcraft/renders/Screen2_Scenario_Exam.png`
- `docs/figcraft/renders/Screen3_IFAB_Handbook.png`
- `docs/figcraft/renders/Screen4_Trainee_Gradebook.png`
- `docs/figcraft/scripts/generate_figcraft_ui.py` (Script to generate the JSON commands for figcraft-cli)

**CLI Path:**
- `C:\Program Files\ArtCraft\FigCraft\figcraft-cli.exe`

**Specs & Design Requirements:**
1. Grounded in `docs/superpowers/specs/2026-11-15-referee-ui-design-untitledui-figcraft.md` and Untitled UI Design System.
2. 4 Core Screens (Frames):
   - **Frame 1: `Screen 1 - Live Practice Studio (/drills)`**
     - Resolution: 1440x900, Fill: `#090D16` (Pitch Dark)
     - Header: Logo `⚽ Referee Academy AI`, Breadcrumbs, Status Pill `🟢 Microservices Online`
     - Video Viewport: 16:9 dark card `#0F172A`, Tactical Cyan Reticle `[🎯 TAGGED: REFEREE (98%)]`, Skeleton Keypoints & Bones with confidence colors, Angle Arc `176°`, Ghost guideline
     - Right Sidebar: Untitled UI Circular Progress Hold Timer (`1.2s / 1.5s`, `94/100`), Coaching Alert Toast, Angle progress bars, 20-signal selector list
   - **Frame 2: `Screen 2 - Scenario Examination Studio (/examination)`**
     - Resolution: 1440x900, Fill: `#090D16` (Pitch Dark)
     - Header: Exam Module Title `ชุดข้อสอบสถานการณ์: กติกา Law 12 การทำฟาวล์และการประพฤติผิด`, Progress `ข้อ 1/5`
     - Video Scenario Player: Clip playback box, 5s Reaction countdown progress bar
     - Multiple Choice Decision Panel: 4 interactive cards (Direct Free Kick, Indirect Free Kick, Penalty, Advantage)
     - Live Camera Posture Detector HUD
     - Freeze Frame Result Inspector Modal overlay: Peak posture freeze, skeleton, score 92/100, verdict: ถูกต้องตาม IFAB Law 12
   - **Frame 3: `Screen 3 - IFAB Digital Learning Handbook (/handbook)`**
     - Resolution: 1440x900, Fill: `#F9FAFB` (Clean Minimalist Light Mode)
     - Header: Search input with magnifying glass, Category filter tabs (ทั้งหมด 20, ลูกตั้งเตะ, การทำฟาวล์, การควบคุมเกม, การล้ำหน้า)
     - Cards Grid: 3-column signal cards (`#FFFFFF` background, `#EAECF0` borders, Badges: Law 13, Primary Arm, Elevation 90°, Hold 1.2s, CTA buttons)
     - Slide-over Deep Dive Drawer: Anatomical diagram, tolerance degrees, common mistakes list, coaching tips
   - **Frame 4: `Screen 4 - Trainee Performance Gradebook (/gradebook)`**
     - Resolution: 1440x900, Fill: `#F9FAFB` (Clean Minimalist Light Mode)
     - 4 Untitled UI Metric Cards: Overall Accuracy (88.4%), Scenarios Completed (24), Reaction Time (1.35s), Readiness Level 3
     - 4-Quadrant Competency Radar Chart
     - Weakness Diagnostics Panel with alert pill
     - Exam Attempts History Data Table with columns: Session ID, Date, Module, Score, Latency, Badge: Passed, Certificate CTA
     - Certificate of Achievement Preview Modal

**Execution Steps:**
1. Write a Python script `docs/figcraft/scripts/generate_figcraft_ui.py` that outputs a UTF-8 JSON file containing `frame.create`, `node.create`, `shape.rectangle`, `text.create`, `node.set`, etc., building all 4 screens side by side with gap=100 (x=0, x=1540, x=3080, x=4620).
2. Run `& "C:\Program Files\ArtCraft\FigCraft\figcraft-cli.exe" run <script.json> --out docs/figcraft/Referee_Academy_UI.figcraft`.
3. Export each frame to PNG using `figcraft-cli export docs/figcraft/Referee_Academy_UI.figcraft --out docs/figcraft/renders/` or render.
4. Verify file integrity with `figcraft-cli info docs/figcraft/Referee_Academy_UI.figcraft`.
5. Commit all generated design assets to git.
