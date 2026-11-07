#!/usr/bin/env python3
"""Re-resolve the pack's pakku-lock.json for Minecraft 1.21.1 NeoForge.

Starts from the 1.20.1 lock on main (--base), applies the decisions in tools/port/mods-1.21.1.json
(drop, add, fallback replacements), picks the newest 1.21.1 NeoForge file of every remaining
CurseForge project, pulls in missing required dependencies and writes pakku-lock.json, pakku.json
and a Markdown report. Projects without a 1.21.1 build are removed and listed in the report.

The CurseForge core API needs a key, so this uses the public api.curse.tools proxy of it. The
cloud dev container cannot reach CurseForge, so this runs in GitHub Actions (port-lock.yml).

Usage (from the repository root):
    python3 tools/port/port_lock.py --base base-lock.json --report docs/port/lock-report.md
"""
import argparse
import json
import pathlib
import random
import re
import string
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

MC = "1.21.1"
NEOFORGE = 6  # CurseForge modLoaderType
GAME = 432  # Minecraft
CLASS_MOD = 6
API = "https://api.curse.tools/v1/cf"
NEOFORGE_MAVEN = "https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml"
UA = {"User-Agent": "sunlit-valley-idle/port-lock (github.com/blouflashdb/sunlit-valley-idle)",
      "Accept": "application/json"}
RELEASE_TYPES = {1: "release", 2: "beta", 3: "alpha"}
REQUIRED = 3  # CurseForge relationType RequiredDependency


def request(url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = dict(UA, **({"Content-Type": "application/json"} if data else {}))
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data, headers), timeout=60) as r:
                raw = r.read()
                return json.loads(raw) if raw.strip().startswith((b"{", b"[")) else raw.decode()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            print(f"  HTTP {e.code} for {url}, retry {attempt + 1}", flush=True)
        except Exception as e:  # network hiccup
            print(f"  {type(e).__name__} for {url}, retry {attempt + 1}", flush=True)
        time.sleep(2 ** attempt)
    raise SystemExit(f"Giving up on {url}")


def cf(path, **params):
    q = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
    res = request(f"{API}{path}" + (f"?{q}" if q else ""))
    return res.get("data") if isinstance(res, dict) else None


def latest_neoforge():
    xml = request(NEOFORGE_MAVEN)
    versions = [v.text for v in ET.fromstring(xml).iter("version")]
    stable = [v for v in versions if re.fullmatch(r"21\.1\.\d+", v)]
    return max(stable, key=lambda v: int(v.split(".")[2]))


def pick_file(mod_id, kind):
    """Newest 1.21.1 file, preferring release over beta over alpha."""
    params = {"gameVersion": MC, "pageSize": 50}
    if kind == "MOD":
        params["modLoaderType"] = NEOFORGE
    files = cf(f"/mods/{mod_id}/files", **params) or []
    ok = []
    for f in files:
        gv = [v.lower() for v in f.get("gameVersions", [])]
        if MC not in gv or not f.get("isAvailable", True):
            continue
        if kind == "MOD" and "neoforge" not in gv:
            continue
        ok.append(f)
    if not ok:
        return None
    ok.sort(key=lambda f: f["fileDate"], reverse=True)
    for rt in (1, 2, 3):
        for f in ok:
            if f.get("releaseType") == rt:
                return f
    return ok[0]


def find_mod(slug=None, search=None, exclude=(), names=None):
    """Return (mod, file, seen) for a slug, or for the most popular search hit with a 1.21.1 NeoForge
    build whose name contains the search text (or equals one of `names`, when given)."""
    if slug:
        hits = cf("/mods/search", gameId=GAME, classId=CLASS_MOD, slug=slug) or []
        for m in hits:
            f = pick_file(m["id"], "MOD")
            if f:
                return m, f, []
    seen = []
    if search:
        hits = cf("/mods/search", gameId=GAME, classId=CLASS_MOD, searchFilter=search, gameVersion=MC,
                  modLoaderType=NEOFORGE, sortField=2, sortOrder="desc", pageSize=10) or []
        norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
        for m in hits:
            seen.append(f"{m['name']} ({m['slug']})")
            if str(m["id"]) in exclude:
                continue
            if names is not None and norm(m["name"]) not in {norm(n) for n in names}:
                continue
            if names is None and norm(search) not in norm(m["name"]):
                continue
            f = pick_file(m["id"], "MOD")
            if f:
                return m, f, seen
    return None, None, seen


def new_pakku_id(taken):
    while True:
        pid = "".join(random.choice(string.ascii_letters + string.digits) for _ in range(16))
        if pid not in taken:
            taken.add(pid)
            return pid


def file_entry(f):
    hashes = {{1: "sha1", 2: "md5"}[h["algo"]]: h["value"] for h in f.get("hashes", []) if h.get("algo") in (1, 2)}
    gv = f.get("gameVersions", [])
    fid = f["id"]
    url = f.get("downloadUrl") or f"https://edge.forgecdn.net/files/{fid // 1000}/{fid % 1000}/{f['fileName']}"
    return {
        "type": "curseforge",
        "file_name": f["fileName"],
        "mc_versions": [v for v in gv if v[:1].isdigit()],
        "loaders": [v.lower() for v in gv if v.lower() in ("neoforge", "forge", "fabric", "quilt")],
        "release_type": RELEASE_TYPES.get(f.get("releaseType"), "release"),
        "url": url,
        "id": str(fid),
        "parent_id": str(f["modId"]),
        "hashes": hashes,
        "required_dependencies": sorted({str(d["modId"]) for d in f.get("dependencies", [])
                                         if d.get("relationType") == REQUIRED}),
        "size": f.get("fileLength", 0),
        "date_published": f.get("fileDate", ""),
    }


def project_entry(old, mod, f, taken):
    entry = {
        "pakku_id": old["pakku_id"] if old else new_pakku_id(taken),
        "type": old["type"] if old else "MOD",
    }
    if old and old.get("side"):
        entry["side"] = old["side"]
    entry["slug"] = {"curseforge": mod["slug"] if mod else old["slug"]["curseforge"]}
    entry["name"] = {"curseforge": mod["name"] if mod else old["name"]["curseforge"]}
    entry["id"] = {"curseforge": str(f["modId"])}
    if old and "redistributable" in old:
        entry["redistributable"] = old["redistributable"]
    entry["files"] = [file_entry(f)]
    return entry


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True, help="1.20.1 pakku-lock.json to start from")
    ap.add_argument("--decisions", default="tools/port/mods-1.21.1.json")
    ap.add_argument("--report", default="docs/port/lock-report.md")
    args = ap.parse_args()

    base = json.loads(pathlib.Path(args.base).read_text())
    decisions = json.loads(pathlib.Path(args.decisions).read_text())
    drop, fallback = decisions["drop"], decisions.get("fallback", {})
    taken = {p["pakku_id"] for p in base["projects"]}

    probe = cf("/mods/238222")  # JEI
    if not probe:
        raise SystemExit(f"CurseForge proxy {API} is not answering")

    neoforge = latest_neoforge()
    print(f"NeoForge {neoforge}", flush=True)

    projects = {}  # cf mod id -> lock entry
    dropped, missing, replaced, added, kept_old = [], [], [], [], []
    for old in base["projects"]:
        slug, name = old["slug"]["curseforge"], old["name"]["curseforge"]
        if slug in drop:
            dropped.append((name, slug, drop[slug]))
            continue
        f = pick_file(old["id"]["curseforge"], old["type"])
        if f:
            projects[str(f["modId"])] = project_entry(old, None, f, taken)
            print(f"ok      {slug:40} {f['fileName']}", flush=True)
            continue
        if slug in fallback:
            fb = fallback[slug]
            mod, f, seen = find_mod(fb.get("slug"), fb.get("search"), exclude={old["id"]["curseforge"]},
                                    names=fb.get("names"))
            if f:
                entry = project_entry(old, mod, f, taken)
                projects[str(f["modId"])] = entry
                replaced.append((name, f"{mod['name']} ({mod['slug']})", fb["reason"]))
                print(f"replace {slug:40} -> {mod['slug']} {f['fileName']}; search saw {seen}", flush=True)
                continue
            print(f"  fallback search for {slug} saw: {seen}", flush=True)
        if old["type"] != "MOD":
            # Resource and shader packs rarely tag new versions; the old file still loads.
            projects[old["id"]["curseforge"]] = old
            kept_old.append((name, slug))
            print(f"keepold {slug}", flush=True)
            continue
        missing.append((name, slug))
        print(f"MISSING {slug}", flush=True)

    for add in decisions.get("add", []):
        mod, f, seen = find_mod(add.get("slug"), add.get("search"))
        if not f:
            missing.append((add.get("search") or add["slug"], add["slug"] + " (planned addition)"))
            print(f"MISSING addition {add}: saw {seen}", flush=True)
            continue
        entry = project_entry(None, mod, f, taken)
        if add.get("side"):
            entry = {**{k: entry[k] for k in ("pakku_id", "type")}, "side": add["side"],
                     **{k: v for k, v in entry.items() if k not in ("pakku_id", "type")}}
        projects[str(f["modId"])] = entry
        added.append((mod["name"], mod["slug"], add["reason"]))
        print(f"add     {mod['slug']:40} {f['fileName']}", flush=True)

    # Pull in required dependencies that are not in the pack yet.
    queue = list(projects.values())
    while queue:
        p = queue.pop()
        for dep in p["files"][0]["required_dependencies"]:
            if dep in projects:
                continue
            f = pick_file(dep, "MOD")
            mod = cf(f"/mods/{dep}")
            if not f or not mod:
                missing.append((mod["name"] if mod else dep, f"required by {p['slug']['curseforge']}"))
                projects[dep] = None
                continue
            entry = project_entry(None, mod, f, taken)
            projects[dep] = entry
            queue.append(entry)
            added.append((mod["name"], mod["slug"], f"required by {p['slug']['curseforge']}"))
            print(f"dep     {mod['slug']:40} {f['fileName']} (for {p['slug']['curseforge']})", flush=True)

    entries = sorted((p for p in projects.values() if p), key=lambda p: p["name"]["curseforge"].lower())
    by_cf = {p["id"]["curseforge"]: p["pakku_id"] for p in entries}
    linked = []
    for p in entries:
        links = [by_cf[d] for d in p["files"][0]["required_dependencies"] if d in by_cf]
        q = {"pakku_id": p["pakku_id"], **({"pakku_links": links} if links else {})}
        q.update({k: v for k, v in p.items() if k not in ("pakku_id", "pakku_links")})
        linked.append(q)
    entries = linked

    lock = {"target": base["target"], "mc_versions": [MC], "loaders": {"neoforge": neoforge},
            "projects": entries, "lockfile_version": base["lockfile_version"]}
    pathlib.Path("pakku-lock.json").write_text(json.dumps(lock, indent=4, ensure_ascii=False) + "\n")

    pakku = json.loads(pathlib.Path("pakku.json").read_text())
    slugs = {p["slug"]["curseforge"] for p in entries}
    pakku["projects"] = {k: v for k, v in pakku["projects"].items() if k in slugs}
    for add in decisions.get("add", []):
        if add.get("side") and add["slug"] in slugs:
            pakku["projects"][add["slug"]] = {"side": add["side"]}
    pathlib.Path("pakku.json").write_text(json.dumps(pakku, indent=4, ensure_ascii=False) + "\n")

    expected_missing = {"botania", "create-steam-n-rails"}
    unexpected = [m for m in missing if m[1] not in expected_missing]
    rep = [f"# 1.21.1 NeoForge lock report", "",
           f"Generated by `tools/port/port_lock.py` from the 1.20.1 lock on `main`.", "",
           f"- Minecraft {MC}, NeoForge {neoforge}",
           f"- Projects: {len(base['projects'])} before, {len(entries)} after", "",
           f"## Missing on 1.21.1 NeoForge, removed ({len(missing)})", ""]
    rep += [f"- {n} (`{s}`)" for n, s in sorted(missing)] or ["None."]
    rep += ["", f"## Replaced ({len(replaced)})", ""]
    rep += [f"- {a} -> {b}: {r}" for a, b, r in replaced] or ["None."]
    rep += ["", f"## Added ({len(added)})", ""]
    rep += [f"- {n} (`{s}`): {r}" for n, s, r in sorted(added)] or ["None."]
    rep += ["", f"## Resource/shader packs kept on their 1.20.1 file ({len(kept_old)})", ""]
    rep += [f"- {n} (`{s}`)" for n, s in sorted(kept_old)] or ["None."]
    rep += ["", f"## Dropped by decision ({len(dropped)})", ""]
    rep += [f"- {n} (`{s}`): {r}" for n, s, r in sorted(dropped)]
    report = pathlib.Path(args.report)
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text("\n".join(rep) + "\n")
    print("\n".join(rep))
    if unexpected:
        print(f"\nNOTE: {len(unexpected)} projects were removed without a decision; review the report.")


if __name__ == "__main__":
    sys.exit(main())
