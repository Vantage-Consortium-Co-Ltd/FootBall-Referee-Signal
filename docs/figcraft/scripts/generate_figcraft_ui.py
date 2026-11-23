"""
generate_figcraft_ui.py
=======================
Generates the FigCraft UI prototype for the Football Referee Academy
(educational & trainee-assessment platform) on a strict layout grid.

Layout system (all screens 1440x900):
  - Header bar          y=0    h=64   (logo | nav tabs | profile)  — auto layout
  - Page title bar      y=88   h=48   (title + subtitle | actions)  — auto layout
  - Content area        y=160  h=708  (bottom margin 32)
  - Side margins 32, gutter 24, content width 1376
  - Two-column screens: 792 | 24 | 560   (Drills, Examination)
                        904 | 24 | 448   (Handbook)

Why auto layout: badges, buttons and rows hug their real text width, so Thai
copy never overflows a hard-coded box. Cards clip their children.

Icons: Google Material Symbols (24x24 SVG paths). Each path gets two
sub-pixel corner anchors so FigCraft scales the full 24px viewBox instead of
stretching the glyph's own bounding box.
"""

import json
import math
import subprocess
import sys
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parent
DOCS_FIGCRAFT = SCRIPTS_DIR.parent
RENDERS_DIR = DOCS_FIGCRAFT / "renders"
FIGCRAFT_CLI = r"C:\Program Files\ArtCraft\FigCraft\figcraft-cli.exe"

# ==============================================================================
# GOOGLE MATERIAL SYMBOLS (24x24 viewBox SVG paths)
# ==============================================================================
ICONS = {
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
    "speed": "M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.28-10.43zM10.59 15.41a2 2 0 1 0 2.83-2.83l-3.07-3.07-1.41 1.41 1.65 1.65z",
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
    "straighten": "M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h2v4h2V8h2v4h2V8h2v4h2V8h2v4h2V8h2v8z",
    "lightbulb": "M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-1.3l-.85-.6A5.002 5.002 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z",
    "play_arrow": "M8 5v14l11-7z",
}
# Sub-pixel anchors at (0,0) and (24,24): force the 24px viewBox as the bounds.
VIEWBOX_ANCHORS = " M0 0h.01v.01H0z M23.99 23.99h.01v.01h-.01z"

# ==============================================================================
# DESIGN TOKENS (Apple HIG Dark & Light Studio System)
# ==============================================================================
DARK = {
    "name": "dark", "bg": "#000000", "surface": "#1C1C1E", "surface2": "#141416",
    "elevated": "#2C2C2E", "border": "#38383A", "text": "#F5F5F7",
    "text2": "#A1A1A6", "text3": "#6E6E73", "accent": "#0A84FF",
    "accent_bg": "#0A84FF24", "accent_border": "#0A84FF55",
}
LIGHT = {
    "name": "light", "bg": "#F5F5F7", "surface": "#FFFFFF", "surface2": "#F2F2F7",
    "elevated": "#FFFFFF", "border": "#E5E5EA", "text": "#1D1D1F",
    "text2": "#6E6E73", "text3": "#8E8E93", "accent": "#007AFF",
    "accent_bg": "#007AFF1A", "accent_border": "#007AFF44",
}
TONES = {
    # name: (dark bg, dark fg, dark border, light bg, light fg, light border)
    "success": ("#062614", "#30D158", "#30D15855", "#EAFBF0", "#1E8E3E", "#34C75955"),
    "warning": ("#2C1A04", "#FF9F0A", "#FF9F0A55", "#FFF5E5", "#C97200", "#FF950055"),
    "error":   ("#2B0B0D", "#FF453A", "#FF453A55", "#FFECEB", "#D70015", "#FF3B3055"),
    "info":    ("#08223D", "#64D2FF", "#64D2FF55", "#EAF5FF", "#0066CC", "#007AFF55"),
    "accent":  ("#082240", "#0A84FF", "#0A84FF66", "#EBF3FF", "#007AFF", "#007AFF55"),
    "neutral": ("#2C2C2E", "#E5E5EA", "#3A3A3C", "#E8E8ED", "#3A3A3C", "#D2D2D7"),
}


def tone(theme, name):
    t = TONES[name]
    return (t[0], t[1], t[2]) if theme["name"] == "dark" else (t[3], t[4], t[5])


# ==============================================================================
# FIGCRAFT COMMAND BUILDER
# ==============================================================================
class FigCraftDoc:
    """Accumulates commands and predicts node ids (FigCraft assigns them
    sequentially from 2 in a fresh document; verified after the run)."""

    def __init__(self):
        self.commands = []
        self.expected_ids = []
        self._next_id = 2

    def _create(self, command, params):
        node_id = self._next_id
        self._next_id += 1
        self.commands.append({"command": command, "params": params})
        self.expected_ids.append(node_id)
        return node_id

    # ---- primitives ---------------------------------------------------------
    def frame(self, parent, x, y, w, h, name=None, fill="none", **props):
        props["fill"] = fill
        params = {"x": x, "y": y, "width": w, "height": h, "props": props}
        if parent is not None:
            params["parent"] = parent
        if name:
            params["name"] = name
        return self._create("frame.create", params)

    def rect(self, parent, x, y, w, h, fill="none", name=None, **props):
        props["fill"] = fill
        params = {"parent": parent, "x": x, "y": y, "width": w, "height": h, "props": props}
        if name:
            params["name"] = name
        return self._create("shape.rectangle", params)

    def ellipse(self, parent, x, y, w, h, fill="none", name=None, **props):
        props["fill"] = fill
        params = {"parent": parent, "x": x, "y": y, "width": w, "height": h, "props": props}
        if name:
            params["name"] = name
        return self._create("shape.ellipse", params)

    def text(self, parent, s, x=0, y=0, size=12, weight="Regular", color="#FFFFFF",
             width=None, align=None, name=None):
        props = {"fontSize": size, "fontStyle": weight, "fill": color}
        if align:
            props["textAlign"] = align
        params = {"parent": parent, "text": s, "x": x, "y": y, "props": props}
        if width:
            params["width"] = width
            props["textAutoResize"] = "height"
        if name:
            params["name"] = name
        return self._create("text.create", params)

    def path(self, parent, d, fill="none", stroke=None, weight=None, name=None,
             x=None, y=None, w=None, h=None, **props):
        props["fill"] = fill
        if stroke:
            props["stroke"] = stroke
            props["strokeWeight"] = weight or 1
        params = {"parent": parent, "path": d, "props": props}
        for key, val in (("x", x), ("y", y), ("width", w), ("height", h)):
            if val is not None:
                params[key] = val
        if name:
            params["name"] = name
        return self._create("vector.create", params)

    def line(self, parent, x1, y1, x2, y2, color, weight=2, dashes=None, name=None):
        extra = {"strokeCap": "round"}
        if dashes:
            extra["dashes"] = dashes
        return self.path(parent, f"M {x1} {y1} L {x2} {y2}", stroke=color,
                         weight=weight, name=name, **extra)

    def icon(self, parent, name, size=18, color="#22D3EE", x=None, y=None):
        return self.path(parent, ICONS[name] + VIEWBOX_ANCHORS, fill=color,
                         name=f"icon/{name}", x=x, y=y, w=size, h=size)

    # ---- auto-layout containers --------------------------------------------
    def _stack(self, layout, parent, x, y, w, h, gap, main, cross, pad, fill,
               radius, stroke, name, clip):
        props = {"layout": layout, "gap": gap, "mainAlign": main, "crossAlign": cross,
                 "padding": pad, "sizingH": "fixed" if w else "hug",
                 "sizingV": "fixed" if h else "hug"}
        if radius is not None:
            props["cornerRadius"] = radius
        if stroke:
            props["stroke"] = stroke
            props["strokeWeight"] = 1
        if clip:
            props["clip"] = True
        return self.frame(parent, x, y, w or 10, h or 10, name=name, fill=fill, **props)

    def hstack(self, parent, x=0, y=0, w=None, h=None, gap=8, main="min", cross="center",
               pad=0, fill="none", radius=None, stroke=None, name=None, clip=False):
        return self._stack("horizontal", parent, x, y, w, h, gap, main, cross, pad,
                           fill, radius, stroke, name, clip)

    def vstack(self, parent, x=0, y=0, w=None, h=None, gap=8, main="min", cross="min",
               pad=0, fill="none", radius=None, stroke=None, name=None, clip=False):
        return self._stack("vertical", parent, x, y, w, h, gap, main, cross, pad,
                           fill, radius, stroke, name, clip)

    # ---- components -----------------------------------------------------------
    def badge(self, parent, label, colors, icon=None, dot=False, x=0, y=0, size=11):
        bg, fg, border = colors
        left_pad = 6 if (icon or dot) else 8
        b = self.hstack(parent, x, y, gap=4, pad=[3, 8, 3, left_pad], fill=bg,
                        radius=12, stroke=border, name=f"badge/{label[:24]}")
        if dot:
            self.ellipse(b, 0, 0, 6, 6, fill=fg)
        if icon:
            self.icon(b, icon, size + 3, fg)
        self.text(b, label, size=size, weight="SemiBold", color=fg)
        return b

    def button(self, parent, label, bg, fg, x=0, y=0, w=None, h=36, icon=None,
               border=None, size=13, radius=10, weight="SemiBold"):
        props = {"layout": "horizontal", "gap": 6, "mainAlign": "center",
                 "crossAlign": "center", "cornerRadius": radius,
                 "sizingH": "fixed" if w else "hug", "sizingV": "fixed"}
        if not w:
            props["padding"] = [0, 14, 0, 12 if icon else 14]
        if border:
            props["stroke"] = border
            props["strokeWeight"] = 1
        b = self.frame(parent, x, y, w or 10, h, name=f"button/{label[:24] or icon}",
                       fill=bg, **props)
        if icon:
            self.icon(b, icon, size + 3, fg)
        if label:
            self.text(b, label, size=size, weight=weight, color=fg)
        return b

    def card(self, parent, x, y, w, h, theme, fill=None, stroke=None, radius=20, name=None):
        return self.frame(parent, x, y, w, h, name=name, fill=fill or theme["surface"],
                          stroke=stroke or theme["border"], strokeWeight=1,
                          cornerRadius=radius, clip=True)

    def card_header(self, card, w, theme, icon, title, right=None, icon_color=None,
                    title_color=None, pad=20):
        row = self.hstack(card, pad, 16, w=w - 2 * pad, h=24, main="spaceBetween",
                          name="card-header")
        left = self.hstack(row, gap=8)
        self.icon(left, icon, 18, icon_color or theme["accent"])
        self.text(left, title, size=14, weight="Bold", color=title_color or theme["text"])
        if right:
            group = self.hstack(row, gap=8)
            for spec in right:
                self.badge(group, *spec)
        return row

    def progress(self, parent, x, y, w, pct, color, track, h=8):
        self.rect(parent, x, y, w, h, fill=track, cornerRadius=h / 2)
        self.rect(parent, x, y, max(h, round(w * pct / 100)), h, fill=color, cornerRadius=h / 2)

    def gauge(self, parent, x, y, w, label, value, pct, color, theme):
        row = self.hstack(parent, x, y, w=w, h=16, main="spaceBetween")
        self.text(row, label, size=11, color=theme["text2"])
        self.text(row, value, size=11, weight="Bold", color=color)
        self.progress(parent, x, y + 22, w, pct, color, theme["border"])

    def avatar(self, parent, initials, bg, size=24):
        a = self.frame(parent, 0, 0, size, size, fill=bg, cornerRadius=size / 2,
                       layout="horizontal", mainAlign="center", crossAlign="center")
        self.text(a, initials, size=10, weight="Bold", color="#FFFFFF")
        return a

    def skeleton(self, parent, joints, bones, bone_color, joint_color, ring_color,
                 weight=4, glow=None):
        for a, b in bones:
            (x1, y1), (x2, y2) = joints[a], joints[b]
            if glow:
                self.line(parent, x1, y1, x2, y2, glow, weight=weight + 6)
            self.line(parent, x1, y1, x2, y2, bone_color, weight=weight)
        for jx, jy in joints.values():
            self.ellipse(parent, jx - 5, jy - 5, 10, 10, fill=joint_color,
                         stroke=ring_color, strokeWeight=1.5)


BODY_BONES = [
    ("head", "neck"), ("l_sh", "r_sh"), ("l_sh", "l_el"), ("l_el", "l_wr"),
    ("r_sh", "r_el"), ("r_el", "r_wr"), ("l_sh", "l_hip"), ("r_sh", "r_hip"),
    ("l_hip", "r_hip"), ("l_hip", "l_kn"), ("r_hip", "r_kn"), ("l_kn", "l_an"),
    ("r_kn", "r_an"),
]

NAV_TABS = [
    ("videocam", "ห้องฝึกซ้อมสด"),
    ("quiz", "ห้องสอบสถานการณ์"),
    ("menu_book", "คู่มือ IFAB 20 ท่า"),
    ("monitoring", "สมุดผลการประเมิน"),
]


# ==============================================================================
# SHARED SCREEN CHROME
# ==============================================================================
def header(doc, frame, theme, active, profile):
    row = doc.hstack(frame, 0, 0, w=1440, h=64, main="spaceBetween", pad=[0, 32, 0, 32],
                     fill=theme["surface"], name="header")
    logo = doc.hstack(row, gap=10)
    doc.icon(logo, "sports_soccer", 24, theme["accent"])
    doc.text(logo, "Referee Academy AI", size=17, weight="Bold", color=theme["text"])

    nav = doc.hstack(row, gap=4, pad=[4, 4, 4, 4], radius=14,
                     fill=theme["surface2"], stroke=theme["border"], name="nav")
    for idx, (ic, label) in enumerate(NAV_TABS):
        is_active = idx == active
        tab = doc.hstack(nav, gap=6, pad=[6, 14, 6, 12], radius=10,
                         fill=theme["elevated"] if is_active else "none",
                         stroke=theme["border"] if is_active else None)
        doc.icon(tab, ic, 16, theme["accent"] if is_active else theme["text2"])
        doc.text(tab, label, size=13, weight="SemiBold" if is_active else "Medium",
                 color=theme["text"] if is_active else theme["text2"])

    chip = doc.hstack(row, gap=8, pad=[4, 14, 4, 4], radius=18, fill=theme["surface2"],
                      stroke=theme["border"], name="profile")
    doc.avatar(chip, "IR", theme["accent"])
    doc.text(chip, profile, size=12, weight="Medium", color=theme["text"])
    doc.rect(frame, 0, 63, 1440, 1, fill=theme["border"])


def title_bar(doc, frame, theme, title, subtitle):
    """Returns the right-hand action group so screens can add badges/buttons."""
    row = doc.hstack(frame, 32, 88, w=1376, h=48, main="spaceBetween", name="title-bar")
    left = doc.vstack(row, gap=4)
    doc.text(left, title, size=20, weight="Bold", color=theme["text"])
    doc.text(left, subtitle, size=12, color=theme["text2"])
    return doc.hstack(row, gap=8)


# ==============================================================================
# SCREEN 1 — Live Practice Studio (/drills)
# ==============================================================================
def build_drills(doc, f):
    t = DARK
    header(doc, f, t, 0, "อัศวิน · Level 2")
    actions = title_bar(doc, f, t, "ห้องฝึกซ้อมสัญญาณสด (Live Practice Studio)",
                        "หน้าหลัก / แบบฝึกหัดสด / ฟรีคิกทางอ้อม · IFAB Law 13")
    doc.badge(actions, "Microservices Online · 31.4 FPS", tone(t, "success"), dot=True)
    doc.badge(actions, "Latency 14.2 ms", tone(t, "info"), icon="bolt")
    doc.badge(actions, "Session 00:14:25", tone(t, "neutral"), icon="schedule")

    # ---- Left column: viewport card (x=32 w=792) ----------------------------
    vp = doc.card(f, 32, 160, 792, 496, t, name="viewport-card")
    doc.card_header(vp, 792, t, "videocam", "กล้องตรวจจับท่าทาง (Live Camera Feed)",
                    right=[("YOLOv8x-Pose · ONNX", tone(t, "neutral"))])

    video = doc.frame(vp, 20, 56, 752, 368, name="video", fill="#0A0A0D",
                      cornerRadius=16, clip=True)
    for gx in range(0, 752, 47):  # subtle optical calibration grid
        doc.line(video, gx, 0, gx, 368, "#2C2C2E66", weight=1)
    doc.badge(video, "LIVE · 1080p 60FPS", tone(t, "error"), dot=True, x=12, y=12)

    # Tactical reticle on the referee
    rx, ry, rw, rh = 248, 44, 214, 312
    doc.rect(video, rx, ry, rw, rh, fill="#0A84FF0D", stroke="#0A84FF4D",
             strokeWeight=1, cornerRadius=14)
    bl = 22
    for cx, cy, dx, dy in ((rx, ry, 1, 1), (rx + rw, ry, -1, 1),
                           (rx, ry + rh, 1, -1), (rx + rw, ry + rh, -1, -1)):
        doc.line(video, cx, cy, cx + dx * bl, cy, t["accent"], weight=3)
        doc.line(video, cx, cy, cx, cy + dy * bl, t["accent"], weight=3)
    doc.badge(video, "TAGGED: REFEREE · 98.4%", tone(t, "accent"), icon="my_location",
              x=rx, y=12)

    joints = {
        "head": (356, 106), "neck": (356, 138), "l_sh": (321, 138), "r_sh": (391, 138),
        "l_el": (304, 196), "l_wr": (296, 246), "r_el": (393, 96), "r_wr": (395, 54),
        "l_hip": (336, 236), "r_hip": (376, 236), "l_kn": (332, 290), "r_kn": (380, 290),
        "l_an": (328, 340), "r_an": (384, 340),
    }
    # Ghost target guide (IFAB 180°) drawn under the live skeleton
    doc.line(video, 391, 138, 391, 50, "#64D2FFAA", weight=2, dashes=[6, 5])
    doc.ellipse(video, 384, 42, 14, 14, stroke="#64D2FF", strokeWeight=2, dashes=[3, 3])
    doc.skeleton(video, joints, BODY_BONES, t["accent"], "#30D158", "#0A3A1E",
                 glow="#0A84FF38")
    doc.badge(video, "เป้าหมาย IFAB 180°", tone(t, "info"), x=470, y=42)
    doc.badge(video, "176° มุมยกแขน", tone(t, "accent"), icon="straighten", x=470, y=76)
    doc.badge(video, "ศอกเหยียด 172°", tone(t, "success"), icon="check_circle", x=470, y=110)
    doc.badge(video, "แขนซ้าย 24°", tone(t, "neutral"), x=138, y=204)

    # Untagged second person
    doc.rect(video, 616, 104, 114, 236, fill="#1C1C1E80", stroke="#6E6E73",
             strokeWeight=1, dashes=[6, 4], cornerRadius=12)
    doc.badge(video, "Player #10 · แตะเพื่อ Tag", tone(t, "neutral"), icon="person", x=594, y=72)

    # Toolbar under the video
    bar = doc.hstack(vp, 20, 436, w=752, h=40, main="spaceBetween", name="toolbar")
    left = doc.hstack(bar, gap=8)
    s_bg, s_fg, s_bd = tone(t, "success")
    a_bg, a_fg, a_bd = tone(t, "accent")
    n_bg, n_fg, n_bd = tone(t, "neutral")
    doc.button(left, "กล้อง: เปิด", s_bg, s_fg, h=32, icon="videocam", border=s_bd, size=12)
    doc.button(left, "Ghost Guide", a_bg, a_fg, h=32, icon="my_location", border=a_bd, size=12)
    doc.button(left, "Mirror", n_bg, n_fg, h=32, icon="flip", border=n_bd, size=12)
    doc.button(left, "Angles", n_bg, n_fg, h=32, icon="straighten", border=n_bd, size=12)
    right = doc.hstack(bar, gap=8)
    doc.button(right, "Auto-Tag ผู้ตัดสิน", "#0A84FF", "#FFFFFF", h=32, icon="how_to_reg", size=12)
    doc.button(right, "", n_bg, n_fg, w=32, h=32, icon="refresh", border=n_bd, size=12)

    # ---- Left column: telemetry card ----------------------------------------
    tel = doc.card(f, 32, 680, 792, 188, t, name="telemetry-card")
    doc.card_header(tel, 792, t, "monitoring", "ความนิ่งของท่าทาง (Telemetry Waveform)",
                    right=[("STABLE HOLD · 98.2%", tone(t, "success"), "check_circle")])
    wave = doc.frame(tel, 20, 52, 752, 76, name="waveform", fill=t["surface2"],
                     cornerRadius=12, clip=True)
    for i in range(40):
        hv = 22 + 30 * math.sin(i * 0.3) * math.cos(i * 0.1) + (30 if i > 25 else 8)
        hv = int(max(8, min(60, hv)))
        doc.rect(wave, 14 + i * 18.2, 76 - 8 - hv, 10, hv,
                 fill="#30D158" if i > 25 else t["accent"], cornerRadius=4)
    foot = doc.hstack(tel, 20, 140, w=752, h=28, main="spaceBetween")
    doc.badge(foot, "ตรวจพบ: ฟรีคิกทางอ้อม (INDIRECT_FREE_KICK)", tone(t, "accent"),
              icon="my_location")
    doc.text(foot, "Pose Confidence 98.4%", size=11, color=t["text2"])

    # ---- Right column (x=848 w=560) ------------------------------------------
    hold = doc.card(f, 848, 160, 560, 196, t, name="hold-card")
    doc.card_header(hold, 560, t, "schedule", "ระยะเวลาค้างสัญญาณ (Hold Countdown)")
    cx, cy, r = 24 + 56, 56 + 56, 50
    doc.ellipse(hold, cx - r, cy - r, 2 * r, 2 * r, stroke=t["border"], strokeWeight=10)
    ang = math.radians(360 * 0.8)  # 1.2s / 1.5s
    ex, ey = cx + r * math.sin(ang), cy - r * math.cos(ang)
    doc.path(hold, f"M {cx} {cy - r} A {r} {r} 0 1 1 {ex:.2f} {ey:.2f}", stroke="#30D158",
             weight=10, strokeCap="round", name="hold-arc")
    center = doc.vstack(hold, 24, 56, w=112, h=112, gap=0, main="center", cross="center")
    doc.text(center, "1.2s", size=22, weight="Bold", color="#30D158")
    doc.text(center, "/ 1.5s", size=11, color=t["text3"])

    score = doc.vstack(hold, 172, 60, gap=6)
    doc.text(score, "คะแนนความถูกต้อง (Posture Score)", size=12, color=t["text2"])
    num = doc.hstack(score, gap=6, cross="baseline")
    doc.text(num, "94", size=44, weight="Bold", color="#30D158")
    doc.text(num, "/ 100", size=16, weight="Bold", color=t["text3"])
    doc.badge(score, "EXCELLENT POSTURE FORM", tone(t, "success"), icon="check_circle")

    s_bg, s_fg, s_bd = tone(t, "success")
    toast = doc.hstack(f, 848, 372, w=560, h=76, gap=12, pad=[0, 20, 0, 20], fill=s_bg,
                       radius=16, stroke=s_bd, name="coaching-toast")
    doc.icon(toast, "check_circle", 24, s_fg)
    msg = doc.vstack(toast, gap=4)
    doc.text(msg, "ยอดเยี่ยม! สัญญาณถูกต้องตาม IFAB Law 13", size=13, weight="Bold",
             color="#30D158")
    doc.text(msg, "แขนขวายกตรง 176° — ค้างไว้อีก 0.3 วินาทีเพื่อผ่านแบบฝึกหัด", size=11,
             color="#A6F4C5")

    gauges = doc.card(f, 848, 464, 560, 184, t, name="gauges-card")
    doc.card_header(gauges, 560, t, "straighten", "องศาข้อต่อ (Joint Angle Gauges)")
    doc.gauge(gauges, 20, 56, 520, "การยกแขนขวา (Shoulder Elevation)", "176° / 180°", 98,
              t["accent"], t)
    doc.gauge(gauges, 20, 96, 520, "ความเหยียดศอก (Elbow Straightness)", "172° / 180°", 95,
              "#30D158", t)
    doc.gauge(gauges, 20, 136, 520, "ลำตัวตั้งตรง (Torso Alignment)", "99%", 99, "#BF5AF2", t)

    drills = doc.card(f, 848, 664, 560, 204, t, name="drill-selector")
    doc.card_header(drills, 560, t, "menu_book", "แบบฝึกหัดสัญญาณ IFAB",
                    right=[("20 ท่า", tone(t, "neutral"))])
    items = [
        ("ฟรีคิกทางอ้อม (Indirect Free Kick)", "กำลังฝึก", "accent", True),
        ("ฟรีคิกทางตรง (Direct Free Kick)", "พร้อมฝึก", "neutral", False),
        ("การให้จุดโทษ (Penalty Kick)", "พร้อมฝึก", "neutral", False),
    ]
    for i, (label, status, tn, active) in enumerate(items):
        row = doc.hstack(drills, 20, 52 + i * 50, w=520, h=44, main="spaceBetween",
                         pad=[0, 12, 0, 12], radius=12,
                         fill=t["accent_bg"] if active else t["surface2"],
                         stroke=t["accent_border"] if active else t["border"])
        lg = doc.hstack(row, gap=10)
        doc.icon(lg, "my_location" if active else "play_arrow", 18,
                 t["accent"] if active else t["text3"])
        doc.text(lg, f"{i + 1}. {label}", size=12, weight="SemiBold" if active else "Medium",
                 color=t["text"] if active else t["text2"])
        doc.badge(row, status, tone(t, tn))


# ==============================================================================
# SCREEN 2 — Scenario Examination Studio (/examination)
# ==============================================================================
def build_exam(doc, f):
    t = DARK
    header(doc, f, t, 1, "อัศวิน · กำลังสอบ")
    actions = title_bar(doc, f, t, "ห้องสอบสถานการณ์จำลอง (Scenario Examination)",
                        "ชุดข้อสอบ IFAB Law 12 · การทำฟาวล์และการประพฤติผิด")
    doc.badge(actions, "ข้อ 1 / 5 · 20%", tone(t, "info"), icon="quiz")
    doc.badge(actions, "เวลาสอบเหลือ 04:32", tone(t, "warning"), icon="timer")

    # ---- Left: scenario card --------------------------------------------------
    sc = doc.card(f, 32, 160, 792, 708, t, name="scenario-card")
    doc.card_header(sc, 792, t, "quiz", "โจทย์สถานการณ์ (Instructional Scenario)",
                    right=[("คลิปที่ 1 · นาทีที่ 73", tone(t, "neutral"))])

    pitch = doc.frame(sc, 20, 56, 752, 320, name="scenario-video", fill="#0B3318",
                      cornerRadius=16, clip=True)
    ln = "#FFFFFF59"
    doc.rect(pitch, 24, 20, 704, 240, stroke=ln, strokeWeight=2)
    doc.line(pitch, 376, 20, 376, 260, ln)
    doc.ellipse(pitch, 326, 90, 100, 100, stroke=ln, strokeWeight=2)
    doc.rect(pitch, 24, 60, 140, 160, stroke=ln, strokeWeight=2)
    doc.rect(pitch, 24, 105, 50, 70, stroke=ln, strokeWeight=2)
    doc.ellipse(pitch, 112, 137, 6, 6, fill="#FFFFFF")
    doc.ellipse(pitch, 126, 124, 18, 18, fill="#FF453A", stroke="#FFFFFF", strokeWeight=2)
    doc.ellipse(pitch, 142, 132, 18, 18, fill="#0A84FF", stroke="#FFFFFF", strokeWeight=2)
    doc.text(pitch, "#9", x=128, y=148, size=10, weight="Bold", color="#FFD6D4")
    doc.text(pitch, "#4", x=148, y=154, size=10, weight="Bold", color="#B8DEFF")
    doc.badge(pitch, "ฟาวล์ขัดขาในเขตโทษ", tone(t, "error"), icon="warning", x=180, y=118)
    ctrl = doc.hstack(pitch, 0, 276, w=752, h=44, main="spaceBetween", pad=[0, 16, 0, 16],
                      fill="#1C1C1EE6")
    cl = doc.hstack(ctrl, gap=8)
    doc.icon(cl, "play_arrow", 20, t["text"])
    doc.text(cl, "00:03.42 / 00:08.00", size=12, weight="SemiBold", color=t["text"])
    doc.badge(ctrl, "SLOW MOTION 0.5x", tone(t, "neutral"))

    react = doc.hstack(sc, 20, 392, w=752, h=24, main="spaceBetween")
    doc.text(react, "เวลาตัดสินใจให้สัญญาณ (5s Reaction Window)", size=12, weight="SemiBold",
             color=t["text"])
    doc.badge(react, "เหลือ 2.4s", tone(t, "warning"), icon="timer")
    doc.progress(sc, 20, 424, 752, 48, "#FF9F0A", t["border"])

    doc.text(sc, "คำถาม: จากเหตุการณ์นี้ ในฐานะผู้ตัดสินท่านต้องให้สัญญาณใด?", x=20, y=448,
             size=14, weight="Bold", color=t["text"])
    options = [
        ("A", "ฟรีคิกทางตรง (Direct Free Kick)", "จุดเกิดเหตุอยู่ในเขตโทษฝ่ายรับ", False),
        ("B", "ฟรีคิกทางอ้อม (Indirect Free Kick)", "การขัดขาเป็นความผิดโทษโดยตรง", False),
        ("C", "การให้จุดโทษ (Penalty Kick)", "ถูกต้อง — ฟาวล์ในเขตโทษ IFAB Law 12/14", True),
        ("D", "ให้ได้เปรียบ (Advantage)", "ฝ่ายรุกเสียการครอบครองบอลทันที", False),
    ]
    for i, (key, title, sub, correct) in enumerate(options):
        ox, oy = 20 + (i % 2) * 384, 480 + (i // 2) * 112
        opt = doc.hstack(sc, ox, oy, w=368, h=96, gap=12, pad=[0, 16, 0, 16], radius=16,
                         fill=t["accent_bg"] if correct else t["surface2"],
                         stroke=t["accent"] if correct else t["border"])
        k = doc.frame(opt, 0, 0, 32, 32, fill=t["accent"] if correct else t["elevated"],
                      cornerRadius=16, layout="horizontal", mainAlign="center",
                      crossAlign="center")
        doc.text(k, key, size=13, weight="Bold", color="#FFFFFF" if correct else t["text2"])
        body = doc.vstack(opt, gap=4)
        doc.text(body, title, size=13, weight="Bold", color=t["text"] if correct else t["text2"])
        doc.text(body, sub, size=11, color=t["accent"] if correct else t["text3"])

    # ---- Right: trainee posture HUD -------------------------------------------
    hud = doc.card(f, 848, 160, 560, 332, t, name="posture-hud")
    doc.card_header(hud, 560, t, "how_to_reg", "ท่าทางผู้เรียนสด (Live Trainee Posture)")
    cam = doc.frame(hud, 20, 56, 520, 256, name="trainee-camera", fill="#0A0A0D",
                    cornerRadius=16, clip=True)
    top = doc.hstack(cam, 12, 12, w=496, h=24, main="spaceBetween")
    doc.badge(top, "LIVE", tone(t, "error"), dot=True)
    doc.badge(top, "Latency 1.18s", tone(t, "info"), icon="speed")
    tj = {
        "head": (250, 62), "neck": (250, 96), "l_sh": (215, 96), "r_sh": (285, 96),
        "r_el": (330, 134), "r_wr": (372, 172), "l_el": (205, 148), "l_wr": (200, 196),
        "l_hip": (228, 196), "r_hip": (272, 196),
    }
    tbones = [("head", "neck"), ("l_sh", "r_sh"), ("r_sh", "r_el"), ("r_el", "r_wr"),
              ("l_sh", "l_el"), ("l_el", "l_wr"), ("l_sh", "l_hip"), ("r_sh", "r_hip"),
              ("l_hip", "r_hip")]
    doc.skeleton(cam, tj, tbones, "#30D158", "#64D2FF", "#062614")
    doc.badge(cam, "ชี้ลง 44° · จุดโทษ", tone(t, "success"), icon="straighten", x=384, y=160)
    doc.badge(cam, "ตรวจพบ: PENALTY KICK · 97.2%", tone(t, "success"), icon="my_location",
              x=12, y=220)

    # ---- Right: result inspector ----------------------------------------------
    res = doc.card(f, 848, 508, 560, 360, t, fill="#082414", stroke="#30D15855", name="result-card")
    doc.card_header(res, 560, t, "check_circle", "ผลประเมินข้อนี้: ถูกต้องตาม IFAB (PASS)",
                    icon_color="#30D158", title_color="#30D158")
    panel = doc.hstack(res, 20, 56, w=520, h=84, main="spaceBetween", pad=[0, 16, 0, 16],
                       fill="#0C381F", radius=14)
    pl = doc.vstack(panel, gap=2)
    doc.text(pl, "คะแนนภาคปฏิบัติ", size=11, color="#A6F4C5")
    doc.text(pl, "92 / 100", size=28, weight="Bold", color="#30D158")
    pr = doc.vstack(panel, gap=4, cross="max")
    doc.text(pr, "เวลาตอบสนอง 1.18 วินาที", size=11, weight="SemiBold", color="#F5F5F7")
    doc.text(pr, "ค้างสัญญาณ 1.8 วินาที", size=11, color="#A6F4C5")
    doc.text(pr, "เกรด A+ (ยอดเยี่ยม)", size=11, weight="Bold", color="#FF9F0A")
    checks = doc.vstack(res, 20, 156, gap=10)
    for item in ("คำตัดสินถูกต้องตาม IFAB Law 12 & 14",
                 "ชี้แขนลง 44° ตรงไปยังจุดโทษ",
                 "ค้างสัญญาณนิ่งเกิน 1.5 วินาที",
                 "ความเสถียรข้อต่อแขน 95.4%"):
        r = doc.hstack(checks, gap=8)
        doc.icon(r, "check_circle", 16, "#30D158")
        doc.text(r, item, size=12, color="#E5F9EC")
    btns = doc.hstack(res, 20, 296, w=520, h=44, gap=16)
    doc.button(btns, "ดู Replay", "#1C1C1E", "#F5F5F7", w=252, h=44, icon="refresh",
               border="#38383A")
    doc.button(btns, "ข้อถัดไป (2/5)", "#30D158", "#000000", w=252, h=44, icon="play_arrow")


# ==============================================================================
# SCREEN 3 — IFAB Digital Learning Handbook (/handbook)
# ==============================================================================
def signal_figure(doc, parent, cx, cy, arm, color):
    """Stick-figure thumbnail: body, head and the signalling arm(s)."""
    doc.line(doc_parent := parent, cx, cy - 8, cx, cy + 36, "#334155", weight=3)
    doc.ellipse(doc_parent, cx - 8, cy - 26, 16, 16, fill=color)
    sx, sy = cx, cy - 2
    ends = {
        "horizontal": [(cx + 38, sy)],
        "vertical": [(cx + 4, sy - 40)],
        "down45": [(cx + 30, sy + 28)],
        "both45": [(cx + 32, sy + 16), (cx - 32, sy + 16)],
        "up45": [(cx + 30, sy - 26)],
        "tv": [(cx + 24, sy - 10), (cx - 24, sy - 10)],
    }[arm]
    for ex, ey in ends:
        doc.line(parent, sx, sy, ex, ey, "#0891B2", weight=3)


def build_handbook(doc, f):
    t = LIGHT
    header(doc, f, t, 2, "อัศวิน · Level 2")
    actions = title_bar(doc, f, t, "คลังสื่อการสอนสัญญาณผู้ตัดสิน 20 ท่า (IFAB Curriculum)",
                        "คู่มือมาตรฐาน International Football Association Board · Laws of the Game 2025/26")
    doc.badge(actions, "อัปเดต 2025/26", tone(t, "info"), icon="menu_book")

    search = doc.hstack(f, 32, 160, w=904, h=44, gap=10, pad=[0, 14, 0, 14], radius=12,
                        fill=t["surface"], stroke=t["border"], name="search")
    doc.icon(search, "search", 20, t["text3"])
    doc.text(search, "ค้นหาท่าสัญญาณ กติกา หรือคำสำคัญ (เช่น ฟรีคิก, ล้ำหน้า, จุดโทษ)",
             size=13, color=t["text3"])

    tabs = doc.hstack(f, 32, 220, h=36, gap=4, pad=[3, 3, 3, 3], radius=12,
                      fill=t["surface2"], stroke=t["border"], name="category-tabs")
    for i, label in enumerate(("ทั้งหมด (20)", "ลูกตั้งเตะ (6)", "การทำฟาวล์ (5)",
                               "การควบคุมเกม (5)", "การล้ำหน้า (4)")):
        active = i == 0
        pill = doc.hstack(tabs, h=30, pad=[0, 14, 0, 14], radius=9,
                          fill=t["surface"] if active else "none",
                          stroke=t["border"] if active else None)
        doc.text(pill, label, size=12, weight="SemiBold" if active else "Medium",
                 color=t["accent"] if active else t["text2"])

    cards = [
        ("Law 13", "ฟรีคิกทางตรง", "Direct Free Kick", "horizontal", "แขน 90°", "Hold 1.2s"),
        ("Law 13", "ฟรีคิกทางอ้อม", "Indirect Free Kick", "vertical", "แขน 180°", "จนบอลถูกเล่น"),
        ("Law 14", "การให้จุดโทษ", "Penalty Kick", "down45", "ชี้ลง 45°", "Hold 1.5s"),
        ("Law 5", "สัญญาณได้เปรียบ", "Advantage", "both45", "2 แขน 45°", "กวาดไปข้างหน้า"),
        ("Law 17", "การเตะมุม", "Corner Kick", "up45", "ชี้ธงมุม 45°", "Hold 1.2s"),
        ("Law 5", "สัญญาณตรวจ VAR", "VAR Review Signal", "tv", "วาดกรอบ TV", "2 รอบ"),
    ]
    for i, (law, th, en, arm, m1, m2) in enumerate(cards):
        active = i == 1
        x, y = 32 + (i % 3) * 309, 268 + (i // 3) * 312
        c = doc.card(f, x, y, 286, 288, t, stroke=t["accent"] if active else t["border"],
                     radius=20, name=f"signal-card/{en}")
        doc.badge(c, law, tone(t, "info"), icon="menu_book", x=16, y=16)
        thumb = doc.frame(c, 16, 48, 254, 100, fill=t["surface2"], stroke=t["border"],
                          strokeWeight=1, cornerRadius=12, clip=True)
        signal_figure(doc, thumb, 127, 54, arm, t["accent"])
        doc.text(c, th, x=16, y=160, size=14, weight="Bold", color=t["text"])
        doc.text(c, en, x=16, y=182, size=11, color=t["text2"])
        metrics = doc.hstack(c, 16, 206, gap=14)
        for ic, label in (("straighten", m1), ("schedule", m2)):
            m = doc.hstack(metrics, gap=4)
            doc.icon(m, ic, 14, t["accent"])
            doc.text(m, label, size=11, color=t["text2"])
        if active:
            doc.button(c, "เริ่มฝึกซ้อมท่านี้", t["accent"], "#FFFFFF", x=16, y=240, w=254,
                       h=32, icon="videocam", size=12)
        else:
            doc.button(c, "เริ่มฝึกซ้อมท่านี้", t["surface2"], t["text"], x=16, y=240, w=254,
                       h=32, icon="videocam", size=12)

    # ---- Deep-dive drawer (x=960 w=448) -----------------------------------------
    d = doc.card(f, 960, 160, 448, 708, t, name="deep-dive-drawer")
    doc.rect(d, 206, 10, 36, 4, fill=t["border"], cornerRadius=2)
    doc.badge(d, "IFAB LAW 13 · DEEP DIVE", tone(t, "info"), icon="menu_book", x=24, y=24)
    doc.text(d, "ท่าที่ 2: ฟรีคิกทางอ้อม (Indirect Free Kick)", x=24, y=58, size=16,
             weight="Bold", color=t["text"])
    doc.text(d, "Official Instructional Guideline for Referees", x=24, y=84, size=12,
             color=t["text2"])

    dia = doc.frame(d, 24, 112, 400, 176, fill=t["surface2"], stroke=t["border"],
                    strokeWeight=1, cornerRadius=16, clip=True, name="anatomy-diagram")
    tol = doc.hstack(dia, 12, 12, w=376, h=24, main="max")
    doc.badge(tol, "ช่วงที่ยอมรับ 170° – 180°", tone(t, "success"), icon="straighten")
    doc.line(dia, 200, 80, 200, 24, "#007AFF80", weight=2, dashes=[5, 4])
    doc.line(dia, 200, 70, 200, 150, "#3A3A3C", weight=4)
    doc.ellipse(dia, 190, 44, 20, 20, fill=t["accent"])
    doc.line(dia, 200, 80, 206, 26, "#007AFF", weight=4)
    doc.ellipse(dia, 202, 22, 8, 8, fill="#34C759")

    crit = doc.vstack(d, 24, 308, w=400, gap=12, name="criteria")
    doc.text(crit, "เกณฑ์มาตรฐานตามกติกา (IFAB Criteria)", size=13, weight="Bold",
             color=t["text"])
    for title, val in (("มุมยกแขน (Shoulder Elevation)", "180° ชูตรงขนานศีรษะ"),
                       ("ความเหยียดศอก (Elbow Straightness)", "มากกว่า 165° ห้ามงอศอก"),
                       ("แขนที่ใช้ (Active Arm)", "ข้างใดข้างหนึ่ง (แนะนำข้างถนัด)"),
                       ("ระยะเวลาค้าง (Hold Duration)", "จนกว่าบอลจะถูกเล่นหรือบอลตาย")):
        item = doc.vstack(crit, gap=2)
        doc.text(item, title, size=12, weight="SemiBold", color=t["text"])
        doc.text(item, val, size=12, color=t["accent"])

    e_bg, e_fg, e_bd = tone(t, "error")
    box = doc.hstack(d, 24, 552, w=400, h=72, gap=12, pad=[0, 16, 0, 16], cross="center",
                     fill=e_bg, radius=14, stroke=e_bd, name="common-mistakes")
    doc.icon(box, "warning", 20, e_fg)
    bt = doc.vstack(box, gap=4)
    doc.text(bt, "ข้อผิดพลาดที่พบบ่อย (Common Mistakes)", size=12, weight="Bold", color=e_fg)
    doc.text(bt, "ลดแขนก่อนบอลถูกเล่น · งอศอกทำให้สัญญาณไม่ชัดเจน", size=11, color=e_fg)

    doc.button(d, "เริ่มฝึกท่านี้ใน Live Studio", t["accent"], "#FFFFFF", x=24, y=636,
               w=400, h=48, icon="videocam", size=14)


# ==============================================================================
# SCREEN 4 — Trainee Performance Gradebook (/gradebook)
# ==============================================================================
def build_gradebook(doc, f):
    t = LIGHT
    header(doc, f, t, 3, "อัศวิน พิทักษ์ธรรม · REF-2026-092")
    actions = title_bar(doc, f, t, "สมุดบันทึกผลการประเมินผู้เรียน (Trainee Gradebook)",
                        "สถิติการฝึกภาคปฏิบัติและผลสอบสถานการณ์จำลองตามเกณฑ์ IFAB · หลักสูตร Class 3")
    doc.button(actions, "ดาวน์โหลด PDF", t["surface"], t["text"], h=40, icon="download",
               border=t["border"])
    doc.button(actions, "ดูใบรับรองผล", t["accent"], "#FFFFFF", h=40, icon="school")

    stats = [
        ("monitoring", "#007AFF", "#EAF5FF", "ความแม่นยำรวม (Overall Accuracy)", "88.4%",
         "+4.2% จากสัปดาห์ก่อน", "#1E8E3E"),
        ("quiz", "#34C759", "#EAFBF0", "ชุดข้อสอบที่ผ่าน (Passed)", "24 / 28",
         "อัตราผ่าน 85.7%", "#6E6E73"),
        ("speed", "#5856D6", "#EFEFFE", "เวลาตอบสนองเฉลี่ย (Reaction)", "1.35s",
         "เร็วกว่าเกณฑ์ 0.65s", "#1E8E3E"),
        ("school", "#AF52DE", "#F7ECFD", "ระดับสมรรถนะ (Competency)", "Class 3",
         "พร้อมสอบภาคสนามจริง", "#6E6E73"),
    ]
    for i, (ic, col, tint, title, value, sub, sub_col) in enumerate(stats):
        c = doc.card(f, 32 + i * 350, 160, 326, 112, t, radius=20, name=f"stat/{value}")
        tile = doc.frame(c, 20, 20, 40, 40, fill=tint, cornerRadius=12, layout="horizontal",
                         mainAlign="center", crossAlign="center")
        doc.icon(tile, ic, 22, col)
        doc.text(c, title, x=72, y=20, size=11, weight="Medium", color=t["text2"])
        doc.text(c, value, x=72, y=36, size=24, weight="Bold", color=t["text"])
        doc.text(c, sub, x=20, y=80, size=11, weight="Medium", color=sub_col)

    # ---- Radar card -----------------------------------------------------------
    rc = doc.card(f, 32, 296, 676, 276, t, radius=20, name="radar-card")
    doc.card_header(rc, 676, t, "monitoring", "สมรรถนะ 4 มิติ (Competency Radar)",
                    right=[("เกณฑ์ IFAB 80%", tone(t, "warning"))])
    cx, cy, r = 160, 164, 76
    for step in (0.25, 0.5, 0.75, 1.0):
        rr = r * step
        doc.path(rc, f"M {cx} {cy - rr} L {cx + rr} {cy} L {cx} {cy + rr} L {cx - rr} {cy} Z",
                 stroke=t["border"], weight=1)
    tr = r * 0.8
    doc.path(rc, f"M {cx} {cy - tr} L {cx + tr} {cy} L {cx} {cy + tr} L {cx - tr} {cy} Z",
             stroke="#FF9500", weight=1.5, dashes=[4, 3], name="ifab-target")
    doc.line(rc, cx, cy - r, cx, cy + r, t["border"], weight=1)
    doc.line(rc, cx - r, cy, cx + r, cy, t["border"], weight=1)
    vals = [92, 84, 76, 90]  # top, right, bottom, left
    vt, vr, vb, vl = [v / 100 * r for v in vals]
    doc.path(rc, f"M {cx} {cy - vt} L {cx + vr} {cy} L {cx} {cy + vb} L {cx - vl} {cy} Z",
             fill="#007AFF29", stroke=t["accent"], weight=2, name="trainee-polygon")
    for px, py in ((cx, cy - vt), (cx + vr, cy), (cx, cy + vb), (cx - vl, cy)):
        doc.ellipse(rc, px - 4, py - 4, 8, 8, fill=t["accent"], stroke="#FFFFFF", strokeWeight=1.5)
    doc.text(rc, "ลูกตั้งเตะ", x=cx - 50, y=cy - r - 20, width=100, align="center", size=11,
             weight="SemiBold", color=t["text"])
    doc.text(rc, "ควบคุมเกม", x=cx - 50, y=cy + r + 6, width=100, align="center", size=11,
             weight="SemiBold", color=t["text"])
    doc.text(rc, "ล้ำหน้า", x=8, y=cy - 8, width=68, align="right", size=11,
             weight="SemiBold", color=t["text"])
    doc.text(rc, "ฟาวล์", x=cx + r + 8, y=cy - 8, size=11, weight="SemiBold", color=t["text"])

    legend = [("ลูกตั้งเตะ (Restarts)", 92, "#007AFF"),
              ("การทำฟาวล์ (Fouls)", 84, "#34C759"),
              ("การควบคุมเกม (Game Control)", 76, "#FF9500"),
              ("การล้ำหน้า (Offside)", 90, "#5856D6")]
    for i, (label, pct, col) in enumerate(legend):
        ly = 64 + i * 48
        row = doc.hstack(rc, 328, ly, w=328, h=16, main="spaceBetween")
        lg = doc.hstack(row, gap=8)
        doc.ellipse(lg, 0, 0, 8, 8, fill=col)
        doc.text(lg, label, size=12, weight="SemiBold", color=t["text"])
        doc.text(row, f"{pct}%", size=12, weight="Bold", color=col)
        doc.progress(rc, 328, ly + 24, 328, pct, col, t["surface2"], h=6)

    # ---- Diagnostics card -----------------------------------------------------
    dc = doc.card(f, 732, 296, 676, 276, t, radius=20, name="diagnostics-card")
    doc.card_header(dc, 676, t, "lightbulb", "วินิจฉัยจุดอ่อนรายบุคคล (AI Action Plan)",
                    icon_color="#FF9500")
    alerts = [
        ("error", "warning", "#FF3B30", "สัญญาณได้เปรียบ: กางแขนแคบเกินไป (32° จากเกณฑ์ 45°)",
         "ผู้เล่นอาจมองไม่เห็นสัญญาณในจังหวะเกมสวนกลับเร็ว"),
        ("warning", "schedule", "#FF9500", "ฟรีคิกทางอ้อม: ค้างสัญญาณสั้นกว่าเกณฑ์ (0.8s จาก 1.5s)",
         "ชูแขนค้างไว้จนกว่าบอลจะถูกเล่น อย่าลดแขนทันทีหลังเป่านกหวีด"),
    ]
    for i, (tn, ic, icol, title, desc) in enumerate(alerts):
        bg, fg, bd = tone(t, tn)
        a = doc.hstack(dc, 20, 56 + i * 76, w=636, h=64, gap=12, pad=[0, 16, 0, 16],
                       fill=bg, radius=14, stroke=bd)
        doc.icon(a, ic, 20, icol)
        body = doc.vstack(a, gap=4)
        doc.text(body, title, size=12, weight="Bold", color=fg)
        doc.text(body, desc, size=11, color=fg)
    doc.button(dc, "เข้าห้องฝึกซ้อมเพื่อแก้ไขจุดอ่อน 2 ข้อนี้", t["accent"], "#FFFFFF",
               x=20, y=212, w=636, h=44, icon="videocam")

    # ---- History table --------------------------------------------------------
    tc = doc.card(f, 32, 596, 1376, 272, t, radius=20, name="history-table")
    doc.card_header(tc, 1376, t, "quiz", "ประวัติผลการประเมินล่าสุด (Recent Assessment Sessions)",
                    right=[("5 รายการล่าสุด", tone(t, "neutral"))])
    cols = [16, 176, 336, 776, 896, 1036, 1228]
    thead = doc.frame(tc, 20, 52, 1336, 32, fill=t["surface2"], cornerRadius=8)
    for cx_, label in zip(cols, ("รหัสเซสชัน", "วันที่ - เวลา", "ชุดแบบฝึก / ข้อสอบ",
                                 "คะแนน", "เวลาตอบสนอง", "ผลประเมิน", "การกระทำ")):
        doc.text(thead, label, x=cx_, y=9, size=11, weight="SemiBold", color=t["text2"])
    rows = [
        ("EXAM-2026-104", "15 พ.ย. 2026 · 11:20", "ชุดข้อสอบ Law 12: ฟาวล์ในเขตโทษ", "92", "1.18s", "ผ่าน (A+)", "success"),
        ("DRILL-2026-098", "14 พ.ย. 2026 · 16:45", "ฝึกซ้อมสด: ฟรีคิกทางอ้อม (Law 13)", "94", "1.05s", "ผ่าน (A+)", "success"),
        ("DRILL-2026-089", "14 พ.ย. 2026 · 10:15", "ฝึกซ้อมสด: สัญญาณได้เปรียบ", "74", "1.82s", "ปรับปรุง (C)", "warning"),
        ("EXAM-2026-075", "12 พ.ย. 2026 · 14:30", "ชุดข้อสอบ Law 11: จังหวะล้ำหน้า", "88", "1.25s", "ผ่าน (A)", "success"),
        ("DRILL-2026-064", "10 พ.ย. 2026 · 09:00", "ฝึกซ้อมสด: การให้จุดโทษ (Law 14)", "90", "1.20s", "ผ่าน (A)", "success"),
    ]
    for i, (sid, date, module, sc, lat, status, tn) in enumerate(rows):
        row = doc.frame(tc, 20, 88 + i * 34, 1336, 34,
                        fill=t["surface2"] if i % 2 else "none", cornerRadius=8)
        doc.text(row, sid, x=cols[0], y=9, size=12, weight="Medium", color=t["text"])
        doc.text(row, date, x=cols[1], y=9, size=12, color=t["text2"])
        doc.text(row, module, x=cols[2], y=9, size=12, weight="Medium", color=t["text"])
        doc.text(row, f"{sc} / 100", x=cols[3], y=9, size=12, weight="Bold", color=t["accent"])
        doc.text(row, lat, x=cols[4], y=9, size=12, color=t["text2"])
        doc.badge(row, status, tone(t, tn), icon="check_circle" if tn == "success" else "warning",
                  x=cols[5], y=6)
        doc.button(row, "ดูผลตรวจ", t["surface"], t["accent"], x=cols[6], y=5, w=92, h=24,
                   border=t["border"], size=11, radius=8)


# ==============================================================================
# SCREEN 5 — Google Material Symbols asset library
# ==============================================================================
def build_icon_library(doc, f):
    t = DARK
    head = doc.hstack(f, 0, 0, w=1440, h=64, main="spaceBetween", pad=[0, 32, 0, 32],
                      fill=t["surface"])
    logo = doc.hstack(head, gap=10)
    doc.icon(logo, "sports_soccer", 26, t["accent"])
    doc.text(logo, "Referee Academy AI · Design Tokens", size=17, weight="Bold", color=t["text"])
    doc.badge(head, "Apple HIG · Google Material SVG", tone(t, "accent"))
    doc.rect(f, 0, 63, 1440, 1, fill=t["border"])
    title_bar(doc, f, t, "คลังไอคอน Google Material Symbols (SVG)",
              "ชุดเดียวกับ Front_End/src/UI_Components/Common/Google_Icon.tsx · viewBox 24×24")

    groups = [
        ("Navigation & Portal", ["sports_soccer", "menu_book", "quiz", "monitoring", "school"]),
        ("Video & Vision Engine", ["videocam", "videocam_off", "crop_free", "flip", "refresh", "play_arrow"]),
        ("Tactical & Tagging", ["my_location", "person", "group", "how_to_reg", "straighten"]),
        ("Scores & Metrics", ["check_circle", "warning", "bolt", "schedule", "timer", "speed"]),
        ("Actions & Helpers", ["search", "download", "emoji_events", "lightbulb"]),
    ]
    for gi, (gname, names) in enumerate(groups):
        c = doc.card(f, 32, 160 + gi * 144, 1376, 132, t, radius=20, name=f"group/{gname}")
        doc.text(c, f"{gname} · {len(names)} icons", x=20, y=16, size=13, weight="Bold",
                 color="#64D2FF")
        tiles = doc.hstack(c, 20, 48, gap=12)
        for name in names:
            tile = doc.hstack(tiles, w=200, h=64, gap=12, pad=[0, 14, 0, 14], radius=12,
                              fill=t["surface2"], stroke=t["border"])
            doc.icon(tile, name, 28, t["accent"])
            lab = doc.vstack(tile, gap=2)
            doc.text(lab, name, size=12, weight="Bold", color=t["text"])
            doc.text(lab, "Material Symbol", size=10, color=t["text3"])


# ==============================================================================
# MAIN
# ==============================================================================
SCREENS = [
    ("Screen1_Live_Drills", DARK, build_drills),
    ("Screen2_Scenario_Exam", DARK, build_exam),
    ("Screen3_IFAB_Handbook", LIGHT, build_handbook),
    ("Screen4_Trainee_Gradebook", LIGHT, build_gradebook),
    ("Google_Font_Icons_Asset_Library", DARK, build_icon_library),
]


def run(cmd):
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    if res.returncode != 0:
        print("ERROR:", " ".join(cmd), "\n", res.stderr or res.stdout)
        sys.exit(1)
    return res.stdout


def verify_ids(stdout, expected):
    """Fail loudly if FigCraft's ids drifted from the predicted ones —
    every parent reference in the script depends on them."""
    actual = []
    for line in stdout.splitlines():
        line = line.strip()
        if line.startswith("{"):
            data = json.loads(line)
            if not data.get("ok"):
                print("ERROR: step failed:", line)
                sys.exit(1)
            if isinstance(data.get("result"), dict) and "id" in data["result"]:
                actual.append(data["result"]["id"])
    if actual != expected:
        first = next((i for i, (a, e) in enumerate(zip(actual, expected)) if a != e), None)
        print(f"ERROR: node id drift at step {first} (expected {len(expected)} ids, got {len(actual)})")
        sys.exit(1)


def main():
    doc = FigCraftDoc()
    frames = [doc.frame(None, i * 1540, 0, 1440, 900, name=name, fill=theme["bg"], clip=True)
              for i, (name, theme, _) in enumerate(SCREENS)]
    for frame_id, (name, _, builder) in zip(frames, SCREENS):
        print(f"Building {name} (frame {frame_id})...")
        builder(doc, frame_id)

    script_path = SCRIPTS_DIR / "figcraft_commands.json"
    script_path.write_text(json.dumps(doc.commands, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Wrote {len(doc.commands)} commands -> {script_path.name}")

    out = DOCS_FIGCRAFT / "Referee_Academy_UI.figcraft"
    stdout = run([FIGCRAFT_CLI, "run", str(script_path), "--out", str(out)])
    verify_ids(stdout, doc.expected_ids)
    print("Node ids verified.")

    RENDERS_DIR.mkdir(exist_ok=True)
    print(run([FIGCRAFT_CLI, "export", "--out", str(RENDERS_DIR), str(out)]))
    print(run([FIGCRAFT_CLI, "info", str(out)]))


if __name__ == "__main__":
    main()
