#!/usr/bin/env python3
"""High-contrast dark-green nav + meal icons for Printemps (from hiver PNGs)."""

from __future__ import annotations

import colorsys
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path("/work")
OUT = Path("/out")
NAV_SRC = ROOT / "nav/hiver"
NAV_DST = OUT / "nav/printemps"
MEALS_SRC = ROOT / "themes/hiver/meals"
MEALS_DST = OUT / "themes/printemps/meals"
MEALS_ACC_SRC = ROOT / "themes/hiver/meals/accueil"
MEALS_ACC_DST = OUT / "themes/printemps/meals/accueil"

SPRING_HUE = 0.31
HIVER_HUE = 0.55
# Target ~#0a2218
MAX_L = 0.24


def shift_pixel(r: int, g: int, b: int, a: int, l_scale: float) -> tuple[int, int, int, int]:
    if a < 20:
        return r, g, b, a
    rn, gn, bn = r / 255, g / 255, b / 255
    h, l, s = colorsys.rgb_to_hls(rn, gn, bn)
    if s < 0.08:
        return r, g, b, a
    if l > 0.94:
        return r, g, b, a
    if h > 0.45:
        h = SPRING_HUE + (h - HIVER_HUE) * 0.12
    else:
        h = SPRING_HUE + (h - 0.08) * 0.2
    s = min(1.0, max(0.45, s * 1.65))
    l = min(MAX_L, max(0.07, l * l_scale))
    r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
    return int(r2 * 255), int(g2 * 255), int(b2 * 255), a


def post_enhance(im: Image.Image) -> Image.Image:
    im = ImageEnhance.Contrast(im).enhance(1.75)
    im = ImageEnhance.Color(im).enhance(1.4)
    im = ImageEnhance.Brightness(im).enhance(0.92)
    return im


def recolor_file(src: Path, dest: Path, l_scale: float) -> None:
    im = Image.open(src).convert("RGBA")
    out = im.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            px[x, y] = shift_pixel(*px[x, y], l_scale)
    out = post_enhance(out)
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, format="PNG")
    print("wrote", dest.relative_to(OUT))


def main() -> None:
    for src in sorted(NAV_SRC.glob("*.png")):
        recolor_file(src, NAV_DST / src.name, l_scale=0.42)

    for name in ("petit-dejeuner.png", "dejeuner.png", "collation.png", "diner.png"):
        recolor_file(MEALS_SRC / name, MEALS_DST / name, l_scale=0.4)
        recolor_file(MEALS_ACC_SRC / name, MEALS_ACC_DST / name, l_scale=0.36)

    print("DONE")


if __name__ == "__main__":
    main()
