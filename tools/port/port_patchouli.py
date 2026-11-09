#!/usr/bin/env python3
"""Lists what the Patchouli books (patchouli_books/) reference, for the patchouli CI test (#18).

Patchouli renders the books on the client only, so a missing item, entity or block shows up only when a player
opens the page. This collects every entry/category icon and spotlight item, every entity page and every multiblock
mapping (block, block state values, block tag) of all books and languages, and writes
tools/port/kubejs_tests/patchouliData.js for patchouliTest.js.

Run from the repository root: python3 tools/port/port_patchouli.py
"""
import json
import pathlib
import re

BOOKS = pathlib.Path("patchouli_books")
OUT = pathlib.Path("tools/port/kubejs_tests/patchouliData.js")
ID = re.compile(r"^[a-z0-9_.\-]+:[a-z0-9_./\-]+")


def main():
    items, entities, blocks, tags, states = set(), set(), set(), set(), set()

    def item(text):
        for part in text.split(","):
            match = ID.match(part.strip())
            if match:
                items.add(match.group(0))

    def walk(value):
        if isinstance(value, list):
            for v in value:
                walk(v)
            return
        if not isinstance(value, dict):
            return
        if isinstance(value.get("icon"), str) and not value["icon"].endswith(".png"):
            item(value["icon"])
        kind = value.get("type")
        if kind == "patchouli:spotlight" and isinstance(value.get("item"), str):
            item(value["item"])
        if kind == "patchouli:entity" and isinstance(value.get("entity"), str):
            match = ID.match(value["entity"])
            if match:
                entities.add(match.group(0))
        if kind == "patchouli:multiblock" and isinstance(value.get("multiblock"), dict):
            for block in value["multiblock"].get("mapping", {}).values():
                if block.startswith("#"):
                    tags.add(block[1:])
                    continue
                match = re.match(r"^([a-z0-9_.\-]+:[a-z0-9_./\-]+)(?:\[(.*)\])?$", block.strip())
                if not match:
                    continue
                blocks.add(match.group(1))
                for pair in filter(None, (match.group(2) or "").split(",")):
                    key, _, val = pair.strip().partition("=")
                    states.add((match.group(1), key.strip(), val.strip()))
        for v in value.values():
            walk(v)

    for path in sorted(BOOKS.rglob("*.json")):
        walk(json.loads(path.read_text()))

    def js(name, values):
        return f"const {name} = {json.dumps(sorted(values), indent=2)};\n"

    OUT.write_text(
        "// Written by tools/port/port_patchouli.py: what the Patchouli books reference (patchouliTest.js).\n"
        + js("patchouliItems", items)
        + js("patchouliEntities", entities)
        + js("patchouliBlocks", blocks)
        + js("patchouliBlockTags", tags)
        + js("patchouliStates", [list(s) for s in states])
    )
    print(f"{len(items)} items, {len(entities)} entities, {len(blocks)} blocks, {len(tags)} block tags, "
          f"{len(states)} states")


if __name__ == "__main__":
    main()
