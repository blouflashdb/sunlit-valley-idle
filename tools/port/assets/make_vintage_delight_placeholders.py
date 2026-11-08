#!/usr/bin/env python3
"""Adds placeholder sprites for the Vintage Delight content rebuilt in KubeJS (issue #10).

Vintage Delight has no 1.21.1 build, so its textures are not in the pack. Each vintagedelight:item/... and
vintagedelight:block/... sprite is registered in kubejs/assets/minecraft/atlases/blocks.json from a vanilla
texture of the same kind; a real texture from a resource pack still wins (the atlas re-adds the item/ and
block/ folders last). Usage: run from the repository root; it is idempotent.
"""
import json
from pathlib import Path

ATLAS = Path("kubejs/assets/minecraft/atlases/blocks.json")

ITEMS = {
    "peanut": "cocoa_beans", "roasted_peanut": "cocoa_beans", "honey_roasted_peanut": "honeycomb",
    "magic_peanut": "glow_berries", "cucumber": "kelp", "ghost_pepper": "beetroot", "gearo_berry": "sweet_berries",
    "pickle": "kelp", "pickled_egg": "egg", "pickled_pepper": "beetroot", "pickled_beetroot": "beetroot",
    "pickled_onion": "potato", "pickled_pitcher_pod": "pitcher_pod", "century_egg": "turtle_egg",
    "surstromming": "cod", "salted_cod": "cooked_cod", "salted_salmon": "cooked_salmon",
    "kimchi": "beetroot_soup", "pad_thai": "mushroom_stew", "cheese_pasta": "mushroom_stew",
    "cucumber_salad": "beetroot_soup", "cucumber_noodles": "mushroom_stew", "pickle_soup": "rabbit_stew",
    "ghostly_chili": "rabbit_stew", "overnight_oats": "suspicious_stew", "stuffed_burrito": "bread",
    "deluxe_burger": "bread", "cheese_burger": "bread", "meat_pizza_slice": "pumpkin_pie", "pb_j": "bread",
    "oatmeal_cookie": "cookie", "oat_bread": "bread", "fruity_granola_bar": "dried_kelp",
    "deluxe_granola_bar": "dried_kelp", "chocolate_nut_granola_bar": "dried_kelp",
    "nut_milk_bottle": "honey_bottle", "nut_mash_bottle": "honey_bottle",
    "apple_sauce_mason_jar": "honey_bottle", "gearo_berry_mason_jar": "dragon_breath",
    "glow_berry_mason_jar": "experience_bottle", "honey_mason_jar": "honey_bottle",
    "nut_mash_mason_jar": "honey_bottle", "pepper_jam_mason_jar": "dragon_breath",
    "relish_mason_jar": "experience_bottle", "sweet_berry_mason_jar": "dragon_breath",
    "mason_jar": "glass_bottle", "vinegar_bottle": "dragon_breath", "vinegar_mason_jar": "dragon_breath",
    "organic_mash": "brown_dye", "ghost_charcoal": "charcoal", "golden_egg": "egg", "meat_pizza": "pumpkin_pie",
    "cucumber_seeds": "melon_seeds", "ghost_pepper_seeds": "pumpkin_seeds",
}

BLOCKS = {
    "salt_block": "calcite", "smooth_salt_block": "quartz_block_bottom", "salt_bricks": "quartz_bricks",
    "mixed_salt_bricks": "polished_diorite", "cucumber_crate": "barrel_side", "ghost_pepper_crate": "barrel_side",
    "peanut_crate": "barrel_side", "gearo_berry_bag": "brown_wool", "salt": "white_concrete_powder",
    "salt_lamp": "shroomlight", "salt_lamp_default": "shroomlight", "salt_lamp_blue": "blue_stained_glass",
    "salt_lamp_gray": "gray_stained_glass", "salt_lamp_green": "green_stained_glass",
    "salt_lamp_light_blue": "light_blue_stained_glass", "salt_lamp_pink": "pink_stained_glass",
    "salt_lamp_purple": "purple_stained_glass", "magic_vine": "warped_stem", "magic_vine_top": "warped_stem_top",
    "stripped_magic_vine": "stripped_warped_stem", "stripped_magic_vine_top": "stripped_warped_stem_top",
}


def main():
    atlas = json.loads(ATLAS.read_text())
    sources = atlas["sources"]
    tail = [s for s in sources if s["type"] == "directory"]
    singles = [s for s in sources if s["type"] != "directory" and not s.get("sprite", "").startswith("vintagedelight:")]
    for name, tex in ITEMS.items():
        singles.append({"type": "single", "resource": f"minecraft:item/{tex}", "sprite": f"vintagedelight:item/{name}"})
    for name, tex in BLOCKS.items():
        singles.append({"type": "single", "resource": f"minecraft:block/{tex}", "sprite": f"vintagedelight:block/{name}"})
    if not any(s.get("source") == "block" for s in tail):
        tail.append({"type": "directory", "source": "block", "prefix": "block/"})
    atlas["sources"] = singles + tail
    ATLAS.write_text(json.dumps(atlas, indent=2) + "\n")


if __name__ == "__main__":
    main()
