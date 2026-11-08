#!/usr/bin/env python3
"""Check that every society:* item and block the ported KubeJS scripts register has a model and textures.

Society Tweaks (ARR, no 1.21.1 build) used to ship all assets/society/** files. Until there is permission to
bundle them, kubejs/assets holds placeholders (#22):
  - kubejs/assets/minecraft/atlases/blocks.json registers each society:item/... sprite from a texture that is
    already in the pack ("single" sources). A last "directory" source re-adds item/ textures, so real
    society textures from a resource pack or jar replace the placeholders without any change here.
  - kubejs/assets/society/models/block/kubejs/... holds our own machine models (make_machine_placeholder.py).

The script runs collect_registered_assets.mjs (Node) to list what the startup scripts register, then checks:
  1. every item texture and model (including parents) resolves to a file in kubejs/assets, an atlas sprite or,
     with --jar, a file in one of the jars (vanilla client jar and the pack's mods);
  2. every model the machine blockstates in client_scripts/machineBlockstates.js use exists and resolves;
  3. every placeholder sprite source exists in the jars (with --jar) and is not a society:* file itself;
  4. no texture file is in kubejs/assets/society/textures (those would be copies of Society Tweaks).
Without --jar only textures from other namespaces are assumed to exist; CI passes the jars.

Usage (from the repository root):
    python3 tools/port/assets/check_placeholders.py [--jar client.jar] [--jar-dir build/server/mods]
    python3 tools/port/assets/check_placeholders.py --download-client 1.21.1 --jar-dir build/server/mods
"""
import argparse
import json
import pathlib
import re
import subprocess
import sys
import urllib.request
import zipfile

ASSETS = pathlib.Path("kubejs/assets")
ATLAS = ASSETS / "minecraft/atlases/blocks.json"
MANIFEST = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"
UA = {"User-Agent": "sunlit-valley-idle/check-placeholders (github.com/blouflashdb/sunlit-valley-idle)"}
BUILTIN_PARENTS = {"minecraft:builtin/generated", "minecraft:builtin/entity", "builtin/generated", "builtin/entity"}


def rl(value, default_ns="minecraft"):
    value = str(value)
    return value if ":" in value else f"{default_ns}:{value}"


class Resources:
    def __init__(self, jars):
        self.jar_files = set()
        for jar in jars:
            with zipfile.ZipFile(jar) as z:
                self.jar_files.update(n for n in z.namelist() if n.startswith("assets/"))
        self.jar_contents = {}
        self.jars = jars
        self.check_jars = bool(jars)

    def local(self, kind, loc, ext):
        ns, path = rl(loc).split(":", 1)
        return ASSETS / ns / kind / f"{path}{ext}"

    def in_jars(self, kind, loc, ext):
        ns, path = rl(loc).split(":", 1)
        return f"assets/{ns}/{kind}/{path}{ext}" in self.jar_files

    def similar(self, loc):
        """Hint for a renamed texture: files in the same folder that share a word with the missing one."""
        if not self.check_jars:
            return ""
        ns, path = rl(loc).split(":", 1)
        folder, _, name = f"assets/{ns}/textures/{path}".rpartition("/")
        words = {w for w in name.split("_") if len(w) > 3 and w != "raw"}
        found = sorted(f.rpartition("/")[2][:-4] for f in self.jar_files
                       if f.startswith(folder + "/") and f.endswith(".png") and "/" not in f[len(folder) + 1:]
                       and words & set(f.rpartition("/")[2][:-4].split("_")))
        return f" (similar in {ns}: {', '.join(found[:10])})" if found else f" (nothing similar in {ns})"

    def read_jar_json(self, kind, loc):
        ns, path = rl(loc).split(":", 1)
        name = f"assets/{ns}/{kind}/{path}.json"
        for jar in self.jars:
            with zipfile.ZipFile(jar) as z:
                if name in z.namelist():
                    return json.loads(z.read(name))
        return None


def download_client(version, dest):
    with urllib.request.urlopen(urllib.request.Request(MANIFEST, headers=UA), timeout=60) as r:
        manifest = json.load(r)
    entry = next(v for v in manifest["versions"] if v["id"] == version)
    with urllib.request.urlopen(urllib.request.Request(entry["url"], headers=UA), timeout=60) as r:
        url = json.load(r)["downloads"]["client"]["url"]
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r:
        dest.write_bytes(r.read())
    return dest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--jar", action="append", default=[], help="jar whose assets count as present")
    ap.add_argument("--jar-dir", action="append", default=[], help="folder of jars, such as build/server/mods")
    ap.add_argument("--download-client", metavar="VERSION", help="download this Minecraft client jar and use it")
    ap.add_argument("--registered", help="output of collect_registered_assets.mjs (runs it when missing)")
    args = ap.parse_args()

    jars = [pathlib.Path(j) for j in args.jar]
    for folder in args.jar_dir:
        jars += sorted(pathlib.Path(folder).glob("*.jar"))
    if args.download_client:
        dest = pathlib.Path("build") / f"minecraft-{args.download_client}-client.jar"
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists():
            download_client(args.download_client, dest)
        jars.append(dest)
    res = Resources(jars)

    if args.registered:
        registered = json.loads(pathlib.Path(args.registered).read_text())
    else:
        out = subprocess.run(["node", "tools/port/assets/collect_registered_assets.mjs", "kubejs"],
                             capture_output=True, text=True)
        if out.returncode != 0:
            sys.exit(f"collect_registered_assets.mjs failed:\n{out.stderr}")
        registered = json.loads(out.stdout)

    atlas = json.loads(ATLAS.read_text())
    sprites = {}
    for source in atlas["sources"]:
        if source["type"] == "single":
            sprites[rl(source.get("sprite", source["resource"]))] = rl(source["resource"])

    errors = []

    def texture_ok(tex):
        tex = rl(tex)
        if tex in sprites or res.local("textures", tex, ".png").exists():
            return True
        if res.check_jars:
            return res.in_jars("textures", tex, ".png")
        return not tex.startswith("society:")

    def check_model(loc, where, seen=None):
        """Resolve a model and its parents; check every texture it ends up using."""
        loc = rl(loc)
        seen = seen or set()
        textures = {}
        current = loc
        while current and current not in BUILTIN_PARENTS:
            if current in seen:
                errors.append(f"{where}: model loop at {current}")
                return
            seen.add(current)
            local = res.local("models", current, ".json")
            if local.exists():
                data = json.loads(local.read_text())
            elif res.check_jars:
                data = res.read_jar_json("models", current)
                if data is None:
                    errors.append(f"{where}: model {current} does not exist")
                    return
            elif current.startswith("society:"):
                errors.append(f"{where}: model {current} does not exist")
                return
            else:
                return  # another mod's model, only checked with --jar
            for key, value in data.get("textures", {}).items():
                textures.setdefault(key, value)
            current = rl(data["parent"]) if "parent" in data else None
        for key, value in textures.items():
            seen_refs = set()
            while value.startswith("#") and value not in seen_refs:
                seen_refs.add(value)
                value = textures.get(value[1:], value)
            if value.startswith("#"):
                continue  # unresolved reference in a parent template, not used by this model
            if not texture_ok(value):
                errors.append(f"{where}: texture {rl(value)} ({key}) does not exist")

    blocks = {rl(b["id"]): b for b in registered.get("blocks", [])}
    for item in registered["items"]:
        item_id = rl(item["id"])
        ns, path = item_id.split(":", 1)
        where = f"item {item_id}"
        static_model = res.local("models", f"{ns}:item/{path}", ".json")
        if static_model.exists():
            check_model(f"{ns}:item/{path}", where)
        elif item["parentModel"]:
            check_model(item["parentModel"], where)
        elif item["type"] == "block_item" and not item["texture"] and not item["textures"]:
            # KubeJS gives a block item the block's generated model, so the block's textures are what it uses.
            block = blocks.get(item_id)
            if block and block["parentModel"]:
                check_model(block["parentModel"], where)
            elif block:
                layers = [block["texture"] or f"{ns}:block/{path}"] + list(block["textures"].values())
                for tex in layers:
                    if not texture_ok(tex):
                        errors.append(f"{where}: block texture {rl(tex)} does not exist{res.similar(tex)}")
        else:
            layers = [item["texture"]] if item["texture"] else []
            layers += item["textures"].values()
            if not layers:
                layers = [f"{ns}:item/{path}"]
            for tex in layers:
                if not texture_ok(tex):
                    errors.append(f"{where}: texture {rl(tex)} does not exist{res.similar(tex)}")

    machines_js = pathlib.Path("kubejs/client_scripts/machineBlockstates.js").read_text()
    names = re.search(r"const multipartMachines = \[([^\]]*)\]", machines_js)
    machines = re.findall(r"[\"']([\w/]+)[\"']", names.group(1)) if names else []
    for name in machines:
        states = ["", "_off", "_done", "_upgraded", "_off_upgraded", "_done_upgraded", "_particle"]
        for state in states:
            check_model(f"society:block/kubejs/{name}/{name}{state}", f"machine {name}")
    if machines:
        check_model("society:block/kubejs/machine_done", "machine_done")

    for sprite, source in sprites.items():
        if source.startswith("society:"):
            errors.append(f"atlas: placeholder {sprite} comes from {source}; use a texture from vanilla or a mod")
        elif res.check_jars and not res.in_jars("textures", source, ".png") \
                and not res.local("textures", source, ".png").exists():
            errors.append(f"atlas: placeholder source {source} for {sprite} does not exist")

    society_textures = ASSETS / "society/textures"
    if society_textures.exists() and any(p.is_file() for p in society_textures.rglob("*")):
        errors.append(f"{society_textures} has files; Society Tweaks textures must not be in the repository")

    print(f"Checked {len(registered['items'])} items, {len(machines)} machines, {len(sprites)} placeholder sprites"
          f" ({'with' if res.check_jars else 'without'} jars: {len(jars)})")
    for error in sorted(set(errors)):
        print(f"ERROR {error}")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
