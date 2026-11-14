#!/usr/bin/env python3
"""Ports the Better Archeology and Lootr overrides from kubejs/_unported/data to kubejs/data for 1.21.1 (#16).

  - betterarcheology:structure/temple_jungle: the pack's jungle temple; the Splendid Slimes spawner (the mod is gone,
    slimes are an idle skill now) becomes air like the other missing blocks (port_structures_data.remap);
  - betterarcheology:recipe/bomb: 1.21 recipe results use "id" instead of "item";
  - lootr:loot_table/chests/elytra: the End ship chest gives a dragon egg instead of the elytra, unchanged.

Needs nbtlib (pip install nbtlib). Run from the repository root: python3 tools/port/port_exploration_data.py
"""
import json
import pathlib
import shutil
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from port_structures_data import port_template, read_list  # noqa: E402

SRC = pathlib.Path("kubejs/_unported/data")
DST = pathlib.Path("kubejs/data")


def main():
    missing = read_list("structure_missing_blocks.txt") | {"splendid_slimes:slime_spawner"}
    temple = "betterarcheology/structure/temple_jungle.nbt"
    changed = port_template(SRC / temple, DST / temple, missing)
    for name, target in sorted(changed.items()):
        print(f"  {name} -> {target}")

    recipe = json.loads((SRC / "betterarcheology/recipe/bomb.json").read_text())
    result = recipe["result"]
    recipe["result"] = {"id": result["item"], "count": result.get("count", 1)}
    path = DST / "betterarcheology/recipe/bomb.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(recipe, indent=2) + "\n")

    elytra = "lootr/loot_table/chests/elytra.json"
    (DST / elytra).parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(SRC / elytra, DST / elytra)
    print("temple_jungle, bomb and elytra written")


if __name__ == "__main__":
    main()
