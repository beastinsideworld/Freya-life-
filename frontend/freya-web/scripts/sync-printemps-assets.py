#!/usr/bin/env python3
"""Map Design / long-name printemps PNGs to stable app paths (JPEG fonds)."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path("/themes")

FONDS = {
    "Printemps fleuri sous une lumière dorée-1.png": "fonds/accueil.jpg",
    "Éclosion printanière des cerisiers en fleurs-2.png": "fonds/taches.jpg",
    "Prairie printanière fleurie sous le soleil-3.png": "fonds/evenement.jpg",
    "Fond printanier fleuri et lumineux-4.png": "fonds/repas.jpg",
    "Jardin printanier fleuri et lumineux-5.png": "fonds/planning.jpg",
    "Fond floral printanier à l’aquarelle-6.png": "fonds/voyage.jpg",
}

MODULES = {
    "Jardin printanier fleuri et lumineux-5.png": "planning.jpg",
    "Fond printanier fleuri et lumineux-4.png": "repas.jpg",
    "Jardin printanier fleuri au lever du soleil-6.png": "voyage.jpg",
    "Ciel printanier et floraisons lumineuses-5.png": "sport.jpg",
    "Printemps pastel aux fleurs lumineuses-4.png": "finances.jpg",
    "Jardin printanier baigné de lumière-1.png": "animaux.jpg",
    "Jardin printanier fleuri au lever du soleil-6.png": "bandeau.jpg",
}

ICONS = {
    "Calendrier printanier fleuri et doré-1.png": "calendrier-fantasy.png",
    "Portrait familial floral printanier-2.png": "famille-fantasy.png",
}

METEO = {
    "meteo/06_soleil_et_nuages.png": "meteo/soleil.png",
    "meteo/06_soleil_et_nuages.png": "meteo/nuageux.png",
    "meteo/09_nuages_et_arc_en_ciel.png": "meteo/tres-couvert.png",
    "meteo/02_pluie.png": "meteo/pluie.png",
    "meteo/04_orage.png": "meteo/orage.png",
    "meteo/09_nuages_et_arc_en_ciel.png": "meteo/neige.png",
    "meteo/08_temps_venteux.png": "meteo/vent.png",
    "meteo/01_lune_nuageuse.png": "meteo/nuit.png",
}

FINANCE = {
    "finance/Calendrier financier printanier fleuri.png": "finance/calendrier.png",
    "finance/Cible de tir fleurie au printemps-1.png": "finance/cible.png",
    "finance/Croissance financière écoresponsable en fleurs-2.png": "finance/graphique.png",
    "finance/Tirelire fleurie et pièces dorées-2.png": "finance/tirelire.png",
    "finance/Icône de transfert botanique dorée.png": "finance/transfert.png",
    "finance/Carte bancaire botanique dorée-4.png": "finance/carte.png",
    "finance/Icône 3D de croissance financière florissante-1.png": "finance/croissance.png",
    "finance/Portefeuille vert et pièces en euros-3.png": "finance/portefeuille.png",
}

ANIMAUX = {
    "animaux/Calendrier printanier aux pattes fleuries-1.png": "animaux/calendrier.png",
    "animaux/Chaton fleuri au médaillon doré-2.png": "animaux/chat.png",
    "animaux/Toutou printanier au bandana fleuri-3.png": "animaux/chien.png",
    "animaux/Empreinte florale printanière en 3D-4.png": "animaux/patte.png",
    "animaux/Bol vert pour animaux fleuri-5.png": "animaux/gamelle.png",
    "animaux/Icône vétérinaire florale avec patte verte-6.png": "animaux/vaccin.png",
    "animaux/Bourse porte-bonheur pour animaux-1.png": "animaux/bourse.png",
    "animaux/Médaille de collier fleurie pour animal-2.png": "animaux/soin.png",
}

MUSCU = {
    "muscu/Calendrier printanier fleuri 3D-4.png": "muscu/programme.png",
    "muscu/Banc de musculation fleuri printanier-3.png": "muscu/banc.png",
    "muscu/Disques de musculation fleuris printaniers-5.png": "muscu/disques.png",
    "muscu/Haltère printanier fleuri aux accents dorés-7.png": "muscu/haltere.png",
    "muscu/kettlebell_printemps.png": "muscu/kettlebell.png",
    "muscu/shaker_printemps.png": "muscu/shaker.png",
    "muscu/trophee_printemps.png": "muscu/trophee.png",
}


def find_src(name: str) -> Path | None:
    direct = ROOT / name
    if direct.is_file():
        return direct
    for p in ROOT.rglob(name):
        if p.is_file() and "automne" not in p.name.lower() and "automne" not in str(p.parent).lower():
            if "automne" in p.name or "feuilles d" in p.name or "érable" in p.name:
                continue
            return p
    return None


def save_image(src: Path, dest: Path, jpeg: bool) -> None:
    im = Image.open(src)
    im.load()
    dest.parent.mkdir(parents=True, exist_ok=True)
    if jpeg:
        if im.mode in ("RGBA", "P", "LA"):
            bg = Image.new("RGB", im.size, (240, 248, 235))
            if im.mode != "RGBA":
                im = im.convert("RGBA")
            bg.paste(im, mask=im.split()[-1])
            im = bg
        else:
            im = im.convert("RGB")
        buf = BytesIO()
        im.save(buf, format="JPEG", quality=84, optimize=True)
    else:
        if im.mode not in ("RGBA", "RGB"):
            im = im.convert("RGBA")
        buf = BytesIO()
        im.save(buf, format="PNG", optimize=True)
    dest.write_bytes(buf.getvalue())
    print(f"ok {dest.relative_to(ROOT)} <= {src.name}")


def main() -> None:
    for src_name, rel in FONDS.items():
        src = find_src(src_name)
        if not src:
            src = ROOT / "fonds" / src_name
        if not src.is_file():
            print("MISSING fond", src_name)
            continue
        save_image(src, ROOT / rel, jpeg=True)

    for src_name, rel in MODULES.items():
        src = find_src(src_name)
        if not src or not src.is_file():
            print("MISSING module", src_name)
            continue
        save_image(src, ROOT / rel, jpeg=True)

    for src_name, rel in ICONS.items():
        src = find_src(src_name)
        if not src or not src.is_file():
            print("MISSING icon", src_name)
            continue
        save_image(src, ROOT / rel, jpeg=False)

    for src_rel, dest_rel in METEO.items():
        src = ROOT / src_rel
        if not src.is_file():
            print("MISSING meteo", src_rel)
            continue
        save_image(src, ROOT / dest_rel, jpeg=False)

    for src_rel, dest_rel in FINANCE.items():
        if not dest_rel:
            continue
        src = ROOT / src_rel
        if not src.is_file():
            print("MISSING finance", src_rel)
            continue
        save_image(src, ROOT / dest_rel, jpeg=False)

    for src_rel, dest_rel in ANIMAUX.items():
        src = ROOT / src_rel
        if not src.is_file():
            print("MISSING animaux", src_rel)
            continue
        save_image(src, ROOT / dest_rel, jpeg=False)

    for src_rel, dest_rel in MUSCU.items():
        src = ROOT / src_rel
        if not src.is_file():
            print("MISSING muscu", src_rel)
            continue
        save_image(src, ROOT / dest_rel, jpeg=False)

    print("DONE")


if __name__ == "__main__":
    main()
