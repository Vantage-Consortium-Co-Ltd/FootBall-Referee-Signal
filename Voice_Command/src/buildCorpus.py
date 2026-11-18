"""สร้างคลังประโยคดิบ (ก่อน augment) คลาสละ PER_CLASS ประโยค

ต่อคลาส = ประโยคสถานการณ์ที่เขียนมือทั้งหมด + ประโยคจากแม่แบบ x ชื่อท่า (สุ่มแบบกระจายให้ทุกชื่อท่าถูกใช้)
"""
import random
import re

from seedData import CLASSES, TEMPLATES

PER_CLASS = 50          # จำนวนประโยคต่อคลาส
MAX_PER_TEMPLATE = 3    # แม่แบบเดียวใช้ได้ไม่เกินกี่ครั้งต่อคลาส กันประโยคซ้ำโครงเดียวกันเยอะเกิน
_LATIN_RE = re.compile(r"[a-zA-Z]")


def fill(template, alias):
    """แทนชื่อท่าลงแม่แบบ ถ้าเป็นภาษาอังกฤษให้เว้นวรรครอบคำ (คนไทยพิมพ์แบบนี้)"""
    x = f" {alias} " if _LATIN_RE.search(alias) else alias
    return re.sub(r"\s+", " ", template.format(x=x)).strip()


def build(seed):
    rng = random.Random(seed)
    rows = []
    for cid, c in enumerate(CLASSES):
        picked, seen = [], set()

        def add(text, style, alias, template):
            if text not in seen:
                seen.add(text)
                picked.append({"text": text, "label": c["label"], "label_id": cid, "vision_class_id": c["vision_id"],
                               "style": style, "alias": alias, "template": template})

        for s in c["situations"]:
            add(s, "situation", "", "")

        combos = [(style, a, t) for style, al in c["aliases"].items() for a in al for t in TEMPLATES]
        rng.shuffle(combos)
        used_alias, used_tpl = set(), {}
        # รอบแรก: ให้ทุกชื่อท่าได้ออกอย่างน้อย 1 ครั้ง / รอบสอง: เติมให้ครบ
        for first_pass in (True, False):
            for style, a, t in combos:
                if len(picked) >= PER_CLASS:
                    break
                if (first_pass and a in used_alias) or used_tpl.get(t, 0) >= MAX_PER_TEMPLATE:
                    continue
                before = len(picked)
                add(fill(t, a), style, a, t)
                if len(picked) > before:
                    used_alias.add(a)
                    used_tpl[t] = used_tpl.get(t, 0) + 1
        assert len(picked) == PER_CLASS, f"{c['label']}: ได้ {len(picked)} ประโยค"
        rows.extend(picked)
    return rows
