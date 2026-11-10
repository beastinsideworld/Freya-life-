#!/usr/bin/env python3
"""Copy new Hiver finance icons + generate whiter ice meal slot icons."""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

SRC = Path("/src")
DST = Path("/dst")
MEALS_SRC = Path("/meals")


def is_goldish(r: int, g: int, b: int, a: int) -> bool:
    if a < 20:
        return False
    if r > 220 and g > 220 and b > 200:
        return False
    if r < 18 and g < 18 and b < 18:
        return False
    if b > r + 25 and b > g:
        return False
    if max(r, g, b) < 40:
        return False
    warm = (r > g - 5) and (g >= b) and (r - b >= 18)
    amber = r > 90 and g > 55 and b < 140 and (r - b) > 25 and g > b
    rose = r > 100 and g > 60 and b > 40 and r >= g and (r - b) > 20 and (g - b) < 70
    return warm or amber or rose


def recolor_to_ice_white(im: Image.Image) -> Image.Image:
    """Same ice palette as nav, biased whiter for meal icons."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not is_goldish(r, g, b, a):
                continue
            lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
            # Whiter ice: pale frost → soft cyan → soft steel
            if lum > 0.72:
                nr, ng, nb = 248, 252, 255
            elif lum > 0.5:
                nr, ng, nb = 220, 236, 248
            elif lum > 0.32:
                nr, ng, nb = 176, 208, 232
            else:
                nr, ng, nb = 120, 158, 190
            t = 0.88
            nr = int(nr * t + 55 * lum)
            ng = int(ng * t + 60 * lum)
            nb = int(min(255, nb * t + 70 * lum))
            px[x, y] = (min(255, nr), min(255, ng), min(255, nb), a)
    return im


def copy_finance() -> None:
    fin = DST / "finance"
    fin.mkdir(parents=True, exist_ok=True)
    mapping = [
        ("Tirelire", "tirelire.png"),
        ("Fl", "transfert.png"),  # Flèches…
    ]
    files = list(fin.glob("*.png")) + list((SRC / "finance").glob("*.png"))
    # Prefer Design theme source
    src_files = list((SRC / "finance").glob("*.png"))
    tirelire = next((p for p in src_files if "Tirelire" in p.name), None)
    fleches = next((p for p in src_files if p.name.startswith("Fl") or "ches" in p.name), None)
    if tirelire is None:
        raise SystemExit("missing Tirelire source")
    if fleches is None:
        raise SystemExit("missing Flèches source")
    shutil.copy2(tirelire, fin / "tirelire.png")
    shutil.copy2(fleches, fin / "transfert.png")
    print("finance", tirelire.name, "→ tirelire.png")
    print("finance", fleches.name, "→ transfert.png")
    # remove obsolete jpeg if present
    for old in ("tirelire.jpeg", "transfert.jpeg"):
        p = fin / old
        if p.exists():
            p.unlink()
            print("removed", old)


def make_meals() -> None:
    out = DST / "meals"
    out.mkdir(parents=True, exist_ok=True)
    for name in ("petit-dejeuner.png", "dejeuner.png", "collation.png", "diner.png"):
        src = MEALS_SRC / name
        if not src.exists():
            print("missing meal", name)
            continue
        recolor_to_ice_white(Image.open(src)).save(out / name, optimize=True)
        print("meals", name)


if __name__ == "__main__":
    copy_finance()
    make_meals()
    print("DONE")
