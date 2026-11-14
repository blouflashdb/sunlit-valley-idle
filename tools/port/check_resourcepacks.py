#!/usr/bin/env python3
"""Check the client resource packs, the shader pack and the files that enable them (#19).

Checks that fail the run:
  1. resourcepacks/sunlit_overrides.zip has the 1.21.1 pack format.
  2. Every pack that config/resourcepackoverrides.json or configureddefaults/options.txt enables is a resource
     pack in pakku-lock.json or a file in resourcepacks/ (the names change with each pack update).
  3. The shader pack in config/iris.properties is the shader pack in pakku-lock.json, or the copy that
     Colorwheel Patcher makes of it ("<name> + Clrwl_<patcher version>.zip"), and Colorwheel Patcher has a patch for
     that shader version (otherwise Create contraptions render wrong with shaders on). This downloads the
     Colorwheel Patcher jar from the lock to read its patch list.
  4. No Oculus or Embeddium config is left in config/ (Iris and Sodium replace them on 1.21.1).

With --jars-from-lock (or --jar/--jar-dir) it also reports, for each resource pack, how many of its texture,
model and blockstate files override a file that exists in the vanilla client or a pack mod, and which
namespaces it targets that no mod provides. A low share means the pack targets an old or missing mod. The
report never fails the run, because some packs add new files on purpose (CEM models, GUI sprites).

Usage (from the repository root):
    python3 tools/port/check_resourcepacks.py
    python3 tools/port/check_resourcepacks.py --download-client 1.21.1 --jars-from-lock --summary report.md
"""
import argparse
import re
import concurrent.futures
import io
import json
import os
import pathlib
import sys
import urllib.parse
import urllib.request
import zipfile

LOCK = pathlib.Path("pakku-lock.json")
OVERRIDES_ZIP = pathlib.Path("resourcepacks/sunlit_overrides.zip")
RPO = pathlib.Path("config/resourcepackoverrides.json")
OPTIONS = pathlib.Path("configureddefaults/options.txt")
IRIS = pathlib.Path("config/iris.properties")
# Resource pack format of Minecraft 1.21 and 1.21.1.
PACK_FORMAT = 34
OLD_CONFIGS = ("oculus.properties", "embeddium-options.json", "embeddium-mixins.properties",
               "embeddium-fingerprint.json")
MANIFEST = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"
UA = {"User-Agent": "sunlit-valley-idle/check-resourcepacks (github.com/blouflashdb/sunlit-valley-idle)"}
CHECKED_KINDS = ("textures", "models", "blockstates")


def fetch(url):
    url = urllib.parse.quote(url, safe=":/%?=&+")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001 - network errors of any kind are retried
            print(f"  {url}: {e}, retry {attempt + 1}", file=sys.stderr, flush=True)
    raise SystemExit(f"Could not download {url}")


def client_jar(version):
    manifest = json.loads(fetch(MANIFEST))
    meta_url = next(v["url"] for v in manifest["versions"] if v["id"] == version)
    return fetch(json.loads(fetch(meta_url))["downloads"]["client"]["url"])


def asset_names(data):
    with zipfile.ZipFile(io.BytesIO(data) if isinstance(data, bytes) else data) as z:
        return {n for n in z.namelist() if n.startswith("assets/") and not n.endswith("/")}


def pack_format(data):
    with zipfile.ZipFile(io.BytesIO(data) if isinstance(data, bytes) else data) as z:
        meta = next((n for n in z.namelist() if n.endswith("pack.mcmeta") and n.count("/") <= 1), None)
        if not meta:
            return None, None
        pack = json.loads(z.read(meta).decode("utf-8-sig"))["pack"]
        return pack.get("pack_format"), pack.get("supported_formats")


def enabled_in_options():
    for line in OPTIONS.read_text().splitlines():
        if line.startswith("resourcePacks:"):
            return [p for p in json.loads(line.split(":", 1)[1]) if p.startswith("file/")]
    return []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--download-client", metavar="VERSION", help="add this vanilla client jar to the report")
    ap.add_argument("--jar", action="append", default=[], help="jar whose assets count as existing")
    ap.add_argument("--jar-dir", action="append", default=[], help="folder of jars whose assets count as existing")
    ap.add_argument("--jars-from-lock", action="store_true", help="download every mod in the lock for the report")
    ap.add_argument("--summary", help="also append the report as Markdown to this file")
    args = ap.parse_args()

    lock = json.loads(LOCK.read_text())
    packs = {p["files"][0]["file_name"]: p for p in lock["projects"] if p["type"] == "RESOURCE_PACK"}
    shaders = [p["files"][0]["file_name"] for p in lock["projects"] if p["type"] == "SHADER"]
    local = {p.name for p in OVERRIDES_ZIP.parent.glob("*.zip")}
    errors = []

    fmt, supported = pack_format(OVERRIDES_ZIP)
    if fmt != PACK_FORMAT:
        errors.append(f"{OVERRIDES_ZIP}: pack_format {fmt}, expected {PACK_FORMAT} (1.21.1)")

    rpo = json.loads(RPO.read_text())
    enabled = {f"{RPO} default_packs": rpo.get("default_packs", [])}
    for key, value in rpo.get("pack_overrides", {}).items():
        if isinstance(value, list):
            enabled[f"{RPO} pack_overrides.{key}"] = value
    enabled[f"{OPTIONS} resourcePacks"] = enabled_in_options()
    for where, ids in enabled.items():
        for pack_id in ids:
            name = pack_id.removeprefix("file/")
            if pack_id.startswith("file/") and name not in packs and name not in local:
                errors.append(f"{where}: {name} is not a resource pack in the lock or in resourcepacks/")
    first = enabled[f"{RPO} default_packs"]
    for name in packs:
        if f"file/{name}" not in first:
            print(f"Note: {name} is in the lock but not enabled by {RPO}")

    lines = IRIS.read_text().splitlines() if IRIS.exists() else []
    iris = dict(line.split("=", 1) for line in lines if "=" in line and line[0] != "#")
    selected = iris.get("shaderPack", "")
    patcher = next((p for p in lock["projects"] if p["slug"].get("curseforge") == "colorwheel-patcher"), None)
    if patcher:
        # The patcher names its copy after its own version: "<pack> + Clrwl_1.0.5.zip" for 1.0.5+mc1.21.1.
        m = re.search(r"colorwheel_patcher-\w+-([0-9.]+)", patcher["files"][0]["file_name"])
        expected = [s.removesuffix(".zip") + f" + Clrwl_{m.group(1)}.zip" for s in shaders] if m else []
        if selected not in expected:
            errors.append(f"{IRIS}: shaderPack={selected}, Colorwheel Patcher writes {expected}")
    elif selected not in shaders:
        errors.append(f"{IRIS}: shaderPack={selected}, the lock has {shaders}")
    errors += colorwheel_errors(lock, shaders)
    for name in OLD_CONFIGS:
        if (pathlib.Path("config") / name).exists():
            errors.append(f"config/{name} is an Oculus/Embeddium config; use the Iris/Sodium config instead")

    report = []
    if args.download_client or args.jar or args.jar_dir or args.jars_from_lock:
        report = coverage_report(args, lock, packs)

    if args.summary:
        lines = ["## Resource packs (1.21.1)", "",
                 "| Pack | pack_format | Overrides | Match vanilla/mods | Unknown namespaces |",
                 "| --- | --- | --- | --- | --- |"]
        lines += [f"| {r['name']} | {r['format']} | {r['total']} | {r['share']} | {r['unknown']} |" for r in report]
        lines += ["", "Errors: " + ("none" if not errors else ""), *[f"- {e}" for e in errors]]
        with open(args.summary, "a") as f:  # appends, so it can be $GITHUB_STEP_SUMMARY
            f.write("\n".join(lines) + "\n")

    for e in errors:
        print("ERROR: " + e)
    if errors:
        raise SystemExit(f"{len(errors)} resource pack problem(s)")
    print("Resource packs, shader pack and their configs are consistent.")


def colorwheel_errors(lock, shaders):
    patcher = next((p for p in lock["projects"] if p["slug"].get("curseforge") == "colorwheel-patcher"), None)
    if not patcher:
        return []
    with zipfile.ZipFile(io.BytesIO(fetch(patcher["files"][0]["url"]))) as z:
        patches = json.loads(z.read("config.json"))["patches"]
    errors = []
    for shader in shaders:
        # Same test as the patcher: the file name contains the shader name and one of its versions.
        if not any(p["shaderName"] in shader and any(v in shader for v in p["versions"]) for p in patches):
            supported = "; ".join(f"{p['shaderName']} {', '.join(p['versions'])}" for p in patches)
            errors.append(f"Colorwheel Patcher {patcher['files'][0]['file_name']} cannot patch {shader} "
                          f"(supported: {supported})")
    return errors


def coverage_report(args, lock, packs):
    known = set()
    if args.download_client:
        known |= asset_names(client_jar(args.download_client))
    jars = [pathlib.Path(j) for j in args.jar]
    for d in args.jar_dir:
        jars += sorted(pathlib.Path(d).glob("*.jar"))
    for jar in jars:
        known |= asset_names(jar)
    # KubeJS serves kubejs/assets as a resource pack (placeholders for Society Tweaks, #22).
    known |= {"assets/" + p.relative_to("kubejs/assets").as_posix()
              for p in pathlib.Path("kubejs/assets").rglob("*") if p.is_file()}
    have = {j.name for j in jars}
    pack_data = {}

    def load(project):
        f = project["files"][0]
        return project["type"], f["file_name"], fetch(f["url"])

    todo = [p for p in lock["projects"] if p["type"] == "RESOURCE_PACK"
            or (args.jars_from_lock and p["type"] == "MOD" and p["files"][0]["file_name"] not in have)]
    with concurrent.futures.ThreadPoolExecutor(8) as pool:
        for kind, name, data in pool.map(load, todo):
            if kind == "MOD":
                known |= asset_names(data)
            else:
                pack_data[name] = data
    pack_data[OVERRIDES_ZIP.name] = OVERRIDES_ZIP.read_bytes()
    namespaces = {n.split("/")[1] for n in known}

    rows = []
    print(f"\n{'Pack':45} {'format':>8} {'files':>6} {'match':>6}  unknown namespaces")
    for name, data in sorted(pack_data.items()):
        fmt, supported = pack_format(data)
        files = [n for n in asset_names(data) if n.split("/")[2:3] and n.split("/")[2] in CHECKED_KINDS
                 and not n.endswith(".mcmeta")]
        hits = sum(1 for n in files if n in known)
        unknown = sorted({n.split("/")[1] for n in files} - namespaces)
        share = f"{100 * hits // len(files)}%" if files else "-"
        if isinstance(supported, dict):
            supported = [supported.get("min_inclusive"), supported.get("max_inclusive")]
        fmt_text = f"{fmt}" + (f" ({supported[0]}-{supported[1]})" if isinstance(supported, list) else "")
        print(f"{name:45} {fmt_text:>8} {len(files):>6} {share:>6}  {', '.join(unknown)}")
        rows.append({"name": name, "format": fmt_text, "total": len(files), "share": share,
                     "unknown": ", ".join(unknown)})
    return rows


if __name__ == "__main__":
    os.chdir(pathlib.Path(__file__).resolve().parents[2])
    main()
