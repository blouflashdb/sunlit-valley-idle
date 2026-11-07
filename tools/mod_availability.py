#!/usr/bin/env python3
"""Check which pack mods have builds for newer Minecraft versions on NeoForge.

Reads pakku-lock.json, queries Modrinth (by CurseForge slug, then by title search)
and the cfwidget CurseForge mirror, and writes a CSV plus a summary.
Usage: python tools/mod_availability.py [out.csv]
"""
import csv, json, sys, time, urllib.parse, urllib.request

TARGETS = ["1.21.1", "1.21.11", "26.1", "26.2", "26.3"]
UA = {"User-Agent": "sunlit-valley-idle/mod-availability (github.com/blouflashdb/sunlit-valley-idle)"}


def get(url):
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code == 429:
                time.sleep(10)
                continue
            time.sleep(2 ** attempt)
        except Exception:
            time.sleep(2 ** attempt)
    return None


def matches(gv, target):
    # "26.1" target also accepts 26.1.x patch releases.
    return gv == target or (target.count(".") == 1 and gv.startswith(target + "."))


def modrinth_pairs(slug, title):
    proj = get(f"https://api.modrinth.com/v2/project/{slug}")
    if proj is None:
        q = urllib.parse.quote(title)
        res = get(f"https://api.modrinth.com/v2/search?query={q}&limit=5") or {}
        norm = lambda s: "".join(c for c in s.lower() if c.isalnum())
        for hit in res.get("hits", []):
            if norm(hit["title"]) == norm(title) or hit["slug"] == slug:
                proj = {"slug": hit["slug"]}
                break
    if proj is None:
        return None, set()
    versions = get(f"https://api.modrinth.com/v2/project/{proj['slug']}/version") or []
    pairs = {(gv, l) for v in versions for gv in v["game_versions"] for l in v["loaders"]}
    return proj["slug"], pairs


def curseforge_pairs(cf_id):
    data = get(f"https://api.cfwidget.com/{cf_id}")
    pairs = set()
    if not data:
        return pairs
    for f in data.get("files", []):
        vs = f.get("versions", [])
        loaders = {v.lower() for v in vs if v.lower() in ("forge", "neoforge", "fabric", "quilt")}
        if not loaders:
            loaders = {"any"}
        for gv in vs:
            if gv[:1].isdigit():
                for l in loaders:
                    pairs.add((gv, l))
    return pairs


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "mod-availability.csv"
    lock = json.load(open("pakku-lock.json"))
    rows = []
    for p in lock["projects"]:
        title = p["name"].get("curseforge") or next(iter(p["name"].values()))
        slug = p["slug"].get("curseforge") or next(iter(p["slug"].values()))
        cf_id = p["id"].get("curseforge")
        mr_slug, pairs = modrinth_pairs(slug, title)
        if cf_id:
            pairs |= curseforge_pairs(cf_id)
        kind = p.get("type", "MOD")
        row = {"name": title, "slug": slug, "type": kind, "side": p.get("side", ""), "modrinth": mr_slug or ""}
        # Resource/shader packs do not depend on a loader.
        okloaders = {"neoforge"} if kind == "MOD" else None
        for t in TARGETS:
            row[t] = int(any(matches(gv, t) and (okloaders is None or l in okloaders) for gv, l in pairs))
        mc = sorted({gv for gv, l in pairs if gv[:1].isdigit() and (okloaders is None or l in okloaders)},
                    key=lambda s: [int(x) if x.isdigit() else 0 for x in s.split(".")])
        row["newest_neoforge"] = mc[-1] if mc else ""
        row["found"] = int(bool(pairs))
        rows.append(row)
        print(f"{title[:45]:45} nf-newest={row['newest_neoforge']:8} " + " ".join(f"{t}={row[t]}" for t in TARGETS), flush=True)
        time.sleep(0.3)
    with open(out, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    mods = [r for r in rows if r["type"] == "MOD"]
    print(f"\nSUMMARY ({len(mods)} mods, {len(rows) - len(mods)} packs; not found anywhere: {sum(1 for r in rows if not r['found'])})")
    for t in TARGETS:
        print(f"  {t:8} NeoForge: {sum(r[t] for r in mods)}/{len(mods)} mods")
    for t in TARGETS:
        missing = [r["name"] for r in mods if not r[t]]
        print(f"\nMISSING on {t} ({len(missing)}): " + "; ".join(missing))


if __name__ == "__main__":
    main()
