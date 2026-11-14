#!/usr/bin/env python3
"""Stale config keys: keys of a shipped mod config that the mod's own 1.21.1 default config does not have.

A 1.20.1 config whose keys were renamed loses the pack's setting without an error when the mod does not rewrite
the file (for example supplementaries-client.toml: config_button became configs_button). The boot tests therefore
start the pack once more without its configs ("defaults instance": same mods and scripts, empty config/), so every
mod writes its default config, and compare the keys:
- TOML files: every dotted key (tables are walked, arrays are values),
- JSON files: every key of nested objects (arrays are values).
A shipped key that the default file does not have is reported. defaultconfigs/<name> is compared with the default
config/<name>. Files that the mod does not write by default (data such as quests or InControl rules) are skipped.

Intentional extra keys (maps whose keys are data, such as a list of plugin ids) go into
tools/port/config_keys_allowlist.txt: "<reason> | <glob of the shipped file> | <python regex for the key>".

Usage (from the repository root):
    python3 tools/port/config_keys.py --defaults build/server-defaults [--client]
"""
import argparse
import fnmatch
import json
import os
import pathlib
import re
import shutil
import sys
import tomllib

DEFAULT_ALLOWLIST = pathlib.Path(__file__).with_name("config_keys_allowlist.txt")
# Instance folders that the defaults instance links to (large and read-only); other folders are copied, except
# the configs and what a start writes.
LINKED = {"libraries", "mods", "versions", "assets", "resourcepacks", "shaderpacks"}
SKIPPED = {"config", "defaultconfigs", "world", "saves", "logs", "crash-reports", "screenshots", "backups", "local",
           "journeymap", "data", "dynamic-data-pack-cache", "moonlight-global-datapacks", "easy_npc",
           "configureddefaults", "options.txt"}


def defaults_instance(instance, dest):
    """A copy of an instance without its configs: links to the mods and libraries, a copy of everything else."""
    instance, dest = pathlib.Path(instance).resolve(), pathlib.Path(dest).resolve()
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    for entry in instance.iterdir():
        if entry.name in SKIPPED:
            continue
        if entry.name in LINKED:
            os.symlink(entry, dest / entry.name)
        elif entry.is_dir():
            shutil.copytree(entry, dest / entry.name, symlinks=True, ignore=shutil.ignore_patterns("_ci"))
        else:
            shutil.copy2(entry, dest / entry.name)
    return dest


def _toml_keys(table, prefix=""):
    keys = set()
    for key, value in table.items():
        if isinstance(value, dict):
            keys |= _toml_keys(value, f"{prefix}{key}.")
        else:
            keys.add(f"{prefix}{key}")
    return keys


def _json_keys(node, prefix=""):
    keys = set()
    if isinstance(node, dict):
        for key, value in node.items():
            if isinstance(value, dict) and value:
                keys |= _json_keys(value, f"{prefix}{key}.")
            else:
                keys.add(f"{prefix}{key}")
    return keys


def keys(path):
    """The keys of a TOML or JSON config, or None if it is neither or does not parse."""
    try:
        if path.suffix == ".toml":
            return _toml_keys(tomllib.loads(path.read_text()))
        if path.suffix == ".json":
            return _json_keys(json.loads(path.read_text()))
    except (ValueError, UnicodeDecodeError):
        return None
    return None


def shipped_configs(repo=".", client=False):
    """(shipped file, path relative to the instance's config/) of every TOML and JSON mod config."""
    repo = pathlib.Path(repo)
    files = {}
    for p in sorted((repo / "config").rglob("*")):
        if p.is_file() and p.suffix in (".toml", ".json"):
            files[p.relative_to(repo / "config")] = p
    for p in sorted((repo / "defaultconfigs").glob("*")):
        if p.is_file() and p.suffix in (".toml", ".json"):
            files[pathlib.Path(p.name)] = p
    if client:
        for p in sorted((repo / "configureddefaults" / "config").rglob("*")):
            if p.is_file() and p.suffix in (".toml", ".json"):
                files[p.relative_to(repo / "configureddefaults" / "config")] = p
    return sorted((shipped, rel) for rel, shipped in files.items())


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
            raise SystemExit(f"{path}:{number}: expected '<reason> | <file glob> | <key regex>', got {raw!r}")
        entries.append({"owner": parts[0], "glob": parts[1], "pattern": re.compile(parts[2]), "hits": 0})
    return entries


def stale_keys(defaults, label, repo=".", client=False, allowlist=()):
    """Shipped keys that the defaults instance does not have, as (label, message) pairs for the gate."""
    defaults = pathlib.Path(defaults)
    found = []
    for shipped, rel in shipped_configs(repo, client):
        default = defaults / "config" / rel
        if not default.exists():
            continue
        have, want = keys(shipped), keys(default)
        if have is None or want is None:
            continue
        shipped_rel = shipped.relative_to(repo).as_posix() if shipped.is_absolute() else shipped.as_posix()
        for key in sorted(have - want):
            entry = next((e for e in allowlist
                          if fnmatch.fnmatch(shipped_rel, e["glob"]) and e["pattern"].fullmatch(key)), None)
            if entry:
                entry["hits"] += 1
                continue
            found.append((label, f"{shipped_rel}: key '{key}' is not in the mod's 1.21.1 default config"))
    return found


def report_stale(allowlist):
    for entry in allowlist:
        if entry["hits"] == 0:
            print(f"  stale allowlist entry ({entry['owner']}), matched nothing: {entry['glob']} | "
                  f"{entry['pattern'].pattern}")


def main():
    sys.path.insert(0, str(pathlib.Path(__file__).parent))
    import kubejs_log_gate  # noqa: E402

    ap = argparse.ArgumentParser()
    ap.add_argument("--defaults", required=True, help="instance folder that was started without the pack configs")
    ap.add_argument("--client", action="store_true", help="the defaults instance is a client game folder")
    ap.add_argument("--allowlist", default=str(DEFAULT_ALLOWLIST))
    args = ap.parse_args()
    allowlist = load_allowlist(args.allowlist)
    errors = stale_keys(args.defaults, "defaults", client=args.client, allowlist=allowlist)
    failed = kubejs_log_gate.gate(errors, [], "Stale config keys")
    report_stale(allowlist)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
