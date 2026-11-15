"""
generate_figcraft_ui.py
=======================
Generates high-fidelity FigCraft UI prototype commands for Football Referee Academy
based on Untitled UI Design System & IFAB Rules specification.

Generates 4 frames side-by-side (1440x900 each, with 100px gap):
  - Screen1_Live_Drills (x=0, y=0)
  - Screen2_Scenario_Exam (x=1540, y=0)
  - Screen3_IFAB_Handbook (x=3080, y=0)
  - Screen4_Trainee_Gradebook (x=4620, y=0)
"""

import os
import sys
import json
import math
import subprocess
from pathlib import Path

# Paths
SCRIPTS_DIR = Path(__file__).resolve().parent
DOCS_FIGCRAFT = SCRIPTS_DIR.parent
WORKSPACE_ROOT = DOCS_FIGCRAFT.parent.parent
RENDERS_DIR = DOCS_FIGCRAFT / "renders"
FIGCRAFT_CLI = r"C:\Program Files\ArtCraft\FigCraft\figcraft-cli.exe"

COMMANDS = []

def add_command(command, params):
    COMMANDS.append({"command": command, "params": params})

def add_frame(name, x, y, width=1440, height=900, fill="#090D16"):
    add_command("frame.create", {
        "name": name,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "props": {
            "fill": fill
        }
    })

def add_rect(parent, x, y, w, h, fill=None, stroke=None, stroke_width=None, corner_radius=None, name=None, opacity=None):
    props = {}
    if fill is not None:
        props["fill"] = fill
    if stroke is not None:
        props["stroke"] = stroke
        props["strokeWeight"] = stroke_width if stroke_width is not None else 1
    if corner_radius is not None:
        props["cornerRadius"] = corner_radius
    if opacity is not None:
        props["opacity"] = opacity
    
    params = {
        "parent": parent,
        "x": x,
        "y": y,
        "width": w,
        "height": h,
        "props": props
    }
    if name:
        params["name"] = name
    add_command("shape.rectangle", params)

def add_ellipse(parent, x, y, w, h, fill=None, stroke=None, stroke_width=None, name=None, opacity=None):
    props = {}
    if fill is not None:
        props["fill"] = fill
    if stroke is not None:
        props["stroke"] = stroke
        props["strokeWeight"] = stroke_width if stroke_width is not None else 1
    if opacity is not None:
        props["opacity"] = opacity
    
    params = {
        "parent": parent,
        "x": x,
        "y": y,
        "width": w,
        "height": h,
        "props": props
    }
    if name:
        params["name"] = name
    add_command("shape.ellipse", params)

def add_text(parent, x, y, text, font_size=14, font_style="Regular", fill="#FFFFFF", width=None, align="left", name=None):
    props = {
        "fontSize": font_size,
        "fill": fill,
        "textAlign": align
    }
    if font_style:
        props["fontStyle"] = font_style
    
    params = {
        "parent": parent,
        "text": text,
        "x": x,
        "y": y,
        "props": props
    }
    if width:
        params["width"] = width
    if name:
        params["name"] = name
    add_command("text.create", params)

def add_path(parent, path_data, fill=None, stroke=None, stroke_width=None, name=None, opacity=None):
    props = {}
    if fill is not None:
        props["fill"] = fill
    if stroke is not None:
        props["stroke"] = stroke
        props["strokeWeight"] = stroke_width if stroke_width is not None else 1
    if opacity is not None:
        props["opacity"] = opacity
    
    params = {
        "parent": parent,
        "path": path_data,
        "props": props
    }
    if name:
        params["name"] = name
    add_command("vector.create", params)

def add_line(parent, x1, y1, x2, y2, stroke="#FFFFFF", stroke_width=1, name=None, opacity=None):
    path_data = f"M {x1} {y1} L {x2} {y2}"
    add_path(parent, path_data, stroke=stroke, stroke_width=stroke_width, name=name, opacity=opacity)

def add_badge(parent, x, y, text, bg_color, text_color, border_color=None, font_size=11, font_style="SemiBold", height=22, width=None):
    calc_width = width if width else (len(text) * 7 + 16)
    add_rect(parent, x, y, calc_width, height, fill=bg_color, stroke=border_color, stroke_width=1 if border_color else None, corner_radius=height // 2)
    add_text(parent, x + 8, y + 4, text, font_size=font_size, font_style=font_style, fill=text_color)
    return calc_width

def add_button(parent, x, y, w, h, text, bg_color, text_color, border_color=None, font_size=13, font_style="SemiBold", corner_radius=8):
    add_rect(parent, x, y, w, h, fill=bg_color, stroke=border_color, stroke_width=1 if border_color else None, corner_radius=corner_radius)
    # Estimate text centering
    add_text(parent, x + (w // 2), y + (h // 2) - (font_size // 2) - 1, text, font_size=font_size, font_style=font_style, fill=text_color, align="center")

def add_progress_bar(parent, x, y, w, h, pct, bg_color, fill_color, corner_radius=4):
    add_rect(parent, x, y, w, h, fill=bg_color, corner_radius=corner_radius)
    fill_w = max(4, int(w * (pct / 100.0)))
    add_rect(parent, x, y, fill_w, h, fill=fill_color, corner_radius=corner_radius)

def add_radar_chart(parent, cx, cy, radius, values, labels, color="#0E7490"):
    """
    Renders 4-axis diamond/concentric radar chart.
    values: list of 4 floats (0-100) for [Top, Right, Bottom, Left]
    """
    # Grid rings: 25%, 50%, 75%, 100%
    for step in [0.25, 0.5, 0.75, 1.0]:
        r = radius * step
        ring_path = f"M {cx} {cy - r} L {cx + r} {cy} L {cx} {cy + r} L {cx - r} {cy} Z"
        add_path(parent, ring_path, stroke="#E2E8F0" if color=="#0E7490" else "#334155", stroke_width=1)
    
    # Axis lines
    add_line(parent, cx, cy - radius, cx, cy + radius, stroke="#CBD5E1", stroke_width=1)
    add_line(parent, cx - radius, cy, cx + radius, cy, stroke="#CBD5E1", stroke_width=1)

    # Trainee value polygon
    v_top, v_right, v_bottom, v_left = [v / 100.0 * radius for v in values]
    poly_path = f"M {cx} {cy - v_top} L {cx + v_right} {cy} L {cx} {cy + v_bottom} L {cx - v_left} {cy} Z"
    add_path(parent, poly_path, fill="#0E749033", stroke=color, stroke_width=2, name="Radar Data Polygon")

    # Vertex dots
    pts = [
        (cx, cy - v_top),
        (cx + v_right, cy),
        (cx, cy + v_bottom),
        (cx - v_left, cy)
    ]
    for px, py in pts:
        add_ellipse(parent, px - 4, py - 4, 8, 8, fill=color, stroke="#FFFFFF", stroke_width=1)

    # Labels
    add_text(parent, cx, cy - radius - 20, f"{labels[0]} ({int(values[0])}%)", font_size=11, font_style="SemiBold", fill="#1E293B", align="center")
    add_text(parent, cx + radius + 10, cy - 6, f"{labels[1]} ({int(values[1])}%)", font_size=11, font_style="SemiBold", fill="#1E293B", align="left")
    add_text(parent, cx, cy + radius + 10, f"{labels[2]} ({int(values[2])}%)", font_size=11, font_style="SemiBold", fill="#1E293B", align="center")
    add_text(parent, cx - radius - 10, cy - 6, f"{labels[3]} ({int(values[3])}%)", font_size=11, font_style="SemiBold", fill="#1E293B", align="right")


# ==============================================================================
# BUILD SCREEN 1: Live Practice Studio (/drills) - Frame ID: 2
# ==============================================================================
def build_screen_1(frame_id):
    p = frame_id
    # Header Bar
    add_rect(p, 0, 0, 1440, 64, fill="#0F172A", stroke="#1E293B", stroke_width=1)
    # Brand
    add_text(p, 32, 20, "⚽ Referee Academy AI", font_size=18, font_style="Bold", fill="#FFFFFF")
    # Breadcrumbs
    add_rect(p, 270, 16, 380, 32, fill="#1E293B", corner_radius=16)
    add_text(p, 286, 23, "หน้าหลัก   /   แบบฝึกหัดสด   /   ฟรีคิกทางอ้อม (IFAB Law 13)", font_size=12, font_style="Medium", fill="#94A3B8")
    
    # Status badges in header
    add_badge(p, 670, 20, "🟢 Microservices Online (31.4 FPS)", bg_color="#064E3B", text_color="#34D399", border_color="#059669")
    add_badge(p, 915, 20, "⚡ Latency: 14.2ms", bg_color="#1E293B", text_color="#38BDF8")
    add_badge(p, 1055, 20, "⏱ 00:14:25 Session", bg_color="#1E293B", text_color="#CBD5E1")
    
    # Profile & Theme
    add_rect(p, 1220, 16, 188, 32, fill="#1E293B", corner_radius=16)
    add_ellipse(p, 1224, 20, 24, 24, fill="#0E7490")
    add_text(p, 1229, 24, "IR", font_size=11, font_style="Bold", fill="#FFFFFF")
    add_text(p, 1256, 23, "อัศวิน (Level 2)", font_size=12, font_style="Medium", fill="#E2E8F0")
    add_text(p, 1365, 23, "🌙", font_size=13, fill="#FCD34D")

    # LEFT VIEWPORT: Video Feed Area (x=32, y=88, width=860, height=530)
    add_rect(p, 32, 88, 860, 530, fill="#0B132B", stroke="#1E293B", stroke_width=2, corner_radius=16)
    
    # Top feed meta banner
    add_rect(p, 48, 104, 240, 26, fill="#0F172ACC", corner_radius=6)
    add_text(p, 58, 109, "🔴 LIVE WEBCAM FEED (1080p 60FPS)", font_size=11, font_style="Bold", fill="#F43F5E")
    add_badge(p, 300, 104, "AI MODEL: YOLOv8x-Pose (ONNX TensorRT)", bg_color="#0F172ACC", text_color="#38BDF8")

    # Secondary untagged person (Player #10)
    add_rect(p, 670, 210, 160, 280, fill="#0F172A40", stroke="#475569", stroke_width=1, corner_radius=8)
    add_badge(p, 670, 182, "👤 Player #10 (คลิกเพื่อสลับ Tag)", bg_color="#1E293B", text_color="#94A3B8")

    # Tactical Reticle on Referee: Box (x=240, y=140, width=380, height=430)
    ret_x, ret_y, ret_w, ret_h = 240, 140, 380, 430
    add_rect(p, ret_x, ret_y, ret_w, ret_h, fill="#08334415", stroke="#22D3EE40", stroke_width=1, corner_radius=12)
    # Corner brackets (4 corners)
    bracket_len = 24
    # Top-Left
    add_line(p, ret_x, ret_y + bracket_len, ret_x, ret_y, stroke="#22D3EE", stroke_width=3)
    add_line(p, ret_x, ret_y, ret_x + bracket_len, ret_y, stroke="#22D3EE", stroke_width=3)
    # Top-Right
    add_line(p, ret_x + ret_w - bracket_len, ret_y, ret_x + ret_w, ret_y, stroke="#22D3EE", stroke_width=3)
    add_line(p, ret_x + ret_w, ret_y, ret_x + ret_w, ret_y + bracket_len, stroke="#22D3EE", stroke_width=3)
    # Bottom-Left
    add_line(p, ret_x, ret_y + ret_h - bracket_len, ret_x, ret_y + ret_h, stroke="#22D3EE", stroke_width=3)
    add_line(p, ret_x, ret_y + ret_h, ret_x + bracket_len, ret_y + ret_h, stroke="#22D3EE", stroke_width=3)
    # Bottom-Right
    add_line(p, ret_x + ret_w - bracket_len, ret_y + ret_h, ret_x + ret_w, ret_y + ret_h, stroke="#22D3EE", stroke_width=3)
    add_line(p, ret_x + ret_w, ret_y + ret_h - bracket_len, ret_x + ret_w, ret_y + ret_h, stroke="#22D3EE", stroke_width=3)

    # Floating Tag pill above reticle
    add_badge(p, ret_x + 30, ret_y - 14, "🎯 TAGGED: REFEREE (98.4% Confidence)", bg_color="#083344", text_color="#22D3EE", border_color="#22D3EE", font_size=11, height=24)

    # Ghost guideline overlay (Translucent dotted vertical line for 180° arm)
    add_line(p, 470, 240, 470, 90, stroke="#38BDF860", stroke_width=2, name="Ghost Target Line")
    add_ellipse(p, 464, 84, 12, 12, stroke="#38BDF880", stroke_width=2, fill="#0284C720", name="Ghost Wrist Target")
    add_text(p, 485, 96, "เกณฑ์ IFAB 180° (เป้าหมาย)", font_size=10, font_style="Medium", fill="#38BDF8")

    # Referee Skeleton (COCO 17 Keypoints for Indirect Free Kick)
    # Keypoint Coordinates
    head_x, head_y = 430, 190
    l_sh_x, l_sh_y = 390, 240
    r_sh_x, r_sh_y = 470, 240
    # Left Arm (Resting)
    l_elb_x, l_elb_y = 360, 310
    l_wri_x, l_wri_y = 350, 375
    # Right Arm (Raised Vertically for Indirect Free Kick - 176°)
    r_elb_x, r_elb_y = 472, 160
    r_wri_x, r_wri_y = 474, 90
    # Hips & Legs
    l_hip_x, l_hip_y = 405, 375
    r_hip_x, r_hip_y = 455, 375
    l_knee_x, l_knee_y = 398, 455
    r_knee_x, r_knee_y = 462, 455
    l_ank_x, l_ank_y = 395, 530
    r_ank_x, r_ank_y = 465, 530

    # Skeleton Bones
    bones = [
        (head_x, head_y, (l_sh_x + r_sh_x)//2, (l_sh_y + r_sh_y)//2),
        (l_sh_x, l_sh_y, r_sh_x, r_sh_y),
        (l_sh_x, l_sh_y, l_elb_x, l_elb_y),
        (l_elb_x, l_elb_y, l_wri_x, l_wri_y),
        (r_sh_x, r_sh_y, r_elb_x, r_elb_y),
        (r_elb_x, r_elb_y, r_wri_x, r_wri_y),
        ((l_sh_x + r_sh_x)//2, (l_sh_y + r_sh_y)//2, (l_hip_x + r_hip_x)//2, (l_hip_y + r_hip_y)//2),
        (l_hip_x, l_hip_y, r_hip_x, r_hip_y),
        (l_hip_x, l_hip_y, l_knee_x, l_knee_y),
        (l_knee_x, l_knee_y, l_ank_x, l_ank_y),
        (r_hip_x, r_hip_y, r_knee_x, r_knee_y),
        (r_knee_x, r_knee_y, r_ank_x, r_ank_y),
    ]
    for x1, y1, x2, y2 in bones:
        add_line(p, x1, y1, x2, y2, stroke="#22D3EE", stroke_width=3)

    # Keypoint Nodes
    keypoints = [
        (head_x, head_y), (l_sh_x, l_sh_y), (r_sh_x, r_sh_y),
        (l_elb_x, l_elb_y), (l_wri_x, l_wri_y),
        (r_elb_x, r_elb_y), (r_wri_x, r_wri_y),
        (l_hip_x, l_hip_y), (r_hip_x, r_hip_y),
        (l_knee_x, l_knee_y), (r_knee_x, r_knee_y),
        (l_ank_x, l_ank_y), (r_ank_x, r_ank_y)
    ]
    for kx, ky in keypoints:
        add_ellipse(p, kx - 5, ky - 5, 10, 10, fill="#34D399", stroke="#FFFFFF", stroke_width=2)
    # Head circle
    add_ellipse(p, head_x - 18, head_y - 35, 36, 36, fill="#0F172A40", stroke="#22D3EE", stroke_width=2)

    # Angle Badges & Indicator Arcs
    add_badge(p, 490, 150, "📐 176° (มุมยกแขน)", bg_color="#064E3B", text_color="#34D399", border_color="#059669")
    add_badge(p, 490, 200, "ศอกเหยียด 172° ✓", bg_color="#064E3B", text_color="#34D399")
    add_badge(p, 285, 310, "แขนซ้ายแนบลำตัว 24°", bg_color="#1E293B", text_color="#94A3B8")

    # Floating Action Bar (Bottom of video viewport: x=210, y=555, width=500, height=46)
    add_rect(p, 210, 555, 500, 46, fill="#0F172AE6", stroke="#334155", stroke_width=1, corner_radius=23)
    add_button(p, 222, 563, 86, 30, "📷 ปิดกล้อง", bg_color="#1E293B", text_color="#E2E8F0", corner_radius=15, font_size=11)
    add_button(p, 314, 563, 86, 30, "🔄 Mirror", bg_color="#1E293B", text_color="#E2E8F0", corner_radius=15, font_size=11)
    add_button(p, 406, 563, 88, 30, "👻 Ghost ON", bg_color="#083344", text_color="#22D3EE", border_color="#22D3EE", corner_radius=15, font_size=11)
    add_button(p, 500, 563, 86, 30, "📐 องศา ON", bg_color="#083344", text_color="#22D3EE", border_color="#22D3EE", corner_radius=15, font_size=11)
    add_button(p, 592, 563, 106, 30, "🎯 Auto-Tag", bg_color="#14B8A6", text_color="#FFFFFF", corner_radius=15, font_size=11)

    # BOTTOM CARD: Real-Time Posture Confidence Stream (x=32, y=634, width=860, height=234)
    add_rect(p, 32, 634, 860, 234, fill="#0F172A", stroke="#1E293B", stroke_width=1, corner_radius=16)
    add_text(p, 52, 650, "📊 Real-Time Posture Confidence & Keypoint Stability Stream", font_size=14, font_style="Bold", fill="#FFFFFF")
    add_badge(p, 620, 646, "🟢 STABLE HOLD DETECTED (98.2%)", bg_color="#064E3B", text_color="#34D399", border_color="#059669")
    
    # Stability Stream Waveform (simulated real-time audio/posture waveform bars)
    wave_x = 52
    wave_y = 686
    add_rect(p, wave_x, wave_y, 820, 72, fill="#090D16", corner_radius=8)
    # Add 40 bars across the 820px width
    bar_heights = [38, 42, 45, 48, 52, 50, 54, 58, 60, 62, 64, 65, 66, 68, 68, 66, 65, 68, 66, 68, 67, 68, 68, 67, 68, 68, 67, 68, 68, 68, 67, 68, 67, 68, 68, 67, 68, 68, 68, 68]
    for i, h in enumerate(bar_heights):
        bx = wave_x + 12 + i * 20
        by = wave_y + (72 - h) // 2
        col = "#10B981" if h >= 60 else ("#22D3EE" if h >= 50 else "#F59E0B")
        add_rect(p, bx, by, 12, h, fill=col, corner_radius=2)
    add_line(p, wave_x, wave_y + 36, wave_x + 820, wave_y + 36, stroke="#33415540", stroke_width=1)

    # Bottom Stream Telemetry Stats
    add_text(p, 52, 775, "🎯 ตรวจพบสัญญาณ: ฟรีคิกทางอ้อม (INDIRECT_FREE_KICK)", font_size=12, font_style="SemiBold", fill="#22D3EE")
    add_text(p, 52, 796, "อัลกอริทึม: COCO-17 Biomechanical Angle Validator | Window: 30 Frames (1.0s) | Stability Variance: ±0.012 rad", font_size=11, fill="#94A3B8")
    add_badge(p, 660, 780, "EMA Smoothing: α=0.7", bg_color="#1E293B", text_color="#CBD5E1")
    add_badge(p, 775, 780, "FPS: 31.4 Stable", bg_color="#1E293B", text_color="#34D399")

    # ==========================================================================
    # RIGHT COLUMN: Coaching HUD & Drills Selector (x=916, y=88, width=492)
    # ==========================================================================
    # Card 1: Circular Progress Hold Timer (x=916, y=88, width=492, height=190)
    add_rect(p, 916, 88, 492, 190, fill="#0F172A", stroke="#1E293B", stroke_width=1, corner_radius=16)
    add_text(p, 936, 104, "⏱ Posture Hold Countdown (ระยะเวลาค้างสัญญาณ)", font_size=14, font_style="Bold", fill="#FFFFFF")
    
    # Circular progress ring simulation
    circ_cx, circ_cy, circ_r = 995, 190, 48
    add_ellipse(p, circ_cx - circ_r, circ_cy - circ_r, circ_r * 2, circ_r * 2, stroke="#1E293B", stroke_width=8, fill="#090D16")
    # Progress arc (approx 80% circle)
    add_path(p, f"M {circ_cx} {circ_cy - circ_r} A {circ_r} {circ_r} 0 1 1 {circ_cx - 38} {circ_cy + 28}", stroke="#10B981", stroke_width=8)
    add_text(p, circ_cx, circ_cy - 10, "1.2s", font_size=20, font_style="Bold", fill="#10B981", align="center")
    add_text(p, circ_cx, circ_cy + 12, "เป้า 1.5s", font_size=10, font_style="Medium", fill="#94A3B8", align="center")

    # Right side score details
    add_text(p, 1080, 145, "คะแนนความแม่นยำท่าทาง", font_size=12, fill="#94A3B8")
    add_text(p, 1080, 165, "94", font_size=40, font_style="Bold", fill="#10B981")
    add_text(p, 1140, 185, "/ 100", font_size=14, fill="#64748B")
    add_badge(p, 1080, 215, "EXCELLENT POSTURE FORM", bg_color="#064E3B", text_color="#34D399", border_color="#059669")
    add_text(p, 936, 252, "รักษาท่าทางนิ่งตรงตาม IFAB Law 13 ไว้อีก 0.3 วินาที เพื่อบันทึกสถิติสำเร็จ", font_size=11, fill="#64748B")

    # Card 2: Dynamic Live Coaching Alert Toast (x=916, y=294, width=492, height=114)
    add_rect(p, 916, 294, 492, 114, fill="#064E3B", stroke="#059669", stroke_width=1, corner_radius=12)
    add_ellipse(p, 936, 312, 28, 28, fill="#059669")
    add_text(p, 943, 318, "✓", font_size=16, font_style="Bold", fill="#FFFFFF")
    add_text(p, 976, 312, "สัญญาณถูกต้อง: ฟรีคิกทางอ้อม (Indirect Free Kick)", font_size=13, font_style="Bold", fill="#ECFDF5")
    add_text(p, 976, 336, "แขนขวาเหยียดตรงขึ้นเหนือศีรษะ ทำมุม 176° (อยู่ในเกณฑ์มาตรฐาน IFAB 170°-180°)\nข้อสังเกต: ต้องค้างสัญญาณจนกว่าลูกบอลจะถูกสัมผัสโดยผู้เล่นคนอื่น", font_size=11, font_style="Regular", fill="#A7F3D0")

    # Card 3: Joint Angle Linear Progress Gauges (x=916, y=424, width=492, height=164)
    add_rect(p, 916, 424, 492, 164, fill="#0F172A", stroke="#1E293B", stroke_width=1, corner_radius=16)
    add_text(p, 936, 440, "📐 การประเมินองศาข้อต่อรายจุด (Joint Angle Compliance)", font_size=13, font_style="Bold", fill="#FFFFFF")
    
    # Gauge 1
    add_text(p, 936, 468, "Right Shoulder Elevation (ยกแขนขวา)", font_size=11, fill="#E2E8F0")
    add_text(p, 1330, 468, "176° / 180°", font_size=11, font_style="Bold", fill="#10B981")
    add_progress_bar(p, 936, 486, 452, 6, 98, bg_color="#1E293B", fill_color="#10B981")

    # Gauge 2
    add_text(p, 936, 504, "Right Elbow Straightness (ความตรงข้อศอก)", font_size=11, fill="#E2E8F0")
    add_text(p, 1330, 504, "172° / 180°", font_size=11, font_style="Bold", fill="#10B981")
    add_progress_bar(p, 936, 522, 452, 6, 95, bg_color="#1E293B", fill_color="#10B981")

    # Gauge 3
    add_text(p, 936, 540, "Torso Vertical Alignment (ความตั้งตรงของลำตัว)", font_size=11, fill="#E2E8F0")
    add_text(p, 1330, 540, "89° / 90°", font_size=11, font_style="Bold", fill="#22D3EE")
    add_progress_bar(p, 936, 558, 452, 6, 99, bg_color="#1E293B", fill_color="#22D3EE")

    # Card 4: Drill Selector Accordion (x=916, y=604, width=492, height=264)
    add_rect(p, 916, 604, 492, 264, fill="#0F172A", stroke="#1E293B", stroke_width=1, corner_radius=16)
    add_text(p, 936, 620, "📋 คลังท่าฝึกซ้อม (20 IFAB Referee Signals)", font_size=13, font_style="Bold", fill="#FFFFFF")
    # Quick filter pills
    add_badge(p, 936, 646, "ทั้งหมด (20)", bg_color="#0E7490", text_color="#FFFFFF")
    add_badge(p, 1020, 646, "ลูกตั้งเตะ (6)", bg_color="#1E293B", text_color="#94A3B8")
    add_badge(p, 1108, 646, "การทำฟาวล์ (5)", bg_color="#1E293B", text_color="#94A3B8")

    # Drill Items list
    drills = [
        ("1. ฟรีคิกทางอ้อม (Indirect Free Kick)", "กำลังฝึกซ้อม 🎯", "#083344", "#22D3EE", True),
        ("2. ฟรีคิกทางตรง (Direct Free Kick)", "คะแนน 96/100 ✓", "#064E3B", "#34D399", False),
        ("3. การให้สัญญาณได้เปรียบ (Advantage Play-on)", "คะแนน 82/100 ✓", "#064E3B", "#34D399", False),
        ("4. จุดโทษ (Penalty Kick)", "ยังไม่ได้ทดสอบ", "#1E293B", "#94A3B8", False),
    ]
    for idx, (title, status_text, s_bg, s_fg, is_active) in enumerate(drills):
        item_y = 682 + idx * 42
        item_bg = "#1E293B80" if is_active else "#0F172A"
        item_stroke = "#22D3EE" if is_active else "#1E293B"
        add_rect(p, 936, item_y, 452, 36, fill=item_bg, stroke=item_stroke, stroke_width=1, corner_radius=8)
        add_text(p, 948, item_y + 10, title, font_size=12, font_style="SemiBold" if is_active else "Regular", fill="#FFFFFF" if is_active else "#CBD5E1")
        add_badge(p, 1280, item_y + 7, status_text, bg_color=s_bg, text_color=s_fg, font_size=10, height=22)


# ==============================================================================
# BUILD SCREEN 2: Scenario Examination Studio (/examination) - Frame ID: 3
# ==============================================================================
def build_screen_2(frame_id):
    p = frame_id
    # Header Bar
    add_rect(p, 0, 0, 1440, 64, fill="#0F172A", stroke="#1E293B", stroke_width=1)
    add_text(p, 32, 20, "⚽ Referee Academy AI", font_size=18, font_style="Bold", fill="#FFFFFF")
    add_badge(p, 270, 20, "🎓 ห้องสอบจำลองสถานการณ์ผู้ตัดสิน (Scenario Examination Studio)", bg_color="#0E7490", text_color="#FFFFFF")

    # Module title & Question progress in header
    add_text(p, 720, 23, "คำถามข้อที่ 1 / 5", font_size=12, font_style="Bold", fill="#22D3EE")
    add_progress_bar(p, 830, 28, 140, 8, 20, bg_color="#1E293B", fill_color="#22D3EE")
    add_badge(p, 990, 20, "⏳ เวลาสอบเหลือ: 04:32", bg_color="#1E293B", text_color="#F59E0B")
    
    # Trainee Info
    add_rect(p, 1180, 16, 228, 32, fill="#1E293B", corner_radius=16)
    add_ellipse(p, 1184, 20, 24, 24, fill="#0E7490")
    add_text(p, 1189, 24, "IR", font_size=11, font_style="Bold", fill="#FFFFFF")
    add_text(p, 1216, 23, "อัศวิน (REF-2026-092)", font_size=11, font_style="Medium", fill="#E2E8F0")

    # LEFT COLUMN: Scenario Video Player & Decision Choices (x=32, y=88, width=820)
    # Scenario Video Box
    add_rect(p, 32, 88, 820, 440, fill="#0B132B", stroke="#1E293B", stroke_width=2, corner_radius=16)
    # Header strip inside video
    add_rect(p, 48, 104, 520, 28, fill="#0F172ACC", corner_radius=6)
    add_text(p, 58, 110, "🎬 สถานการณ์แข่งขันจริง: นาทีที่ 73 (การสกัดบอลรุนแรงบริเวณเขตโทษ)", font_size=11, font_style="Bold", fill="#F43F5E")
    add_badge(p, 700, 104, "SLOW-MO 0.5x", bg_color="#0F172ACC", text_color="#38BDF8")

    # Football Pitch Graphic Simulation inside video viewport
    pitch_x, pitch_y, pitch_w, pitch_h = 52, 144, 780, 364
    add_rect(p, pitch_x, pitch_y, pitch_w, pitch_h, fill="#064E3B", corner_radius=12)
    # Pitch line markings
    add_line(p, pitch_x + 100, pitch_y, pitch_x + 100, pitch_y + pitch_h, stroke="#FFFFFF80", stroke_width=2) # Goal line
    # Penalty box line
    add_line(p, pitch_x + 100, pitch_y + 60, pitch_x + 360, pitch_y + 60, stroke="#FFFFFF80", stroke_width=2)
    add_line(p, pitch_x + 360, pitch_y + 60, pitch_x + 360, pitch_y + pitch_h - 60, stroke="#FFFFFF80", stroke_width=2)
    add_line(p, pitch_x + 100, pitch_y + pitch_h - 60, pitch_x + 360, pitch_y + pitch_h - 60, stroke="#FFFFFF80", stroke_width=2)
    # Penalty spot
    add_ellipse(p, pitch_x + 280, pitch_y + (pitch_h // 2) - 4, 8, 8, fill="#FFFFFF")
    add_text(p, pitch_x + 260, pitch_y + (pitch_h // 2) + 12, "Penalty Spot", font_size=10, fill="#FFFFFF80")

    # Match players simulation silhouettes
    # Defender sliding
    add_rect(p, pitch_x + 310, pitch_y + 190, 60, 24, fill="#3B82F6", corner_radius=12)
    add_text(p, pitch_x + 314, pitch_y + 194, "Defender", font_size=10, font_style="Bold", fill="#FFFFFF")
    # Striker tripped
    add_rect(p, pitch_x + 290, pitch_y + 160, 50, 24, fill="#EF4444", corner_radius=12)
    add_text(p, pitch_x + 296, pitch_y + 164, "Striker", font_size=10, font_style="Bold", fill="#FFFFFF")
    # Referee in field observing
    add_ellipse(p, pitch_x + 480, pitch_y + 240, 28, 28, fill="#090D16", stroke="#FACC15", stroke_width=2)
    add_text(p, pitch_x + 465, pitch_y + 274, "มุมมองผู้ตัดสิน (Ref)", font_size=10, font_style="Bold", fill="#FACC15")

    # Video timecode
    add_badge(p, pitch_x + 20, pitch_y + pitch_h - 36, "⏱ 00:03.42 / 00:08.00 [FOUL DETECTED]", bg_color="#0F172ACC", text_color="#F43F5E")

    # 5-Second Reaction Countdown Progress Bar (x=32, y=542, width=820, height=44)
    add_rect(p, 32, 542, 820, 44, fill="#1E293B", stroke="#334155", stroke_width=1, corner_radius=12)
    add_progress_bar(p, 32, 542, 820, 44, 48, bg_color="#1E293B", fill_color="#F59E0B", corner_radius=12)
    add_text(p, 52, 554, "⚡ เวลาในการตัดสินใจและให้สัญญาณ: เหลือ 2.4 วินาที (Reaction Window: 5.0s)", font_size=13, font_style="Bold", fill="#FFFFFF")
    add_badge(p, 720, 550, "⏱ COUNTDOWN", bg_color="#B45309", text_color="#FEF3C7")

    # Multiple Choice Decision Panel (x=32, y=600, width=820, height=268)
    add_rect(p, 32, 600, 820, 268, fill="#0F172A", stroke="#1E293B", stroke_width=1, corner_radius=16)
    add_text(p, 52, 616, "เลือกคำตัดสินและทำท่าสัญญาณให้ถูกต้องตามกติกา IFAB Law 12 & 14:", font_size=13, font_style="Bold", fill="#FFFFFF")
    
    # 4 Decision Cards Grid (2x2)
    choices = [
        ("A", "ฟรีคิกทางตรง (Direct Free Kick)", "การทำฟาวล์ภายนอกกรอบเขตโทษ ไม่มีการคาดโทษ", False),
        ("B", "ฟรีคิกทางอ้อม (Indirect Free Kick)", "การเล่นที่เป็นอันตราย (Dangerous Play) โดยไม่มีการปะทะ", False),
        ("C", "จุดโทษ (Penalty Kick)", "สกัดฟาวล์ชัดเจนภายในกรอบเขตโทษ ปฏิเสธโอกาสทำประตู", True),
        ("D", "ให้เปรียบ (Advantage - Play On)", "ทีมรุกยังคงครองบอลและได้เปรียบในการทำประตูต่อเนื่อง", False)
    ]
    for idx, (letter, title, desc, selected) in enumerate(choices):
        col = idx % 2
        row = idx // 2
        cx = 52 + col * 400
        cy = 646 + row * 102
        c_bg = "#083344" if selected else "#1E293B"
        c_stroke = "#22D3EE" if selected else "#334155"
        add_rect(p, cx, cy, 388, 92, fill=c_bg, stroke=c_stroke, stroke_width=2 if selected else 1, corner_radius=10)
        
        # Letter badge
        badge_bg = "#22D3EE" if selected else "#334155"
        badge_fg = "#090D16" if selected else "#CBD5E1"
        add_ellipse(p, cx + 16, cy + 16, 26, 26, fill=badge_bg)
        add_text(p, cx + 24, cy + 20, letter, font_size=12, font_style="Bold", fill=badge_fg)

        add_text(p, cx + 52, cy + 16, title, font_size=13, font_style="Bold", fill="#FFFFFF" if selected else "#E2E8F0")
        add_text(p, cx + 52, cy + 38, desc, font_size=11, font_style="Regular", fill="#22D3EE" if selected else "#94A3B8")
        if selected:
            add_badge(p, cx + 290, cy + 14, "เลือกแล้ว ✓", bg_color="#0E7490", text_color="#FFFFFF", font_size=10, height=22)

    # ==========================================================================
    # RIGHT COLUMN: Trainee Camera & Freeze Frame Result Inspector (x=876, y=88, width=532)
    # ==========================================================================
    # Live Trainee Camera Posture Detector HUD (x=876, y=88, width=532, height=360)
    add_rect(p, 876, 88, 532, 360, fill="#0F172A", stroke="#1E293B", stroke_width=1, corner_radius=16)
    add_text(p, 896, 104, "📹 กล้องตรวจจับท่าทางผู้เข้าสอบ (Live Posture Verification)", font_size=13, font_style="Bold", fill="#FFFFFF")
    add_text(p, 896, 124, "ผู้เข้าสอบ: อัศวิน วิทักษ์ | สถานะ: โพสท่าทางให้สัญญาณตามคำตัดสิน", font_size=11, fill="#94A3B8")

    # Camera Feed Canvas inside HUD
    cam_x, cam_y, cam_w, cam_h = 896, 148, 492, 230
    add_rect(p, cam_x, cam_y, cam_w, cam_h, fill="#090D16", stroke="#1E293B", stroke_width=1, corner_radius=12)

    # Trainee figure pointing towards penalty spot (Arm 45° downwards)
    t_head_x, t_head_y = cam_x + 240, cam_y + 45
    t_sh_r_x, t_sh_r_y = t_head_x + 25, t_head_y + 35
    t_elb_r_x, t_elb_r_y = t_sh_r_x + 35, t_sh_r_y + 30
    t_wri_r_x, t_wri_r_y = t_elb_r_x + 40, t_elb_r_y + 35 # Pointing down-forward at 45°
    
    # Skeleton bones on trainee
    add_line(p, t_head_x, t_head_y, t_head_x, t_head_y + 80, stroke="#10B981", stroke_width=3)
    add_line(p, t_head_x - 25, t_head_y + 35, t_sh_r_x, t_sh_r_y, stroke="#10B981", stroke_width=3)
    add_line(p, t_sh_r_x, t_sh_r_y, t_elb_r_x, t_elb_r_y, stroke="#10B981", stroke_width=3)
    add_line(p, t_elb_r_x, t_elb_r_y, t_wri_r_x, t_wri_r_y, stroke="#10B981", stroke_width=3)
    # Head & joints
    add_ellipse(p, t_head_x - 12, t_head_y - 20, 24, 24, fill="#0F172A", stroke="#10B981", stroke_width=2)
    add_ellipse(p, t_wri_r_x - 4, t_wri_r_y - 4, 8, 8, fill="#34D399")
    add_badge(p, t_wri_r_x + 8, t_wri_r_y - 10, "44° ชี้ลงจุดโทษ ✓", bg_color="#064E3B", text_color="#34D399")

    # Banner inside camera
    add_badge(p, cam_x + 12, cam_y + cam_h - 32, "🎯 ตรวจพบสัญญาณ: จุดโทษ (PENALTY KICK) [ความเชื่อมั่น 97.2%]", bg_color="#064E3B", text_color="#34D399", border_color="#059669")
    add_badge(p, cam_x + 360, cam_y + 12, "⏱ Latency: 1.18s", bg_color="#1E293B", text_color="#38BDF8")

    # Freeze Frame Result Inspector Modal Overlay (x=876, y=464, width=532, height=404)
    add_rect(p, 876, 464, 532, 404, fill="#022C22", stroke="#10B981", stroke_width=2, corner_radius=16)
    
    # Trophy & Header
    add_text(p, 896, 484, "🎉 ผลการตัดสินและให้สัญญาณ: ถูกต้องสมบูรณ์ (VERIFIED)", font_size=14, font_style="Bold", fill="#ECFDF5")
    add_text(p, 896, 506, "ประเมินโดย IFAB Neural Rules Engine | Peak Posture Freeze: 00:04.62", font_size=11, fill="#A7F3D0")

    # Score Card Banner
    add_rect(p, 896, 528, 492, 60, fill="#064E3B", corner_radius=10)
    add_text(p, 916, 538, "คะแนนท่าทางและการตัดสิน", font_size=11, fill="#A7F3D0")
    add_text(p, 916, 554, "92 / 100", font_size=24, font_style="Bold", fill="#FFFFFF")
    add_badge(p, 1040, 546, "เกรด A+ (ยอดเยี่ยม)", bg_color="#10B981", text_color="#FFFFFF")
    add_badge(p, 1220, 546, "เวลาตอบสนอง: 1.18s", bg_color="#083344", text_color="#22D3EE")

    # Criteria Verification Checklist
    checklist = [
        ("คำตัดสินกติกา", "ถูกต้องตาม IFAB Law 12 & Law 14 (Penalty Kick)", True),
        ("องศาการชี้แขน", "44° ชี้ตรงลงจุดโทษอย่างเด็ดขาด (เกณฑ์กำหนด 40°-50°)", True),
        ("ระยะเวลา Hold ท่าทาง", "1.8 วินาที (เกณฑ์กำหนดอย่างน้อย 1.2 วินาที)", True),
        ("ความมั่นคงของลำตัว", "95.4% Stability Index (ไม่มีการเอียงเสียสมดุล)", True)
    ]
    for idx, (label, val, passed) in enumerate(checklist):
        cy = 604 + idx * 36
        add_rect(p, 896, cy, 492, 30, fill="#044E3940", stroke="#05966940", stroke_width=1, corner_radius=6)
        add_text(p, 908, cy + 8, "✅", font_size=12, fill="#34D399")
        add_text(p, 930, cy + 8, f"{label}: {val}", font_size=11, font_style="Medium", fill="#ECFDF5")

    # Navigation Buttons
    add_button(p, 896, 760, 236, 42, "⏮ ย้อนดูรีเพลย์ (Replay)", bg_color="#064E3B", text_color="#ECFDF5", border_color="#059669", font_size=12, corner_radius=8)
    add_button(p, 1152, 760, 236, 42, "ข้อถัดไป (Next Scenario) ➔", bg_color="#10B981", text_color="#FFFFFF", font_size=12, corner_radius=8)
    add_text(p, 896, 820, "คำถามข้อที่ 2: การแฮนด์บอลโดยเจตนาขัดขวางการส่งบอล (Law 12)", font_size=11, fill="#6EE7B7")


# ==============================================================================
# BUILD SCREEN 3: IFAB Digital Learning Handbook (/handbook) - Frame ID: 4
# ==============================================================================
def build_screen_3(frame_id):
    p = frame_id
    # Header Bar (Clean Minimalist White)
    add_rect(p, 0, 0, 1440, 72, fill="#FFFFFF", stroke="#EAECF0", stroke_width=1)
    add_text(p, 32, 24, "⚽ Referee Academy AI", font_size=18, font_style="Bold", fill="#101828")
    add_badge(p, 270, 24, "📖 IFAB Digital Learning Handbook", bg_color="#F2F4F7", text_color="#344054")

    # Navigation Links in header
    nav_links = [
        ("แบบฝึกหัด (Drills)", False),
        ("สอบจำลอง (Exam)", False),
        ("คู่มือกติกา 20 ท่า (Handbook)", True),
        ("สมุดประเมิน (Gradebook)", False)
    ]
    for idx, (title, active) in enumerate(nav_links):
        nx = 580 + idx * 160
        add_text(p, nx, 26, title, font_size=13, font_style="Bold" if active else "Medium", fill="#0E7490" if active else "#667085")
        if active:
            add_line(p, nx, 54, nx + 130, 54, stroke="#0E7490", stroke_width=2)

    # Trainee Profile in header
    add_ellipse(p, 1260, 22, 28, 28, fill="#E0F2FE")
    add_text(p, 1266, 28, "IR", font_size=11, font_style="Bold", fill="#0369A1")
    add_text(p, 1296, 26, "อัศวิน (Level 2)", font_size=12, font_style="Medium", fill="#344054")

    # LEFT AREA: Title, Search, Filter Tabs & 3-Column Grid (x=32, y=92, width=880)
    add_text(p, 32, 92, "คลังกติกาสัญญาณผู้ตัดสิน 20 ท่าทางทางการ (IFAB Laws of the Game)", font_size=18, font_style="Bold", fill="#101828")
    add_text(p, 32, 118, "มาตรฐานการให้สัญญาณมือและภาษากายของผู้ตัดสินตามเกณฑ์ IFAB ประจำฤดูกาล 2025/2026 พร้อมมุมองศาและเกณฑ์วัดผล", font_size=12, fill="#475467")

    # Search Bar (x=32, y=144, width=540, height=42)
    add_rect(p, 32, 144, 540, 42, fill="#FFFFFF", stroke="#D0D5DD", stroke_width=1, corner_radius=8)
    add_text(p, 48, 156, "🔍 ค้นหาท่าสัญญาณ, กติกา, หรือคำสำคัญ (เช่น ฟรีคิก, ล้ำหน้า, VAR, จุดโทษ)...", font_size=12, fill="#98A2B3")
    add_button(p, 490, 150, 72, 30, "ค้นหา", bg_color="#F2F4F7", text_color="#344054", corner_radius=6, font_size=11)

    # Category Filter Tabs (x=32, y=198, width=880, height=38)
    tabs = [
        ("ทั้งหมด (20 ท่า)", True),
        ("ลูกตั้งเตะ (Restarts - 6)", False),
        ("การทำฟาวล์ (Fouls - 5)", False),
        ("การควบคุมเกม (Game Control - 5)", False),
        ("การล้ำหน้า & VAR (Offside - 4)", False),
    ]
    cur_tab_x = 32
    for title, is_active in tabs:
        t_w = len(title) * 8 + 24
        t_bg = "#0E7490" if is_active else "#F2F4F7"
        t_fg = "#FFFFFF" if is_active else "#344054"
        add_rect(p, cur_tab_x, 198, t_w, 36, fill=t_bg, corner_radius=18)
        add_text(p, cur_tab_x + 12, 208, title, font_size=12, font_style="Bold" if is_active else "Medium", fill=t_fg)
        cur_tab_x += t_w + 10

    # 3-Column Signal Cards Grid (x=32, y=250, width=880, height=620)
    cards_data = [
        {
            "law": "IFAB Law 13", "law_bg": "#EFF8FF", "law_fg": "#175CD3",
            "title": "ฟรีคิกทางตรง (Direct Free Kick)",
            "subtitle": "ชี้แขนไปในทิศทางของทีมที่ได้เปรียบ",
            "arm": "📐 แขน 90°", "hold": "⏱ Hold 1.2s", "body": "💪 แขนข้างใดข้างหนึ่ง",
            "selected": False
        },
        {
            "law": "IFAB Law 13", "law_bg": "#EFF8FF", "law_fg": "#175CD3",
            "title": "ฟรีคิกทางอ้อม (Indirect Free Kick)",
            "subtitle": "ยกแขนขวาเหยียดตรงขึ้นเหนือศีรษะ",
            "arm": "📐 แขน 180°", "hold": "⏱ Hold จนสัมผัสบอล", "body": "💪 แขนขวาตรง",
            "selected": True # Selected to match Drawer deep dive!
        },
        {
            "law": "IFAB Law 14", "law_bg": "#FEF3F2", "law_fg": "#B42318",
            "title": "จุดโทษ (Penalty Kick)",
            "subtitle": "ชี้ตรงไปยังจุดโทษอย่างเด็ดขาด",
            "arm": "📐 แขน 45° ชี้ลง", "hold": "⏱ Hold 1.5s", "body": "💪 แขนข้างใดข้างหนึ่ง",
            "selected": False
        },
        {
            "law": "IFAB Law 5", "law_bg": "#ECFDF3", "law_fg": "#027A48",
            "title": "การให้ได้เปรียบ (Advantage Play-on)",
            "subtitle": "ยื่นแขนทั้งสองข้างไปข้างหน้าพร้อมกัน",
            "arm": "📐 2 แขน 45°", "hold": "⏱ กวาดแขนไปข้างหน้า", "body": "💪 2 แขนพร้อมกัน",
            "selected": False
        },
        {
            "law": "IFAB Law 17", "law_bg": "#F9F5FF", "law_fg": "#6941C6",
            "title": "ลูกเตะมุม (Corner Kick)",
            "subtitle": "ชี้ขึ้นไปยังมุมธงฝั่งที่ได้เตะมุม",
            "arm": "📐 ชี้มุม 45° ขึ้น", "hold": "⏱ Hold 1.0s", "body": "💪 แขนข้างที่สะดวก",
            "selected": False
        },
        {
            "law": "IFAB Law 5", "law_bg": "#F8F9FC", "law_fg": "#3E4784",
            "title": "ตรวจสอบ VAR (VAR Review TV)",
            "subtitle": "วาดรูปสี่เหลี่ยมผืนผ้าในอากาศด้วยสองมือ",
            "arm": "📐 สี่เหลี่ยม 2 มือ", "hold": "⏱ ทำซ้ำ 2 ครั้ง", "body": "💪 สองมือชัดเจน",
            "selected": False
        }
    ]

    for idx, card in enumerate(cards_data):
        c_col = idx % 3
        c_row = idx // 3
        card_x = 32 + c_col * 296
        card_y = 250 + c_row * 306
        card_w, card_h = 284, 292
        
        c_fill = "#F0FDFA" if card["selected"] else "#FFFFFF"
        c_stroke = "#0E7490" if card["selected"] else "#EAECF0"
        add_rect(p, card_x, card_y, card_w, card_h, fill=c_fill, stroke=c_stroke, stroke_width=2 if card["selected"] else 1, corner_radius=12)

        # Law badge
        add_badge(p, card_x + 16, card_y + 16, card["law"], bg_color=card["law_bg"], text_color=card["law_fg"])
        if card["selected"]:
            add_badge(p, card_x + 130, card_y + 16, "ดูรายละเอียดอยู่ 🔍", bg_color="#0E7490", text_color="#FFFFFF", font_size=10)

        # Title & Subtitle
        add_text(p, card_x + 16, card_y + 46, card["title"], font_size=13, font_style="Bold", fill="#101828")
        add_text(p, card_x + 16, card_y + 68, card["subtitle"], font_size=11, fill="#475467")

        # Visual anatomical posture thumbnail box
        thumb_y = card_y + 92
        add_rect(p, card_x + 16, thumb_y, card_w - 32, 92, fill="#F8FAFC", stroke="#E2E8F0", stroke_width=1, corner_radius=8)
        # Miniature schematic stick figure in thumbnail
        fig_cx = card_x + (card_w // 2)
        fig_cy = thumb_y + 46
        add_ellipse(p, fig_cx - 6, fig_cy - 24, 12, 12, fill="#0E7490")
        add_line(p, fig_cx, fig_cy - 12, fig_cx, fig_cy + 16, stroke="#0E7490", stroke_width=2)
        # Miniature arm based on signal
        if "180°" in card["arm"]: # Raised vertical
            add_line(p, fig_cx, fig_cy - 6, fig_cx + 8, fig_cy - 34, stroke="#10B981", stroke_width=3)
        elif "90°" in card["arm"]: # Horizontal
            add_line(p, fig_cx, fig_cy - 6, fig_cx + 28, fig_cy - 6, stroke="#10B981", stroke_width=3)
        elif "45° ชี้ลง" in card["arm"]: # Point down
            add_line(p, fig_cx, fig_cy - 6, fig_cx + 24, fig_cy + 18, stroke="#10B981", stroke_width=3)
        elif "45° ขึ้น" in card["arm"]: # Point up
            add_line(p, fig_cx, fig_cy - 6, fig_cx + 22, fig_cy - 24, stroke="#10B981", stroke_width=3)
        else: # 2 arms
            add_line(p, fig_cx, fig_cy - 6, fig_cx + 20, fig_cy + 6, stroke="#10B981", stroke_width=2)
            add_line(p, fig_cx, fig_cy - 6, fig_cx - 20, fig_cy + 6, stroke="#10B981", stroke_width=2)

        # Metric tags
        tag_y = card_y + 194
        add_badge(p, card_x + 16, tag_y, card["arm"], bg_color="#F2F4F7", text_color="#344054", font_size=10, height=22)
        add_badge(p, card_x + 104, tag_y, card["hold"], bg_color="#F2F4F7", text_color="#344054", font_size=10, height=22)
        add_badge(p, card_x + 16, tag_y + 26, card["body"], bg_color="#F2F4F7", text_color="#344054", font_size=10, height=22)

        # CTA Button
        add_button(p, card_x + 16, card_y + 250, card_w - 32, 32, "🎯 เริ่มฝึกซ้อมท่านี้", bg_color="#0E7490", text_color="#FFFFFF", corner_radius=6, font_size=11)

    # ==========================================================================
    # RIGHT AREA: Slide-over Deep Dive Rule Inspector Drawer (x=936, y=88, width=472)
    # ==========================================================================
    add_rect(p, 936, 88, 472, 784, fill="#FFFFFF", stroke="#EAECF0", stroke_width=1, corner_radius=16)
    
    # Drawer Header
    add_text(p, 956, 108, "🔍 รายละเอียดเชิงลึก: ฟรีคิกทางอ้อม", font_size=15, font_style="Bold", fill="#101828")
    add_text(p, 956, 130, "IFAB Law 13 - Free Kicks (ฉบับรับรองปี 2025/2026)", font_size=11, fill="#475467")
    add_button(p, 1360, 106, 28, 28, "✕", bg_color="#F2F4F7", text_color="#667085", corner_radius=14, font_size=12)

    # Anatomical Vector Diagram Box (x=956, y=160, width=432, height=170)
    add_rect(p, 956, 160, 432, 170, fill="#F8FAFC", stroke="#E2E8F0", stroke_width=1, corner_radius=12)
    add_text(p, 972, 172, "📐 แผนผังโครงสร้างร่างกายและมุมมาตรฐาน (IFAB Tolerance Specs)", font_size=11, font_style="Bold", fill="#0E7490")
    
    # Diagram drawing
    d_cx, d_cy = 1040, 250
    add_ellipse(p, d_cx - 10, d_cy - 48, 20, 20, fill="#0E7490")
    add_line(p, d_cx, d_cy - 28, d_cx, d_cy + 24, stroke="#0E7490", stroke_width=3)
    # Raised Arm 180°
    add_line(p, d_cx, d_cy - 20, d_cx + 10, d_cy - 70, stroke="#10B981", stroke_width=3)
    add_ellipse(p, d_cx + 8, d_cy - 72, 6, 6, fill="#10B981")
    # Tolerance arc
    add_path(p, f"M {d_cx + 4} {d_cy - 60} A 20 20 0 0 1 {d_cx + 20} {d_cy - 56}", stroke="#F59E0B", stroke_width=2)
    
    # Specs on right side of diagram
    add_text(p, 1110, 198, "• มุมยกแขน (Elevation): 170° - 180° (ยอมรับได้ ±10°)", font_size=11, font_style="SemiBold", fill="#101828")
    add_text(p, 1110, 220, "• ความเหยียดตรงของข้อศอก: > 165° (ห้ามงอข้อศอก)", font_size=11, font_style="SemiBold", fill="#101828")
    add_text(p, 1110, 242, "• แขนที่ใช้: แขนขวาเหยียดตรงขึ้นเหนือศีรษะ", font_size=11, fill="#475467")
    add_text(p, 1110, 264, "• ระยะเวลาค้างท่าทาง: จนกว่าจะมีการเตะและสัมผัสบอล", font_size=11, fill="#475467")
    add_text(p, 1110, 286, "• ลำตัว: ตั้งตรง สายตามองไปยังจุดตั้งเตะ", font_size=11, fill="#475467")

    # Common Mistakes Box (x=956, y=344, width=432, height=124)
    add_rect(p, 956, 344, 432, 124, fill="#FFFBEB", stroke="#FDE68A", stroke_width=1, corner_radius=10)
    add_text(p, 972, 358, "⚠️ ข้อผิดพลาดที่พบบ่อยในการแข่งขันจริง (Common Mistakes to Avoid):", font_size=11, font_style="Bold", fill="#B45309")
    add_text(p, 972, 380, "1. ลดแขนลงเร็วกว่ากำหนด: กรรมการต้องค้างแขนไว้จนกว่าบอลจะถูกเตะและสัมผัสผู้เล่นคนอื่น\n2. ข้อศอกงอหรือยกแขนเอียงออกด้านข้างเกิน 15 องศา ทำให้ผู้เล่นและแฟนบอลสับสน\n3. ไม่ส่งสัญญาณเสียงนกหวีดควบคู่เมื่อเกิดการฟาวล์ที่เป็นลูกตั้งเตะ", font_size=11, fill="#92400E")

    # Official IFAB Guideline Quote Box (x=956, y=482, width=432, height=108)
    add_rect(p, 956, 482, 432, 108, fill="#F0FDFA", stroke="#99F6E4", stroke_width=1, corner_radius=10)
    add_text(p, 972, 496, "📜 คำอธิบายอย่างเป็นทางการตามคู่มือ IFAB Law 13:", font_size=11, font_style="Bold", fill="#0F766E")
    add_text(p, 972, 516, "\"The referee indicates an indirect free kick by raising the arm above the head; this signal is maintained until the kick has been taken and the ball touches another player or goes out of play.\"", font_size=11, font_style="Medium", fill="#115E59")

    # Assessment Scoring Weights Table (x=956, y=604, width=432, height=114)
    add_rect(p, 956, 604, 432, 114, fill="#F8FAFC", stroke="#E2E8F0", stroke_width=1, corner_radius=8)
    add_text(p, 972, 616, "📊 เกณฑ์และน้ำหนักคะแนนการตรวจประเมินด้วย AI (Scoring Breakdown):", font_size=11, font_style="Bold", fill="#101828")
    add_text(p, 972, 638, "1. ความเหยียดตรงของข้อศอก (Elbow Straightness)  ──  น้ำหนักคะแนน 40%", font_size=11, fill="#475467")
    add_text(p, 972, 658, "2. ความตั้งตรงของลำตัวและแขน (Body Posture Alignment)  ──  น้ำหนักคะแนน 30%", font_size=11, fill="#475467")
    add_text(p, 972, 678, "3. ระยะเวลาการค้างสัญญาณ (Hold Duration Stability)  ──  น้ำหนักคะแนน 30%", font_size=11, fill="#475467")

    # Bottom CTA Action Button (x=956, y=732, width=432, height=44)
    add_button(p, 956, 732, 432, 44, "🎯 เริ่มฝึกซ้อมท่านี้ใน Live Studio (/drills)", bg_color="#0E7490", text_color="#FFFFFF", corner_radius=8, font_size=13)
    add_text(p, 956, 786, "กดเพื่อโหลดท่านี้เข้าสู่โหมดกล้องสดพร้อมระบบตรวจจับอัตโนมัติทันที", font_size=11, fill="#98A2B3")


# ==============================================================================
# BUILD SCREEN 4: Trainee Performance Gradebook (/gradebook) - Frame ID: 5
# ==============================================================================
def build_screen_4(frame_id):
    p = frame_id
    # Top Header Bar (Clean Minimalist White)
    add_rect(p, 0, 0, 1440, 72, fill="#FFFFFF", stroke="#EAECF0", stroke_width=1)
    add_text(p, 32, 24, "⚽ Referee Academy AI", font_size=18, font_style="Bold", fill="#101828")
    add_badge(p, 270, 24, "📊 สมุดผลการเรียนและใบรับรอง (Trainee Gradebook)", bg_color="#F2F4F7", text_color="#344054")

    # Trainee Profile in header
    add_rect(p, 860, 18, 260, 36, fill="#F8FAFC", stroke="#EAECF0", stroke_width=1, corner_radius=18)
    add_ellipse(p, 864, 22, 28, 28, fill="#0E7490")
    add_text(p, 870, 28, "IR", font_size=11, font_style="Bold", fill="#FFFFFF")
    add_text(p, 900, 28, "อัศวิน วิทักษ์ (REF-2026-092)", font_size=11, font_style="Bold", fill="#101828")

    # Export & Certificate CTAs in header
    add_button(p, 1136, 18, 140, 36, "📄 ดาวน์โหลด PDF", bg_color="#FFFFFF", text_color="#344054", border_color="#D0D5DD", corner_radius=8, font_size=12)
    add_button(p, 1286, 18, 122, 36, "🎓 ดูใบรับรอง", bg_color="#0E7490", text_color="#FFFFFF", corner_radius=8, font_size=12)

    # TOP ROW: 4 Untitled UI Metric Cards (x=32, y=92, width=1376, height=120)
    cards = [
        {
            "label": "ความแม่นยำท่าทางโดยรวม (Overall Accuracy)",
            "val": "88.4%",
            "trend": "+4.2% vs สัปดาห์ก่อน", "trend_bg": "#ECFDF3", "trend_fg": "#027A48",
            "sub": "ประเมินจากการฝึกซ้อม 142 ครั้ง"
        },
        {
            "label": "ข้อสอบสถานการณ์ที่ผ่าน (Scenarios Passed)",
            "val": "24 / 28",
            "trend": "อัตราผ่าน 85.7%", "trend_bg": "#EFF8FF", "trend_fg": "#175CD3",
            "sub": "ผ่านเกณฑ์ IFAB Category 2"
        },
        {
            "label": "เวลาตอบสนองเฉลี่ย (Avg. Reaction Time)",
            "val": "1.35s",
            "trend": "เร็วขึ้น -0.22s", "trend_bg": "#ECFDF3", "trend_fg": "#027A48",
            "sub": "เกณฑ์มาตรฐาน IFAB: < 1.50s"
        },
        {
            "label": "ระดับความพร้อม (Readiness Tier)",
            "val": "ระดับ 3 (Class 3)",
            "trend": "พร้อมเลื่อนสู่ระดับชาติ 🏆", "trend_bg": "#F0FDFA", "trend_fg": "#0E7490",
            "sub": "สะสมคะแนน 884 / 1,000 XP"
        }
    ]
    for idx, c in enumerate(cards):
        cx = 32 + idx * 348
        add_rect(p, cx, 92, 332, 120, fill="#FFFFFF", stroke="#EAECF0", stroke_width=1, corner_radius=12)
        add_text(p, cx + 18, 108, c["label"], font_size=11, font_style="Medium", fill="#475467")
        add_text(p, cx + 18, 130, c["val"], font_size=28, font_style="Bold", fill="#101828")
        add_badge(p, cx + 18, 172, c["trend"], bg_color=c["trend_bg"], text_color=c["trend_fg"])
        add_text(p, cx + 175, 176, c["sub"], font_size=10, fill="#98A2B3")

    # MIDDLE ROW: Radar Chart & Diagnostics (x=32, y=228, width=1376, height=270)
    # Left Panel: 4-Quadrant Competency Radar Chart (width=680)
    add_rect(p, 32, 228, 680, 270, fill="#FFFFFF", stroke="#EAECF0", stroke_width=1, corner_radius=16)
    add_text(p, 52, 246, "🕸 เรดาร์ประเมินทักษะ 4 มิติหลัก (Referee Core Competencies)", font_size=14, font_style="Bold", fill="#101828")
    add_text(p, 52, 268, "เปรียบเทียบผลการฝึกซ้อมกับเกณฑ์มาตรฐานสมาคมผู้ตัดสินฟุตบอล", font_size=11, fill="#475467")

    # Radar Chart
    r_cx, r_cy, r_rad = 200, 385, 75
    r_vals = [92.0, 86.0, 74.0, 94.0]
    r_labels = ["ลูกตั้งเตะ", "การทำฟาวล์", "การให้ได้เปรียบ", "การล้ำหน้า & VAR"]
    add_radar_chart(p, r_cx, r_cy, r_rad, r_vals, r_labels, color="#0E7490")

    # Competency breakdown progress bars on the right side of the radar card
    breakdown_x = 380
    competencies = [
        ("ลูกตั้งเตะ (Restarts)", 92, "#10B981"),
        ("การทำฟาวล์ (Fouls & Misconduct)", 86, "#10B981"),
        ("การให้ได้เปรียบ (Advantage Play-on)", 74, "#F59E0B"),
        ("การล้ำหน้า & VAR (Offside & Tech)", 94, "#10B981")
    ]
    for idx, (c_name, c_score, c_col) in enumerate(competencies):
        b_y = 310 + idx * 38
        add_text(p, breakdown_x, b_y, c_name, font_size=11, font_style="Medium", fill="#344054")
        add_text(p, breakdown_x + 250, b_y, f"{c_score}%", font_size=11, font_style="Bold", fill=c_col)
        add_progress_bar(p, breakdown_x, b_y + 16, 290, 6, c_score, bg_color="#F2F4F7", fill_color=c_col)

    # Right Panel: Weakness Diagnostics & Action Plan (width=680)
    add_rect(p, 728, 228, 680, 270, fill="#FFFFFF", stroke="#EAECF0", stroke_width=1, corner_radius=16)
    add_text(p, 748, 246, "🔍 การวินิจฉัยจุดบกพร่องและแผนพัฒนา (Diagnostics & Action Plan)", font_size=14, font_style="Bold", fill="#101828")
    add_text(p, 748, 268, "วิเคราะห์จากสถิติข้อสอบและวิดีโอฝึกซ้อม 30 วันล่าสุด", font_size=11, fill="#475467")

    # Alert Card 1: Warning (Advantage Play-on)
    add_rect(p, 748, 296, 640, 64, fill="#FFFBEB", stroke="#FDE68A", stroke_width=1, corner_radius=10)
    add_text(p, 764, 308, "⚠️ จุดที่ต้องพัฒนา: การให้สัญญาณได้เปรียบ (Advantage Play-on)", font_size=12, font_style="Bold", fill="#B45309")
    add_text(p, 764, 328, "องศาการกางแขน 2 ข้างยังแคบกว่าเกณฑ์ (32° เทียบกับมาตรฐาน 45°) และการโน้มตัวไปข้างหน้ายังไม่ชัดเจน", font_size=11, fill="#92400E")

    # Alert Card 2: Success (Offside & Free Kicks)
    add_rect(p, 748, 368, 640, 64, fill="#ECFDF5", stroke="#A7F3D0", stroke_width=1, corner_radius=10)
    add_text(p, 764, 380, "✅ จุดเด่น: สัญญาณการล้ำหน้าและฟรีคิก (Offside & Free Kicks)", font_size=12, font_style="Bold", fill="#065F46")
    add_text(p, 764, 400, "ความเหยียดตรงของข้อศอกเฉลี่ย 177° ความมั่นคงของสัญชาตญาณสูงมาก อยู่ในเกณฑ์ผู้ตัดสินระดับชาติ", font_size=11, fill="#047857")

    # Recommended Action
    add_rect(p, 748, 440, 640, 44, fill="#F0FDFA", stroke="#99F6E4", stroke_width=1, corner_radius=8)
    add_text(p, 764, 452, "🎯 แผนฝึกประจำสัปดาห์: ฝึกซ้อมท่า Advantage Play-on ต่อเนื่อง 15 นาที เพื่อปลดล็อก Class 2", font_size=11, font_style="Bold", fill="#0F766E")
    add_button(p, 1280, 446, 96, 32, "เริ่มฝึกซ้อม", bg_color="#0E7490", text_color="#FFFFFF", corner_radius=6, font_size=11)

    # BOTTOM ROW: Exam Attempts History Data Table (x=32, y=514, width=1376, height=356)
    add_rect(p, 32, 514, 1376, 356, fill="#FFFFFF", stroke="#EAECF0", stroke_width=1, corner_radius=16)
    
    # Table Header & Controls
    add_text(p, 52, 532, "📜 ประวัติการทดสอบสถานการณ์จำลอง (Recent Assessment Sessions)", font_size=14, font_style="Bold", fill="#101828")
    add_badge(p, 540, 528, "5 การทดสอบล่าสุด", bg_color="#F2F4F7", text_color="#344054")
    # Search & Filter
    add_rect(p, 1080, 526, 180, 32, fill="#FFFFFF", stroke="#D0D5DD", stroke_width=1, corner_radius=6)
    add_text(p, 1092, 534, "🔍 ค้นหาเซสชัน...", font_size=11, fill="#98A2B3")
    add_badge(p, 1270, 526, "โมดูล: ทั้งหมด ▾", bg_color="#F2F4F7", text_color="#344054", font_size=11, height=32)

    # Table Column Headers
    th_y = 570
    add_rect(p, 52, th_y, 1336, 36, fill="#F8FAFC", stroke="#EAECF0", stroke_width=1, corner_radius=6)
    headers = [
        ("SESSION ID", 70),
        ("DATE & TIME", 220),
        ("EXAM MODULE", 410),
        ("QUESTIONS", 680),
        ("SCORE", 800),
        ("AVG. LATENCY", 920),
        ("STATUS / BADGE", 1060),
        ("ACTION", 1240)
    ]
    for h_title, h_x in headers:
        add_text(p, h_x, th_y + 11, h_title, font_size=11, font_style="Bold", fill="#475467")

    # Table Rows
    rows_data = [
        ("EXAM-2026-104", "15 พ.ย. 2026 10:30", "Law 12 Fouls & Misconduct", "5 / 5 ข้อ", "92 / 100", "1.18s", "PASSED (A+)", "#ECFDF3", "#027A48", "📄 รีวิวผล"),
        ("EXAM-2026-098", "14 พ.ย. 2026 16:45", "Law 13 Free Kicks Master", "5 / 5 ข้อ", "96 / 100", "1.05s", "PASSED (A+)", "#ECFDF3", "#027A48", "📄 รีวิวผล"),
        ("EXAM-2026-091", "12 พ.ย. 2026 14:10", "Law 11 Offside Decisive", "5 / 5 ข้อ", "88 / 100", "1.42s", "PASSED (A)", "#ECFDF3", "#027A48", "📄 รีวิวผล"),
        ("EXAM-2026-085", "10 พ.ย. 2026 09:20", "Advantage & Game Flow", "4 / 5 ข้อ", "74 / 100", "1.65s", "NEEDS REVIEW", "#FFFBEB", "#B45309", "🔄 สอบซ่อม"),
        ("EXAM-2026-077", "08 พ.ย. 2026 11:00", "VAR Protocols & Signals", "5 / 5 ข้อ", "90 / 100", "1.30s", "PASSED (A)", "#ECFDF3", "#027A48", "📄 รีวิวผล")
    ]

    for idx, (s_id, s_date, s_mod, s_q, s_score, s_lat, s_badge, b_bg, b_fg, s_act) in enumerate(rows_data):
        tr_y = 614 + idx * 44
        tr_bg = "#FFFFFF" if idx % 2 == 0 else "#F8FAFC40"
        add_rect(p, 52, tr_y, 1336, 40, fill=tr_bg, stroke="#EAECF0", stroke_width=1, corner_radius=4)
        
        add_text(p, 70, tr_y + 13, s_id, font_size=11, font_style="Bold", fill="#0E7490")
        add_text(p, 220, tr_y + 13, s_date, font_size=11, fill="#475467")
        add_text(p, 410, tr_y + 13, s_mod, font_size=11, font_style="Medium", fill="#101828")
        add_text(p, 680, tr_y + 13, s_q, font_size=11, fill="#475467")
        add_text(p, 800, tr_y + 13, s_score, font_size=11, font_style="Bold", fill="#101828")
        add_text(p, 920, tr_y + 13, s_lat, font_size=11, fill="#475467")
        add_badge(p, 1060, tr_y + 9, s_badge, bg_color=b_bg, text_color=b_fg)
        add_button(p, 1230, tr_y + 7, 90, 26, s_act, bg_color="#F2F4F7", text_color="#344054", corner_radius=6, font_size=10)

    # Certificate Preview floating badge banner in gradebook
    add_rect(p, 52, 836, 1336, 26, fill="#F0FDFA", corner_radius=6)
    add_text(p, 68, 842, "🏆 เอกสารรับรองอย่างเป็นทางการ: ผู้เข้าสอบ อัศวิน วิทักษ์ ผ่านเกณฑ์ทดสอบมาตรฐานผู้ตัดสินฟุตบอลระดับ Class 3 (ID: CERT-IFAB-2026-THA-092)", font_size=10, font_style="Medium", fill="#0F766E")


# ==============================================================================
# MAIN GENERATOR FUNCTION
# ==============================================================================
def main():
    print("=== Generating FigCraft UI Prototype Commands ===")
    
    # Ensure directories exist
    DOCS_FIGCRAFT.mkdir(parents=True, exist_ok=True)
    SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    RENDERS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Create 4 Frames (Top-level nodes, side-by-side with 100px gap)
    # IDs in FigCraft start at 2 for the first created node in a new file:
    # Frame 1 -> ID 2 (x=0, y=0)
    # Frame 2 -> ID 3 (x=1540, y=0)
    # Frame 3 -> ID 4 (x=3080, y=0)
    # Frame 4 -> ID 5 (x=4620, y=0)
    print("Step 1: Adding 4 Frames...")
    add_frame("Screen1_Live_Drills", 0, 0, 1440, 900, fill="#090D16")
    add_frame("Screen2_Scenario_Exam", 1540, 0, 1440, 900, fill="#090D16")
    add_frame("Screen3_IFAB_Handbook", 3080, 0, 1440, 900, fill="#F9FAFB")
    add_frame("Screen4_Trainee_Gradebook", 4620, 0, 1440, 900, fill="#F9FAFB")

    # 2. Build Screen 1: Live Practice Studio
    print("Step 2: Building Screen 1 (Live Practice Studio)...")
    build_screen_1(frame_id=2)

    # 3. Build Screen 2: Scenario Examination Studio
    print("Step 3: Building Screen 2 (Scenario Examination Studio)...")
    build_screen_2(frame_id=3)

    # 4. Build Screen 3: IFAB Digital Learning Handbook
    print("Step 4: Building Screen 3 (IFAB Digital Learning Handbook)...")
    build_screen_3(frame_id=4)

    # 5. Build Screen 4: Trainee Performance Gradebook
    print("Step 5: Building Screen 4 (Trainee Performance Gradebook)...")
    build_screen_4(frame_id=5)

    # Write commands to UTF-8 JSON file
    script_json_path = SCRIPTS_DIR / "figcraft_commands.json"
    print(f"Step 6: Writing {len(COMMANDS)} commands to {script_json_path}...")
    with open(script_json_path, "w", encoding="utf-8") as f:
        json.dump(COMMANDS, f, ensure_ascii=False, indent=2)
    print("JSON command script successfully written!")

    # Run FigCraft CLI to generate .figcraft project
    output_figcraft = DOCS_FIGCRAFT / "Referee_Academy_UI.figcraft"
    print(f"Step 7: Running figcraft-cli to generate {output_figcraft}...")
    run_cmd = [
        FIGCRAFT_CLI,
        "run",
        str(script_json_path),
        "--out",
        str(output_figcraft)
    ]
    res_run = subprocess.run(run_cmd, capture_output=True, text=True)
    if res_run.returncode != 0:
        print("ERROR running figcraft-cli:", res_run.stderr)
        sys.exit(1)
    print("FigCraft project generated successfully!")

    # Export Frames to PNG
    print(f"Step 8: Exporting frames to PNG in {RENDERS_DIR}...")
    export_cmd = [
        FIGCRAFT_CLI,
        "export",
        "--out",
        str(RENDERS_DIR),
        str(output_figcraft)
    ]
    res_export = subprocess.run(export_cmd, capture_output=True, text=True)
    print(res_export.stdout)
    if res_export.returncode != 0:
        print("ERROR exporting frames:", res_export.stderr)
        sys.exit(1)

    # Check info
    print("Step 9: Inspecting FigCraft file info...")
    info_cmd = [
        FIGCRAFT_CLI,
        "info",
        str(output_figcraft)
    ]
    res_info = subprocess.run(info_cmd, capture_output=True, text=True)
    print(res_info.stdout)

    print("=== All FigCraft generation tasks completed successfully! ===")

if __name__ == "__main__":
    main()
