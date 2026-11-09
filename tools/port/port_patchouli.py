#!/usr/bin/env python3
"""Ports the Patchouli books (patchouli_books/) to 1.21.1 and lists what they reference for the CI test (#18).

The books (Almanac, Fish Finder) are edited in every language:
  - entries about animals, pets, crops and fish whose mod or 1.21.1 version no longer has them are deleted
    (REMOVED_ENTRIES);
  - ids that changed are replaced (SUBSTITUTES, exact text inside JSON strings);
  - multiblock pages of crops the pack does not rebuild are dropped (NO_MULTIBLOCK).
Running it again changes nothing.

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
# Entry files (relative to <book>/<language>/entries) deleted in every language.
REMOVED_ENTRIES = {
    # Species, Dracovita Farm Life, Hamsters and Nether Vinery are not in the 1.21.1 pack.
    "almanac": ["animals/cruncher.json", "animals/goober.json", "animals/mammutilation.json", "animals/wraptor.json",
                "animals/tri_bull.json", "animals/galliraptor.json", "pets/hamster.json", "crops/nether_grapes.json",
                # Wilder Nature 1.21.1 has no flamingos, penguins, owls or red wolves; Meadow no wooly sheep;
                # Beachparty no palm trees.
                "animals/flamingo.json", "animals/penguin.json", "pets/owl.json", "pets/red_wolf.json",
                "animals/wooly_sheep.json", "trees/letsdo/palm.json"],
    # Unusual Fish Mod 1.21.1 has no Snowflake Tail.
    "fish_finder": ["fish/frosty_fin.json"],
}
SUBSTITUTES = {
    # Vintage Delight crops rebuilt in KubeJS (#10): the crop block is vintagedelight:<crop>, ages 0-5.
    '"vintagedelight:cucumber_crop[age=7]"': '"vintagedelight:cucumber[age=5]"',
    '"vintagedelight:ghost_pepper_crop[age=7]"': '"vintagedelight:ghost_pepper[age=5]"',
    '"vintagedelight:gearo_berry_bush[age=4]"': '"vintagedelight:gearo_berry_bush[age=3]"',
    # icons of items that are gone
    '"candlelight:hearth"': '"minecraft:bone"',
    '"relics:horse_flute"': '"minecraft:saddle"',
    '"meadow:highland_wool"': '"minecraft:brown_wool"',
}
# Entries whose multiblock page shows a crop block the pack does not have (peanuts are not rebuilt).
NO_MULTIBLOCK = {"almanac": ["crops/peanut.json"]}


def edit_books():
    for book, entries in REMOVED_ENTRIES.items():
        for entry in entries:
            for path in (BOOKS / book).glob(f"*/entries/{entry}"):
                path.unlink()
    for book, entries in NO_MULTIBLOCK.items():
        for entry in entries:
            for path in (BOOKS / book).glob(f"*/entries/{entry}"):
                data = json.loads(path.read_text())
                pages = [page for page in data["pages"] if page.get("type") != "patchouli:multiblock"]
                if pages != data["pages"]:
                    data["pages"] = pages
                    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    for path in sorted(BOOKS.rglob("*.json")):
        text = path.read_text()
        edited = text
        for old, new in SUBSTITUTES.items():
            edited = edited.replace(old, new)
        if edited != text:
            path.write_text(edited)


def main():
    edit_books()
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
