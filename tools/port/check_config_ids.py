#!/usr/bin/env python3
"""Config id sweep: finds namespaced ids in the shipped mod configs that point to mods that are not in the pack.

Mods drop ids of missing mods quietly or report them only in chat (InControl: "Unknown mob 'balloonbox:balloonbox'"),
so the KubeJS error gate does not see them. This script reads the registry dump of a server boot
(tools/port/kubejs_tests/registryDump.js writes kubejs/registry_dump.json with the loaded mod ids and the registries),
and the mod ids of the client install (tools/port/check_mod_deps.py --mod-ids-out, for client-only mods),
collects every quoted "namespace:path" id in config/, defaultconfigs/ and configureddefaults/config/ and reports:
- ids whose namespace is neither a loaded mod id nor a namespace of any dumped registry (dropped mods),
- in the InControl rules (config/incontrol/*.json), mobs, items, blocks, biomes, dimensions and structures that are
  not in the registries, with the "N=" weight prefix of item lists removed (renamed or removed ids of mods that
  are still in the pack, such as wildernature:flamingo).

Known exceptions (for example default lists of a mod that name other mods on purpose) go into
tools/port/config_id_allowlist.txt, one entry per line:
    <reason> | <glob of the config file, relative to the repository> | <python regex for the id>
Entries that matched nothing are reported as stale.

Usage (from the repository root):
    python3 tools/port/check_config_ids.py --registry build/server/kubejs/registry_dump.json \
        [--mod-ids build/mod-ids-client.json]
"""
import argparse
import fnmatch
import json
import pathlib
import re
import sys

ROOTS = ("config", "defaultconfigs", "configureddefaults/config")
SUFFIXES = {".toml", ".json", ".json5", ".snbt", ".cfg", ".txt", ".properties", ".yml", ".yaml"}
DEFAULT_ALLOWLIST = pathlib.Path(__file__).with_name("config_id_allowlist.txt")
# A quoted id, optionally with an InControl weight ("3=") or a tag marker ("#"). Namespaces follow the vanilla
# ResourceLocation rules; the path must start with a letter or digit, so "http://" and "12:30" do not match.
QUOTED_ID = re.compile(r"""["']((?:[0-9.]+=)?#?)([a-z_][a-z0-9_.-]*):([a-z0-9_][a-z0-9_./-]*)["']""")
# Namespaces that are not mod ids but are valid in configs.
BUILTIN_NAMESPACES = {"minecraft", "c", "neoforge", "brigadier"}
# Placeholder namespaces of the examples in the default comments of mod configs.
PLACEHOLDER_NAMESPACES = {"modid", "othermodid", "othermod", "mod_id", "examplemod", "example"}
# The InControl keys whose values are ids of one registry (1.21 InControl, config/incontrol/*.json).
INCONTROL_KEYS = {
    "mob": "entities", "mob_not": "entities", "mobsfrombiome": None,
    "helditem": "items", "playerhelditem": "items", "offhanditem": "items", "bothhandsitem": "items",
    "armorhelmet": "items", "armorchest": "items", "armorlegs": "items", "armorboots": "items",
    "armortype": None, "item": "items", "give": "items", "drop": "items", "removeall": None,
    "block": "blocks", "biome": "biomes", "dimension": "dimensions", "structure": "structures",
    "mod": "mods",
}


def load_allowlist(path):
    entries = []
    path = pathlib.Path(path)
    if not path.exists():
        return entries
    for number, raw in enumerate(path.read_text().splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = [part.strip() for part in line.split("|")]
        if len(parts) != 3:
            raise SystemExit(f"{path}:{number}: expected '<reason> | <file glob> | <id regex>', got {raw!r}")
        entries.append({"reason": parts[0], "glob": parts[1], "pattern": re.compile(parts[2]), "hits": 0})
    return entries


def allowed(allowlist, rel, rl):
    for entry in allowlist:
        if fnmatch.fnmatch(rel, entry["glob"]) and entry["pattern"].fullmatch(rl):
            entry["hits"] += 1
            return entry
    return None


def config_files(repo):
    for root in ROOTS:
        base = repo / root
        if not base.exists():
            continue
        for path in sorted(base.rglob("*")):
            if path.is_file() and path.suffix.lower() in SUFFIXES:
                yield path


def known_namespaces(registry, extra_mods=()):
    namespaces = set(BUILTIN_NAMESPACES) | PLACEHOLDER_NAMESPACES | set(registry.get("mods", [])) | set(extra_mods)
    for key, ids in registry.items():
        if key == "mods":
            continue
        namespaces |= {rl.lstrip("#").split(":", 1)[0] for rl in ids if ":" in rl}
    return namespaces


def incontrol_values(node, key=None):
    """(key, value) of every string under an InControl key, through nested lists and objects."""
    if isinstance(node, dict):
        for k, v in node.items():
            yield from incontrol_values(v, k)
    elif isinstance(node, list):
        for v in node:
            yield from incontrol_values(v, key)
    elif isinstance(node, str) and key in INCONTROL_KEYS:
        yield key, node


def check_incontrol(path, registry):
    """Ids of InControl rules that are not in the registries, as (line, id, message)."""
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError as e:
        return [(e.lineno, "", f"JSON error: {e.msg}")]
    found = []
    text = path.read_text()
    sets = {key: set(ids) for key, ids in registry.items()}
    for key, value in incontrol_values(data):
        kind = INCONTROL_KEYS[key]
        if kind is None:
            continue
        rl = re.sub(r"^[0-9.]+=", "", value)
        if kind == "mods":
            ok = rl in sets.get("mods", ())
        elif rl.startswith("#"):
            tags = {"items": "item_tags", "biomes": "biome_tags"}.get(kind)
            ok = tags is None or tags not in sets or rl[1:] in sets[tags]
        elif ":" not in rl or rl.startswith("{"):
            continue  # names without a namespace (mobsfrombiome "monster") and NBT objects
        elif kind not in sets:
            continue  # old dump without that registry
        else:
            ok = rl in sets[kind]
        if not ok:
            line = text[:text.find(f'"{value}"')].count("\n") + 1 if f'"{value}"' in text else 0
            found.append((line, rl, f"'{key}' names {rl}, which is not in the {kind} of the pack"))
    return found


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--registry", required=True, help="kubejs/registry_dump.json of a server boot")
    ap.add_argument("--mod-ids", action="append", default=[],
                    help="JSON list of more mod ids, such as the client-only mods (check_mod_deps.py --mod-ids-out)")
    ap.add_argument("--allowlist", default=str(DEFAULT_ALLOWLIST))
    ap.add_argument("--repo", default=".")
    args = ap.parse_args()
    repo = pathlib.Path(args.repo).resolve()
    registry = json.loads(pathlib.Path(args.registry).read_text())
    if not registry.get("mods"):
        raise SystemExit("the registry dump has no mod list; it is from an older registryDump.js")
    extra_mods = [m for path in args.mod_ids for m in json.loads(pathlib.Path(path).read_text())]
    namespaces = known_namespaces(registry, extra_mods)
    allowlist = load_allowlist(args.allowlist)

    problems = []
    allowed_hits = []
    for path in config_files(repo):
        rel = path.relative_to(repo).as_posix()
        text = path.read_text(errors="replace")
        seen = set()
        for m in QUOTED_ID.finditer(text):
            namespace = m.group(2)
            rl = f"{m.group(1).split('=')[-1]}{namespace}:{m.group(3)}"
            if namespace in namespaces or rl in seen:
                continue
            seen.add(rl)
            line = text.count("\n", 0, m.start()) + 1
            entry = allowed(allowlist, rel, rl.lstrip("#"))
            if entry:
                allowed_hits.append((rel, line, rl, entry["reason"]))
            else:
                problems.append((rel, line, rl, f"namespace '{namespace}' is not a mod of the pack"))
        if rel.startswith("config/incontrol/") and path.suffix == ".json":
            for line, rl, message in check_incontrol(path, registry):
                # Ids of unknown namespaces are already listed above; mod names have no namespace.
                if ":" in rl and rl.lstrip("#").split(":")[0] not in namespaces:
                    continue
                if not (rl and allowed(allowlist, rel, rl)):
                    problems.append((rel, line, rl, message))

    print(f"=== Config id sweep: {len(problems)} unexpected, {len(allowed_hits)} allowed "
          f"({len(registry['mods'])} mods loaded)")
    for rel, line, rl, message in problems:
        print(f"  ERROR {rel}:{line}: {rl}: {message}")
    for rel, line, rl, reason in allowed_hits:
        print(f"  allowed ({reason}) {rel}:{line}: {rl}")
    for entry in allowlist:
        if entry["hits"] == 0:
            print(f"  stale allowlist entry ({entry['reason']}), matched nothing: {entry['glob']} | "
                  f"{entry['pattern'].pattern}")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
