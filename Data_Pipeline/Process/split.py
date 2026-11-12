"""Burst grouping and stratified group split."""
import random
import re
from collections import Counter
from datetime import datetime

SPLITS = ("train", "val", "test")
TS_RE = re.compile(r"(\d{8})_(\d{6})")  # 20261110_113646(1).jpg


def burst_groups(names, gap):
    """Chain images whose filename timestamps are <= gap seconds from the previous one; others own group."""
    ts = {}
    for n in names:
        m = TS_RE.search(n)
        if m:
            try:
                ts[n] = datetime.strptime(m.group(1) + m.group(2), "%Y%m%d%H%M%S")
            except ValueError:
                pass
    group, k, prev = {}, 0, None
    for n in sorted(ts, key=ts.get):
        if prev is None or (ts[n] - prev).total_seconds() > gap:
            k += 1
        group[n], prev = f"g{k:04d}", ts[n]
    for n in names:
        if n not in group:
            k += 1
            group[n] = f"g{k:04d}"
    return group


def split_groups(counts, ratios, seed):
    """Greedy stratified group split. counts: {group: Counter(class_id -> persons, '_img' -> images)}.
    Rarest-class groups go first, each to the split whose per-class quota it fits best.
    shortcut: greedy, not optimal - classes with only a few bursts can miss val/test (warned later)."""
    total = Counter()
    for c in counts.values():
        total.update(c)
    rng = random.Random(seed)
    order = sorted(counts, key=lambda g: (min(total[k] for k in counts[g] if k != "_img"),
                                          -counts[g]["_img"], rng.random()))
    cur = {s: Counter() for s in SPLITS}
    out = {}
    for g in order:
        def cost(s):
            tgt = lambda k: ratios[s] * total[k]
            return sum(((cur[s][k] + v - tgt(k)) ** 2 - (cur[s][k] - tgt(k)) ** 2) / max(tgt(k), 1)
                       for k, v in counts[g].items())
        out[g] = min(SPLITS, key=cost)
        cur[out[g]].update(counts[g])
    return out
