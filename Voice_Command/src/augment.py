"""Data augmentation สำหรับชุด train เท่านั้น

วิธีที่ใช้ (สุ่มเลือก 1-2 วิธีต่อประโยค)
- spelling : เปลี่ยนตัวสะกดคำทับศัพท์ (คำพ้องรูป/สะกดต่าง) เช่น เช็ค->เช็ก, ฟรีคิก->ฟรีคิค
- synonym  : แทนคำพ้องความหมายของคำสั่ง เช่น ฝึก->ซ้อม, กรรมการ->ผู้ตัดสิน
- alias    : สลับชื่อท่าเป็นชื่ออื่นของคลาสเดียวกัน (ทางการ/ภาษาพูด/ทับศัพท์/อังกฤษ)
- spoken   : เติมคำลงท้าย/คำขึ้นต้นสำนวนพูด เช่น ครับ, นะ, เอ่อ, รบกวน
"""
import random

from buildCorpus import fill
from seedData import CLASSES
from textUtils import tokenize

# ตัวสะกดต่างของคำเดียวกัน (แทนระดับ token)
SPELLING = [
    {"เช็ค", "เช็ก"}, {"ฟรีคิก", "ฟรีคิค", "ฟรีคิ๊ก"}, {"แฮนด์บอล", "แฮนบอล"}, {"ออฟไซด์", "ออฟไซ"},
    {"เพนัลตี้", "เพนนัลตี้"}, {"ไดเร็ก", "ไดเร็ค", "ไดเรกต์"}, {"อินไดเร็ก", "อินไดเร็ค", "อินไดเรกต์"},
    {"คอร์เนอร์", "คอนเนอร์"}, {"โกล", "โกว์"}, {"ไทม์เอาท์", "ไทม์เอาต์", "ไทม์เอ้าท์"}, {"เยลโล่", "เยลโลว์"},
    {"เรด", "เร็ด"}, {"พุชชิ่ง", "พุชชิง"}, {"ทริปปิ้ง", "ทริปปิง"}, {"คิกกิ้ง", "คิกกิง"}, {"จัมปิ้ง", "จั๊มปิ้ง"},
    {"ยังไง", "ยังงัย", "ไง"},
]
SPELLING_MAP = {w: sorted(g - {w}) for g in SPELLING for w in g}

# คำพ้องความหมายของคำสั่ง (แทนระดับ token, ไม่แตะชื่อท่า)
SYNONYMS = {
    "ฝึก": ["ซ้อม", "หัด", "ลองฝึก"], "ซ้อม": ["ฝึก", "ฝึกซ้อม"], "สอน": ["บอกวิธี", "อธิบาย", "แนะนำ"],
    "เช็ค": ["ตรวจ", "เช็คดู"], "ตรวจ": ["เช็ค", "ตรวจสอบ"], "แสดง": ["โชว์", "เปิด"], "ดู": ["ดูหน่อย", "เห็น"],
    "อยาก": ["อยากจะ", "ต้องการ"], "ขอ": ["รบกวนขอ", "อยากได้"], "สัญญาณ": ["ซิกแนล", "สัญญาณมือ"],
    "ท่า": ["ท่าทาง", "ท่ามือ"], "กรรมการ": ["ผู้ตัดสิน", "รีฟ", "ผู้ชี้ขาด"], "ผู้เล่น": ["นักเตะ", "นักฟุตบอล"],
    "นักเตะ": ["ผู้เล่น", "นักบอล"], "คู่แข่ง": ["ฝ่ายตรงข้าม", "อีกทีม"], "ยังไง": ["อย่างไร", "แบบไหน"],
    "ไหน": ["อะไร", "แบบไหน"], "เริ่ม": ["เปิด", "เริ่มต้น"], "ลอง": ["ทดลอง", "ขอลอง"], "หน่อย": ["ให้หน่อย", "ที"],
    "practice": ["train", "drill"], "show": ["teach"],
}

SUFFIXES = ["ครับ", "ค่ะ", "นะ", "หน่อย", "จ้า", "เลย", "ทีครับ", "หน่อยนะคะ", "ได้ไหม", "ด่วนๆ"]
PREFIXES = ["เอ่อ ", "รบกวน", "ขอโทษนะครับ ", "โค้ชครับ ", "สวัสดีครับ ", "ok ", "เอาล่ะ "]
_ALIASES = {c["label"]: [(s, a) for s, al in c["aliases"].items() for a in al] for c in CLASSES}


def _swap_tokens(text, table, rng):
    toks = tokenize(text)
    idx = [i for i, t in enumerate(toks) if t in table]
    if not idx:
        return None
    i = rng.choice(idx)
    toks[i] = rng.choice(table[toks[i]])
    # ภาษาไทยไม่เว้นวรรค แต่คำอังกฤษต้องมีช่องว่างคั่น
    out = ""
    for t in toks:
        out += (" " if out and (t[0].isascii() or out[-1].isascii()) else "") + t
    return out


def _alias(row, rng):
    if not row["alias"]:
        return None
    others = [a for _, a in _ALIASES[row["label"]] if a != row["alias"]]
    return fill(row["template"], rng.choice(others))


def _spoken(text, rng):
    if rng.random() < 0.6:
        if text.endswith(("ครับ", "ค่ะ", "คะ")):
            return None
        sfx = rng.choice([s for s in SUFFIXES if not text.endswith(s)])
        return f"{text} {sfx}" if text[-1].isascii() else text + sfx
    return (rng.choice(PREFIXES) + text).strip()


METHODS = {
    "spelling": lambda r, t, rng: _swap_tokens(t, SPELLING_MAP, rng),
    "synonym": lambda r, t, rng: _swap_tokens(t, SYNONYMS, rng),
    "alias": lambda r, t, rng: _alias(r, rng) if t == r["text"] else None,  # ต้องทำก่อนวิธีอื่น
    "spoken": lambda r, t, rng: _spoken(t, rng),
}
ORDER = ["alias", "spelling", "synonym", "spoken"]


def augment_rows(rows, n_per_row, blocked, seed):
    """สร้าง n_per_row ประโยคใหม่ต่อแถว; blocked = ข้อความ (clean แล้ว) ที่ห้ามซ้ำ เช่น val/test กันข้อมูลรั่ว"""
    from textUtils import clean_text
    rng = random.Random(seed)
    seen = set(blocked) | {clean_text(r["text"]) for r in rows}
    out = []
    for r in rows:
        made, tries = 0, 0
        while made < n_per_row and tries < 20:
            tries += 1
            methods = sorted(rng.sample(ORDER, rng.choice([1, 2])), key=ORDER.index)
            text, applied = r["text"], []
            for m in methods:
                new = METHODS[m](r, text, rng)
                if new:
                    text, applied = new, applied + [m]
            key = clean_text(text)
            if not applied or key in seen:
                continue
            seen.add(key)
            out.append({**r, "text": text, "source": "augmented", "aug_method": "+".join(applied)})
            made += 1
    return out
