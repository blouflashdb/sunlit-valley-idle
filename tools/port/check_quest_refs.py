#!/usr/bin/env python3
"""Lists every id in the FTB Quests book (config/ftbquests/quests) that does not resolve on 1.21.1 (#18).

It reads the quest files and the quest texts (kubejs/assets/ftbquestlocalizer/lang/en_us.json) and checks:
  - items: task, reward and icon items and the item(...) ids of FTB Filter System smart filters;
  - item tags: item_tag(...) of smart filters;
  - blocks (break tasks), entities (observation tasks), biomes and dimensions;
  - images: chapter images and {image:...} in quest descriptions.
An id resolves when one of these has it:
  - the registry dump of a server boot (--registry; tools/port/kubejs_tests/registryDump.js writes it): items,
    blocks, entities, item tags, biomes and dimensions are then checked against the real registries;
  - the jars (--jar, --jar-dir, --download-client) and the repository (kubejs/assets, kubejs/data, the sunlitidle
    mod resources): the image files, and without --registry an item model, blockstate, lang key, recipe or
    block loot table of the item, a lang key of the entity and a data file of the tag, biome or dimension. Mods
    that register items in code only (crop seeds, wood variants) then show up as false positives;
  - without --registry, also what the KubeJS startup scripts register (collect_registered_assets.mjs) and the
    tags the KubeJS scripts name.
Without --registry and jars, only ids of LOCAL_NAMESPACES are checked; the others are counted as
unchecked. CI (server-boot job) passes the registry dump, the server's mod jars and the client jar; the target
is 0 unresolved ids. questsTest.js also checks the items in game.

Usage (from the repository root):
    python3 tools/port/check_quest_refs.py [--registry build/server/kubejs/registry_dump.json]
        [--jar-dir build/server/mods] [--download-client 1.21.1]
"""
import argparse
import io
import json
import pathlib
import re
import subprocess
import sys
import zipfile

sys.path.insert(0, str(pathlib.Path(__file__).parent))
sys.path.insert(0, str(pathlib.Path(__file__).parent / "assets"))
import ftb_snbt  # noqa: E402
from ftb_snbt import Raw  # noqa: E402

QUESTS = pathlib.Path("config/ftbquests/quests")
QUEST_LANG = pathlib.Path("kubejs/assets/ftbquestlocalizer/lang/en_us.json")
LOCAL_ASSETS = [pathlib.Path("kubejs/assets"), pathlib.Path("mod/src/main/resources/assets")]
LOCAL_DATA = [pathlib.Path("kubejs/data"), pathlib.Path("mod/src/main/resources/data")]
SCRIPTS = [pathlib.Path("kubejs/startup_scripts"), pathlib.Path("kubejs/server_scripts")]
# Namespaces whose content only the repository provides: the KubeJS scripts (society and the rebuilt mods without
# a 1.21.1 build) and the sunlitidle mod.
LOCAL_NAMESPACES = ("society", "sunlitidle", "botania_seeds", "croptania", "vintagedelight")
FILTER_ITEM = re.compile(r"item\(([a-z0-9_.\-]+:[a-z0-9_./\-]+)\)")
FILTER_TAG = re.compile(r"item_tag\(([a-z0-9_.\-]+:[a-z0-9_./\-]+)\)")
TEXT_IMAGE = re.compile(r"\{image:([a-z0-9_.\-]+:[a-z0-9_./\-]+)")


class Known:
    """Everything the registry dump, the jars and the repository provide."""

    def __init__(self, jars, registry):
        self.files = set()  # "assets/ns/..." and "data/ns/..." paths
        self.lang = set()
        for jar in jars:
            with zipfile.ZipFile(jar) as z:
                self.read_jar(z)
        for root in LOCAL_ASSETS + LOCAL_DATA:
            for path in root.rglob("*"):
                if path.is_file():
                    self.files.add(f"{root.name}/{path.relative_to(root).as_posix()}")
                    if path.name == "en_us.json" and path.parent.name == "lang":
                        self.read_lang(path.read_bytes())
        self.recipe_names = {}
        for f in self.files:
            parts = f.split("/")
            if parts[0] == "data" and len(parts) > 4 and parts[2] == "advancement" and parts[3] == "recipes":
                self.recipe_names.setdefault(parts[1], set()).add(parts[-1].removesuffix(".json"))
        self.registry = {key: set(ids) for key, ids in registry.items()} if registry is not None else None
        self.registered = registered_items() if registry is None else set()
        self.script_text = "\n".join(p.read_text(encoding="utf-8", errors="replace")
                                     for root in SCRIPTS for p in root.rglob("*.js"))
        self.checks_jars = bool(jars)
        self.local_namespaces = set(LOCAL_NAMESPACES)

    def read_jar(self, z):
        for name in z.namelist():
            if name.startswith(("assets/", "data/")):
                self.files.add(name)
                if name.endswith("/lang/en_us.json"):
                    self.read_lang(z.read(name))
            elif name.startswith("META-INF/jarjar/") and name.endswith(".jar"):
                # mods that ship their content in a nested jar (Oreganized)
                with zipfile.ZipFile(io.BytesIO(z.read(name))) as inner:
                    self.read_jar(inner)

    def read_lang(self, raw):
        try:
            self.lang.update(json.loads(raw.decode("utf-8-sig")))
        except (ValueError, UnicodeDecodeError):
            pass

    def checkable(self, kind, rl):
        """Without the registry dump and the jars, only ids of namespaces the repository has are checked."""
        if kind == "image":
            return self.checks_jars or self.image(rl) or rl.split(":")[0] in self.local_namespaces
        return self.registry is not None or self.checks_jars or rl.lstrip("#").split(":")[0] in self.local_namespaces

    def item(self, rl):
        if self.registry is not None:
            return rl in self.registry["items"]
        ns, path = rl.split(":", 1)
        return (rl in self.registered
                or f"assets/{ns}/models/item/{path}.json" in self.files
                or f"assets/{ns}/blockstates/{path}.json" in self.files
                or f"item.{ns}.{path}" in self.lang or f"block.{ns}.{path}" in self.lang
                # items that only data names: a recipe of the same name or a block loot table
                or path in self.recipe_names.get(ns, ())
                or f"data/{ns}/loot_table/blocks/{path}.json" in self.files)

    def block(self, rl):
        if self.registry is not None:
            return rl in self.registry["blocks"]
        ns, path = rl.split(":", 1)
        return (rl in self.registered or f"assets/{ns}/blockstates/{path}.json" in self.files
                or f"block.{ns}.{path}" in self.lang)

    def entity(self, rl):
        if self.registry is not None:
            return rl in self.registry["entities"]
        ns, path = rl.split(":", 1)
        return f"entity.{ns}.{path}" in self.lang

    def tag(self, rl):
        if self.registry is not None:
            return rl in self.registry["item_tags"]
        ns, path = rl.split(":", 1)
        return (f"data/{ns}/tags/item/{path}.json" in self.files
                or f'"{rl}"' in self.script_text or f"'{rl}'" in self.script_text)

    def biome(self, rl):
        if self.registry is not None:
            return rl.lstrip("#") in self.registry["biome_tags" if rl.startswith("#") else "biomes"]
        ns, path = rl.lstrip("#").split(":", 1)
        kind = "tags/worldgen/biome" if rl.startswith("#") else "worldgen/biome"
        return f"data/{ns}/{kind}/{path}.json" in self.files

    def dimension(self, rl):
        if self.registry is not None:
            return rl in self.registry["dimensions"]
        ns, path = rl.split(":", 1)
        return ns == "minecraft" or f"data/{ns}/dimension/{path}.json" in self.files

    def image(self, rl):
        ns, path = rl.split(":", 1)
        return f"assets/{ns}/{path}" in self.files


def registered_items():
    out = subprocess.run(["node", "tools/port/assets/collect_registered_assets.mjs", "kubejs"],
                         capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(f"collect_registered_assets.mjs failed:\n{out.stderr}")
    registered = json.loads(out.stdout)
    ids = {entry["id"] for kind in ("items", "blocks") for entry in registered.get(kind, [])}
    # KubeJS adds the seeds of a crop block and the bucket of a fluid itself
    ids |= {f"{entry['id']}_seeds" for entry in registered.get("blocks", []) if entry["type"] == "crop"}
    fluids = (pathlib.Path("kubejs/startup_scripts/fluids/registerFluids.js")).read_text()
    ids |= {f"{fluid}_bucket" for fluid in re.findall(r'^\s*\["([a-z0-9_]+:[a-z0-9_/]+)"', fluids, re.M)}
    return ids


def stack_ids(value):
    """Item ids of an item stack: an id string or {id, components}, smart filters included."""
    if isinstance(value, Raw):
        return [("item", value.text)] if ":" in value.text else []
    if not isinstance(value, dict) or "id" not in value:
        return []
    ids = [("item", value["id"].text)]
    expression = value.get("components", {}).get("ftbfiltersystem:filter")
    if expression is not None:
        ids += [("item", i) for i in FILTER_ITEM.findall(expression.text)]
        ids += [("tag", t) for t in FILTER_TAG.findall(expression.text)]
    return ids


def references(value, where, out):
    """Collects (kind, id, where) from a quest file."""
    if isinstance(value, list):
        for v in value:
            references(v, where, out)
        return
    if not isinstance(value, dict):
        return
    task_type = value.get("type").text if isinstance(value.get("type"), Raw) else None
    for key, v in value.items():
        if key in ("item", "icon"):
            out += [(kind, rl, where) for kind, rl in stack_ids(v)]
        elif key == "image" and isinstance(v, Raw):
            out.append(("image", v.text, where))
        elif key == "block" and isinstance(v, Raw) and task_type == "questsadditions:break":
            out.append(("block", v.text, where))
        elif key == "to_observe" and isinstance(v, Raw) and task_type == "observation":
            observe = value.get("observe_type")
            kind = "entity" if observe is not None and observe.text in ("5", "entity_type") else "block_or_entity"
            out.append((kind, v.text, where))
        elif key in ("biome", "dimension") and isinstance(v, Raw) and task_type == key:
            out.append((key, v.text, where))
        else:
            references(v, where, out)


def collect():
    refs = []
    for path in sorted(QUESTS.rglob("*.snbt")):
        references(ftb_snbt.read(path.read_text()), path.relative_to(QUESTS).as_posix(), refs)
    for key, text in json.loads(QUEST_LANG.read_text(encoding="utf-8")).items():
        refs += [("image", rl, key) for rl in TEXT_IMAGE.findall(text)]
    return refs


def resolves(known, kind, rl):
    if kind == "block_or_entity":
        return known.entity(rl) or known.block(rl)
    return getattr(known, kind)(rl)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--jar", action="append", default=[], help="jar whose assets and data count as present")
    ap.add_argument("--jar-dir", action="append", default=[], help="folder of jars, such as build/server/mods")
    ap.add_argument("--download-client", metavar="VERSION", help="download this Minecraft client jar and use it")
    ap.add_argument("--registry", help="registry dump of a server boot (tools/port/kubejs_tests/registryDump.js)")
    args = ap.parse_args()

    jars = [pathlib.Path(j) for j in args.jar]
    for folder in args.jar_dir:
        jars += sorted(pathlib.Path(folder).glob("*.jar"))
    if args.download_client:
        from check_placeholders import download_client
        dest = pathlib.Path("build") / f"minecraft-{args.download_client}-client.jar"
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists():
            download_client(args.download_client, dest)
        jars.append(dest)
    registry = json.loads(pathlib.Path(args.registry).read_text()) if args.registry else None
    known = Known(jars, registry)

    unresolved = {}
    unchecked = set()
    refs = collect()
    for kind, rl, where in refs:
        if not known.checkable(kind, rl):
            unchecked.add(f"{kind} {rl}")
            continue
        if not resolves(known, kind, rl):
            unresolved.setdefault((kind, rl), []).append(where)

    print(f"{len(refs)} references, {len({(k, r) for k, r, _ in refs})} distinct ids, {len(jars)} jars")
    if unchecked:
        print(f"{len(unchecked)} ids not checked (pass --registry or the mod jars with --jar-dir to check them)")
    for (kind, rl), places in sorted(unresolved.items()):
        shown = ", ".join(sorted(set(places))[:3])
        print(f"  unresolved {kind} {rl} ({len(places)}x: {shown})")
    print(f"{len(unresolved)} unresolved ids")
    if unresolved:
        sys.exit(1)


if __name__ == "__main__":
    main()
