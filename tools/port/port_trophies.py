#!/usr/bin/env python3
"""Ports the Trofers trophies (kubejs/_unported/data/trofers/trofers) to Trofers for 1.21.1 (#18).

Trofers 1.21.1 reads trophies from the datapack registry trofers:trophies (data/<ns>/trofers/trophies/*.json):
  - item {item, count, nbt} becomes {id, count, components}; the NBT is dropped (it only posed the item:
    a butterfly variant, relic charges);
  - display.offset {x, y, z} becomes a list [x, y, z];
  - effects.sound.soundEvent becomes effects.sound.id, effects.rewards.lootTable becomes loot_table.
A trophy whose item is in MISSING_ITEMS (no 1.21.1 item) uses the replacement given there. The loot tables
(data/trofers/loot_table) keep their format. Writes kubejs/data/trofers/... and deletes the unported files.

Run from the repository root: python3 tools/port/port_trophies.py
"""
import json
import pathlib
import shutil

SOURCE = pathlib.Path("kubejs/_unported/data/trofers")
TARGET = pathlib.Path("kubejs/data/trofers")
# Trophy items without a 1.21.1 item, with what the trophy shows instead.
MISSING_ITEMS = {}


def port_trophy(data):
    out = dict(data)
    item = out.pop("item", None)
    if item is not None:
        item_id = MISSING_ITEMS.get(item["item"], item["item"])
        out["item"] = {"id": item_id, "count": item.get("count", 1)}
    display = out.get("display")
    if display and isinstance(display.get("offset"), dict):
        offset = display["offset"]
        display["offset"] = [offset.get("x", 0), offset.get("y", 0), offset.get("z", 0)]
    if isinstance(display, dict) and isinstance(display.get("rotation"), dict):
        rotation = display["rotation"]
        display["rotation"] = [rotation.get("x", 0), rotation.get("y", 0), rotation.get("z", 0)]
    effects = out.get("effects", {})
    if "sound" in effects:
        sound = effects["sound"]
        effects["sound"] = {"id": sound["soundEvent"], **{k: v for k, v in sound.items() if k != "soundEvent"}}
    if "rewards" in effects:
        rewards = effects["rewards"]
        if "lootTable" in rewards:
            rewards["loot_table"] = rewards.pop("lootTable")
    return out


def main():
    trophies = sorted((SOURCE / "trofers").glob("*.json"))
    for path in trophies:
        target = TARGET / "trofers/trophies" / path.name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(port_trophy(json.loads(path.read_text())), indent=2) + "\n")
    for path in sorted((SOURCE / "loot_table").rglob("*.json")):
        target = TARGET / path.relative_to(SOURCE)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
    shutil.rmtree(SOURCE)
    print(f"{len(trophies)} trophies ported")


if __name__ == "__main__":
    main()
