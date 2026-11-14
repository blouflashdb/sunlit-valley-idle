#!/usr/bin/env python3
"""Static check of the client defaults (#19): configureddefaults/options.txt must parse and every resource pack it
enables must ship with the pack (a resource pack of pakku-lock.json or a file in resourcepacks/).

Minecraft reads options.txt as one "key:value" per line; two options on one line silently lose the second one.
A resource pack that is enabled but missing (for example a 1.20.1 file name) is silently dropped by the game.

Usage (from the repository root):
    python3 tools/port/check_client_defaults.py
"""
import json
import pathlib
import re
import sys

OPTIONS = pathlib.Path("configureddefaults/options.txt")
KEY = re.compile(r"^[A-Za-z0-9_.]+$")
BINDING = re.compile(r"key\.[\w.\-]+(:[A-Z]+)?")
NEXT_OPTION = re.compile(r"key_[\w.]+:")


def main():
    lock = json.loads(pathlib.Path("pakku-lock.json").read_text())
    shipped = {p["files"][0]["file_name"] for p in lock["projects"] if p["type"] == "RESOURCE_PACK"}
    shipped |= {p.name for p in pathlib.Path("resourcepacks").glob("*")}
    problems = []
    options = {}
    for number, line in enumerate(OPTIONS.read_text().splitlines(), 1):
        if not line.strip():
            continue
        key, sep, value = line.partition(":")
        if not sep or not KEY.match(key):
            problems.append(f"{OPTIONS}:{number}: not a key:value line: {line[:80]!r}")
            continue
        if key.startswith("key_"):
            # Key bindings: key_<name>:key.<input>[:<modifier>]
            if not BINDING.fullmatch(value):
                problems.append(f"{OPTIONS}:{number}: bad key binding {key}: {value[:60]!r}")
        elif NEXT_OPTION.search(value):
            problems.append(f"{OPTIONS}:{number}: two options on one line: {line[:80]!r}")
        options[key] = value
    for pack in json.loads(options.get("resourcePacks", "[]")):
        if pack.startswith("file/") and pack[5:] not in shipped:
            problems.append(f"{OPTIONS}: resourcePacks enables {pack!r}, which the pack does not ship")
    for problem in problems:
        print(problem)
    if problems:
        sys.exit(f"{len(problems)} problems in the client defaults")
    print(f"{OPTIONS}: {len(options)} options, resource packs all shipped")


if __name__ == "__main__":
    main()
