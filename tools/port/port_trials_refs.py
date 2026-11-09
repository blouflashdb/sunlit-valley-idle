#!/usr/bin/env python3
"""Replaces the ids of Trials (the 1.21 backport mod, not in the 1.21.1 pack) with the vanilla 1.21 ones (#16).

Rewrites the ported scripts and configs in place; kubejs/_unported is left alone.
Run from the repository root: python3 tools/port/port_trials_refs.py
"""
import pathlib
import re

ROOTS = ("kubejs/startup_scripts", "kubejs/server_scripts", "kubejs/client_scripts", "kubejs/data", "config")
SUFFIXES = {".js", ".json", ".snbt", ".bp"}
RENAMED = {
    "trials:waxed_copper_grate_oxidized": "minecraft:waxed_oxidized_copper_grate",
    "trials:waxed_copper_trapdoor_oxidized": "minecraft:waxed_oxidized_copper_trapdoor",
    "trials:trial_key_ominous": "minecraft:ominous_trial_key",
    "trials:trials_chambers": "minecraft:trial_chambers",
}
TRIALS_ID = re.compile(r"trials:[a-z0-9_]+")


def vanilla(match):
    old = match.group(0)
    return RENAMED.get(old, "minecraft:" + old.split(":", 1)[1])


def main():
    changed = 0
    for root in ROOTS:
        for path in sorted(pathlib.Path(root).rglob("*")):
            if path.suffix not in SUFFIXES or "_unported" in path.parts or not path.is_file():
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            new = TRIALS_ID.sub(vanilla, text)
            if new != text:
                path.write_text(new, encoding="utf-8")
                changed += 1
                print("  ", path)
    print(f"{changed} files rewritten")


if __name__ == "__main__":
    main()
