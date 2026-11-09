#!/usr/bin/env python3
"""Ports the Society overworld structures from kubejs/_unported/data/society to kubejs/data/society for 1.21.1 (#16).

  - structures keep the Moog's Structure Lib jigsaw type; Moog's Voyager Structures 1.21 has no
    "#mvs:has_structure/overworld_biomes" tag any more, so they use "#c:is_overworld" and do not spawn in water;
  - structure set salts must be non-negative ints and the spacing larger than the separation (1.21 codecs);
  - template palettes: blocks of mods that are not in the pack become a close vanilla block (REMAPPED_BLOCKS,
    with the blocks of data/structure_missing_blocks.txt from a CI probe); anything else missing becomes air;
  - the stables chest loot table loses entries with missing items.

Needs nbtlib (pip install nbtlib). Run from the repository root: python3 tools/port/port_structures_data.py
"""
import json
import pathlib
import re
import shutil

import nbtlib

SRC = pathlib.Path("kubejs/_unported/data/society")
DST = pathlib.Path("kubejs/data/society")
DATA = pathlib.Path(__file__).parent / "data"
STRUCTURES = (
    "bench_stop", "blacksmith", "mini_quarry", "rotten_coop", "rotten_farmhouse", "rotten_garden", "rotten_shed",
    "stables", "woodcutter",
)
# Exact replacements; the patterns below cover the rest.
REMAPPED_BLOCKS = {
    "quark:framed_glass_pane": "minecraft:glass_pane",
    "quark:dirt_bricks": "minecraft:packed_mud",
    "quark:sandstone_bricks": "minecraft:cut_sandstone",
    "quark:cobblestone_bricks": "minecraft:stone_bricks",
    "quark:yellow_corundum": "minecraft:yellow_stained_glass",
    "quark:yellow_corundum_cluster": "minecraft:air",
    "quark:azalea_post": "minecraft:oak_fence",
    "quark:cobblestone_bricks_vertical_slab": "minecraft:stone_brick_slab",
    "decorative_blocks:oak_support": "minecraft:stripped_oak_log",
    "decorative_blocks:spruce_support": "minecraft:stripped_spruce_log",
    "decorative_blocks:spruce_beam": "minecraft:stripped_spruce_log",
    "decorative_blocks:spruce_palisade": "minecraft:spruce_fence",
    "decorative_blocks:spruce_seat": "minecraft:spruce_slab",
    "verdantvibes:burnweed": "minecraft:short_grass",
    "verdantvibes:ivy": "minecraft:vine",
    "minecraft:grass": "minecraft:short_grass",
    "verdantvibes:bracket_mushroom": "minecraft:brown_mushroom",
}
REMAPPED_PATTERNS = (
    # Diagonal Fences / Walls wrap the fence or wall of another mod: <mod>/<block>.
    (re.compile(r"^diagonal(?:fences|walls):([a-z_]+)/(.+)$"), r"\1:\2"),
    (re.compile(r"^quark:(.+)_vertical_slab$"), r"minecraft:\1_slab"),
    (re.compile(r"^quark:vertical_(.+)_planks$"), r"minecraft:\1_planks"),
    (re.compile(r"^quark:stripped_(.+)_post$"), r"minecraft:\1_fence"),
    (re.compile(r"^quark:(.+)_post$"), r"minecraft:\1_fence"),
    (re.compile(r"^quark:(.+)_ladder$"), r"minecraft:ladder"),
    (re.compile(r"^quark:(?:flowering_)?azalea_leaf_carpet$"), r"minecraft:moss_carpet"),
    (re.compile(r"^quark:azalea_(log|planks)$"), r"minecraft:oak_\1"),
    (re.compile(r"^quark:blossom_planks_(slab|stairs)$"), r"minecraft:cherry_\1"),
    (re.compile(r"^fantasyfurniture:.+$"), r"minecraft:air"),
    # Every Compat's Decorative Blocks variants of other mods' woods: db/<mod>/<wood>_<block>.
    (re.compile(r"^everycomp:db/([a-z_]+)/(.+)_palisade$"), r"\1:\2_fence"),
    (re.compile(r"^everycomp:db/([a-z_]+)/(.+)_(?:support|beam)$"), r"\1:\2_log"),
    (re.compile(r"^everycomp:db/([a-z_]+)/(.+)_seat$"), r"\1:\2_slab"),
)


def read_list(name):
    path = DATA / name
    if not path.exists():
        return set()
    return {line.strip() for line in path.read_text().splitlines() if line.strip() and not line.startswith("#")}


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def remap(name, missing):
    if name in REMAPPED_BLOCKS:
        return REMAPPED_BLOCKS[name]
    namespace = name.split(":")[0]
    for pattern, replacement in REMAPPED_PATTERNS:
        if pattern.match(name):
            target = pattern.sub(replacement, name)
            return target if target not in missing else "minecraft:air"
    return "minecraft:air" if name in missing or namespace in ("splendid_slimes",) else name


def port_template(src, dst, missing):
    template = nbtlib.load(src)
    palettes = template["palettes"] if "palettes" in template else [template["palette"]]
    changed, replaced = {}, set()
    for palette in palettes:
        for index, state in enumerate(palette):
            name = str(state["Name"])
            target = remap(name, missing)
            if target != name:
                changed[name] = target
                replaced.add(index)
                state["Name"] = nbtlib.String(target)
                if target == "minecraft:air":
                    state.pop("Properties", None)
    # Block entity data of a replaced block would not fit the new block.
    for block in template["blocks"]:
        if int(block["state"]) in replaced and "nbt" in block:
            del block["nbt"]
    dst.parent.mkdir(parents=True, exist_ok=True)
    template.save(dst)
    return changed


def port_salt(salt):
    salt &= 0xFFFFFFFF
    if salt >= 0x80000000:
        salt -= 0x100000000
    return abs(salt)


# Items of the stables loot that 1.21.1 mods do not register.
MISSING_LOOT = {"relics:horse_flute"}


def main():
    missing = read_list("structure_missing_blocks.txt")
    missing_items = read_list("town_missing_items.txt") | missing | MISSING_LOOT
    for folder in ("structure", "structure_set", "template_pool"):
        for name in STRUCTURES:
            (DST / "worldgen" / folder / f"{name}.json").unlink(missing_ok=True)
    changed = {}
    for name in STRUCTURES:
        structure = json.loads((SRC / "worldgen" / "structure" / f"{name}.json").read_text())
        structure["biomes"] = "#c:is_overworld"
        structure["cannot_spawn_in_liquid"] = True
        write(DST / "worldgen" / "structure" / f"{name}.json", structure)

        structure_set = json.loads((SRC / "worldgen" / "structure_set" / f"{name}.json").read_text())
        placement = structure_set["placement"]
        placement["salt"] = port_salt(placement["salt"])
        spacing, separation = placement["spacing"], placement["separation"]
        if separation >= spacing:
            placement["spacing"], placement["separation"] = max(spacing, separation + 1), min(spacing, separation)
        write(DST / "worldgen" / "structure_set" / f"{name}.json", structure_set)

        pool_dst = DST / "worldgen" / "template_pool" / f"{name}.json"
        pool_dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(SRC / "worldgen" / "template_pool" / f"{name}.json", pool_dst)
        changed.update(port_template(SRC / "structure" / f"{name}.nbt", DST / "structure" / f"{name}.nbt", missing))

    loot = json.loads((SRC / "loot_table" / "chests" / "stables.json").read_text())
    for pool in loot["pools"]:
        pool["entries"] = [e for e in pool["entries"] if e.get("name") not in missing_items]
        for entry in pool["entries"]:
            for function in entry.get("functions", []):
                function.pop("treasure", None)  # 1.21 picks enchantments from a tag; the default fits
    write(DST / "loot_table" / "chests" / "stables.json", loot)
    for name, target in sorted(changed.items()):
        print(f"  {name} -> {target}")
    print(f"{len(STRUCTURES)} structures written, {len(changed)} template blocks replaced")


if __name__ == "__main__":
    main()
