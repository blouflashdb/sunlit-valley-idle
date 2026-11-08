"""Builds a CurseForge-importable modpack zip from pakku.json, pakku-lock.json and our mod jar.

The upstream pack is managed with Pakku and targets CurseForge, so every project in the lock file
has a CurseForge project and file id. This script writes the CurseForge manifest itself, copies the
overrides listed in pakku.json and adds the sunlitidle mod jar under overrides/mods when one is
given. Paths listed in EXCLUDE (work-in-progress content that the game must not load) are skipped.

Usage (from the repository root):
    python3 tools/export_curseforge.py --mod-jar mod/build/libs/sunlitidle-0.1.0.jar --version 0.1.0 --out build/pack.zip
"""
import argparse
import json
import pathlib
import zipfile

PACK_NAME = "Sunlit Valley Idle"
PACK_AUTHOR = "blouflashdb"
EXCLUDE = ("kubejs/_unported", "config/_unported")


def excluded(path):
    p = pathlib.Path(path).as_posix()
    return any(p == e or p.startswith(e + "/") for e in EXCLUDE)


def add_tree(zf, src, arc_root):
    src = pathlib.Path(src)
    if src.is_file():
        zf.write(src, f"{arc_root}/{src.as_posix()}")
        return
    for path in sorted(src.rglob("*")):
        if path.is_file() and not excluded(path):
            zf.write(path, f"{arc_root}/{path.as_posix()}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mod-jar", help="sunlitidle jar to bundle; omitted while the mod is not ported")
    parser.add_argument("--version", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    pakku = json.loads(pathlib.Path("pakku.json").read_text())
    lock = json.loads(pathlib.Path("pakku-lock.json").read_text())

    files = []
    for project in lock["projects"]:
        cf = next(f for f in project["files"] if f["type"] == "curseforge")
        files.append({"projectID": int(cf["parent_id"]), "fileID": int(cf["id"]), "required": True})

    loader, loader_version = next(iter(lock["loaders"].items()))
    manifest = {
        "minecraft": {
            "version": lock["mc_versions"][0],
            "modLoaders": [{"id": f"{loader}-{loader_version}", "primary": True}],
        },
        "manifestType": "minecraftModpack",
        "manifestVersion": 1,
        "name": PACK_NAME,
        "version": args.version,
        "author": PACK_AUTHOR,
        "files": files,
        "overrides": "overrides",
    }

    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", json.dumps(manifest, indent=2))
        for entry in pakku.get("overrides", []) + pakku.get("client_overrides", []):
            if pathlib.Path(entry).exists():
                add_tree(zf, entry, "overrides")
        if args.mod_jar:
            jar = pathlib.Path(args.mod_jar)
            zf.write(jar, f"overrides/mods/{jar.name}")
    print(f"Wrote {out} with {len(files)} CurseForge files")


if __name__ == "__main__":
    main()
