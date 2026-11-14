#!/usr/bin/env python3
"""Ports the worn blueprints of config/portable_blueprints/world_injection_worn_blueprints to 1.21.1 (#16).

Blocks that 1.21.1 mods do not register (a CI probe of blueprintsTest.js) become a close block of the pack
(REMAPPED_BLOCKS / REMAPPED_PATTERNS) or air. A replaced block keeps only the block state properties its new block
has (TARGET_PROPERTIES), and loses its block entity data. Also writes tools/port/kubejs_tests/blueprintBlocksData.js,
the block list that blueprintsTest.js checks.

Run from the repository root: python3 tools/port/port_blueprints.py
"""
import json
import pathlib
import re

BLUEPRINTS = pathlib.Path("config/portable_blueprints/world_injection_worn_blueprints")
TEST_DATA = pathlib.Path("tools/port/kubejs_tests/blueprintBlocksData.js")

REMAPPED_BLOCKS = {
    "beachparty:dried_wheat_slab": "minecraft:bamboo_mosaic_slab",
    "createutilities:void_steel_bars": "minecraft:iron_bars",
    "decorative_blocks:lattice": "minecraft:oak_trapdoor",
    "fantasyfurniture:decorations/brewing_cauldron": "minecraft:cauldron",
    "farmersdelight:basket": "farmersdelight:wooden_basket",
    "meadow:highland_wool": "minecraft:brown_wool",
    "meadow:pine_barn_door": "meadow:pine_door",
    "meadow:pine_barn_trapdoor": "meadow:pine_trapdoor",
    "minecraft:grass": "minecraft:short_grass",
    "moreminecarts:chiseled_organic_glass": "minecraft:glass",
    "moreminecarts:greenhouse_glass_stairs": "minecraft:glass",
    "moreminecarts:wooden_rail": "minecraft:rail",
    "quark:nether_brick_trapped_chest": "minecraft:trapped_chest",
    "railways:dripstone_hinged_locometal_door": "minecraft:iron_door",
    # Society Tweaks wallpapers and baseboards: the Cluttered wallpapers of the same colours.
    "society:bee_wallpaper": "cluttered:marigold_wallpaper",
    "society:hive_wallpaper": "cluttered:marigold_wallpaper",
    "society:hive_baseboard": "cluttered:rialto_wallpaper_lower_trim",
    "society:bunny_wallpaper": "cluttered:pink_striped_wallpaper",
    "society:bunny_baseboard": "cluttered:pink_striped_wallpaper_lower_trim",
    "society:cloud_wallpaper": "cluttered:mint_wallpaper",
    "society:cloud_baseboard": "cluttered:mint_wallpaper_bottom",
    "society:pink_flower_wallpaper": "cluttered:checkered_pink_wallpaper",
    "society:pink_flower_baseboard": "cluttered:chic_wallpaper_lower_trim",
    "society:boysenberry_crate": "minecraft:barrel",
    "society:cranberry_crate": "minecraft:barrel",
    "society:crystalberry_crate": "minecraft:barrel",
    "society:salmonberry_crate": "minecraft:barrel",
    "species:alphacene_grass": "minecraft:short_grass",
    "vanillabackport:pale_oak_trapdoor": "minecraft:birch_trapdoor",
    "everycomp:db/vanillabackport/pale_oak_support": "minecraft:stripped_birch_log",
    "verdantvibes:ivy": "minecraft:vine",
    "verdantvibes:parlour_palm": "minecraft:potted_fern",
    "vinery:flower_box": "minecraft:flower_pot",
    "vinery:flower_pot_big": "minecraft:flower_pot",
    "vintagedelight:empty_mason_jar": "minecraft:air",
}
REMAPPED_PATTERNS = (
    (re.compile(r"^decorative_blocks:(.+)_(?:support|beam)$"), r"minecraft:stripped_\1_log"),
    (re.compile(r"^decorative_blocks:(.+)_palisade$"), r"minecraft:\1_fence"),
    (re.compile(r"^decorative_blocks:(.+)_seat$"), r"minecraft:\1_slab"),
    # Every Compat's Decorative Blocks variants of other mods' woods: db/<mod>/<wood>_<block>.
    (re.compile(r"^everycomp:db/([a-z_]+)/(.+)_(?:support|beam)$"), r"\1:\2_log"),
    (re.compile(r"^everycomp:db/([a-z_]+)/(.+)_palisade$"), r"\1:\2_fence"),
    (re.compile(r"^everycomp:db/([a-z_]+)/(.+)_seat$"), r"\1:\2_slab"),
)
SIDES = {"north", "east", "south", "west", "waterlogged"}
# The block state properties a replacement block has, by the end of its id.
TARGET_PROPERTIES = (
    ("_log", {"axis"}),
    ("_fence", SIDES),
    ("iron_bars", SIDES),
    ("_slab", {"type", "waterlogged"}),
    ("_trapdoor", {"facing", "half", "open", "powered", "waterlogged"}),
    ("_door", {"facing", "half", "hinge", "open", "powered"}),
    ("trapped_chest", {"facing", "type", "waterlogged"}),
    ("barrel", {"facing", "open"}),
    ("wooden_basket", {"facing", "waterlogged"}),
    ("minecraft:rail", {"shape"}),
    ("minecraft:vine", {"north", "east", "south", "west", "up"}),
)
STATE = re.compile(r"^<bid>(.*?)</bid>(?:<properties>(.*)</properties>|null)$", re.S)
PROPERTY = re.compile(r"<propertie><name>(.*?)</name>.*?</propertie>;!v!;", re.S)


def remap(name):
    if name in REMAPPED_BLOCKS:
        return REMAPPED_BLOCKS[name]
    for pattern, replacement in REMAPPED_PATTERNS:
        if pattern.match(name):
            return pattern.sub(replacement, name)
    return name


def target_properties(target):
    for suffix, names in TARGET_PROPERTIES:
        if target.endswith(suffix):
            return names
    return set()


def port_state(state):
    """The ported state string, or None when the block stays."""
    match = STATE.match(state)
    name, properties = match.group(1), match.group(2) or ""
    target = remap(name)
    if target == name:
        return None
    allowed = target_properties(target)
    kept = "".join(p.group(0) for p in PROPERTY.finditer(properties) if p.group(1) in allowed)
    return f"<bid>{target}</bid>" + (f"<properties>{kept}</properties>" if kept else "null")


def gson_json(data):
    """JSON the way Portable Blueprints (Gson) writes it, so that a ported file only differs in its blocks."""
    text = json.dumps(data, indent=2, ensure_ascii=False)
    for char in "<>=&'":
        text = text.replace(char, "\\u%04x" % ord(char))
    return text


def block_ids(blueprint):
    ids = set()
    for key in ("BlocksData", "NotSolidBlocksData"):
        for layer in blueprint[key].values():
            for state in layer.values():
                if state:
                    ids.add(STATE.match(state).group(1))
    return ids


def main():
    changed, all_ids, files = {}, set(), 0
    for path in sorted(BLUEPRINTS.glob("*.bp")):
        blueprint = json.loads(path.read_text(encoding="utf-8"))
        touched = False
        for key in ("BlocksData", "NotSolidBlocksData"):
            for layer_key, layer in blueprint[key].items():
                for pos, state in layer.items():
                    if not state:
                        continue
                    ported = port_state(state)
                    if ported is None:
                        continue
                    changed[STATE.match(state).group(1)] = STATE.match(ported).group(1)
                    layer[pos] = ported
                    touched = True
                    blueprint["BlocksNBT"].get(layer_key, {}).pop(pos, None)
        if touched:
            path.write_text(gson_json(blueprint), encoding="utf-8", newline="")
            files += 1
        all_ids |= block_ids(blueprint)
    all_ids.discard("minecraft:air")
    ids = ", ".join(f'"{i}"' for i in sorted(all_ids))
    TEST_DATA.write_text(
        "// Generated by tools/port/port_blueprints.py: the block ids of the worn blueprints.\n"
        f"const blueprintBlockIds = [{ids}];\n"
    )
    for name, target in sorted(changed.items()):
        print(f"  {name} -> {target}")
    print(f"{files} blueprints changed, {len(changed)} blocks replaced, {len(all_ids)} blocks listed")


if __name__ == "__main__":
    main()
