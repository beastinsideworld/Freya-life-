#!/usr/bin/env python3
"""Build two Hiver meal-slot icon sets from the original gold icons.

Accueil (light snow): dark ice-blue strokes, transparent background.
Repas tab (dark panel): pale ice strokes, transparent background.
"""

from pathlib import Path

from PIL import Image

SRC = Path("/meals")
LIGHT = Path("/dst")
DARK = Path("/dst/accueil")
NAMES = ("petit-dejeuner.png", "dejeuner.png", "collation.png", "diner.png")


def recolor(src: Path, mode: str) -> Image.Image:
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 16 or (r < 26 and g < 26 and b < 26):
                px[x, y] = (0, 0, 0, 0)
                continue
            lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
            if mode == "dark":
                nr = int(8 + lum * 36)
                ng = int(36 + lum * 62)
                nb = int(72 + lum * 78)
            else:
                nr = int(214 + lum * 41)
                ng = int(230 + lum * 25)
                nb = int(246 + lum * 9)
            px[x, y] = (min(255, nr), min(255, ng), min(255, nb), a)
    return im


def main() -> None:
    LIGHT.mkdir(parents=True, exist_ok=True)
    DARK.mkdir(parents=True, exist_ok=True)
    for name in NAMES:
        src = SRC / name
        recolor(src, "light").save(LIGHT / name, optimize=True)
        recolor(src, "dark").save(DARK / name, optimize=True)
        print("ok", name)


if __name__ == "__main__":
    main()
