"""Pipeline ชุดข้อมูลคำสั่งเสียงภาษาไทย 20 ท่าสัญญาณผู้ตัดสิน

build corpus -> split 80/10/10 (stratified ต่อคลาส) -> augment เฉพาะ train -> ตัดคำ + ลบ stopword
-> บันทึก CSV/JSON -> สรุปสถิติ

รัน:  python Voice_Command/src/main.py
"""
import csv
import json
import random
from collections import Counter
from pathlib import Path

from augment import augment_rows
from buildCorpus import PER_CLASS, build
from seedData import CLASSES
from textUtils import clean_text, remove_stopwords, tokenize

SEED = 42
RATIOS = {"train": 0.8, "val": 0.1, "test": 0.1}
AUG_PER_ROW = 2          # จำนวนประโยค augment ต่อประโยค train 1 ประโยค
ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "data" / "processed"
FIELDS = ["id", "text", "text_clean", "tokens", "tokens_nostop", "label", "label_id", "vision_class_id",
          "style", "source", "aug_method"]


def split(rows, seed):
    """แบ่งต่อคลาส ให้ทุกคลาสมีสัดส่วน 80/10/10 เท่ากัน"""
    rng = random.Random(seed)
    out = {k: [] for k in RATIOS}
    by_class = {}
    for r in rows:
        by_class.setdefault(r["label_id"], []).append(r)
    for items in by_class.values():
        items = items[:]
        rng.shuffle(items)
        n_val, n_test = round(len(items) * RATIOS["val"]), round(len(items) * RATIOS["test"])
        out["val"] += items[:n_val]
        out["test"] += items[n_val:n_val + n_test]
        out["train"] += items[n_val + n_test:]
    return out


def preprocess(r):
    toks = tokenize(r["text"])
    return {**r, "text_clean": clean_text(r["text"]), "tokens": toks, "tokens_nostop": remove_stopwords(toks)}


def save(name, rows):
    with open(OUT_DIR / f"{name}.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({**r, "tokens": "|".join(r["tokens"]), "tokens_nostop": "|".join(r["tokens_nostop"])})
    with open(OUT_DIR / f"{name}.json", "w", encoding="utf-8") as f:
        json.dump([{k: r[k] for k in FIELDS} for r in rows], f, ensure_ascii=False, indent=1)


def stats(splits):
    labels = [c["label"] for c in CLASSES]
    s = {"seed": SEED, "per_class_original": PER_CLASS, "aug_per_row": AUG_PER_ROW, "splits": {}}
    vocab_all, vocab_ns = set(), set()
    for name, rows in splits.items():
        v, vns = {t for r in rows for t in r["tokens"]}, {t for r in rows for t in r["tokens_nostop"]}
        vocab_all |= v
        vocab_ns |= vns
        s["splits"][name] = {
            "total": len(rows),
            "original": sum(r["source"] == "original" for r in rows),
            "augmented": sum(r["source"] == "augmented" for r in rows),
            "class_distribution": {l: sum(r["label"] == l for r in rows) for l in labels},
            "style_distribution": dict(Counter(r["style"] for r in rows if r["source"] == "original")),
            "aug_methods": dict(Counter(r["aug_method"] for r in rows if r["aug_method"])),
            "vocab_size": len(v), "vocab_size_nostop": len(vns),
            "avg_tokens": round(sum(len(r["tokens"]) for r in rows) / len(rows), 2),
            "avg_tokens_nostop": round(sum(len(r["tokens_nostop"]) for r in rows) / len(rows), 2),
        }
    train_v = {t for r in splits["train"] for t in r["tokens_nostop"]}
    for name in ("val", "test"):
        toks = [t for r in splits[name] for t in r["tokens_nostop"]]
        s["splits"][name]["oov_rate_vs_train"] = round(sum(t not in train_v for t in toks) / len(toks), 4)
    s["vocab_size_total"], s["vocab_size_total_nostop"] = len(vocab_all), len(vocab_ns)
    s["top_tokens_per_class"] = {
        l: [t for t, _ in Counter(t for r in splits["train"] if r["label"] == l for t in r["tokens_nostop"]).most_common(6)]
        for l in labels}
    return s


def stats_md(s):
    sp = s["splits"]
    L = ["# สถิติชุดข้อมูลคำสั่งเสียง (Voice Command Corpus)", "",
         f"seed = {s['seed']} · ต้นฉบับ {s['per_class_original']} ประโยค/คลาส · augment {s['aug_per_row']} ประโยค/ประโยค train", "",
         "## ภาพรวม", "", "| split | ทั้งหมด | ต้นฉบับ | augmented | vocab | vocab (ไม่รวม stopword) | token เฉลี่ย | OOV เทียบ train |",
         "|---|---:|---:|---:|---:|---:|---:|---:|"]
    for n, d in sp.items():
        L.append(f"| {n} | {d['total']} | {d['original']} | {d['augmented']} | {d['vocab_size']} | {d['vocab_size_nostop']} "
                 f"| {d['avg_tokens']} | {d.get('oov_rate_vs_train', '-')} |")
    L += ["", f"**Vocabulary ทั้งชุด:** {s['vocab_size_total']} คำ (หลังลบ stopword {s['vocab_size_total_nostop']} คำ)", "",
          "## Class Distribution", "", "| id | class | vision id | train | val | test | รวม |", "|---:|---|---:|---:|---:|---:|---:|"]
    for i, c in enumerate(CLASSES):
        l = c["label"]
        n = [sp[k]["class_distribution"][l] for k in ("train", "val", "test")]
        L.append(f"| {i} | {l} | {c['vision_id']} | {n[0]} | {n[1]} | {n[2]} | {sum(n)} |")
    L += ["", "## ระดับภาษาของประโยคต้นฉบับ (train/val/test)", "", "| style | train | val | test |", "|---|---:|---:|---:|"]
    for st in ("situation", "formal", "colloquial", "translit", "english"):
        L.append(f"| {st} | " + " | ".join(str(sp[k]["style_distribution"].get(st, 0)) for k in ("train", "val", "test")) + " |")
    L += ["", "## วิธี augment (train)", "", "| method | จำนวน |", "|---|---:|"]
    for m, n in sorted(sp["train"]["aug_methods"].items(), key=lambda x: -x[1]):
        L.append(f"| {m} | {n} |")
    L += ["", "## คำที่พบบ่อยต่อคลาส (train, ไม่รวม stopword)", "", "| class | top tokens |", "|---|---|"]
    for l, toks in s["top_tokens_per_class"].items():
        L.append(f"| {l} | {' · '.join(toks)} |")
    return "\n".join(L) + "\n"


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    corpus = build(SEED)
    for i, r in enumerate(corpus):
        r.update(id=f"s{i:04d}", source="original", aug_method="")
    with open(RAW_DIR / "corpus.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["id", "text", "label", "label_id", "vision_class_id", "style", "alias", "template"],
                           extrasaction="ignore")
        w.writeheader()
        w.writerows(corpus)

    parts = split(corpus, SEED)
    # augment เฉพาะ train และห้ามได้ประโยคซ้ำกับ val/test (กันข้อมูลรั่ว)
    blocked = {clean_text(r["text"]) for k in ("val", "test") for r in parts[k]}
    aug = augment_rows(parts["train"], AUG_PER_ROW, blocked, SEED)
    for i, r in enumerate(aug):
        r["id"] = f"a{i:04d}"
    parts["train"] = parts["train"] + aug

    rng = random.Random(SEED)
    for k in parts:
        parts[k] = [preprocess(r) for r in parts[k]]
        rng.shuffle(parts[k])
        save(k, parts[k])

    s = stats(parts)
    (OUT_DIR / "stats.json").write_text(json.dumps(s, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT_DIR / "stats.md").write_text(stats_md(s), encoding="utf-8")
    print(f"corpus {len(corpus)} | " + " | ".join(f"{k} {len(v)}" for k, v in parts.items())
          + f" | vocab {s['vocab_size_total']} ({s['vocab_size_total_nostop']} no-stop)")


if __name__ == "__main__":
    main()
