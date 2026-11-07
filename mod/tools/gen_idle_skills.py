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
    ore("sandstone", 1, 0, 3.0, 2, "minecraft:sandstone"),
    ore("terracotta", 3, 0, 3.5, 3, "minecraft:terracotta"),
    ore("netherrack", 6, 0, 2.5, 3, "minecraft:netherrack"),
    {"id": "nether_stone", "level": 7, "tool_tier": 0, "seconds": 3.5, "xp": 4, "icon": "minecraft:blackstone",
     "drops": [{"block": "minecraft:blackstone"}, {"block": "minecraft:basalt", "chance": 0.5},
               {"block": "minecraft:magma_block", "chance": 0.15}]},
    ore("glowstone", 8, 0, 5.0, 8, "minecraft:glowstone", icon="minecraft:glowstone_dust"),
    ore("amethyst", 9, 1, 6.0, 10, "minecraft:amethyst_cluster", icon="minecraft:amethyst_shard"),
    ore("obsidian", 9, 3, 10.0, 12, "minecraft:obsidian"),
    ore("prismarine", 10, 1, 6.0, 10, "minecraft:prismarine"),
    ore("end_stone", 10, 1, 4.0, 8, "minecraft:end_stone"),
    ore("purpur", 11, 1, 6.0, 12, "minecraft:purpur_block"),
    ore("crying_obsidian", 11, 3, 12.0, 15, "minecraft:crying_obsidian"),
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
    forage("ferns", 0, 3.0, 2, ["minecraft:fern", "minecraft:large_fern"], icon="minecraft:fern"),
    forage("saplings", 1, 3.5, 3, ["minecraft:oak_leaves", "minecraft:birch_leaves", "minecraft:spruce_leaves"],
           icon="minecraft:oak_sapling"),
    forage("wild_veggies", 2, 4.0, 4, ["veggiesdelight:wild_bellpeppers", "veggiesdelight:wild_sweet_potatoes",
                                       "veggiesdelight:wild_garlic", "veggiesdelight:wild_cauliflowers"],
           icon="veggiesdelight:bellpepper"),
    forage("wild_herbs", 3, 4.0, 4, ["farm_and_charm:wild_nettle", "farm_and_charm:wild_ribwort"],
           icon="farm_and_charm:wild_nettle"),
    forage("salmonberries", 3, 4.0, 4, ["society:salmonberry"], icon="society:salmonberry"),
    forage("pitcher", 5, 5.0, 6, ["minecraft:pitcher_plant", "minecraft:torchflower"], icon="minecraft:torchflower"),
    forage("spore_blossoms", 7, 5.5, 7, ["minecraft:spore_blossom", "minecraft:azalea", "minecraft:flowering_azalea"],
           icon="minecraft:spore_blossom"),
    forage("aloe", 8, 5.5, 8, ["atmospheric:aloe_vera", "atmospheric:yucca_flower"], icon="atmospheric:aloe_kernels"),
    forage("dragon_roots", 9, 6.0, 9, ["atmospheric:dragon_roots"], icon="atmospheric:dragon_fruit"),
    forage("twisting_vines", 10, 6.5, 10, ["minecraft:twisting_vines", "minecraft:weeping_vines",
                                           "minecraft:crimson_roots", "minecraft:warped_roots"],
           icon="minecraft:twisting_vines"),
]

def kcrop(id, level, seconds, xp, block, output):
    """A KubeJS crop from the pack: its seed is <block>_seed and it does not drop seeds itself."""
    return crop(id, level, seconds, xp, block, block + "_seed", output,
                extra=[{"item": block + "_seed"}, {"item": block + "_seed", "chance": 0.25}])


farming = [
    crop("wheat", 0, 6.0, 3, "minecraft:wheat", "minecraft:wheat_seeds", "minecraft:wheat"),
    kcrop("carrot", 1, 6.0, 4, "society:carrot", "minecraft:carrot"),
    kcrop("potato", 1, 6.0, 4, "society:potato", "minecraft:potato"),
    crop("beetroots", 2, 6.5, 5, "minecraft:beetroots", "minecraft:beetroot_seeds", "minecraft:beetroot"),
    crop("cabbage", 2, 6.5, 5, "farmersdelight:cabbages", "farmersdelight:cabbage_seeds", "farmersdelight:cabbage"),
    kcrop("onion", 3, 7.0, 6, "society:onion", "farm_and_charm:onion"),
    crop("lettuce", 3, 7.0, 6, "farm_and_charm:lettuce_crop", "farm_and_charm:lettuce_seeds", "farm_and_charm:lettuce"),
    crop("tomato", 4, 7.0, 7, "farmersdelight:tomatoes", "farmersdelight:tomato_seeds", "farmersdelight:tomato"),
    kcrop("strawberry", 4, 7.0, 7, "farm_and_charm:strawberry", "farm_and_charm:strawberry"),
    kcrop("blueberry", 5, 7.5, 8, "society:blueberry", "society:blueberry"),
    crop("corn", 5, 7.5, 8, "farm_and_charm:corn_crop", "farm_and_charm:kernels", "farm_and_charm:corn"),
    crop("oat", 5, 7.5, 8, "farm_and_charm:oat_crop", "farm_and_charm:oat_seeds", "farm_and_charm:oat"),
    crop("pumpkin", 5, 8.0, 8, "minecraft:pumpkin", "minecraft:pumpkin_seeds", "minecraft:pumpkin",
         extra=[{"item": "minecraft:pumpkin_seeds", "count": [1, 2]}]),
    crop("melon", 6, 8.0, 9, "minecraft:melon", "minecraft:melon_seeds", "minecraft:melon_slice",
         extra=[{"item": "minecraft:melon_seeds", "count": [1, 2]}]),
    crop("bellpepper", 6, 8.0, 9, "veggiesdelight:bellpepper_crop", "veggiesdelight:bellpepper_seeds",
         "veggiesdelight:bellpepper"),
    crop("broccoli", 6, 8.0, 9, "veggiesdelight:broccoli_crop", "veggiesdelight:broccoli_seeds",
         "veggiesdelight:broccoli"),
    crop("cauliflower", 7, 8.0, 10, "veggiesdelight:cauliflower_crop", "veggiesdelight:cauliflower_seeds",
         "veggiesdelight:cauliflower"),
    crop("turnip", 7, 8.0, 10, "veggiesdelight:turnip_crop", "veggiesdelight:turnip_seeds", "veggiesdelight:turnip"),
    kcrop("sweet_potato", 7, 8.0, 10, "society:sweet_potato", "veggiesdelight:sweet_potato"),
    kcrop("peanut", 7, 8.0, 10, "society:peanut", "vintagedelight:peanut"),
    crop("cucumber", 8, 8.5, 11, "vintagedelight:cucumber_crop", "vintagedelight:cucumber_seeds",
         "vintagedelight:cucumber"),
    kcrop("cranberry", 8, 8.5, 11, "society:cranberry", "society:cranberry"),
    kcrop("eggplant", 8, 8.5, 11, "society:eggplant", "society:eggplant"),
    crop("sugar_cane", 8, 6.0, 9, "minecraft:sugar_cane", "minecraft:sugar_cane", "minecraft:sugar_cane",
         extra=[{"item": "minecraft:sugar_cane", "count": [1, 2]}]),
    crop("sweet_berries", 9, 7.0, 11, "minecraft:sweet_berry_bush", "minecraft:sweet_berries",
         "minecraft:sweet_berries"),
    kcrop("hops", 9, 9.0, 12, "brewery:hop_trellis", "brewery:hops"),
    crop("ghost_pepper", 10, 9.0, 13, "vintagedelight:ghost_pepper_crop", "vintagedelight:ghost_pepper_seeds",
         "vintagedelight:ghost_pepper"),
    crop("cocoa", 10, 8.0, 12, "minecraft:cocoa", "minecraft:cocoa_beans", "minecraft:cocoa_beans"),
    crop("nether_wart", 10, 8.0, 12, "minecraft:nether_wart", "minecraft:nether_wart", "minecraft:nether_wart"),
    kcrop("tubabacco", 11, 10.0, 15, "society:tubabacco_leaf", "society:tubabacco_leaf"),
    kcrop("sparkpod", 11, 10.0, 15, "society:sparkpod", "society:sparkpod"),
    crop("glow_berries", 11, 8.0, 14, "minecraft:cave_vines", "minecraft:glow_berries", "minecraft:glow_berries",
         extra=[{"item": "minecraft:glow_berries", "count": [0, 1]}]),
    kcrop("ancient_fruit", 12, 12.0, 20, "society:ancient_fruit", "society:ancient_fruit"),
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

def animal(id, level, seconds, xp, icon, inputs, drops):
    return {"id": id, "level": level, "seconds": seconds, "xp": xp, "icon": icon,
            "inputs": [{"item": i, "count": 1} for i in inputs], "drops": drops}


husbandry = [
    animal("chickens", 0, 8.0, 3, "minecraft:egg", ["minecraft:wheat_seeds"],
           [{"item": "minecraft:egg"}, {"item": "minecraft:feather", "count": [0, 1]},
            {"item": "society:large_egg", "chance": 0.1}]),
    animal("sheep", 1, 10.0, 4, "minecraft:white_wool", ["minecraft:wheat"],
           [{"item": "minecraft:white_wool", "count": [1, 2]}, {"item": "society:fine_wool", "chance": 0.05}]),
    animal("cattle", 2, 10.0, 5, "minecraft:leather", ["minecraft:wheat"],
           [{"item": "minecraft:leather"}, {"item": "minecraft:beef", "count": [1, 2]}]),
    animal("dairy", 3, 12.0, 6, "society:milk", ["minecraft:wheat"],
           [{"item": "society:milk"}, {"item": "society:large_milk", "chance": 0.1}]),
    animal("pigs", 4, 12.0, 6, "minecraft:porkchop", ["minecraft:carrot"],
           [{"item": "minecraft:porkchop", "count": [1, 2]}, {"item": "society:truffle", "chance": 0.15}]),
    animal("goats", 5, 12.0, 7, "society:goat_milk", ["minecraft:wheat"],
           [{"item": "society:goat_milk"}, {"item": "society:large_goat_milk", "chance": 0.1},
            {"item": "minecraft:goat_horn", "chance": 0.01}]),
    animal("rabbits", 6, 12.0, 8, "minecraft:rabbit_hide", ["minecraft:carrot"],
           [{"item": "minecraft:rabbit_hide"}, {"item": "minecraft:rabbit", "chance": 0.5},
            {"item": "minecraft:rabbit_foot", "chance": 0.05}]),
    animal("dairy_sheep", 7, 13.0, 9, "society:sheep_milk", ["minecraft:wheat"],
           [{"item": "society:sheep_milk"}, {"item": "society:large_sheep_milk", "chance": 0.1}]),
    animal("bees", 8, 14.0, 11, "minecraft:honey_bottle", ["minecraft:glass_bottle"],
           [{"item": "minecraft:honey_bottle"}, {"item": "minecraft:honeycomb", "chance": 0.3}]),
    animal("buffalo", 9, 14.0, 12, "society:buffalo_milk", ["minecraft:wheat"],
           [{"item": "society:buffalo_milk"}, {"item": "society:large_buffalo_milk", "chance": 0.1}]),
    animal("turtles", 10, 16.0, 13, "minecraft:scute", ["minecraft:seagrass"],
           [{"item": "minecraft:scute", "chance": 0.5}, {"item": "minecraft:turtle_egg", "chance": 0.1}]),
    animal("merino", 11, 16.0, 15, "society:merino_wool", ["minecraft:wheat"],
           [{"item": "society:merino_wool"}, {"item": "minecraft:white_wool", "count": [1, 2]}]),
    animal("truffle_hunt", 12, 18.0, 18, "society:truffle", ["minecraft:carrot"],
           [{"item": "society:truffle"}, {"item": "society:truffle", "chance": 0.25}]),
]


def dig(id, level, seconds, xp, blocks, icon=None, chances=None):
    drops = []
    for i, b in enumerate(blocks):
        d = {"block": b}
        if chances and chances[i] < 1:
            d["chance"] = chances[i]
        drops.append(d)
    return {"id": id, "level": level, "seconds": seconds, "xp": xp, "icon": icon or blocks[0], "drops": drops}


digging = [
    dig("dirt", 0, 2.0, 1, ["minecraft:dirt", "minecraft:coarse_dirt"], chances=[1, 0.1]),
    dig("sand", 0, 2.0, 1, ["minecraft:sand"]),
    dig("gravel", 1, 2.5, 2, ["minecraft:gravel"]),
    dig("clay", 2, 3.0, 3, ["minecraft:clay"], icon="minecraft:clay_ball"),
    dig("red_sand", 3, 3.0, 3, ["minecraft:red_sand"]),
    dig("mud", 3, 3.0, 3, ["minecraft:mud"]),
    dig("snow", 4, 3.0, 3, ["minecraft:snow_block"], icon="minecraft:snowball"),
    dig("podzol", 4, 3.5, 4, ["minecraft:podzol", "minecraft:brown_mushroom"], chances=[1, 0.1]),
    dig("rooted_dirt", 5, 3.5, 4, ["minecraft:rooted_dirt", "minecraft:hanging_roots"], chances=[1, 0.3]),
    dig("mycelium", 6, 4.0, 5, ["minecraft:mycelium", "minecraft:red_mushroom"], chances=[1, 0.15],
        icon="minecraft:mycelium"),
    dig("soul_sand", 7, 4.0, 6, ["minecraft:soul_sand"]),
    dig("soul_soil", 7, 4.0, 6, ["minecraft:soul_soil"]),
    dig("beach", 8, 4.5, 7, ["minecraft:sand", "minecraft:gravel", "minecraft:clay", "minecraft:sea_pickle"],
        chances=[1, 0.5, 0.3, 0.1], icon="minecraft:sea_pickle"),
    dig("badlands", 9, 4.5, 8, ["minecraft:red_sand", "minecraft:terracotta", "minecraft:dead_bush"],
        chances=[1, 0.4, 0.2], icon="minecraft:terracotta"),
    dig("crystal_sand", 10, 5.0, 9, ["minecraft:sand", "minecraft:quartz_block"], chances=[1, 0.05],
        icon="minecraft:quartz"),
]


def mob(id, level, seconds, xp, entity, icon, extra=None):
    drops = [{"entity": entity}] + (extra or [])
    return {"id": id, "level": level, "seconds": seconds, "xp": xp, "icon": icon, "drops": drops}


hunting = [
    mob("zombies", 0, 6.0, 4, "minecraft:zombie", "minecraft:rotten_flesh"),
    mob("wild_game", 0, 6.0, 4, "minecraft:cow", "minecraft:beef",
        extra=[{"entity": "minecraft:pig", "chance": 0.5}, {"entity": "minecraft:sheep", "chance": 0.5},
               {"entity": "minecraft:chicken", "chance": 0.5}]),
    mob("skeletons", 1, 6.5, 5, "minecraft:skeleton", "minecraft:bone"),
    mob("spiders", 2, 6.5, 5, "minecraft:spider", "minecraft:string"),
    mob("creepers", 3, 7.0, 6, "minecraft:creeper", "minecraft:gunpowder"),
    mob("slimes", 4, 7.0, 6, "minecraft:slime", "minecraft:slime_ball"),
    mob("drowned", 5, 8.0, 7, "minecraft:drowned", "minecraft:copper_ingot"),
    mob("witches", 6, 9.0, 8, "minecraft:witch", "minecraft:glowstone_dust"),
    mob("endermen", 7, 10.0, 10, "minecraft:enderman", "minecraft:ender_pearl"),
    mob("blazes", 8, 10.0, 11, "minecraft:blaze", "minecraft:blaze_rod"),
    {"id": "bartering", "level": 8, "seconds": 8.0, "xp": 8, "icon": "minecraft:gold_ingot",
     "inputs": [{"item": "minecraft:gold_ingot", "count": 1}],
     "drops": [{"loot_table": "minecraft:gameplay/piglin_bartering", "context": "chest"}]},
    mob("ghasts", 9, 11.0, 12, "minecraft:ghast", "minecraft:ghast_tear"),
    mob("wither_skeletons", 10, 12.0, 14, "minecraft:wither_skeleton", "minecraft:wither_skeleton_skull"),
    mob("guardians", 11, 12.0, 15, "minecraft:guardian", "minecraft:prismarine_shard"),
    mob("shulkers", 12, 14.0, 18, "minecraft:shulker", "minecraft:shulker_shell"),
]


def dig_site(id, level, seconds, xp, table, icon):
    return {"id": id, "level": level, "seconds": seconds, "xp": xp, "icon": icon,
            "drops": [{"loot_table": table, "context": "chest"}]}


archaeology = [
    dig_site("desert_well", 0, 10.0, 4, "minecraft:archaeology/desert_well", "minecraft:suspicious_sand"),
    dig_site("desert_pyramid", 2, 11.0, 6, "minecraft:archaeology/desert_pyramid", "minecraft:archer_pottery_sherd"),
    dig_site("trail_ruins", 4, 12.0, 8, "minecraft:archaeology/trail_ruins_common", "minecraft:suspicious_gravel"),
    dig_site("warm_ocean_ruins", 6, 12.0, 10, "minecraft:archaeology/ocean_ruin_warm", "minecraft:sniffer_egg"),
    dig_site("cold_ocean_ruins", 8, 13.0, 12, "minecraft:archaeology/ocean_ruin_cold", "minecraft:blade_pottery_sherd"),
    dig_site("rare_trail_ruins", 10, 15.0, 15, "minecraft:archaeology/trail_ruins_rare", "minecraft:wayfinder_armor_trim_smithing_template"),
]

adventuring = [
    {"id": "t1", "level": 0, "dungeon": 1, "icon": "minecraft:mossy_cobblestone"},
    {"id": "t2", "level": 3, "dungeon": 2, "icon": "minecraft:packed_ice"},
    {"id": "t3", "level": 6, "dungeon": 3, "icon": "minecraft:magma_block"},
    {"id": "t4", "level": 9, "dungeon": 4, "icon": "minecraft:skeleton_skull"},
    {"id": "t5", "level": 12, "dungeon": 5, "icon": "minecraft:netherite_scrap"},
]

skills = [
    {"id": "woodcutting", "category": "sunlitidle:woodcutting", "icon": "minecraft:iron_axe",
     "tool": "axe", "tool_required": False, "actions": woodcutting},
    {"id": "mining", "category": "society:mining", "icon": "minecraft:iron_pickaxe",
     "tool": "pickaxe", "tool_required": True, "actions": mining},
    {"id": "digging", "category": "sunlitidle:digging", "icon": "minecraft:iron_shovel",
     "tool": "shovel", "tool_required": False, "actions": digging},
    {"id": "foraging", "category": "sunlitidle:foraging", "icon": "minecraft:sweet_berries",
     "tool": "none", "tool_required": False, "actions": foraging},
    {"id": "farming", "category": "society:farming", "icon": "minecraft:iron_hoe",
     "tool": "hoe", "tool_required": False, "seasonal": True, "actions": farming},
    {"id": "fishing", "category": "society:fishing", "icon": "minecraft:fishing_rod",
     "tool": "rod", "tool_required": True, "actions": fishing},
    {"id": "hunting", "category": "sunlitidle:hunting", "icon": "minecraft:bow",
     "tool": "weapon", "tool_required": False, "actions": hunting},
    {"id": "husbandry", "category": "society:husbandry", "icon": "minecraft:shears",
     "tool": "shears", "tool_required": False, "actions": husbandry},
    {"id": "archaeology", "category": "sunlitidle:archaeology", "icon": "minecraft:brush",
     "tool": "brush", "tool_required": True, "actions": archaeology},
    {"id": "adventuring", "category": "society:adventuring", "icon": "minecraft:iron_sword",
     "tool": "weapon", "tool_required": True, "actions": adventuring},
    {"id": "smelting", "category": "sunlitidle:smelting", "icon": "minecraft:furnace",
     "tool": "none", "recipes": ["minecraft:smelting", "minecraft:blasting"], "actions": []},
    {"id": "cooking", "category": "sunlitidle:cooking", "icon": "minecraft:smoker",
     "tool": "none", "recipes": ["minecraft:smoking", "minecraft:campfire_cooking"], "actions": []},
]

for skill in skills:
    skill["actions"].sort(key=lambda a: a["level"])

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w") as f:
    json.dump({"skills": skills}, f, indent=1)
    f.write("\n")
print("wrote", sum(len(s["actions"]) for s in skills), "actions")
