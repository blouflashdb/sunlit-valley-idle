"""Generates src/main/resources/data/sunlitidle/idle/skills.json.

Actions whose blocks or items are missing at runtime are hidden, so modded ids are safe to list.
Run: python3 tools/gen_idle_skills.py
"""
import json
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "src", "main", "resources", "data", "sunlitidle", "idle", "skills.json")


def wood(id, level, seconds, xp, log, leaves=None, icon=None):
    drops = [{"block": log}]
    if leaves:
        drops.append({"block": leaves, "chance": 0.5})
    return {"id": id, "level": level, "seconds": seconds, "xp": xp, "icon": icon or log, "drops": drops}


def ore(id, level, tier, seconds, xp, block, icon=None):
    return {"id": id, "level": level, "tool_tier": tier, "seconds": seconds, "xp": xp,
            "icon": icon or block, "drops": [{"block": block}]}


def forage(id, level, seconds, xp, blocks, icon=None):
    return {"id": id, "level": level, "seconds": seconds, "xp": xp, "icon": icon or blocks[0],
            "drops": [{"block": b, "chance": round(1.0 / len(blocks), 3) if len(blocks) > 1 else 1.0}
                      for b in blocks]}


def crop(id, level, seconds, xp, block, seed, icon, extra=None):
    drops = [{"block": block}] + (extra or [])
    return {"id": id, "level": level, "seconds": seconds, "xp": xp, "icon": icon,
            "inputs": [{"item": seed, "count": 1}], "drops": drops}


woodcutting = [
    wood("oak", 0, 3.0, 3, "minecraft:oak_log", "minecraft:oak_leaves"),
    wood("birch", 0, 3.0, 3, "minecraft:birch_log", "minecraft:birch_leaves"),
    wood("spruce", 1, 3.5, 4, "minecraft:spruce_log", "minecraft:spruce_leaves"),
    wood("jungle", 2, 3.5, 4, "minecraft:jungle_log", "minecraft:jungle_leaves"),
    wood("acacia", 2, 3.5, 4, "minecraft:acacia_log", "minecraft:acacia_leaves"),
    wood("dark_oak", 3, 4.0, 5, "minecraft:dark_oak_log", "minecraft:dark_oak_leaves"),
    wood("cherry", 3, 4.0, 5, "minecraft:cherry_log", "minecraft:cherry_leaves"),
    wood("mangrove", 4, 4.5, 6, "minecraft:mangrove_log", "minecraft:mangrove_leaves"),
    wood("maple", 4, 4.5, 6, "autumnity:maple_log", "autumnity:maple_leaves"),
    wood("pine", 5, 5.0, 7, "meadow:pine_log", "meadow:pine_leaves"),
    wood("chestnut", 5, 5.0, 7, "windswept:chestnut_log", "windswept:chestnut_leaves"),
    wood("holly", 5, 5.0, 7, "windswept:holly_log", "windswept:holly_leaves"),
    wood("aspen", 6, 5.5, 8, "atmospheric:aspen_log", "atmospheric:aspen_leaves"),
    wood("laurel", 6, 5.5, 8, "atmospheric:laurel_log", "atmospheric:laurel_leaves"),
    wood("kousa", 6, 5.5, 8, "atmospheric:kousa_log", "atmospheric:kousa_leaves"),
    wood("palm", 7, 6.0, 9, "beachparty:palm_log", "beachparty:palm_leaves"),
    wood("rosewood", 7, 6.0, 9, "atmospheric:rosewood_log", "atmospheric:rosewood_leaves"),
    wood("morado", 7, 6.0, 9, "atmospheric:morado_log", "atmospheric:morado_leaves"),
    wood("yucca", 7, 6.0, 9, "atmospheric:yucca_log", "atmospheric:yucca_leaves"),
    wood("blossom", 8, 6.5, 11, "quark:blossom_log", "quark:blue_blossom_leaves"),
    wood("dark_cherry", 8, 6.5, 11, "vinery:dark_cherry_log", "vinery:dark_cherry_leaves"),
    wood("apple", 8, 6.5, 11, "vinery:apple_log", "vinery:apple_leaves"),
    wood("willow", 9, 7.0, 12, "cluttered:willow_log", "cluttered:willow_leaves"),
    wood("crimson", 9, 7.0, 12, "minecraft:crimson_stem", "minecraft:nether_wart_block"),
    wood("warped", 9, 7.0, 12, "minecraft:warped_stem", "minecraft:warped_wart_block"),
    wood("grimwood", 10, 7.5, 14, "atmospheric:grimwood_log", "atmospheric:grimwood_leaves"),
    wood("azalea", 10, 7.5, 14, "quark:azalea_log", "minecraft:flowering_azalea_leaves"),
    wood("ancient", 11, 8.0, 16, "quark:ancient_log", "quark:ancient_leaves"),
    wood("sappy_maple", 12, 8.0, 18, "autumnity:sappy_maple_log", "autumnity:maple_leaves"),
]

mining = [
    {"id": "stone", "level": 0, "tool_tier": 0, "seconds": 2.5, "xp": 1, "icon": "minecraft:cobblestone",
     "drops": [{"block": "minecraft:stone"}, {"block": "minecraft:andesite", "chance": 0.2},
               {"block": "minecraft:diorite", "chance": 0.2}, {"block": "minecraft:granite", "chance": 0.2}]},
    {"id": "earth", "level": 0, "tool_tier": 0, "seconds": 2.5, "xp": 1, "icon": "minecraft:gravel",
     "drops": [{"block": "minecraft:dirt"}, {"block": "minecraft:gravel", "chance": 0.5},
               {"block": "minecraft:sand", "chance": 0.5}, {"block": "minecraft:clay", "chance": 0.2}]},
    ore("coal", 0, 0, 4.0, 4, "minecraft:coal_ore"),
    ore("copper", 1, 1, 4.0, 5, "minecraft:copper_ore"),
    ore("iron", 2, 1, 5.0, 6, "minecraft:iron_ore"),
    ore("lapis", 3, 1, 5.0, 6, "minecraft:lapis_ore"),
    ore("zinc", 3, 1, 5.0, 7, "create:zinc_ore"),
    ore("salt", 4, 1, 5.0, 6, "meadow:alpine_salt_ore"),
    ore("gold", 4, 2, 5.5, 7, "minecraft:gold_ore"),
    ore("redstone", 4, 2, 5.5, 7, "minecraft:redstone_ore"),
    {"id": "deepslate", "level": 5, "tool_tier": 1, "seconds": 3.0, "xp": 2, "icon": "minecraft:cobbled_deepslate",
     "drops": [{"block": "minecraft:deepslate"}, {"block": "minecraft:tuff", "chance": 0.3},
               {"block": "minecraft:calcite", "chance": 0.1}]},
    ore("geode", 5, 1, 6.0, 8, "society:geode_node"),
    ore("diamond", 6, 2, 8.0, 16, "minecraft:diamond_ore"),
    ore("emerald", 7, 2, 8.0, 16, "minecraft:emerald_ore"),
    ore("nether_quartz", 7, 0, 5.0, 8, "minecraft:nether_quartz_ore"),
    ore("nether_gold", 7, 0, 5.0, 8, "minecraft:nether_gold_ore"),
    ore("lead", 8, 2, 7.0, 12, "oreganized:lead_ore"),
    ore("silver", 8, 2, 7.0, 12, "oreganized:silver_ore"),
    ore("sparkstone", 9, 2, 8.0, 14, "society:sparkstone_ore"),
    ore("magma_geode", 10, 2, 9.0, 16, "society:magma_geode_node"),
    ore("bismuth", 10, 2, 8.0, 15, "etcetera:nether_bismuth_ore"),
    ore("iridium", 11, 3, 10.0, 20, "society:iridium_ore"),
    ore("omni_geode", 12, 3, 12.0, 22, "society:omni_geode_node"),
    ore("ancient_debris", 12, 3, 15.0, 25, "minecraft:ancient_debris"),
]

foraging = [
    forage("meadow", 0, 3.0, 2, ["minecraft:grass", "minecraft:dandelion", "minecraft:poppy"],
           icon="minecraft:wheat_seeds"),
    forage("wildflowers", 1, 3.5, 3, ["minecraft:cornflower", "minecraft:azure_bluet", "minecraft:oxeye_daisy",
                                      "minecraft:allium", "minecraft:blue_orchid"], icon="minecraft:cornflower"),
    forage("berries", 2, 4.0, 4, ["minecraft:sweet_berry_bush"], icon="minecraft:sweet_berries"),
    forage("mushrooms", 3, 4.0, 4, ["minecraft:brown_mushroom", "minecraft:red_mushroom"],
           icon="minecraft:red_mushroom"),
    forage("riverbank", 4, 4.5, 5, ["minecraft:sugar_cane", "minecraft:bamboo", "minecraft:lily_pad"],
           icon="minecraft:sugar_cane"),
    forage("jungle", 5, 4.5, 5, ["minecraft:cocoa", "minecraft:vine", "minecraft:melon"], icon="minecraft:cocoa_beans"),
    forage("caves", 6, 5.0, 6, ["minecraft:cave_vines", "minecraft:glow_lichen", "minecraft:moss_block"],
           icon="minecraft:glow_berries"),
    forage("seaside", 7, 5.0, 7, ["minecraft:kelp", "minecraft:sea_pickle", "minecraft:seagrass"],
           icon="minecraft:kelp"),
    forage("tall_flowers", 8, 5.5, 8, ["minecraft:sunflower", "minecraft:lilac", "minecraft:rose_bush",
                                       "minecraft:peony"], icon="minecraft:sunflower"),
    forage("desert", 9, 6.0, 9, ["minecraft:cactus", "minecraft:dead_bush"], icon="minecraft:cactus"),
    forage("nether_fungi", 10, 6.5, 11, ["minecraft:crimson_fungus", "minecraft:warped_fungus",
                                         "minecraft:shroomlight"], icon="minecraft:crimson_fungus"),
    forage("nether_wart", 11, 7.0, 12, ["minecraft:nether_wart"], icon="minecraft:nether_wart"),
    forage("end", 12, 8.0, 14, ["minecraft:chorus_plant"], icon="minecraft:chorus_fruit"),
]

farming = [
    crop("wheat", 0, 6.0, 3, "minecraft:wheat", "minecraft:wheat_seeds", "minecraft:wheat"),
    crop("carrots", 1, 6.0, 4, "minecraft:carrots", "minecraft:carrot", "minecraft:carrot"),
    crop("potatoes", 1, 6.0, 4, "minecraft:potatoes", "minecraft:potato", "minecraft:potato"),
    crop("beetroots", 2, 6.5, 5, "minecraft:beetroots", "minecraft:beetroot_seeds", "minecraft:beetroot"),
    crop("cabbage", 3, 7.0, 6, "farmersdelight:cabbages", "farmersdelight:cabbage_seeds", "farmersdelight:cabbage"),
    crop("onion", 4, 7.0, 7, "farmersdelight:onions", "farmersdelight:onion", "farmersdelight:onion"),
    crop("pumpkin", 5, 8.0, 8, "minecraft:pumpkin", "minecraft:pumpkin_seeds", "minecraft:pumpkin",
         extra=[{"item": "minecraft:pumpkin_seeds", "count": [1, 2]}]),
    crop("melon", 6, 8.0, 9, "minecraft:melon", "minecraft:melon_seeds", "minecraft:melon_slice",
         extra=[{"item": "minecraft:melon_seeds", "count": [1, 2]}]),
    crop("sugar_cane", 7, 6.0, 8, "minecraft:sugar_cane", "minecraft:sugar_cane", "minecraft:sugar_cane",
         extra=[{"item": "minecraft:sugar_cane", "count": [1, 2]}]),
    crop("sweet_berries", 8, 7.0, 10, "minecraft:sweet_berry_bush", "minecraft:sweet_berries",
         "minecraft:sweet_berries"),
    crop("cocoa", 9, 8.0, 11, "minecraft:cocoa", "minecraft:cocoa_beans", "minecraft:cocoa_beans"),
    crop("nether_wart", 10, 8.0, 12, "minecraft:nether_wart", "minecraft:nether_wart", "minecraft:nether_wart"),
    crop("glow_berries", 11, 8.0, 14, "minecraft:cave_vines", "minecraft:glow_berries", "minecraft:glow_berries",
         extra=[{"item": "minecraft:glow_berries", "count": [0, 1]}]),
]

fishing = [
    {"id": "casting", "level": 0, "seconds": 10.0, "xp": 4, "icon": "minecraft:cod",
     "drops": [{"loot_table": "minecraft:gameplay/fishing"}]},
    {"id": "patient", "level": 3, "seconds": 9.0, "xp": 6, "icon": "minecraft:salmon",
     "drops": [{"loot_table": "minecraft:gameplay/fishing", "luck": 1}]},
    {"id": "skilled", "level": 6, "seconds": 8.0, "xp": 9, "icon": "minecraft:tropical_fish",
     "drops": [{"loot_table": "minecraft:gameplay/fishing", "luck": 2}]},
    {"id": "expert", "level": 9, "seconds": 7.0, "xp": 13, "icon": "minecraft:pufferfish",
     "drops": [{"loot_table": "minecraft:gameplay/fishing", "luck": 3}]},
    {"id": "legendary", "level": 12, "seconds": 6.0, "xp": 18, "icon": "minecraft:nautilus_shell",
     "drops": [{"loot_table": "minecraft:gameplay/fishing", "luck": 4},
               {"loot_table": "minecraft:gameplay/fishing", "luck": 4, "chance": 0.25}]},
]

husbandry = [
    {"id": "chickens", "level": 0, "seconds": 8.0, "xp": 3, "icon": "minecraft:egg",
     "inputs": [{"item": "minecraft:wheat_seeds", "count": 1}],
     "drops": [{"item": "minecraft:egg"}, {"item": "minecraft:feather", "count": [0, 1]}]},
    {"id": "sheep", "level": 2, "seconds": 10.0, "xp": 5, "icon": "minecraft:white_wool",
     "inputs": [{"item": "minecraft:wheat", "count": 1}],
     "drops": [{"item": "minecraft:white_wool", "count": [1, 2]}]},
    {"id": "cows", "level": 4, "seconds": 12.0, "xp": 7, "icon": "minecraft:milk_bucket",
     "inputs": [{"item": "minecraft:wheat", "count": 1}, {"item": "minecraft:bucket", "count": 1}],
     "drops": [{"item": "minecraft:milk_bucket"}, {"item": "minecraft:leather", "chance": 0.25}]},
    {"id": "rabbits", "level": 6, "seconds": 12.0, "xp": 8, "icon": "minecraft:rabbit_hide",
     "inputs": [{"item": "minecraft:carrot", "count": 1}],
     "drops": [{"item": "minecraft:rabbit_hide"}, {"item": "minecraft:rabbit_foot", "chance": 0.05}]},
    {"id": "bees", "level": 8, "seconds": 14.0, "xp": 11, "icon": "minecraft:honey_bottle",
     "inputs": [{"item": "minecraft:glass_bottle", "count": 1}],
     "drops": [{"item": "minecraft:honey_bottle"}, {"item": "minecraft:honeycomb", "chance": 0.3}]},
    {"id": "turtles", "level": 10, "seconds": 16.0, "xp": 13, "icon": "minecraft:scute",
     "inputs": [{"item": "minecraft:seagrass", "count": 1}],
     "drops": [{"item": "minecraft:scute", "chance": 0.5}]},
    {"id": "goats", "level": 12, "seconds": 16.0, "xp": 15, "icon": "minecraft:goat_horn",
     "inputs": [{"item": "minecraft:wheat", "count": 1}, {"item": "minecraft:bucket", "count": 1}],
     "drops": [{"item": "minecraft:milk_bucket"}, {"item": "minecraft:goat_horn", "chance": 0.02}]},
]

skills = [
    {"id": "woodcutting", "category": "sunlitidle:woodcutting", "icon": "minecraft:iron_axe",
     "tool": "axe", "tool_required": False, "actions": woodcutting},
    {"id": "mining", "category": "society:mining", "icon": "minecraft:iron_pickaxe",
     "tool": "pickaxe", "tool_required": True, "actions": mining},
    {"id": "foraging", "category": "sunlitidle:foraging", "icon": "minecraft:sweet_berries",
     "tool": "none", "tool_required": False, "actions": foraging},
    {"id": "farming", "category": "society:farming", "icon": "minecraft:iron_hoe",
     "tool": "hoe", "tool_required": False, "actions": farming},
    {"id": "fishing", "category": "society:fishing", "icon": "minecraft:fishing_rod",
     "tool": "rod", "tool_required": True, "actions": fishing},
    {"id": "husbandry", "category": "society:husbandry", "icon": "minecraft:shears",
     "tool": "shears", "tool_required": False, "actions": husbandry},
]

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w") as f:
    json.dump({"skills": skills}, f, indent=1)
    f.write("\n")
print("wrote", sum(len(s["actions"]) for s in skills), "actions")
