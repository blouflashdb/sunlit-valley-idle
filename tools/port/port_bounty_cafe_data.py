#!/usr/bin/env python3
"""Ports the Bountiful bounties and the Cozy Cafe menus from kubejs/_unported/data to kubejs/data for 1.21.1 (#15).

Bountiful 8 (1.21.x) reads pools and decrees in the 1.20.1 format, so they are copied with two changes:
  - entries with an item from data/town_missing_items.txt are left out (an empty pool is not written);
  - criteria conditions use the 1.21 trigger codecs: a fishing hook check sits in the "entity" predicate.
The two recipes move to recipe/<name>.json, where they replace the mod's own recipes, with {"id"} results.

Cozy Cafe 1.21.1 menus drop "product_type" and "themes"; the sell multiplier attribute that scales the price
is "mult_attribute" now. A menu item that is not registered fails its file, so missing items are left out.

Run from the repository root: python3 tools/port/port_bounty_cafe_data.py
"""
import json
import pathlib
import shutil

SRC = pathlib.Path("kubejs/_unported/data")
DST = pathlib.Path("kubejs/data")
MISSING_FILE = pathlib.Path(__file__).parent / "data" / "town_missing_items.txt"
CAFE_FIELDS = ("item", "category", "price", "bowl_food", "bowl", "bottle_drink", "bottle", "flavors")


def missing_items():
    lines = MISSING_FILE.read_text().splitlines()
    return {line.strip() for line in lines if line.strip() and not line.startswith("#")}


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def port_conditions(conditions):
    conditions = dict(conditions)
    hook = conditions.pop("type_specific", {}).get("fishing_hook")
    if hook is not None:
        conditions["entity"] = {"type_specific": {"type": "minecraft:fishing_hook", **hook}}
    return conditions


def port_bounties(missing):
    src, dst = SRC / "bountiful", DST / "bountiful"
    shutil.rmtree(dst / "bounty_pools", ignore_errors=True)
    shutil.rmtree(dst / "bounty_decrees", ignore_errors=True)
    pools, dropped = set(), 0
    for path in sorted((src / "bounty_pools").rglob("*.json")):
        pool = json.loads(path.read_text())
        content = {}
        for key, entry in pool["content"].items():
            if entry["type"] in ("item", "minecraft:item") and entry["content"] in missing:
                dropped += 1
                continue
            if "conditions" in entry:
                entry = dict(entry, conditions=port_conditions(entry["conditions"]))
            content[key] = entry
        if content:
            pools.add(path.stem)
            write(dst / path.relative_to(src), dict(pool, content=content))
    for path in sorted((src / "bounty_decrees").rglob("*.json")):
        decree = json.loads(path.read_text())
        decree["objectives"] = [p for p in decree["objectives"] if p in pools]
        decree["rewards"] = [p for p in decree["rewards"] if p in pools]
        write(dst / path.relative_to(src), decree)
    for path in sorted((src / "recipe").rglob("*.json")):
        recipe = json.loads(path.read_text())
        result = recipe["result"]
        recipe["result"] = {"id": result["item"], "count": result.get("count", 1)}
        write(dst / "recipe" / path.name, recipe)
    print(f"{len(pools)} bounty pools written, {dropped} entries with missing items dropped")


def port_cafe(missing):
    src, dst = SRC / "cozycafe" / "menu", DST / "cozycafe" / "menu"
    shutil.rmtree(dst, ignore_errors=True)
    written, dropped = 0, 0
    for path in sorted(src.rglob("*.json")):
        menu = json.loads(path.read_text())
        if menu["item"] in missing:
            dropped += 1
            continue
        out = {key: menu[key] for key in CAFE_FIELDS if key in menu}
        if menu.get("product_type"):
            out["mult_attribute"] = menu["product_type"]
        write(dst / path.relative_to(src), out)
        written += 1
    print(f"{written} cafe menu items written, {dropped} with missing items dropped")


def main():
    missing = missing_items()
    port_bounties(missing)
    port_cafe(missing)


if __name__ == "__main__":
    main()
