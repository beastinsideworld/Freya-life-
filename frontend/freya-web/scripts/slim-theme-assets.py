#!/usr/bin/env python3
"""Remove unused long-name duplicates and compress oversized theme PNGs for faster git push / Pages deploy."""

from __future__ import annotations

import re
from pathlib import Path

from PIL import Image

ROOT = Path("/themes")

# Keep only short ASCII aliases used by the app; drop French originals / UUID leftovers.
DROP_NAME_RE = re.compile(
    r"( |é|è|ê|à|â|ô|î|ï|ç|ö|ù|û|ÿ|œ|æ|É|È|À|’|'|天天|Gemini_|\d{8}-)",
    re.IGNORECASE,
)

MAX_SIDE = {
    "fonds": 1600,
    "modules": 1400,  # root theme cards
    "icons": 1024,
}


def should_drop(path: Path) -> bool:
    name = path.name
    if name in {"bandeau (2).png"}:
        return True
    # UUID leftovers when short alias exists
    if re.fullmatch(r"[0-9a-f-]{36}\.webp", name, re.I):
        return True
    # Long French originals alongside short aliases
    if DROP_NAME_RE.search(name):
        # keep if it's the ONLY file providing that role (no short sibling)
        return True
    return False


def max_side_for(path: Path) -> int:
    parts = {p.lower() for p in path.parts}
    if "fonds" in parts:
        return MAX_SIDE["fonds"]
    if path.parent.name.lower() in {"finance", "muscu", "meteo", "animaux", "meals", "nav"}:
        return MAX_SIDE["icons"]
    return MAX_SIDE["modules"]


def compress_png(path: Path) -> tuple[int, int]:
    before = path.stat().st_size
    im = Image.open(path)
    im = im.convert("RGBA") if im.mode in ("P", "LA") else im
    w, h = im.size
    limit = max_side_for(path)
    scale = min(1.0, limit / max(w, h))
    if scale < 1.0:
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)
    # Flatten near-opaque RGB for better compression when no useful alpha
    if im.mode == "RGBA":
        alpha = im.getchannel("A")
        extrema = alpha.getextrema()
        if extrema and extrema[0] >= 250:
            bg = Image.new("RGB", im.size, (0, 0, 0))
            bg.paste(im, mask=alpha)
            im = bg
    from io import BytesIO

    buf = BytesIO()
    suffix = path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        if im.mode == "RGBA":
            im = im.convert("RGB")
        im.save(buf, format="JPEG", quality=82, optimize=True)
    elif suffix == ".webp":
        im.save(buf, format="WEBP", quality=82, method=6)
    else:
        im.save(buf, format="PNG", optimize=True)
    data = buf.getvalue()
    after = len(data)
    if after < before:
        path.write_bytes(data)
        return before, after
    return before, before


def main() -> None:
    dropped = 0
    drop_bytes = 0
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file():
            continue
        if should_drop(path):
            drop_bytes += path.stat().st_size
            path.unlink()
            print("drop", path.relative_to(ROOT))
            dropped += 1

    saved = 0
    touched = 0
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
            continue
        if path.stat().st_size < 350_000:
            continue
        try:
            before, after = compress_png(path)
        except OSError as exc:
            print("fail", path, exc)
            continue
        if after < before:
            touched += 1
            saved += before - after
            print(
                f"slim {path.relative_to(ROOT)} "
                f"{before/1e6:.2f}MB → {after/1e6:.2f}MB"
            )

    print(
        f"DONE drop={dropped} ({drop_bytes/1e6:.1f}MB) "
        f"slim={touched} saved={saved/1e6:.1f}MB"
    )


if __name__ == "__main__":
    main()
