#!/usr/bin/env python3
"""Copy Automne design assets to stable ASCII names used by the theme."""

from pathlib import Path

from PIL import Image

SRC = Path("/src")
DST = Path("/dst")


def numbered(folder: Path, n: int) -> Path:
    hits = [p for p in folder.glob("*.png") if p.stem.endswith(f"-{n}")]
    if not hits:
        raise SystemExit(f"missing -{n} in {folder}")
    return hits[0]


def find(folder: Path, *needles: str) -> Path:
    files = [p for p in folder.glob("*.png")]
    for needle in needles:
        hit = next((p for p in files if needle.lower() in p.name.lower()), None)
        if hit:
            return hit
    raise SystemExit(f"missing {needles} in {folder}")


def save_jpg(src: Path, dest: Path, limit: int = 1400) -> None:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    scale = min(1.0, limit / max(w, h))
    if scale < 1:
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, format="JPEG", quality=82, optimize=True, progressive=True)
    print(f"jpg {dest.name} ← {src.name} {dest.stat().st_size/1e6:.2f}MB")


def save_png(src: Path, dest: Path, limit: int = 900) -> None:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    scale = min(1.0, limit / max(w, h))
    if scale < 1:
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, format="PNG", optimize=True)
    print(f"png {dest.relative_to(DST)} ← {src.name}")


def main() -> None:
    fonds = SRC / "fonds"
    # Cadres d'accueil, même ordre que les autres thèmes.
    save_jpg(numbered(fonds, 1), DST / "fonds" / "accueil.jpg")
    save_jpg(numbered(fonds, 2), DST / "fonds" / "taches.jpg")
    save_jpg(numbered(fonds, 3), DST / "fonds" / "evenement.jpg")
    save_jpg(numbered(fonds, 4), DST / "fonds" / "repas.jpg")
    save_jpg(numbered(fonds, 5), DST / "fonds" / "planning.jpg")
    save_jpg(numbered(fonds, 6), DST / "fonds" / "voyage.jpg")

    # Paysages de pages / modules.
    root = [p for p in SRC.glob("*.png")]
    def root_n(n: int) -> Path:
        hits = [p for p in root if p.stem.endswith(f"-{n}")]
        if not hits:
            raise SystemExit(f"missing root -{n}")
        return hits[0]

    save_jpg(root_n(5), DST / "planning.jpg", 1200)
    save_jpg(root_n(3), DST / "repas.jpg", 1200)
    save_jpg(root_n(1), DST / "voyage.jpg", 1200)
    save_jpg(root_n(4), DST / "sport.jpg", 1200)
    save_jpg(root_n(2), DST / "finances.jpg", 1200)
    save_jpg(root_n(6), DST / "animaux.jpg", 1200)
    save_jpg(root_n(1), DST / "bandeau.jpg", 1400)

    save_png(find(SRC, "Calendrier"), DST / "calendrier-fantasy.png", 768)
    save_png(find(SRC, "treinte"), DST / "famille-fantasy.png", 768)

    fin = SRC / "finance"
    save_png(find(fin, "Graphique"), DST / "finance" / "graphique.png")
    save_png(find(fin, "Cible"), DST / "finance" / "cible.png")
    save_png(find(fin, "carte"), DST / "finance" / "carte.png")
    save_png(find(fin, "Portefeuille"), DST / "finance" / "portefeuille.png")
    save_png(find(fin, "ches"), DST / "finance" / "transfert.png")
    save_png(find(fin, "Calendrier"), DST / "finance" / "calendrier.png")
    save_png(find(fin, "Cochon"), DST / "finance" / "tirelire.png")
    save_png(find(fin, "bronze"), DST / "finance" / "croissance.png")

    an = SRC / "animaux"
    save_png(find(an, "vaccin"), DST / "animaux" / "vaccin.png")
    save_png(find(an, "patte"), DST / "animaux" / "patte.png")
    save_png(find(an, "Gamelle"), DST / "animaux" / "gamelle.png")
    save_png(find(an, "Sac"), DST / "animaux" / "bourse.png")
    save_png(find(an, "daillon"), DST / "animaux" / "soin.png")
    save_png(find(an, "Chien"), DST / "animaux" / "chien.png")
    save_png(find(an, "Chat"), DST / "animaux" / "chat.png")
    save_png(find(an, "Calendrier"), DST / "animaux" / "calendrier.png")

    mu = SRC / "muscu"
    save_png(find(mu, "Halt"), DST / "muscu" / "haltere.png")
    save_png(find(mu, "Kettle"), DST / "muscu" / "kettlebell.png")
    save_png(find(mu, "Banc"), DST / "muscu" / "banc.png")
    save_png(find(mu, "Disque"), DST / "muscu" / "disques.png")
    save_png(find(mu, "Shaker"), DST / "muscu" / "shaker.png")
    save_png(find(mu, "Calendrier"), DST / "muscu" / "programme.png")
    save_png(find(mu, "Troph"), DST / "muscu" / "trophee.png")

    me = SRC / "meteo"
    save_png(find(me, "entour"), DST / "meteo" / "soleil.png")
    save_png(numbered(me, 1), DST / "meteo" / "nuageux.png")
    save_png(find(me, "orageux"), DST / "meteo" / "pluie.png")
    save_png(numbered(me, 3), DST / "meteo" / "orage.png")
    save_png(numbered(me, 4), DST / "meteo" / "tres-couvert.png")
    save_png(find(me, "Lune"), DST / "meteo" / "nuit.png")
    save_png(find(me, "vent"), DST / "meteo" / "vent.png")
    save_png(numbered(me, 6), DST / "meteo" / "neige.png")
    print("DONE")


if __name__ == "__main__":
    main()
