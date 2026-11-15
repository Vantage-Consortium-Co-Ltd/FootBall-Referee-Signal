"""
generate_figcraft_ui.py
=======================
Generates high-fidelity FigCraft UI prototype commands for Football Referee Academy
based on Untitled UI Design System & IFAB Rules specification.
Features Google Font Icons (Material Symbols Outlined) as native vector icon assets.

Generates 5 frames side-by-side (1440x900 each, with 100px gap):
  - Frame 2: Screen1_Live_Drills (x=0, y=0)
  - Frame 3: Screen2_Scenario_Exam (x=1540, y=0)
  - Frame 4: Screen3_IFAB_Handbook (x=3080, y=0)
  - Frame 5: Screen4_Trainee_Gradebook (x=4620, y=0)
  - Frame 6: Google_Font_Icons_Asset_Library (x=6160, y=0)
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

# ==============================================================================
# OFFICIAL GOOGLE FONT ICONS (MATERIAL SYMBOLS OUTLINED - 24x24 SVG PATHS)
# ==============================================================================
GOOGLE_FONT_ICONS = {
    "sports_soccer": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
    "videocam": "M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z",
    "videocam_off": "M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27l4.73 4.73H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.55-.18L18.73 21 20 19.73 3.27 2zM5 16V9.82L11.18 16H5z",
    "my_location": "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z",
    "how_to_reg": "M9 17l3-2.94c-.39-.04-.68-.06-1-.06-2.67 0-8 1.34-8 4v2h9l-3-3zm2-5c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm4.25 3.25l-2.25 2.25 4.5 4.5 7.5-7.5-2.25-2.25-5.25 5.25z",
    "person": "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    "group": "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
    "check_circle": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
    "warning": "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
    "bolt": "M11 21h-1l1-7H7.5c-.88 0-.33-.75-.31-.78C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z",
    "schedule": "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
    "timer": "M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z",
    "emoji_events": "M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1c1.8-.46 3.16-1.92 3.61-3.96C19.08 11.63 21 9.55 21 7V5c0-1.1-.9-2-2-2zm-14 3V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z",
    "search": "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
    "menu_book": "M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm-1 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z",
    "quiz": "M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-2v2h-2V9h-2V7h4c1.1 0 2 .9 2 2zm-3 5h-2v-2h2v2z",
    "crop_free": "M3 5v4h2V5h4V3H5c-1.1 0-2 .9-2 2zm2 10H3v4c0 1.1.9 2 2 2h4v-2H5v-4zm14 4h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5c0-1.1-.9-2-2-2z",
    "monitoring": "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z",
    "school": "M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z",
    "download": "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
    "refresh": "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
    "flip": "M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zm-8 20h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2z",
    "straighten": "M7.41 18.59L8.83 20 12 16.83 15.17 20l1.41-1.41L12 14l-4.59 4.59zm9.18-13.18L15.17 4 12 7.17 8.83 4 7.41 5.41 12 10l4.59-4.59z",
    "lightbulb": "M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-1.3l-.85-.6A5.002 5.002 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z",
    "military_tech": "M17 11h-2V7h2v4zm-4-4h-2v4h2V7zm-4 0H7v4h2V7zm10-5H5c-.55 0-1 .45-1 1v18c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 18H6V4h12v16z",
    "speed": "M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.28-10.43zM10.59 15.41a2 2 0 1 0 2.83-2.83l-3.07-3.07-1.41 1.41 1.65 1.65z",
    "circle": "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
}

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

def add_path(parent, path_data, fill=None, stroke=None, stroke_width=None, name=None, opacity=None, x=None, y=None, width=None, height=None):
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
    if x is not None:
        params["x"] = x
    if y is not None:
        params["y"] = y
    if width is not None:
        params["width"] = width
    if height is not None:
        params["height"] = height
    if name:
        params["name"] = name
    add_command("vector.create", params)

def add_line(parent, x1, y1, x2, y2, stroke="#FFFFFF", stroke_width=1, name=None, opacity=None):
    path_data = f"M {x1} {y1} L {x2} {y2}"
    add_path(parent, path_data, stroke=stroke, stroke_width=stroke_width, name=name, opacity=opacity)

def add_google_icon(parent, icon_name, x, y, size=20, fill="#22D3EE", name=None):
    """Adds a native Google Material Symbols Outlined vector icon to FigCraft"""
    path_data = GOOGLE_FONT_ICONS.get(icon_name)
    if not path_data:
        return
    icon_layer_name = name if name else f"Google_Icon_{icon_name}"
    add_path(parent, path_data, fill=fill, name=icon_layer_name, x=x, y=y, width=size, height=size)

def add_badge(parent, x, y, text, bg_color, text_color, border_color=None, font_size=11, font_style="SemiBold", height=22, width=None, icon_name=None, icon_color=None):
    icon_offset = 0
    if icon_name:
        icon_size = max(12, height - 8)
        icon_offset = icon_size + 4
        calc_width = width if width else (len(text) * 7 + icon_offset + 16)
    else:
        calc_width = width if width else (len(text) * 7 + 16)
        
    add_rect(parent, x, y, calc_width, height, fill=bg_color, stroke=border_color, stroke_width=1 if border_color else None, corner_radius=height // 2)
    
    if icon_name:
        add_google_icon(parent, icon_name, x + 6, y + (height - icon_size) // 2, size=icon_size, fill=icon_color if icon_color else text_color)
        
    add_text(parent, x + 8 + icon_offset, y + 4, text, font_size=font_size, font_style=font_style, fill=text_color)
    return calc_width

def add_button(parent, x, y, w, h, text, bg_color, text_color, border_color=None, font_size=13, font_style="SemiBold", corner_radius=8, icon_name=None, icon_color=None):
    add_rect(parent, x, y, w, h, fill=bg_color, stroke=border_color, stroke_width=1 if border_color else None, corner_radius=corner_radius)
    if icon_name:
        icon_size = 16
        add_google_icon(parent, icon_name, x + 12, y + (h - icon_size) // 2, size=icon_size, fill=icon_color if icon_color else text_color)
        add_text(parent, x + 34, y + (h // 2) - (font_size // 2) - 1, text, font_size=font_size, font_style=font_style, fill=text_color)
    else:
        add_text(parent, x + (w // 2), y + (h // 2) - (font_size // 2) - 1, text, font_size=font_size, font_style=font_style, fill=text_color, align="center")

def add_progress_bar(parent, x, y, w, h, pct, bg_color, fill_color, corner_radius=4):
    add_rect(parent, x, y, w, h, fill=bg_color, corner_radius=corner_radius)
    fill_w = max(4, int(w * (pct / 100.0)))
    add_rect(parent, x, y, fill_w, h, fill=fill_color, corner_radius=corner_radius)

def add_radar_chart(parent, cx, cy, radius, values, labels, color="#0E7490"):
    for step in [0.25, 0.5, 0.75, 1.0]:
        r = radius * step
        ring_path = f"M {cx} {cy - r} L {cx + r} {cy} L {cx} {cy + r} L {cx - r} {cy} Z"
        add_path(parent, ring_path, stroke="#E2E8F0" if color=="#0E7490" else "#334155", stroke_width=1)
    
    add_line(parent, cx, cy - radius, cx, cy + radius, stroke="#CBD5E1", stroke_width=1)
    add_line(parent, cx - radius, cy, cx + radius, cy, stroke="#CBD5E1", stroke_width=1)

    v_top, v_right, v_bottom, v_left = [v / 100.0 * radius for v in values]
    poly_path = f"M {cx} {cy - v_top} L {cx + v_right} {cy} L {cx} {cy + v_bottom} L {cx - v_left} {cy} Z"
    add_path(parent, poly_path, fill="#0E749033", stroke=color, stroke_width=2, name="Radar Data Polygon")

    pts = [
        (cx, cy - v_top),
        (cx + v_right, cy),
        (cx, cy + v_bottom),
        (cx - v_left, cy)
    ]
    for px, py in pts:
        add_ellipse(parent, px - 4, py - 4, 8, 8, fill=color, stroke="#FFFFFF", stroke_width=1)


# ==============================================================================
# BUILD SCREEN 1: Live Practice Studio (/drills) - Frame ID: 2
# ==============================================================================
def build_screen_1(frame_id):
    p = frame_id
    # Header Bar
    add_rect(p, 0, 0, 1440, 64, fill="#0F172A", stroke="#1E293B", stroke_width=1)
    # Brand with Google Icon
    add_google_icon(p, "sports_soccer", 32, 21, size=22, fill="#22D3EE")
    add_text(p, 62, 20, "Referee Academy AI", font_size=18, font_style="Bold", fill="#FFFFFF")
    
    # Breadcrumbs
    add_rect(p, 275, 16, 375, 32, fill="#1E293B", corner_radius=16)
    add_text(p, 290, 23, "หน้าหลัก   /   แบบฝึกหัดสด   /   ฟรีคิกทางอ้อม (IFAB Law 13)", font_size=12, font_style="Medium", fill="#94A3B8")
    
    # Status badges in header (with Google Font Icons)
    add_badge(p, 665, 20, "Microservices Online (31.4 FPS)", bg_color="#064E3B", text_color="#34D399", border_color="#059669", icon_name="circle", icon_color="#34D399")
    add_badge(p, 920, 20, "Latency: 14.2ms", bg_color="#1E293B", text_color="#38BDF8", icon_name="bolt", icon_color="#38BDF8")
    add_badge(p, 1070, 20, "00:14:25 Session", bg_color="#1E293B", text_color="#CBD5E1", icon_name="schedule", icon_color="#CBD5E1")
    
    # Profile
    add_rect(p, 1240, 16, 168, 32, fill="#1E293B", corner_radius=16)
    add_ellipse(p, 1244, 20, 24, 24, fill="#0E7490")
    add_text(p, 1249, 24, "IR", font_size=11, font_style="Bold", fill="#FFFFFF")
    add_text(p, 1276, 23, "อัศวิน (Level 2)", font_size=12, font_style="Medium", fill="#E2E8F0")

    # LEFT VIEWPORT: Video Feed Area
    add_rect(p, 32, 88, 860, 530, fill="#0B132B", stroke="#1E293B", stroke_width=2, corner_radius=16)
    
    # Top feed meta banner
    add_rect(p, 48, 104, 240, 26, fill="#0F172ACC", corner_radius=6)
    add_google_icon(p, "videocam", 56, 109, size=16, fill="#F43F5E")
    add_text(p, 78, 109, "LIVE WEBCAM FEED (1080p 60FPS)", font_size=11, font_style="Bold", fill="#F43F5E")
    add_badge(p, 300, 104, "AI MODEL: YOLOv8x-Pose (ONNX TensorRT)", bg_color="#0F172ACC", text_color="#38BDF8")

    # Secondary untagged person (Player #10)
    add_rect(p, 670, 210, 160, 280, fill="#0F172A40", stroke="#475569", stroke_width=1, corner_radius=8)
    add_badge(p, 670, 182, "Player #10 (คลิกเพื่อสลับ Tag)", bg_color="#1E293B", text_color="#94A3B8", icon_name="person", icon_color="#94A3B8")

    # Tactical Reticle on Referee
    ret_x, ret_y, ret_w, ret_h = 240, 140, 380, 430
    add_rect(p, ret_x, ret_y, ret_w, ret_h, fill="#08334415", stroke="#22D3EE40", stroke_width=1, corner_radius=12)
    bracket_len = 24
    add_line(p, ret_x, ret_y + bracket_len, ret_x, ret_y, stroke="#22D3EE", stroke_width=3)
    add_line(p, ret_x, ret_y, ret_x + bracket_len, ret_y, stroke="#22D3EE", stroke_width=3)
    add_line(p, ret_x + ret_w - bracket_len, ret_y, ret_x + ret_w, ret_y, stroke="#22D3EE", stroke_width=3)
    add_line(p, ret_x + ret_w, ret_y, ret_x + ret_w, ret_y + bracket_len, stroke="#22D3EE", stroke_width=3)
    add_line(p, ret_x, ret_y + ret_h - bracket_len, ret_x, ret_y + ret_h, stroke="#22D3EE", stroke_width=3)
    add_line(p, ret_x, ret_y + ret_h, ret_x + bracket_len, ret_y + ret_h, stroke="#22D3EE", stroke_width=3)
    add_line(p, ret_x + ret_w - bracket_len, ret_y + ret_h, ret_x + ret_w, ret_y + ret_h, stroke="#22D3EE", stroke_width=3)
    add_line(p, ret_x + ret_w, ret_y + ret_h - bracket_len, ret_x + ret_w, ret_y + ret_h, stroke="#22D3EE", stroke_width=3)

    # Floating Tag pill above reticle with Google Icon
    add_badge(p, ret_x + 30, ret_y - 14, "TAGGED: REFEREE (98.4% Confidence)", bg_color="#083344", text_color="#22D3EE", border_color="#22D3EE", font_size=11, height=24, icon_name="my_location", icon_color="#22D3EE")

    # Ghost guideline overlay
    add_line(p, 470, 240, 470, 90, stroke="#38BDF860", stroke_width=2, name="Ghost Target Line")
    add_ellipse(p, 464, 84, 12, 12, stroke="#38BDF880", stroke_width=2, fill="#0284C720", name="Ghost Wrist Target")
    add_text(p, 485, 96, "เกณฑ์ IFAB 180° (เป้าหมาย)", font_size=10, font_style="Medium", fill="#38BDF8")

    # Referee Skeleton (COCO 17 Keypoints)
    head_x, head_y = 430, 190
    l_sh_x, l_sh_y = 390, 240
    r_sh_x, r_sh_y = 470, 240
    l_elb_x, l_elb_y = 360, 310
    l_wri_x, l_wri_y = 350, 375
    r_elb_x, r_elb_y = 472, 165
    r_wri_x, r_wri_y = 474, 95
    l_hip_x, l_hip_y = 405, 370
    r_hip_x, r_hip_y = 455, 370
    l_kne_x, l_kne_y = 395, 460
    r_kne_x, r_kne_y = 465, 460
    l_ank_x, l_ank_y = 390, 540
    r_ank_x, r_ank_y = 470, 540

    bones = [
        (head_x, head_y, (l_sh_x + r_sh_x)//2, l_sh_y),
        (l_sh_x, l_sh_y, r_sh_x, r_sh_y),
        (l_sh_x, l_sh_y, l_elb_x, l_elb_y),
        (l_elb_x, l_elb_y, l_wri_x, l_wri_y),
        (r_sh_x, r_sh_y, r_elb_x, r_elb_y),
        (r_elb_x, r_elb_y, r_wri_x, r_wri_y),
        (l_sh_x, l_sh_y, l_hip_x, l_hip_y),
        (r_sh_x, r_sh_y, r_hip_x, r_hip_y),
        (l_hip_x, l_hip_y, r_hip_x, r_hip_y),
        (l_hip_x, l_hip_y, l_kne_x, l_kne_y),
        (r_hip_x, r_hip_y, r_kne_x, r_kne_y),
        (l_kne_x, l_kne_y, l_ank_x, l_ank_y),
        (r_kne_x, r_kne_y, r_ank_x, r_ank_y),
    ]
    for x1, y1, x2, y2 in bones:
        add_line(p, x1, y1, x2, y2, stroke="#22D3EE", stroke_width=4)
        add_line(p, x1, y1, x2, y2, stroke="#0891B240", stroke_width=8)

    keypoints = [
        (head_x, head_y), (l_sh_x, l_sh_y), (r_sh_x, r_sh_y),
        (l_elb_x, l_elb_y), (l_wri_x, l_wri_y),
        (r_elb_x, r_elb_y), (r_wri_x, r_wri_y),
        (l_hip_x, l_hip_y), (r_hip_x, r_hip_y),
        (l_kne_x, l_kne_y), (r_kne_x, r_kne_y),
        (l_ank_x, l_ank_y), (r_ank_x, r_ank_y)
    ]
    for kx, ky in keypoints:
        add_ellipse(p, kx - 5, ky - 5, 10, 10, fill="#34D399", stroke="#065F46", stroke_width=1.5)

    # Angle Badges
    add_badge(p, r_elb_x + 15, r_elb_y - 10, "176° (มุมยกแขน)", bg_color="#083344E6", text_color="#22D3EE", border_color="#22D3EE", font_size=11, icon_name="straighten", icon_color="#22D3EE")
    add_badge(p, r_wri_x + 15, r_wri_y - 10, "ศอกเหยียด 172° ผ่านเกณฑ์", bg_color="#064E3BE6", text_color="#34D399", border_color="#10B981", font_size=11, icon_name="check_circle", icon_color="#34D399")
    add_badge(p, l_elb_x - 130, l_elb_y, "แขนซ้ายแนบลำตัว 24°", bg_color="#1E293BE6", text_color="#94A3B8", font_size=10)

    # Floating Action Bar at bottom of viewport
    add_rect(p, 190, 555, 520, 46, fill="#0F172AE6", stroke="#334155", stroke_width=1, corner_radius=23)
    add_button(p, 204, 563, 110, 30, "กล้อง ON", bg_color="#064E3B", text_color="#34D399", corner_radius=15, font_size=11, icon_name="videocam")
    add_button(p, 322, 563, 100, 30, "Ghost ON", bg_color="#083344", text_color="#22D3EE", corner_radius=15, font_size=11)
    add_button(p, 430, 563, 75, 30, "Mirror", bg_color="#1E293B", text_color="#94A3B8", corner_radius=15, font_size=11, icon_name="flip")
    add_button(p, 513, 563, 75, 30, "Angles", bg_color="#1E293B", text_color="#94A3B8", corner_radius=15, font_size=11, icon_name="straighten")
    add_button(p, 596, 563, 102, 30, "Auto-Tag", bg_color="#14B8A6", text_color="#FFFFFF", corner_radius=15, font_size=11, icon_name="how_to_reg")

    # Lower Left Telemetry Box
    add_rect(p, 32, 630, 860, 238, fill="#0F172A", stroke="#1E293B", stroke_width=1, corner_radius=16)
    add_google_icon(p, "monitoring", 52, 648, size=18, fill="#22D3EE")
    add_text(p, 76, 646, "Real-time Telemetry Waveform (ความนิ่งของท่าทาง)", font_size=13, font_style="Bold", fill="#FFFFFF")
    add_badge(p, 620, 644, "STABLE HOLD DETECTED (98.2%)", bg_color="#064E3B", text_color="#34D399", border_color="#059669", icon_name="check_circle", icon_color="#34D399")
    
    # 40-step stability waveform stream
    wave_x, wave_y, wave_w, wave_h = 52, 680, 820, 75
    add_rect(p, wave_x, wave_y, wave_w, wave_h, fill="#0B132B", corner_radius=8)
    for i in range(40):
        bar_x = wave_x + 12 + i * 20
        h_val = int(25 + 35 * math.sin(i * 0.3) * math.cos(i * 0.1) + (35 if i > 25 else 10))
        h_val = max(8, min(65, h_val))
        bar_y = wave_y + wave_h - h_val - 5
        color = "#34D399" if i > 25 else "#22D3EE"
        add_rect(p, bar_x, bar_y, 10, h_val, fill=color, corner_radius=3)
    
    add_badge(p, 52, 770, "ตรวจพบสัญญาณ: ฟรีคิกทางอ้อม (INDIRECT_FREE_KICK)", bg_color="#083344", text_color="#22D3EE", border_color="#22D3EE", font_size=12, height=26, icon_name="my_location", icon_color="#22D3EE")
    add_text(p, 52, 808, "ความเชื่อมั่นท่าทาง (Pose Confidence): 98.4% | ผู้ตัดสินต้องชูแขนตรงเหนือศีรษะจนกว่าจะมีการเล่นลูกบอล", font_size=11, fill="#94A3B8")

    # RIGHT SIDEBAR: Coaching HUD (x=916, width=492)
    add_rect(p, 916, 88, 492, 780, fill="#0F172A", stroke="#1E293B", stroke_width=1, corner_radius=16)

    # Metric Card 1: Circular Hold Timer
    add_rect(p, 936, 104, 452, 175, fill="#0B132B", stroke="#1E293B", stroke_width=1, corner_radius=12)
    add_google_icon(p, "schedule", 952, 116, size=18, fill="#22D3EE")
    add_text(p, 976, 115, "Posture Hold Countdown (ระยะเวลาค้างสัญญาณ)", font_size=13, font_style="Bold", fill="#FFFFFF")

    # SVG Ring
    add_ellipse(p, 960, 146, 110, 110, stroke="#1E293B", stroke_width=8)
    circ_path = "M 1015 146 A 55 55 0 1 1 970 215"
    add_path(p, circ_path, stroke="#10B981", stroke_width=8, name="Hold Timer Arc")
    add_text(p, 995, 185, "1.2s", font_size=20, font_style="Bold", fill="#10B981", align="center")
    add_text(p, 995, 210, "/ 1.5s", font_size=11, fill="#64748B", align="center")

    # Score
    add_text(p, 1140, 155, "คะแนนความถูกต้อง", font_size=12, fill="#94A3B8")
    add_text(p, 1140, 175, "94", font_size=44, font_style="Bold", fill="#10B981")
    add_text(p, 1205, 195, "/ 100", font_size=16, font_style="Bold", fill="#64748B")
    add_badge(p, 1140, 225, "EXCELLENT POSTURE FORM", bg_color="#064E3B", text_color="#34D399", border_color="#059669", icon_name="check_circle", icon_color="#34D399")

    # Coaching Tip Toast
    add_rect(p, 936, 295, 452, 68, fill="#064E3B40", stroke="#059669", stroke_width=1, corner_radius=10)
    add_google_icon(p, "check_circle", 952, 310, size=22, fill="#34D399")
    add_text(p, 982, 308, "ยอดเยี่ยมมาก! การให้สัญญาณถูกต้องตามกติกา IFAB Law 13", font_size=12, font_style="Bold", fill="#A7F3D0")
    add_text(p, 982, 328, "แขนขวายกตรง 176° แนบลำตัวถูกต้อง ค้างท่าไว้อีก 0.3 วินาทีเพื่อสำเร็จแบบฝึกหัด", font_size=11, fill="#6EE7B7")

    # Joint Angle Gauges
    add_rect(p, 936, 380, 452, 160, fill="#0B132B", stroke="#1E293B", stroke_width=1, corner_radius=12)
    add_google_icon(p, "straighten", 952, 394, size=18, fill="#22D3EE")
    add_text(p, 976, 393, "Joint Angle Gauges (การตรวจสอบองศาข้อต่อ)", font_size=13, font_style="Bold", fill="#FFFFFF")

    # Gauge 1
    add_text(p, 952, 420, "องศาการยกแขนขวา (Shoulder Elevation)", font_size=11, fill="#94A3B8")
    add_text(p, 1340, 420, "176° / 180°", font_size=11, font_style="Bold", fill="#22D3EE")
    add_progress_bar(p, 952, 438, 420, 8, 98, bg_color="#1E293B", fill_color="#22D3EE")

    # Gauge 2
    add_text(p, 952, 456, "ความเหยียดตรงของข้อศอก (Elbow Straightness)", font_size=11, fill="#94A3B8")
    add_text(p, 1340, 456, "172° / 180°", font_size=11, font_style="Bold", fill="#34D399")
    add_progress_bar(p, 952, 474, 420, 8, 95, bg_color="#1E293B", fill_color="#34D399")

    # Gauge 3
    add_text(p, 952, 492, "ความตั้งตรงของลำตัว (Torso Vertical Alignment)", font_size=11, fill="#94A3B8")
    add_text(p, 1340, 492, "99%", font_size=11, font_style="Bold", fill="#A855F7")
    add_progress_bar(p, 952, 510, 420, 8, 99, bg_color="#1E293B", fill_color="#A855F7")

    # Drill Selector
    add_rect(p, 936, 555, 452, 295, fill="#0B132B", stroke="#1E293B", stroke_width=1, corner_radius=12)
    add_google_icon(p, "menu_book", 952, 569, size=18, fill="#22D3EE")
    add_text(p, 976, 568, "แบบฝึกหัดท่าสัญญาณ IFAB (20 ท่าทาง)", font_size=13, font_style="Bold", fill="#FFFFFF")
    
    drills = [
        ("1. ฟรีคิกทางอ้อม (Indirect Free Kick)", "กำลังฝึกซ้อม", "#083344", "#22D3EE", True, "my_location"),
        ("2. ฟรีคิกทางตรง (Direct Free Kick)", "พร้อมฝึก", "#1E293B", "#94A3B8", False, "videocam"),
        ("3. การให้จุดโทษ (Penalty Kick)", "พร้อมฝึก", "#1E293B", "#94A3B8", False, "videocam"),
        ("4. สัญญาณได้เปรียบ (Advantage Play-on)", "พร้อมฝึก", "#1E293B", "#94A3B8", False, "videocam"),
    ]
    for idx, (title, status, bg_col, text_col, is_active, ic_name) in enumerate(drills):
        dy = 598 + idx * 56
        border_col = "#22D3EE" if is_active else "#1E293B"
        add_rect(p, 952, dy, 420, 48, fill="#0F172A" if not is_active else "#083344", stroke=border_col, stroke_width=1.5 if is_active else 1, corner_radius=8)
        add_google_icon(p, ic_name, 964, dy + 15, size=18, fill=text_col)
        add_text(p, 990, dy + 16, title, font_size=12, font_style="Bold" if is_active else "Medium", fill="#FFFFFF" if is_active else "#CBD5E1")
        add_badge(p, 1270, dy + 13, status, bg_color=bg_col, text_color=text_col)


# ==============================================================================
# BUILD SCREEN 2: Scenario Examination Studio (/examination) - Frame ID: 3
# ==============================================================================
def build_screen_2(frame_id):
    p = frame_id
    # Header Bar
    add_rect(p, 0, 0, 1440, 64, fill="#0F172A", stroke="#1E293B", stroke_width=1)
    add_google_icon(p, "sports_soccer", 32, 21, size=22, fill="#22D3EE")
    add_text(p, 62, 20, "Referee Academy AI", font_size=18, font_style="Bold", fill="#FFFFFF")
    
    # Breadcrumbs
    add_rect(p, 275, 16, 420, 32, fill="#1E293B", corner_radius=16)
    add_text(p, 290, 23, "ชุดข้อสอบ: IFAB Law 12 - การทำฟาวล์และการประพฤติผิด", font_size=12, font_style="Medium", fill="#38BDF8")
    
    # Exam Progress Pill
    add_badge(p, 720, 20, "คำถามข้อที่ 1 / 5 (ความคืบหน้า 20%)", bg_color="#1E293B", text_color="#38BDF8", icon_name="quiz", icon_color="#38BDF8")
    add_badge(p, 1020, 20, "เวลาสอบเหลือ: 04:32", bg_color="#0F172A", text_color="#F59E0B", border_color="#B45309", icon_name="timer", icon_color="#F59E0B")
    
    # Trainee
    add_rect(p, 1240, 16, 168, 32, fill="#1E293B", corner_radius=16)
    add_ellipse(p, 1244, 20, 24, 24, fill="#0E7490")
    add_text(p, 1249, 24, "IR", font_size=11, font_style="Bold", fill="#FFFFFF")
    add_text(p, 1276, 23, "อัศวิน (สอบสด)", font_size=12, font_style="Medium", fill="#E2E8F0")

    # LEFT COLUMN: Scenario Video Clip & Decision Window
    add_rect(p, 32, 88, 800, 780, fill="#0F172A", stroke="#1E293B", stroke_width=1, corner_radius=16)
    add_google_icon(p, "quiz", 52, 108, size=20, fill="#22D3EE")
    add_text(p, 80, 107, "โจทย์สถานการณ์จำลอง (Instructional Incident Scenario)", font_size=14, font_style="Bold", fill="#FFFFFF")
    add_badge(p, 580, 105, "คลิปเหตุการณ์ที่ 1: นาทีที่ 73 (เขตโทษ)", bg_color="#1E293B", text_color="#38BDF8")

    # Video Player Preview Box (x=52, y=140, w=760, h=390)
    pitch_x, pitch_y, pitch_w, pitch_h = 52, 140, 760, 390
    add_rect(p, pitch_x, pitch_y, pitch_w, pitch_h, fill="#052E16", corner_radius=12)
    
    # 2D Soccer Pitch Lines
    add_line(p, pitch_x + 30, pitch_y + 30, pitch_x + pitch_w - 30, pitch_y + 30, stroke="#FFFFFF40", stroke_width=2)
    add_line(p, pitch_x + 30, pitch_y + pitch_h - 30, pitch_x + pitch_w - 30, pitch_y + pitch_h - 30, stroke="#FFFFFF40", stroke_width=2)
    add_line(p, pitch_x + pitch_w // 2, pitch_y + 30, pitch_x + pitch_w // 2, pitch_y + pitch_h - 30, stroke="#FFFFFF40", stroke_width=2)
    add_ellipse(p, pitch_x + pitch_w // 2 - 45, pitch_y + pitch_h // 2 - 45, 90, 90, stroke="#FFFFFF40", stroke_width=2)
    
    # Penalty Box
    pen_w, pen_h = 240, 180
    add_rect(p, pitch_x + 30, pitch_y + (pitch_h - pen_h)//2, pen_w, pen_h, stroke="#FFFFFF50", stroke_width=2)
    add_ellipse(p, pitch_x + 190, pitch_y + pitch_h//2 - 3, 6, 6, fill="#FFFFFF")

    # Simulation Players
    add_ellipse(p, pitch_x + 160, pitch_y + 190, 22, 22, fill="#EF4444", stroke="#FFFFFF", stroke_width=2)
    add_text(p, pitch_x + 140, pitch_y + 170, "กองหน้า #9", font_size=10, font_style="Bold", fill="#FCA5A5")
    
    add_ellipse(p, pitch_x + 180, pitch_y + 195, 22, 22, fill="#3B82F6", stroke="#FFFFFF", stroke_width=2)
    add_text(p, pitch_x + 175, pitch_y + 225, "กองหลัง #4 (สกัดฟาวล์)", font_size=10, font_style="Bold", fill="#93C5FD")
    
    add_line(p, pitch_x + 165, pitch_y + 195, pitch_x + 185, pitch_y + 200, stroke="#F59E0B", stroke_width=3)
    add_badge(p, pitch_x + 130, pitch_y + 140, "TRIPPING FOUL IN THE BOX", bg_color="#7F1D1D", text_color="#FCA5A5", icon_name="warning", icon_color="#FCA5A5")

    # Video Controls Overlay
    add_rect(p, pitch_x, pitch_y + pitch_h - 48, pitch_w, 48, fill="#0F172ACC", corner_radius=0)
    add_badge(p, pitch_x + 20, pitch_y + pitch_h - 36, "00:03.42 / 00:08.00 [FOUL DETECTED]", bg_color="#0F172ACC", text_color="#F43F5E", icon_name="videocam", icon_color="#F43F5E")
    add_badge(p, pitch_x + 340, pitch_y + pitch_h - 36, "SLOW MOTION 0.5x", bg_color="#1E293B", text_color="#94A3B8")

    # 5-Second Reaction Countdown Window
    add_text(p, 52, 550, "เวลาตัดสินใจให้สัญญาณ (5s Reaction Window):", font_size=12, font_style="Bold", fill="#E2E8F0")
    add_badge(p, 700, 546, "COUNTDOWN 2.4s", bg_color="#B45309", text_color="#FEF3C7", icon_name="timer", icon_color="#FEF3C7")
    add_progress_bar(p, 52, 574, 760, 10, 48, bg_color="#1E293B", fill_color="#F59E0B")

    # Multiple Choice Decision Panel (4 Options)
    add_text(p, 52, 604, "คำถาม: จากเหตุการณ์ดังกล่าว ในฐานะผู้ตัดสินท่านต้องให้สัญญาณใด?", font_size=13, font_style="Bold", fill="#FFFFFF")
    
    options = [
        ("A", "ฟรีคิกทางตรง (Direct Free Kick)", "ผิด - จุดเกิดเหตุอยู่ในเขตโทษของฝ่ายรับ", False),
        ("B", "ฟรีคิกทางอ้อม (Indirect Free Kick)", "ผิด - การเข้าสกัดฟาวล์ผู้เล่นเป็นความผิดโทษโดยตรง", False),
        ("C", "การให้จุดโทษ (Penalty Kick)", "ถูกต้อง - ฟาวล์ในเขตโทษตาม IFAB Law 12/14", True),
        ("D", "ให้สัญญาณได้เปรียบ (Advantage)", "ผิด - ฝ่ายรุกเสียการครอบครองบอลทันที", False),
    ]
    for idx, (opt_char, opt_title, opt_sub, is_correct) in enumerate(options):
        col = idx % 2
        row = idx // 2
        bx = 52 + col * 390
        by = 635 + row * 82
        border_col = "#22D3EE" if is_correct else "#1E293B"
        bg_col = "#083344" if is_correct else "#0B132B"
        add_rect(p, bx, by, 370, 72, fill=bg_col, stroke=border_col, stroke_width=2 if is_correct else 1, corner_radius=10)
        
        btn_bg = "#22D3EE" if is_correct else "#1E293B"
        btn_tx = "#090D16" if is_correct else "#94A3B8"
        add_rect(p, bx + 12, by + 16, 28, 28, fill=btn_bg, corner_radius=14)
        add_text(p, bx + 22, by + 22, opt_char, font_size=12, font_style="Bold", fill=btn_tx)
        
        add_text(p, bx + 50, by + 16, opt_title, font_size=12, font_style="Bold", fill="#FFFFFF" if is_correct else "#CBD5E1")
        add_text(p, bx + 50, by + 38, opt_sub, font_size=10, fill="#22D3EE" if is_correct else "#64748B")

    # RIGHT COLUMN: Live Trainee Camera Posture HUD & Instant Evaluation
    add_rect(p, 856, 88, 552, 780, fill="#0F172A", stroke="#1E293B", stroke_width=1, corner_radius=16)
    add_google_icon(p, "how_to_reg", 876, 108, size=20, fill="#22D3EE")
    add_text(p, 904, 107, "การตรวจวัดท่าทางผู้เรียนสด (Live Trainee Posture HUD)", font_size=14, font_style="Bold", fill="#FFFFFF")
    
    # Camera Viewport for Trainee (x=876, y=140, w=512, h=330)
    cam_x, cam_y, cam_w, cam_h = 876, 140, 512, 330
    add_rect(p, cam_x, cam_y, cam_w, cam_h, fill="#0B132B", stroke="#1E293B", stroke_width=2, corner_radius=12)
    
    # Trainee Referee Skeleton giving Penalty Kick Signal (Arm pointing down at 44° to penalty spot)
    t_head_x, t_head_y = cam_x + 256, cam_y + 80
    t_sh_r_x, t_sh_r_y = cam_x + 290, cam_y + 120
    t_sh_l_x, t_sh_l_y = cam_x + 222, cam_y + 120
    t_elb_r_x, t_elb_r_y = cam_x + 345, cam_y + 175
    t_wri_r_x, t_wri_r_y = cam_x + 400, cam_y + 230
    
    t_bones = [
        (t_head_x, t_head_y, (t_sh_r_x + t_sh_l_x)//2, t_sh_r_y),
        (t_sh_l_x, t_sh_l_y, t_sh_r_x, t_sh_r_y),
        (t_sh_r_x, t_sh_r_y, t_elb_r_x, t_elb_r_y),
        (t_elb_r_x, t_elb_r_y, t_wri_r_x, t_wri_r_y),
        (t_sh_l_x, t_sh_l_y, cam_x + 200, cam_y + 180),
        (cam_x + 200, cam_y + 180, cam_x + 190, cam_y + 240),
        (t_sh_l_x, t_sh_l_y, cam_x + 230, cam_y + 230),
        (t_sh_r_x, t_sh_r_y, cam_x + 280, cam_y + 230),
    ]
    for x1, y1, x2, y2 in t_bones:
        add_line(p, x1, y1, x2, y2, stroke="#10B981", stroke_width=4)
    
    for kx, ky in [(t_head_x, t_head_y), (t_sh_r_x, t_sh_r_y), (t_sh_l_x, t_sh_l_y), (t_elb_r_x, t_elb_r_y), (t_wri_r_x, t_wri_r_y)]:
        add_ellipse(p, kx - 5, ky - 5, 10, 10, fill="#34D399", stroke="#065F46", stroke_width=1.5)

    add_badge(p, t_wri_r_x - 30, t_wri_r_y + 15, "องศาชี้ 44° (จุดโทษ)", bg_color="#064E3BE6", text_color="#34D399", border_color="#10B981", icon_name="straighten", icon_color="#34D399")
    add_badge(p, cam_x + 12, cam_y + cam_h - 32, "ตรวจพบสัญญาณ: จุดโทษ (PENALTY KICK) [ความเชื่อมั่น 97.2%]", bg_color="#064E3B", text_color="#34D399", border_color="#059669", icon_name="my_location", icon_color="#34D399")
    add_badge(p, cam_x + 360, cam_y + 12, "Latency: 1.18s", bg_color="#1E293B", text_color="#38BDF8", icon_name="speed", icon_color="#38BDF8")

    # Freeze Frame Result Inspector Modal
    add_rect(p, 876, 490, 512, 355, fill="#022C22", stroke="#059669", stroke_width=1.5, corner_radius=12)
    add_google_icon(p, "check_circle", 896, 508, size=24, fill="#34D399")
    add_text(p, 928, 507, "ผลการประเมินประจำข้อ: ถูกต้องตามกติกา IFAB (PASS)", font_size=14, font_style="Bold", fill="#A7F3D0")
    
    # Score Summary
    add_rect(p, 896, 545, 472, 80, fill="#064E3B80", corner_radius=8)
    add_text(p, 916, 555, "คะแนนภาคปฏิบัติ (Practical Score)", font_size=11, fill="#6EE7B7")
    add_text(p, 916, 575, "92 / 100", font_size=28, font_style="Bold", fill="#34D399")
    add_text(p, 1100, 560, "เวลาตอบสนอง: 1.18 วินาที", font_size=11, font_style="Bold", fill="#FFFFFF")
    add_text(p, 1100, 580, "ระยะเวลา Hold: 1.8 วินาที (ผ่านเกณฑ์)", font_size=11, fill="#A7F3D0")
    add_text(p, 1100, 600, "เกรดประเมิน: A+ (ระดับยอดเยี่ยม)", font_size=11, font_style="Bold", fill="#FCD34D")

    # Evaluation Checklist Breakdown
    crit_items = [
        ("คำตัดสินทางวินัยถูกต้องตาม IFAB Law 12 & 14", True),
        ("ชี้แขนไปข้างหน้ามุมก้ม 44° ตรงไปยังจุดโทษ", True),
        ("ค้างสัญญาณนิ่งเกิน 1.5 วินาทีโดยไม่แกว่ง", True),
        ("ความเสถียรของข้อต่อแขน (Stability Index 95.4%)", True),
    ]
    for c_idx, (crit_text, is_ok) in enumerate(crit_items):
        cy = 640 + c_idx * 26
        add_google_icon(p, "check_circle", 896, cy + 2, size=16, fill="#34D399")
        add_text(p, 920, cy + 2, crit_text, font_size=11, fill="#D1FAE5")

    # Action Buttons
    add_button(p, 896, 755, 225, 42, "ดู Replay ย้อนหลัง", bg_color="#064E3B", text_color="#A7F3D0", border_color="#059669", font_size=12, icon_name="refresh")
    add_button(p, 1140, 755, 228, 42, "ไปข้อถัดไป (ข้อ 2/5)", bg_color="#10B981", text_color="#022C22", font_size=12, icon_name="quiz")


# ==============================================================================
# BUILD SCREEN 3: IFAB Digital Learning Handbook (/handbook) - Frame ID: 4
# ==============================================================================
def build_screen_3(frame_id):
    p = frame_id
    # Header Bar (Light Mode)
    add_rect(p, 0, 0, 1440, 72, fill="#FFFFFF", stroke="#EAECF0", stroke_width=1)
    add_google_icon(p, "sports_soccer", 32, 25, size=22, fill="#0E7490")
    add_text(p, 62, 24, "Referee Academy AI", font_size=18, font_style="Bold", fill="#101828")
    
    # Navigation Links with active tab
    navs = [
        ("ห้องฝึกซ้อมสด (/drills)", False, "videocam"),
        ("ห้องสอบสถานการณ์ (/examination)", False, "quiz"),
        ("คู่มือสื่อการสอน 20 ท่า (/handbook)", True, "menu_book"),
        ("สมุดผลการประเมิน (/gradebook)", False, "monitoring")
    ]
    for n_idx, (nav_title, is_nav_active, nav_icon) in enumerate(navs):
        nx = 270 + n_idx * 210
        tx_col = "#0E7490" if is_nav_active else "#475467"
        add_google_icon(p, nav_icon, nx, 27, size=16, fill=tx_col)
        add_text(p, nx + 22, 26, nav_title, font_size=12, font_style="Bold" if is_nav_active else "Medium", fill=tx_col)
        if is_nav_active:
            add_line(p, nx, 70, nx + 190, 70, stroke="#0E7490", stroke_width=3)

    # Page Title & Search Bar (Left: 960px)
    add_text(p, 32, 100, "คลังสื่อการสอนกติกาสัญญาณผู้ตัดสิน 20 ท่าทาง (IFAB Curriculum)", font_size=20, font_style="Bold", fill="#101828")
    add_text(p, 32, 126, "คู่มือมาตรฐานสากลจาก International Football Association Board (IFAB Laws of the Game 2025/2026)", font_size=12, fill="#475467")

    # Search Input Box with Google Font Icon
    add_rect(p, 32, 150, 920, 44, fill="#FFFFFF", stroke="#D0D5DD", stroke_width=1, corner_radius=8)
    add_google_icon(p, "search", 48, 163, size=18, fill="#98A2B3")
    add_text(p, 74, 163, "ค้นหาท่าสัญญาณ, กติกา, หรือคำสำคัญ (เช่น ฟรีคิก, ล้ำหน้า, VAR, จุดโทษ)...", font_size=12, fill="#98A2B3")

    # Category Filter Tabs
    cats = [
        ("ทั้งหมด (20)", True),
        ("ลูกตั้งเตะ (6)", False),
        ("การทำฟาวล์ (5)", False),
        ("การควบคุมเกม (5)", False),
        ("การล้ำหน้า & VAR (4)", False)
    ]
    for c_idx, (cat_label, is_cat_active) in enumerate(cats):
        cx = 32 + c_idx * 160
        add_rect(p, cx, 208, 145, 36, fill="#F0FDFA" if is_cat_active else "#FFFFFF", stroke="#0E7490" if is_cat_active else "#D0D5DD", stroke_width=1.5 if is_cat_active else 1, corner_radius=18)
        add_text(p, cx + 72, 218, cat_label, font_size=12, font_style="Bold" if is_cat_active else "Medium", fill="#0E7490" if is_cat_active else "#344054", align="center")

    # 3-Column Signals Grid (6 Sample Cards)
    cards_data = [
        {"id": 1, "law": "Law 13", "name_th": "ฟรีคิกทางตรง (Direct Free Kick)", "name_en": "Direct Free Kick", "arm": "แขน 90°", "hold": "Hold 1.2s", "body": "แขนข้างใดข้างหนึ่ง", "active": False},
        {"id": 2, "law": "Law 13", "name_th": "ฟรีคิกทางอ้อม (Indirect Free Kick)", "name_en": "Indirect Free Kick", "arm": "แขน 180°", "hold": "Hold จนสัมผัสบอล", "body": "แขนขวาตรง", "active": True},
        {"id": 3, "law": "Law 14", "name_th": "การให้จุดโทษ (Penalty Kick)", "name_en": "Penalty Kick", "arm": "แขน 45° ชี้ลง", "hold": "Hold 1.5s", "body": "แขนข้างใดข้างหนึ่ง", "active": False},
        {"id": 4, "law": "Law 5", "name_th": "สัญญาณได้เปรียบ (Advantage Play-on)", "name_en": "Advantage (One/Two Arms)", "arm": "2 แขน 45°", "hold": "กวาดแขนไปข้างหน้า", "body": "2 แขนพร้อมกัน", "active": False},
        {"id": 5, "law": "Law 17", "name_th": "การเตะมุม (Corner Kick)", "name_en": "Corner Kick", "arm": "ชี้มุมธง 45°", "hold": "Hold 1.2s", "body": "แขนข้างใดข้างหนึ่ง", "active": False},
        {"id": 6, "law": "Law 5", "name_th": "สัญญาณตรวจ VAR (TV Signal)", "name_en": "VAR Review Signal", "arm": "รูปสี่เหลี่ยม TV", "hold": "วาด 2 รอบ", "body": "2 นิ้วชี้ทั้งสองมือ", "active": False},
    ]

    for idx, c in enumerate(cards_data):
        col = idx % 3
        row = idx // 3
        card_x = 32 + col * 300
        card_y = 260 + row * 290
        
        border_col = "#0E7490" if c["active"] else "#EAECF0"
        shadow_fill = "#FFFFFF"
        add_rect(p, card_x, card_y, 285, 275, fill=shadow_fill, stroke=border_col, stroke_width=2 if c["active"] else 1, corner_radius=12)
        
        # Law Badge with Google Icon
        add_badge(p, card_x + 16, card_y + 16, c["law"], bg_color="#EFF8FF", text_color="#175CD3", border_color="#B2DDFF", font_size=10, height=20, icon_name="menu_book", icon_color="#175CD3")
        
        # Signal Posture Thumbnail Box
        add_rect(p, card_x + 16, card_y + 44, 253, 110, fill="#F8FAFC", stroke="#E2E8F0", stroke_width=1, corner_radius=8)
        
        # Vector schematic
        center_x = card_x + 142
        center_y = card_y + 99
        add_line(p, center_x, center_y - 20, center_x, center_y + 35, stroke="#334155", stroke_width=3)
        add_ellipse(p, center_x - 7, center_y - 34, 14, 14, fill="#0E7490")
        
        if c["id"] == 1:
            add_line(p, center_x, center_y - 10, center_x + 35, center_y - 10, stroke="#0891B2", stroke_width=3)
        elif c["id"] == 2:
            add_line(p, center_x, center_y - 10, center_x + 10, center_y - 45, stroke="#0891B2", stroke_width=3)
        elif c["id"] == 3:
            add_line(p, center_x, center_y - 10, center_x + 30, center_y + 20, stroke="#0891B2", stroke_width=3)
        elif c["id"] == 4:
            add_line(p, center_x, center_y - 10, center_x + 30, center_y + 5, stroke="#0891B2", stroke_width=3)
            add_line(p, center_x, center_y - 10, center_x - 30, center_y + 5, stroke="#0891B2", stroke_width=3)
        else:
            add_line(p, center_x, center_y - 10, center_x + 30, center_y - 25, stroke="#0891B2", stroke_width=3)

        # Card Title
        add_text(p, card_x + 16, card_y + 165, c["name_th"], font_size=12, font_style="Bold", fill="#101828", width=250)
        add_text(p, card_x + 16, card_y + 185, c["name_en"], font_size=10, font_style="Regular", fill="#667085")

        # Metric Pills with Google Icons
        add_google_icon(p, "straighten", card_x + 16, card_y + 208, size=14, fill="#0E7490")
        add_text(p, card_x + 34, card_y + 208, c["arm"], font_size=10, fill="#344054")
        
        add_google_icon(p, "schedule", card_x + 110, card_y + 208, size=14, fill="#0E7490")
        add_text(p, card_x + 128, card_y + 208, c["hold"], font_size=10, fill="#344054")

        # Practice CTA Button
        add_button(p, card_x + 16, card_y + 235, 253, 30, "เริ่มฝึกซ้อมท่านี้", bg_color="#0E7490" if c["active"] else "#F2F4F7", text_color="#FFFFFF" if c["active"] else "#344054", corner_radius=6, font_size=11, icon_name="videocam")

    # RIGHT AREA: Slide-over Deep Dive Rule Inspector Drawer (x=980, y=100, w=428, h=760)
    add_rect(p, 980, 100, 428, 760, fill="#FFFFFF", stroke="#EAECF0", stroke_width=1, corner_radius=16)
    
    # Drawer Header
    add_badge(p, 1004, 120, "IFAB LAW 13 - DEEP DIVE", bg_color="#EFF8FF", text_color="#175CD3", border_color="#B2DDFF", icon_name="menu_book", icon_color="#175CD3")
    add_text(p, 1004, 150, "ท่าที่ 2: ฟรีคิกทางอ้อม (Indirect Free Kick)", font_size=16, font_style="Bold", fill="#101828")
    add_text(p, 1004, 175, "Official Instructional Guideline for Referees", font_size=11, fill="#475467")

    # Anatomical Vector Skeleton Diagram
    add_rect(p, 1004, 205, 380, 170, fill="#F8FAFC", stroke="#E2E8F0", stroke_width=1, corner_radius=12)
    diag_cx = 1004 + 190
    diag_cy = 205 + 100
    add_line(p, diag_cx, diag_cy - 40, diag_cx, diag_cy + 55, stroke="#334155", stroke_width=3)
    add_ellipse(p, diag_cx - 10, diag_cy - 60, 20, 20, fill="#0E7490")
    add_line(p, diag_cx, diag_cy - 20, diag_cx + 25, diag_cy - 75, stroke="#0891B2", stroke_width=4)
    add_ellipse(p, diag_cx + 25 - 4, diag_cy - 75 - 4, 8, 8, fill="#10B981")
    
    add_badge(p, diag_cx + 35, diag_cy - 85, "เป้าหมาย IFAB: 170° - 180°", bg_color="#ECFDF5", text_color="#027A48", border_color="#A6F4C5", icon_name="straighten", icon_color="#027A48")

    # Rule Specs Breakdown
    add_text(p, 1004, 395, "เกณฑ์มาตรฐานตามกฎการแข่งขัน (IFAB Criteria):", font_size=12, font_style="Bold", fill="#101828")
    
    criteria = [
        ("มุมยกแขน (Shoulder Elevation)", "180° (ชูตรงขึ้นฟ้าขนานกับศีรษะ)"),
        ("ความเหยียดตรงของข้อศอก (Elbow Straightness)", "> 165° (ห้ามงอข้อศอกขณะให้สัญญาณ)"),
        ("แขนที่ใช้งาน (Active Arm)", "แขนข้างใดข้างหนึ่ง (แนะนำแขนข้างที่ถนัด)"),
        ("ระยะเวลาค้างสัญญาณ (Hold Duration)", "ค้างไว้จนกว่าจะมีการเล่นลูกบอลหรือบอลตาย"),
    ]
    for cr_idx, (cr_title, cr_val) in enumerate(criteria):
        cry = 420 + cr_idx * 40
        add_text(p, 1004, cry, cr_title, font_size=11, font_style="SemiBold", fill="#344054")
        add_text(p, 1004, cry + 16, cr_val, font_size=11, fill="#0E7490")

    # Common Mistakes Callout Box with Google Icon
    add_rect(p, 1004, 590, 380, 85, fill="#FEF3F2", stroke="#FECDCA", stroke_width=1, corner_radius=8)
    add_google_icon(p, "warning", 1020, 604, size=20, fill="#D92D20")
    add_text(p, 1046, 604, "ข้อผิดพลาดที่พบบ่อย (Common Mistakes):", font_size=11, font_style="Bold", fill="#B42318")
    add_text(p, 1046, 624, "• ลดแขนลงเร็วก่อนที่ลูกบอลจะถูกสัมผัสโดยผู้เล่นคนอื่น\n• งอข้อศอกทำให้สัญญาณดูไม่ชัดเจนและขาดความมั่นใจ", font_size=11, fill="#912018")

    # CTA
    add_button(p, 1004, 695, 380, 48, "เริ่มฝึกซ้อมท่านี้ใน Live Studio", bg_color="#0E7490", text_color="#FFFFFF", corner_radius=8, font_size=13, icon_name="videocam")


# ==============================================================================
# BUILD SCREEN 4: Trainee Performance Gradebook (/gradebook) - Frame ID: 5
# ==============================================================================
def build_screen_4(frame_id):
    p = frame_id
    # Header Bar (Light Mode)
    add_rect(p, 0, 0, 1440, 72, fill="#FFFFFF", stroke="#EAECF0", stroke_width=1)
    add_google_icon(p, "sports_soccer", 32, 25, size=22, fill="#0E7490")
    add_text(p, 62, 24, "Referee Academy AI", font_size=18, font_style="Bold", fill="#101828")
    
    # Trainee Profile Badge
    add_rect(p, 275, 16, 320, 40, fill="#F8FAFC", stroke="#E2E8F0", stroke_width=1, corner_radius=20)
    add_ellipse(p, 281, 22, 28, 28, fill="#0E7490")
    add_text(p, 287, 28, "IR", font_size=12, font_style="Bold", fill="#FFFFFF")
    add_text(p, 318, 23, "อัศวิน พิทักษ์ธรรม (REF-2026-092)", font_size=12, font_style="Bold", fill="#101828")
    add_text(p, 318, 38, "หลักสูตรผู้ตัดสินระดับชาติขั้นต้น (Class 3)", font_size=10, fill="#667085")

    # Export & Certificate Buttons with Google Font Icons
    add_button(p, 1060, 18, 175, 36, "ดาวน์โหลดรายงาน PDF", bg_color="#FFFFFF", text_color="#344054", border_color="#D0D5DD", font_size=11, icon_name="download")
    add_button(p, 1245, 18, 160, 36, "ดูใบรับรองผลการสอบ", bg_color="#0E7490", text_color="#FFFFFF", font_size=11, icon_name="school")

    # Page Title
    add_text(p, 32, 100, "สมุดบันทึกผลการประเมินและพัฒนาการผู้เรียน (Trainee Gradebook)", font_size=20, font_style="Bold", fill="#101828")
    add_text(p, 32, 126, "ภาพรวมสถิติการฝึกซ้อมภาคปฏิบัติและผลการสอบสถานการณ์จำลองตามเกณฑ์ IFAB", font_size=12, fill="#475467")

    # 4 Untitled UI Metric Stat Cards with Google Font Icons
    stat_cards = [
        {"title": "ความแม่นยำรวม (Overall Accuracy)", "value": "88.4%", "sub": "+4.2% จากสัปดาห์ก่อน", "trend": "up", "icon": "monitoring", "color": "#0E7490"},
        {"title": "ชุดข้อสอบที่ผ่านเกณฑ์ (Passed)", "value": "24 / 28", "sub": "อัตราผ่าน 85.7%", "trend": "neutral", "icon": "quiz", "color": "#059669"},
        {"title": "เวลาตอบสนองเฉลี่ย (Reaction Time)", "value": "1.35s", "sub": "เร็วกว่าเกณฑ์ 0.65s (ดีเยี่ยม)", "trend": "up", "icon": "speed", "color": "#2563EB"},
        {"title": "ระดับสมรรถนะ (Competency Tier)", "value": "ระดับ 3", "sub": "พร้อมสอบภาคสนามจริง", "trend": "gold", "icon": "school", "color": "#7C3AED"},
    ]
    for idx, sc in enumerate(stat_cards):
        sc_x = 32 + idx * 345
        add_rect(p, sc_x, 150, 330, 105, fill="#FFFFFF", stroke="#EAECF0", stroke_width=1, corner_radius=12)
        add_google_icon(p, sc["icon"], sc_x + 20, 168, size=22, fill=sc["color"])
        add_text(p, sc_x + 50, 166, sc["title"], font_size=11, font_style="Medium", fill="#667085")
        add_text(p, sc_x + 20, 190, sc["value"], font_size=24, font_style="Bold", fill="#101828")
        add_text(p, sc_x + 20, 222, sc["sub"], font_size=11, font_style="Medium", fill="#027A48" if sc["trend"]=="up" else "#475467")

    # Middle Row: Left (Radar Chart: 680px), Right (Weakness Diagnostics: 660px)
    add_rect(p, 32, 275, 680, 270, fill="#FFFFFF", stroke="#EAECF0", stroke_width=1, corner_radius=12)
    add_google_icon(p, "monitoring", 52, 293, size=18, fill="#0E7490")
    add_text(p, 76, 292, "เรดาร์ชาร์ตสมรรถนะ 4 มิติ (Competency Radar Chart)", font_size=13, font_style="Bold", fill="#101828")
    add_text(p, 52, 314, "เปรียบเทียบคะแนนผู้เรียนกับเกณฑ์มาตรฐาน IFAB Standard (80%)", font_size=11, fill="#667085")

    # Radar
    radar_cx, radar_cy, radar_r = 190, 420, 85
    add_radar_chart(p, radar_cx, radar_cy, radar_r, values=[92, 84, 76, 90], labels=["ลูกตั้งเตะ", "การทำฟาวล์", "การควบคุมเกม", "การล้ำหน้า"])
    
    # Legend
    cats_breakdown = [
        ("ลูกตั้งเตะ (Restarts)", "92%", "#0E7490"),
        ("การทำฟาวล์ (Fouls & Misconduct)", "84%", "#059669"),
        ("การควบคุมเกม (Game Control)", "76%", "#D97706"),
        ("การล้ำหน้า (Offside & Boundary)", "90%", "#2563EB"),
    ]
    for c_idx, (c_label, c_pct, c_col) in enumerate(cats_breakdown):
        cy = 350 + c_idx * 42
        add_ellipse(p, 380, cy + 4, 8, 8, fill=c_col)
        add_text(p, 396, cy, c_label, font_size=11, font_style="SemiBold", fill="#344054")
        add_text(p, 640, cy, c_pct, font_size=12, font_style="Bold", fill=c_col, align="right")
        add_progress_bar(p, 396, cy + 18, 250, 6, int(c_pct.replace("%", "")), bg_color="#F2F4F7", fill_color=c_col)

    # Right: Weakness Diagnostics Panel
    add_rect(p, 730, 275, 678, 270, fill="#FFFFFF", stroke="#EAECF0", stroke_width=1, corner_radius=12)
    add_google_icon(p, "warning", 750, 293, size=18, fill="#D92D20")
    add_text(p, 774, 292, "การวินิจฉัยจุดอ่อนรายบุคคล (AI Diagnostic & Action Plan)", font_size=13, font_style="Bold", fill="#101828")
    
    add_rect(p, 750, 325, 638, 62, fill="#FEF3F2", stroke="#FECDCA", stroke_width=1, corner_radius=8)
    add_google_icon(p, "warning", 764, 338, size=20, fill="#D92D20")
    add_text(p, 792, 336, "จุดที่ควรปรับปรุง: สัญญาณได้เปรียบ (Advantage) กางแขนแคบเกินไป (เฉลี่ย 32° จากเกณฑ์ 45°)", font_size=11, font_style="Bold", fill="#B42318")
    add_text(p, 792, 356, "ผู้เรียนมักกางแขนไม่เต็มระยะ ทำให้ผู้เล่นในสนามอาจมองไม่เห็นสัญญาณในจังหวะสวนกลับเร็ว", font_size=10, fill="#912018")

    add_rect(p, 750, 398, 638, 62, fill="#FFFBEB", stroke="#FEF08A", stroke_width=1, corner_radius=8)
    add_google_icon(p, "schedule", 764, 411, size=20, fill="#D97706")
    add_text(p, 792, 409, "ข้อสังเกต: การค้างสัญญาณในฟรีคิกทางอ้อมสั้นกว่าเกณฑ์ (เฉลี่ย 0.8s จากเกณฑ์ 1.5s)", font_size=11, font_style="Bold", fill="#92400E")
    add_text(p, 792, 429, "ควรฝึกสมาธิในการชูแขนค้างไว้จนกว่าจะมีการสัมผัสบอล ไม่ลดแขนลงทันทีหลังเป่านกหวีด", font_size=10, fill="#78350F")

    add_button(p, 750, 485, 638, 38, "เข้าห้องฝึกซ้อมเพื่อแก้ไขจุดอ่อน 2 ข้อนี้ทันที", bg_color="#0E7490", text_color="#FFFFFF", font_size=12, icon_name="videocam")

    # Bottom Row: Recent Assessment Sessions History Data Table
    add_rect(p, 32, 565, 1376, 295, fill="#FFFFFF", stroke="#EAECF0", stroke_width=1, corner_radius=12)
    add_google_icon(p, "quiz", 52, 583, size=18, fill="#0E7490")
    add_text(p, 76, 582, "ตารางประวัติผลการประเมินการฝึกและสอบล่าสุด (Recent Assessment Sessions)", font_size=13, font_style="Bold", fill="#101828")

    # Table Header Row
    add_rect(p, 52, 610, 1336, 32, fill="#F8FAFC", corner_radius=6)
    headers = [
        ("รหัสเซสชัน", 70),
        ("วันที่ - เวลา", 220),
        ("ชุดแบบฝึก / ข้อสอบ", 400),
        ("คะแนนเฉลี่ย", 780),
        ("เวลาตอบสนอง", 920),
        ("สถานะผลประเมิน", 1080),
        ("การกระทำ", 1250)
    ]
    for h_title, hx in headers:
        add_text(p, hx, 620, h_title, font_size=11, font_style="Bold", fill="#475467")

    # 5 Sample Data Rows
    table_rows = [
        ("EXAM-2026-104", "15 พ.ย. 2026, 11:20", "ชุดข้อสอบ Law 12: การทำฟาวล์ในเขตโทษ", "92 / 100", "1.18 วินาที", "ผ่านเกณฑ์ (A+)", "#027A48", "#ECFDF5", "#A6F4C5"),
        ("DRILL-2026-098", "14 พ.ย. 2026, 16:45", "ฝึกซ้อมสด: ฟรีคิกทางอ้อม (Law 13)", "94 / 100", "1.05 วินาที", "ผ่านเกณฑ์ (A+)", "#027A48", "#ECFDF5", "#A6F4C5"),
        ("DRILL-2026-089", "14 พ.ย. 2026, 10:15", "ฝึกซ้อมสด: สัญญาณได้เปรียบ (Advantage)", "74 / 100", "1.82 วินาที", "ต้องปรับปรุง (C)", "#B54708", "#FFFAEB", "#FEDF89"),
        ("EXAM-2026-075", "12 พ.ย. 2026, 14:30", "ชุดข้อสอบ Law 11: การตัดสินจังหวะล้ำหน้า", "88 / 100", "1.25 วินาที", "ผ่านเกณฑ์ (A)", "#027A48", "#ECFDF5", "#A6F4C5"),
        ("DRILL-2026-064", "10 พ.ย. 2026, 09:00", "ฝึกซ้อมสด: การให้สัญญาณจุดโทษ (Law 14)", "90 / 100", "1.20 วินาที", "ผ่านเกณฑ์ (A)", "#027A48", "#ECFDF5", "#A6F4C5"),
    ]
    for r_idx, r in enumerate(table_rows):
        ry = 650 + r_idx * 38
        if r_idx % 2 == 1:
            add_rect(p, 52, ry - 4, 1336, 36, fill="#F9FAFB")
        
        add_text(p, 70, ry + 6, r[0], font_size=11, font_style="Medium", fill="#101828")
        add_text(p, 220, ry + 6, r[1], font_size=11, fill="#667085")
        add_text(p, 400, ry + 6, r[2], font_size=11, font_style="Medium", fill="#101828")
        add_text(p, 780, ry + 6, r[3], font_size=11, font_style="Bold", fill="#0E7490")
        add_text(p, 920, ry + 6, r[4], font_size=11, fill="#475467")
        add_badge(p, 1070, ry + 2, r[5], bg_color=r[7], text_color=r[6], border_color=r[8], font_size=10, height=22, icon_name="check_circle" if "ผ่าน" in r[5] else "warning", icon_color=r[6])
        add_button(p, 1250, ry + 2, 85, 24, "ดูผลตรวจ", bg_color="#FFFFFF", text_color="#0E7490", border_color="#D0D5DD", font_size=10, corner_radius=4)


# ==============================================================================
# BUILD SCREEN 5: Google Font Icons Asset Library - Frame ID: 6
# ==============================================================================
def build_screen_5(frame_id):
    p = frame_id
    # Header
    add_rect(p, 0, 0, 1440, 72, fill="#0F172A", stroke="#1E293B", stroke_width=1)
    add_google_icon(p, "sports_soccer", 32, 25, size=22, fill="#22D3EE")
    add_text(p, 62, 24, "Referee Academy AI - Design Tokens", font_size=18, font_style="Bold", fill="#FFFFFF")
    
    add_badge(p, 500, 24, "GOOGLE MATERIAL SYMBOLS OUTLINED (NATIVE VECTOR ASSETS)", bg_color="#083344", text_color="#22D3EE", border_color="#22D3EE")
    
    # Title & Guidelines
    add_text(p, 32, 100, "Google Font Icons (Material Symbols) Design Asset Library", font_size=20, font_style="Bold", fill="#FFFFFF")
    add_text(p, 32, 126, "คลังไอคอนเวกเตอร์มาตรฐาน Google Material Symbols สำหรับระบบฝึกอบรมและประเมินผลผู้ตัดสิน (Front_End & FigCraft)", font_size=12, fill="#94A3B8")

    # Categories of icons
    categories = [
        ("Navigation & Portal", ["sports_soccer", "menu_book", "quiz", "monitoring", "school"]),
        ("Video & Vision Engine", ["videocam", "videocam_off", "crop_free", "flip", "refresh"]),
        ("Tactical & Tagging", ["my_location", "person", "group", "how_to_reg", "straighten"]),
        ("Scores & Metrics", ["check_circle", "warning", "bolt", "schedule", "timer", "speed"]),
        ("Actions & UI Helpers", ["search", "download", "emoji_events", "lightbulb", "circle"]),
    ]

    start_y = 160
    for cat_idx, (cat_name, icon_list) in enumerate(categories):
        cy = start_y + cat_idx * 138
        
        # Category Box
        add_rect(p, 32, cy, 1376, 120, fill="#0F172A", stroke="#1E293B", stroke_width=1, corner_radius=12)
        add_text(p, 52, cy + 16, f"Category: {cat_name} ({len(icon_list)} Icons)", font_size=13, font_style="Bold", fill="#38BDF8")
        
        # Render icon tiles in a row
        for i_idx, icon_name in enumerate(icon_list):
            tile_x = 52 + i_idx * 215
            tile_y = cy + 42
            
            # Tile background
            add_rect(p, tile_x, tile_y, 195, 62, fill="#0B132B", stroke="#334155", stroke_width=1, corner_radius=8)
            
            # Google Font Icon preview
            add_google_icon(p, icon_name, tile_x + 14, tile_y + 16, size=28, fill="#22D3EE", name=f"lib_icon_{icon_name}")
            
            # Icon Glyph name
            add_text(p, tile_x + 52, tile_y + 14, icon_name, font_size=11, font_style="Bold", fill="#FFFFFF")
            add_text(p, tile_x + 52, tile_y + 34, "Material Symbol", font_size=9, fill="#64748B")


# ==============================================================================
# MAIN EXECUTION ROUTINE
# ==============================================================================
def main():
    print("=== Generating FigCraft Prototype with Google Font Icons ===")
    
    # 1. Create Top-Level Frames
    print("Step 1: Creating 5 Top-Level Frames...")
    add_frame("Screen1_Live_Drills", 0, 0, 1440, 900, fill="#090D16")
    add_frame("Screen2_Scenario_Exam", 1540, 0, 1440, 900, fill="#090D16")
    add_frame("Screen3_IFAB_Handbook", 3080, 0, 1440, 900, fill="#F9FAFB")
    add_frame("Screen4_Trainee_Gradebook", 4620, 0, 1440, 900, fill="#F9FAFB")
    add_frame("Google_Font_Icons_Asset_Library", 6160, 0, 1440, 900, fill="#090D16")

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

    # 6. Build Screen 5: Google Font Icons Asset Library
    print("Step 6: Building Screen 5 (Google Font Icons Asset Library)...")
    build_screen_5(frame_id=6)

    # Write commands to UTF-8 JSON file
    script_json_path = SCRIPTS_DIR / "figcraft_commands.json"
    print(f"Step 7: Writing {len(COMMANDS)} commands to {script_json_path}...")
    with open(script_json_path, "w", encoding="utf-8") as f:
        json.dump(COMMANDS, f, ensure_ascii=False, indent=2)
    print("JSON command script successfully written!")

    # Run FigCraft CLI to generate .figcraft project
    output_figcraft = DOCS_FIGCRAFT / "Referee_Academy_UI.figcraft"
    print(f"Step 8: Running figcraft-cli to generate {output_figcraft}...")
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
    print(f"Step 9: Exporting frames to PNG in {RENDERS_DIR}...")
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
    print("Step 10: Inspecting FigCraft file info...")
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
