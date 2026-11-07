"""Generates the dungeon tier loot tables.

Writes two sets:
- mod/src/main/resources/data/sunlitidle/loot_tables/dungeon: vanilla-only fallbacks shipped in the jar.
- kubejs/data/sunlitidle/loot_tables/dungeon: the pack versions, which override the fallbacks and use
  Sunlit Valley items (geodes, sparkstone, coins).

Run from the repository root: python3 mod/tools/gen_loot_tables.py
"""
import json
import pathlib


def entry(name, weight, lo=1, hi=1):
    e = {"type": "minecraft:item", "name": name, "weight": weight}
    if (lo, hi) != (1, 1):
        e["functions"] = [{"function": "minecraft:set_count",
                           "count": {"type": "minecraft:uniform", "min": lo, "max": hi}}]
    return e


def pool(entries, chance=None):
    p = {"rolls": 1, "entries": entries}
    if chance is not None:
        p["conditions"] = [{"condition": "minecraft:random_chance", "chance": chance}]
    return p


def table(*pools):
    return {"type": "minecraft:chest", "pools": list(pools)}


# Per tier: common drops (always one roll), signature drops and coins (chance pools).
VANILLA = {
    1: table(
        pool([entry("minecraft:bone", 30, 1, 2), entry("minecraft:string", 25, 1, 2),
              entry("minecraft:rotten_flesh", 25, 1, 3), entry("minecraft:coal", 15, 1, 2),
              entry("minecraft:raw_copper", 10, 1, 2), entry("minecraft:cobblestone", 15, 2, 6)]),
    ),
    2: table(
        pool([entry("minecraft:raw_iron", 30, 1, 2), entry("minecraft:redstone", 20, 1, 4),
              entry("minecraft:lapis_lazuli", 15, 1, 4), entry("minecraft:snowball", 15, 2, 6),
              entry("minecraft:bone", 15, 1, 3)]),
    ),
    3: table(
        pool([entry("minecraft:raw_gold", 30, 1, 2), entry("minecraft:blaze_rod", 15),
              entry("minecraft:magma_cream", 20, 1, 2), entry("minecraft:quartz", 20, 1, 4),
              entry("minecraft:diamond", 2)]),
    ),
    4: table(
        pool([entry("minecraft:raw_gold", 25, 1, 3), entry("minecraft:diamond", 10),
              entry("minecraft:emerald", 15, 1, 2), entry("minecraft:ender_pearl", 20),
              entry("minecraft:obsidian", 15, 1, 3), entry("minecraft:glowstone_dust", 15, 2, 6)]),
    ),
    5: table(
        pool([entry("minecraft:diamond", 25, 1, 2), entry("minecraft:emerald", 20, 1, 3),
              entry("minecraft:netherite_scrap", 8), entry("minecraft:wither_skeleton_skull", 2),
              entry("minecraft:ghast_tear", 20), entry("minecraft:blaze_rod", 25, 1, 3)]),
    ),
}

PACK = {
    1: table(
        pool([entry("minecraft:bone", 30, 1, 2), entry("minecraft:string", 25, 1, 2),
              entry("minecraft:rotten_flesh", 20, 1, 3), entry("minecraft:coal", 15, 1, 2),
              entry("minecraft:raw_copper", 10, 1, 2), entry("minecraft:cobblestone", 10, 2, 6)]),
        pool([entry("society:geode", 50), entry("society:earth_crystal", 30, 1, 2),
              entry("society:aquamarine", 20)], chance=0.25),
        pool([entry("numismatics:spur", 80, 2, 8), entry("numismatics:bevel", 20, 1, 2)], chance=0.30),
    ),
    2: table(
        pool([entry("minecraft:raw_iron", 30, 1, 2), entry("minecraft:redstone", 20, 1, 4),
              entry("minecraft:lapis_lazuli", 15, 1, 4), entry("minecraft:snowball", 10, 2, 6),
              entry("minecraft:bone", 15, 1, 3)]),
        pool([entry("society:sparkstone", 60, 1, 2), entry("society:frozen_geode", 30),
              entry("society:frozen_tear", 10)], chance=0.25),
        pool([entry("numismatics:bevel", 70, 1, 4), entry("numismatics:sprocket", 30, 1, 2)], chance=0.30),
    ),
    3: table(
        pool([entry("minecraft:raw_gold", 30, 1, 2), entry("minecraft:blaze_rod", 15),
              entry("minecraft:magma_cream", 20, 1, 2), entry("minecraft:quartz", 20, 1, 4),
              entry("minecraft:diamond", 2)]),
        pool([entry("society:magma_geode", 50), entry("society:fire_quartz", 25),
              entry("society:ruby", 13), entry("society:topaz", 12)], chance=0.25),
        pool([entry("numismatics:sprocket", 70, 1, 3), entry("numismatics:cog", 30, 1, 2)], chance=0.30),
    ),
    # T4: Skull Cavern ruins.
    4: table(
        pool([entry("oreganized:raw_lead", 25, 1, 3), entry("oreganized:raw_silver", 25, 1, 3),
              entry("minecraft:diamond", 10), entry("minecraft:emerald", 15, 1, 2),
              entry("minecraft:ender_pearl", 15), entry("minecraft:obsidian", 10, 1, 3)]),
        pool([entry("society:omni_geode", 50), entry("society:sparkstone", 30, 2, 4),
              entry("society:ghost_crystal", 15), entry("society:prismatic_shard", 5)], chance=0.25),
        pool([entry("numismatics:cog", 75, 1, 3), entry("numismatics:crown", 25)], chance=0.30),
    ),
    # T5: the deep forge.
    5: table(
        pool([entry("minecraft:diamond", 25, 1, 2), entry("minecraft:emerald", 20, 1, 3),
              entry("minecraft:netherite_scrap", 8), entry("minecraft:wither_skeleton_skull", 2),
              entry("minecraft:ghast_tear", 20), entry("minecraft:blaze_rod", 25, 1, 3)]),
        pool([entry("society:omni_geode", 40, 1, 2), entry("society:prismatic_shard", 20),
              entry("society:pristine_aquamarine", 20), entry("minecraft:ancient_debris", 20)], chance=0.25),
        pool([entry("numismatics:crown", 80, 1, 2), entry("numismatics:sun", 20)], chance=0.30),
    ),
}


def write(base, tables):
    out = pathlib.Path(base)
    out.mkdir(parents=True, exist_ok=True)
    for tier, t in tables.items():
        (out / f"tier_{tier}.json").write_text(json.dumps(t, indent=2) + "\n")


write("mod/src/main/resources/data/sunlitidle/loot_tables/dungeon", VANILLA)
write("kubejs/data/sunlitidle/loot_tables/dungeon", PACK)
