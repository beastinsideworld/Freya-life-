#!/usr/bin/env python3
"""Sync Hiver landscape fonds + recolor gold/rose-gold pixels to ice blue."""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

SRC = Path("/src")
DST = Path("/dst")
NAV = Path("/nav")


def is_goldish(r: int, g: int, b: int, a: int) -> bool:
    if a < 20:
        return False
    # keep snow / near-white
    if r > 220 and g > 220 and b > 200:
        return False
    # keep black bg
    if r < 18 and g < 18 and b < 18:
        return False
    # keep existing ice blues
    if b > r + 25 and b > g:
        return False
    mx = max(r, g, b)
    if mx < 40:
        return False
    warm = (r > g - 5) and (g >= b) and (r - b >= 18)
    amber = r > 90 and g > 55 and b < 140 and (r - b) > 25 and g > b
    rose = r > 100 and g > 60 and b > 40 and r >= g and (r - b) > 20 and (g - b) < 70
    return warm or amber or rose


def recolor_gold_to_ice(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if not is_goldish(r, g, b, a):
                continue
            lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
            if lum > 0.78:
                nr, ng, nb = 220, 235, 248
            elif lum > 0.55:
                nr, ng, nb = 168, 196, 224
            elif lum > 0.35:
                nr, ng, nb = 107, 140, 174
            else:
                nr, ng, nb = 54, 77, 104
            t = 0.82
            nr = int(nr * t + r * (1 - t) * 0.35 + 40 * lum)
            ng = int(ng * t + g * (1 - t) * 0.25 + 50 * lum)
            nb = int(min(255, nb * t + b * (1 - t) * 0.2 + 70 * lum))
            px[x, y] = (min(255, nr), min(255, ng), min(255, nb), a)
    return im


def save_image(out: Image.Image, path: Path) -> None:
    if path.suffix.lower() in {".jpg", ".jpeg"}:
        out.convert("RGB").save(path, quality=92, optimize=True)
    else:
        out.save(path, optimize=True)


def sync_fonds() -> None:
    (DST / "fonds").mkdir(parents=True, exist_ok=True)
    fonds_map = {
        "Vallee-1.png": "accueil.png",
        "Foret-2.png": "taches.png",
        "Village-3.png": "evenement.png",
        "Lac-4.png": "repas.png",
        "Clairiere-5.png": "planning.png",
        "Sentier-6.png": "voyage.png",
        "Paysage.png": "paysage.png",
    }
    # Prefer short aliases if present, else match by substring
    originals = list((SRC / "fonds").glob("*.png"))
    alias_to_src = {
        "Vallee-1.png": next((p for p in originals if p.name.startswith("Vall") and "-1" in p.name), None),
        "Foret-2.png": next((p for p in originals if "-2.png" in p.name and "For" in p.name), None),
        "Village-3.png": next((p for p in originals if "-3.png" in p.name), None),
        "Lac-4.png": next((p for p in originals if "-4.png" in p.name), None),
        "Clairiere-5.png": next((p for p in originals if "-5.png" in p.name), None),
        "Sentier-6.png": next((p for p in originals if "-6.png" in p.name), None),
        "Paysage.png": next((p for p in originals if p.name.startswith("Paysage")), None),
    }
    for alias, dst_name in fonds_map.items():
        src = alias_to_src.get(alias)
        if src is None or not src.exists():
            print("MISSING", alias)
            continue
        shutil.copy2(src, DST / "fonds" / dst_name)
        print("fonds", dst_name, "←", src.name)


def recolor_nav() -> None:
    (NAV / "hiver").mkdir(parents=True, exist_ok=True)
    for name in [
        "accueil.png",
        "planning.png",
        "repas.png",
        "voyages.png",
        "tele.png",
        "chat.png",
        "budget.png",
        "sport.png",
        "animaux.png",
        "parametres.png",
    ]:
        src = NAV / name
        if not src.exists():
            print("nav missing", name)
            continue
        save_image(recolor_gold_to_ice(Image.open(src)), NAV / "hiver" / name)
        print("nav/hiver", name)


def recolor_theme_logos() -> None:
    targets: list[Path] = []
    for sub in ["muscu", "finance", "meteo"]:
        d = DST / sub
        if d.exists():
            targets.extend(
                p
                for p in d.iterdir()
                if p.suffix.lower() in {".png", ".webp", ".jpeg", ".jpg"}
            )
    for name in [
        "calendrier-fantasy.png",
        "famille-fantasy.png",
        "planning.png",
        "repas.png",
        "voyage.png",
        "sport.png",
        "animaux.png",
        "finances.png",
        "bandeau.png",
    ]:
        p = DST / name
        if p.exists():
            targets.append(p)

    for p in targets:
        try:
            save_image(recolor_gold_to_ice(Image.open(p)), p)
            print("recolor", p.relative_to(DST))
        except Exception as exc:  # noqa: BLE001
            print("fail", p, exc)


if __name__ == "__main__":
    sync_fonds()
    recolor_nav()
    recolor_theme_logos()
    print("DONE")
