#!/usr/bin/env python3
"""Rellena `size` (tamaño aproximado) de data/roms/<sistema>.json
usando los DAT de No-Intro / Redump que publica el proyecto libretro-database.

Uso:   python3 scripts/fill_rom_info.py nes
Busca cada juego por su campo "boxart" (nombre No-Intro/Redump) o, si no lo tiene, por "title".
No pisa valores que ya hayas escrito a mano. Avisa de los juegos que no encuentra.
"""
import json, re, sys, urllib.parse, urllib.request

BASE = "https://raw.githubusercontent.com/libretro/libretro-database/master/metadat/"


def fetch_dat(name):
    for folder in ("no-intro", "redump"):
        url = BASE + folder + "/" + urllib.parse.quote(name) + ".dat"
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                return r.read().decode("utf-8", "replace")
        except Exception:
            continue
    sys.exit(f"No se encontró el DAT «{name}» en libretro-database.")


def parse(dat):
    games = {}
    for m in re.finditer(r'game \(\s*name "(.*?)"\s*(?:.*?)rom \( name "(.*?)" size (\d+) crc (\w+) md5 (\w+) sha1 (\w+)', dat, re.S):
        name, rom, size, crc, md5, sha1 = m.groups()
        # si hay varias ROM con el mismo nombre (p. ej. .nes y .unh) nos quedamos con la primera
        games.setdefault(name, dict(rom=rom, size=int(size), crc32=crc.lower(), md5=md5.lower(), sha1=sha1.lower()))
    return games


def human(n):
    return f"{n / 1048576:.1f} MB" if n >= 1048576 else f"{max(1, round(n / 1024))} KB"


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sid = sys.argv[1]
    sysfile = "data/roms/systems.json"
    systems = json.load(open(sysfile, encoding="utf-8"))
    sysd = next((s for s in systems if s["id"] == sid), None)
    if not sysd or not sysd.get("libretro"):
        sys.exit(f"El sistema «{sid}» no existe en systems.json o no tiene campo libretro.")
    path = f"data/roms/{sid}.json"
    items = json.load(open(path, encoding="utf-8"))
    games = parse(fetch_dat(sysd["libretro"]))
    low = {k.lower(): v for k, v in games.items()}
    done = miss = 0
    for g in items:
        hit = games.get(g.get("boxart", "")) or games.get(g["title"]) or low.get(g.get("boxart", g["title"]).lower())
        if not hit:
            miss += 1
            print("  sin datos:", g["title"], f"(boxart: {g.get('boxart', '-')})")
            continue
        g.setdefault("size", human(hit["size"]))
        done += 1
    json.dump(items, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"{done} completados, {miss} sin datos.")


if __name__ == "__main__":
    main()
