"""The 24 slime breeds that replace Splendid Slimes (#13), shared by gen_idle_skills.py and gen_slime_assets.py.

Order = unlock order in Slime Ranching (by plort price). Each breed eats one item from its old diet ("food") and
gives two plorts for its old favorite food ("treat"). Treats from mods that are not installed hide that action.
"""

# (breed, English name, level, food, favorite food)
BREEDS = [
    ("slimy", "Slimy", 0, "minecraft:sweet_berries", "farm_and_charm:strawberry"),
    ("dusty", "Dusty", 0, "minecraft:bone", "netherdepthsupgrade:bonefish"),
    ("bony", "Bony", 1, "society:milk", "society:large_sheep_milk"),
    ("rotting", "Rotting", 1, "minecraft:beef", "minecraft:chicken"),
    ("juicy", "Juicy", 2, "vinery:red_grape", "vinery:jungle_grapes_red"),
    ("webby", "Webby", 2, "minecraft:carrot", "veggiesdelight:garlic"),
    ("luminous", "Luminous", 3, "vintagedelight:pickled_beetroot", "vintagedelight:pickle"),
    ("mechanic", "Mechanic", 3, "minecraft:iron_ingot", "oreganized:lead_ingot"),
    ("ender", "Ender", 4, "minecraft:lapis_lazuli", "minecraft:amethyst_shard"),
    ("boomcat", "Boomcat", 4, "minecraft:porkchop", "untitledduckmod:cooked_duck"),
    ("puddle", "Puddle", 5, "minecraft:cod", "unusualfishmod:raw_sneep_snorp"),
    ("bear", "Bear", 5, "minecraft:honeycomb", "buzzier_bees:crystallized_honey_block"),
    ("all_seeing", "All-Seeing", 6, "minecraft:potato", "minecraft:golden_carrot"),
    ("blazing", "Blazing", 6, "minecraft:cooked_beef", "autumnity:cooked_turkey"),
    ("sweet", "Sweet", 7, "minecraft:apple", "atmospheric:orange"),
    ("bitwise", "Bitwise", 7, "minecraft:quartz", "society:fire_opal"),
    ("weeping", "Weeping", 8, "minecraft:glow_berries", "pamhc2trees:bananaitem"),
    ("minty", "Minty", 8, "society:tubabacco_leaf", "society:tubasmoke_stick"),
    ("prisma", "Prisma", 9, "minecraft:salmon", "aquaculture:boulti"),
    ("orby", "Orby", 9, "society:raisins", "society:dried_shimmering_mushrooms"),
    ("phantom", "Phantom", 10, "minecraft:white_bed", "minecraft:purple_bed"),
    ("shulking", "Shulking", 10, "minecraft:chorus_fruit", "minecraft:chorus_flower"),
    ("sparkcat", "Sparkcat", 11, "society:smoked_cod", "society:smoked_spindlefish"),
    ("gold", "Gold", 12, "society:carrot_preserves", "society:bell_pepper_preserves"),
]
