#!/usr/bin/env python3
"""Takes the mod configs that NeoForge or a mod corrected during a boot back into the repository.

When a shipped config does not match the mod's current spec (keys renamed, moved or added in the 1.21.1 version),
NeoForge's ConfigTracker logs "Configuration file ... is not correct. Correcting", backs the file up as
<name>-1.toml.bak and writes a corrected file: valid pack values stay, missing keys get their defaults and unknown
keys are dropped. Players get the corrected file on the first start anyway, so shipping it changes nothing in game;
it stops the rewrite and the backup on every new install (the config gate in config_gate.py fails on the backups).

Server configs shipped in defaultconfigs/ are copied to config/ on the first start and corrected there without a
backup. So this script compares every shipped TOML file (config/**, defaultconfigs/* against <instance>/config/*)
with the file in the instance by value (config_gate.rewritten_configs) and prints, for each that differs:
- keys whose value was reset (an invalid pack value, such as an enum constant that was renamed),
- keys that were dropped, each with the added key of the same name in another section, if any (a moved key),
so the pack values of moved or renamed keys can be ported by hand. With --write it copies the corrected files
over the shipped ones and then applies the moved values (same leaf name, same value type) to the copies.

Usage (from the repository root, after a server boot, or with --client after a client boot):
    python3 tools/port/sync_corrected_configs.py --instance build/server [--write]
    python3 tools/port/sync_corrected_configs.py --instance build/client/game --client [--write]
"""
import argparse
import pathlib
import re
import sys
import tomllib

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import config_gate  # noqa: E402


def flat(table, prefix=""):
    out = {}
    for key, value in table.items():
        if isinstance(value, dict):
            out.update(flat(value, f"{prefix}{key}."))
        else:
            out[f"{prefix}{key}"] = value
    return out


def leaf(key):
    return key.rsplit(".", 1)[-1].replace("_", "").lower()


def toml_value(value):
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str):
        return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'
    if isinstance(value, list):
        return "[" + ", ".join(toml_value(v) for v in value) + "]"
    return repr(value)


def set_value(text, key, value):
    """Replaces the value of a dotted key in a NeoForge-written TOML file (one "key = value" line per key)."""
    *sections, name = key.split(".")
    lines = text.split("\n")
    current = []
    for i, line in enumerate(lines):
        header = re.match(r"^\s*\[([^\[\]]+)\]\s*$", line)
        if header:
            current = [part.strip().strip('"') for part in header.group(1).split(".")]
            continue
        m = re.match(r"^(\s*)(\"?)" + re.escape(name) + r"\2\s*=\s*(.*)$", line)
        if m and current == sections:
            if m.group(3).lstrip().startswith("[") and not m.group(3).rstrip().endswith("]"):
                return None  # multi-line array: port by hand
            lines[i] = f"{m.group(1)}{m.group(2)}{name}{m.group(2)} = {toml_value(value)}"
            return "\n".join(lines)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--instance", required=True, help="server or client game folder after a boot")
    ap.add_argument("--write", action="store_true", help="copy the corrected files into the repository")
    ap.add_argument("--client", action="store_true", help="the instance is a client game folder")
    args = ap.parse_args()
    instance = pathlib.Path(args.instance)
    for shipped, corrected in config_gate.rewritten_configs(instance, client=args.client):
        rel = shipped.as_posix()
        old = flat(tomllib.loads(shipped.read_text()))
        new = flat(tomllib.loads(corrected.read_text()))
        added = [k for k in new if k not in old]
        reset = [(k, old[k], new[k]) for k in old if k in new and old[k] != new[k]]
        dropped = [k for k in old if k not in new]
        print(f"== {rel}: {len(reset)} reset, {len(dropped)} dropped, {len(added)} added")
        moves = {}
        for key, before, after in reset:
            print(f"   reset   {key}: {before!r} -> {after!r}")
        for key in dropped:
            match = [a for a in added if leaf(a) == leaf(key)]
            target = match[0] if len(match) == 1 else None
            same_type = target is not None and type(new[target]) is type(old[key])
            note = f" -> moved to {target}" if target else ""
            if target and not same_type:
                note += f" (type changed: {new[target]!r})"
            elif target and new[target] != old[key]:
                note += f" (port {old[key]!r}, default {new[target]!r})"
                moves[target] = old[key]
            print(f"   dropped {key} = {old[key]!r}{note}")
        if args.write:
            text = corrected.read_text()
            for key, value in moves.items():
                updated = set_value(text, key, value)
                if updated is None:
                    print(f"   could not port {key}: edit by hand")
                else:
                    text = updated
            shipped.write_text(text)


if __name__ == "__main__":
    main()
