#!/usr/bin/env python3
"""Actualiza version y releaseDate de data/games.json leyendo los releases de GitHub.

Solo toca las entradas que tienen el campo "repo": "propietario/repositorio".
Para dejar de vigilar una entrada, borra ese campo.
"""
import json
import os
import sys
import urllib.error
import urllib.request

PATH = "data/games.json"
LOG = "data/changelog.json"
LOG_MAX = 200


def api(url):
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "scene-backup-updater",
    })
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def latest_release(repo):
    """Último release publicado. Si el repo solo tiene pre-releases, usa el más reciente."""
    try:
        return api(f"https://api.github.com/repos/{repo}/releases/latest")
    except urllib.error.HTTPError as e:
        if e.code != 404:
            raise
    items = api(f"https://api.github.com/repos/{repo}/releases?per_page=5")
    items = [r for r in items if not r.get("draft")]
    return items[0] if items else None


def norm(v):
    v = str(v or "").strip().lower()
    if v[:1] == "v" and v[1:2].isdigit():
        v = v[1:]
    return v.replace(" ", "-").replace("_", "-")


def main():
    with open(PATH, encoding="utf-8") as f:
        games = json.load(f)

    try:
        with open(LOG, encoding="utf-8") as f:
            log = json.load(f)
    except (FileNotFoundError, ValueError):
        log = []

    changed = 0
    for g in games:
        repo = g.get("repo")
        if not repo:
            continue
        try:
            rel = latest_release(repo)
        except Exception as e:  # un fallo en un repo no debe parar al resto
            print(f"[error] {g['title']} ({repo}): {e}")
            continue
        if not rel:
            print(f"[sin releases] {g['title']} ({repo})")
            continue

        tag = (rel.get("tag_name") or "").strip()
        date = (rel.get("published_at") or rel.get("created_at") or "")[:10]
        if not tag:
            continue
        if norm(tag) == norm(g.get("version")):
            print(f"[igual] {g['title']}: {g.get('version')}")
            continue
        # Si lo que tú escribiste es más reciente que el release, no se pisa.
        if g.get("releaseDate") and date and date < g["releaseDate"]:
            print(f"[omitido] {g['title']}: tu fecha ({g['releaseDate']}) es posterior al release ({date})")
            continue

        new_version = tag[1:] if tag[:1] in "vV" and tag[1:2].isdigit() else tag
        print(f"[actualizado] {g['title']}: {g.get('version')} -> {new_version} ({date})")
        entry = {"title": g["title"], "platform": g.get("platform", ""),
                 "from": str(g.get("version", "")), "to": new_version,
                 "date": date or ""}
        if entry not in log:
            log.insert(0, entry)
        g["version"] = new_version
        if date:
            g["releaseDate"] = date
        changed += 1

    if changed:
        with open(PATH, "w", encoding="utf-8") as f:
            json.dump(games, f, indent=2, ensure_ascii=False)
            f.write("\n")
        with open(LOG, "w", encoding="utf-8") as f:
            json.dump(log[:LOG_MAX], f, indent=2, ensure_ascii=False)
            f.write("\n")
    print(f"Entradas actualizadas: {changed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
