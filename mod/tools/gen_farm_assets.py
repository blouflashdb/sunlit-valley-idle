#!/usr/bin/env python3
"""Writes the assets and data of the farming rebuild (dev.sunlitidle.farm).

The blocks and items keep the Dew Drop ids (dew_drop_farmland_growth:*, dew_drop_watering_cans:*).
Models only reference vanilla textures plus our own procedural overlays drawn here (needs Pillow).
Run from the repository root: python3 mod/tools/gen_farm_assets.py
"""
import json
from pathlib import Path

from PIL import Image

RES = Path(__file__).resolve().parent.parent / "src/main/resources"
FARM = "dew_drop_farmland_growth"
CANS = "dew_drop_watering_cans"

# name, farmland name, colour, English item name, English farmland name
FERTILIZERS = [
    ("weak_fertilizer", "weak_fertilized_farmland", 0xC8B48C, "Weak Fertilizer", "Weak Fertilized Farmland"),
    ("strong_fertilizer", "strong_fertilized_farmland", 0x7FBF4F, "Strong Fertilizer", "Strong Fertilized Farmland"),
    ("hyper_fertilizer", "hyper_fertilized_farmland", 0x4FD0A0, "Hyper Fertilizer", "Hyper Fertilized Farmland"),
    ("hydrating_fertilizer", "hydrating_farmland", 0x4F8FD8, "Hydrating Fertilizer", "Hydrating Farmland"),
    ("deluxe_hydrating_fertilizer", "deluxe_hydrating_farmland", 0x2F4FC8, "Deluxe Hydrating Fertilizer",
     "Deluxe Hydrating Farmland"),
    ("bountiful_fertilizer", "bountiful_fertilized_farmland", 0xE07FB0, "Bountiful Fertilizer",
     "Bountiful Fertilized Farmland"),
    ("low_quality_fertilizer", "low_quality_fertilized_farmland", 0xC0C0C0, "Low Quality Fertilizer",
     "Low Quality Fertilized Farmland"),
    ("high_quality_fertilizer", "high_quality_fertilized_farmland", 0xF0C030, "High Quality Fertilizer",
     "High Quality Fertilized Farmland"),
    ("pristine_quality_fertilizer", "pristine_quality_fertilized_farmland", 0x9F5FE0, "Pristine Quality Fertilizer",
     "Pristine Quality Fertilized Farmland"),
]
# name, radius (= tier), look block texture, English name
SPRINKLERS = [
    ("iron_sprinkler", 1, "minecraft:block/iron_block", "Sprinkler"),
    ("gold_sprinkler", 2, "minecraft:block/gold_block", "Quality Sprinkler"),
    ("diamond_sprinkler", 3, "minecraft:block/diamond_block", "Diamond Sprinkler"),
    ("netherite_sprinkler", 4, "minecraft:block/netherite_block", "Iridium Sprinkler"),
]
CAN_TIERS = [
    ("copper_watering_can", 0xC8703C, "Copper Watering Can"),
    ("iron_watering_can", 0xD8D8D8, "Iron Watering Can"),
    ("gold_watering_can", 0xF0C830, "Gold Watering Can"),
    ("diamond_watering_can", 0x4FE0D8, "Diamond Watering Can"),
    ("netherite_watering_can", 0x5A4A50, "Iridium Watering Can"),
]


def write(path, data):
    path = RES / path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def rgb(colour, factor=1.0):
    r, g, b = (colour >> 16) & 255, (colour >> 8) & 255, colour & 255
    return tuple(max(0, min(255, int(c * factor))) for c in (r, g, b)) + (255,)


def save_png(path, image):
    path = RES / path
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)


# --- procedural textures (our own, drawn pixel by pixel) ---

def sack_texture(colour):
    """A small fertilizer sack with a coloured label."""
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = img.load()
    cloth, shade, outline = (196, 170, 120, 255), (150, 124, 84, 255), (70, 52, 34, 255)
    for y in range(4, 15):
        half = 4 if y < 6 else 5 if y < 13 else 4
        for x in range(8 - half, 8 + half):
            px[x, y] = shade if x >= 8 + half - 2 else cloth
    for x in range(6, 10):
        px[x, 2] = cloth
        px[x, 3] = outline
    px[5, 1] = px[10, 1] = cloth
    label = rgb(colour)
    for y in range(8, 12):
        for x in range(5, 11):
            px[x, y] = label if (x + y) % 5 else rgb(colour, 0.7)
    # outline
    solid = [(x, y) for x in range(16) for y in range(16) if px[x, y][3]]
    for x, y in solid:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < 16 and 0 <= ny < 16 and px[nx, ny][3] == 0:
                px[nx, ny] = outline
    return img


def speckle_texture(colour):
    """Transparent overlay with coloured specks, drawn on top of farmland."""
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = img.load()
    seed = colour
    for i in range(22):
        seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
        x, y = seed % 16, (seed >> 8) % 16
        px[x, y] = rgb(colour, 1.0 if i % 3 else 0.75)
    return img


def can_texture(colour):
    """A watering can: body, spout to the right, handle on top."""
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = img.load()
    body, dark, outline = rgb(colour), rgb(colour, 0.7), (40, 40, 48, 255)
    for y in range(7, 14):
        for x in range(2, 10):
            px[x, y] = dark if y >= 12 or x >= 8 else body
    for x in range(3, 9):
        px[x, 4] = body
    px[3, 5] = px[3, 6] = px[8, 5] = px[8, 6] = body
    for i in range(5):
        px[10 + i, 10 - i] = body
    px[14, 5] = px[15, 5] = px[14, 4] = (120, 170, 230, 255)
    solid = [(x, y) for x in range(16) for y in range(16) if px[x, y][3]]
    for x, y in solid:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < 16 and 0 <= ny < 16 and px[nx, ny][3] == 0:
                px[nx, ny] = outline
    return img


# --- models ---

def farmland_model(top, overlay=None):
    elements = [{
        "from": [0, 0, 0], "to": [16, 15, 16],
        "faces": {
            "down": {"uv": [0, 0, 16, 16], "texture": "#dirt", "cullface": "down"},
            "up": {"uv": [0, 0, 16, 16], "texture": "#top"},
            "north": {"uv": [0, 1, 16, 16], "texture": "#dirt", "cullface": "north"},
            "south": {"uv": [0, 1, 16, 16], "texture": "#dirt", "cullface": "south"},
            "west": {"uv": [0, 1, 16, 16], "texture": "#dirt", "cullface": "west"},
            "east": {"uv": [0, 1, 16, 16], "texture": "#dirt", "cullface": "east"},
        },
    }]
    textures = {"particle": "minecraft:block/dirt", "dirt": "minecraft:block/dirt", "top": top}
    if overlay:
        textures["overlay"] = overlay
        elements.append({"from": [0, 15.05, 0], "to": [16, 15.05, 16],
                         "faces": {"up": {"uv": [0, 0, 16, 16], "texture": "#overlay"}}})
    model = {"parent": "minecraft:block/block", "render_type": "minecraft:cutout", "textures": textures,
             "elements": elements}
    return model


def box(frm, to, tex):
    return {"from": frm, "to": to, "faces": {f: {"texture": tex} for f in
                                              ("down", "up", "north", "south", "west", "east")}}


def main():
    lang = {}
    block_tags = {}
    mineable_shovel, mineable_pickaxe = [], []

    for item, farmland, colour, item_name, farmland_name in FERTILIZERS:
        save_png(f"assets/{FARM}/textures/item/{item}.png", sack_texture(colour))
        save_png(f"assets/{FARM}/textures/block/overlay/{farmland}.png", speckle_texture(colour))
        write(f"assets/{FARM}/models/item/{item}.json",
              {"parent": "minecraft:item/generated", "textures": {"layer0": f"{FARM}:item/{item}"}})
        overlay = f"{FARM}:block/overlay/{farmland}"
        write(f"assets/{FARM}/models/block/{farmland}.json", farmland_model("minecraft:block/farmland", overlay))
        write(f"assets/{FARM}/models/block/{farmland}_moist.json",
              farmland_model("minecraft:block/farmland_moist", overlay))
        write(f"assets/{FARM}/blockstates/{farmland}.json", {"variants": {
            f"moisture={m}": {"model": f"{FARM}:block/{farmland}" + ("_moist" if m == 7 else "")} for m in range(8)}})
        write(f"assets/{FARM}/models/item/{farmland}.json", {"parent": f"{FARM}:block/{farmland}"})
        write(f"data/{FARM}/loot_table/blocks/{farmland}.json", {
            "type": "minecraft:block",
            "pools": [{"rolls": 1, "bonus_rolls": 0, "entries": [{"type": "minecraft:item", "name": "minecraft:dirt"}],
                       "conditions": [{"condition": "minecraft:survives_explosion"}]}]})
        lang[f"item.{FARM}.{item}"] = item_name
        lang[f"block.{FARM}.{farmland}"] = farmland_name
        block_tags[farmland] = [f"{FARM}:{farmland}"]
        mineable_shovel.append(f"{FARM}:{farmland}")

    # Garden pot
    pot = "garden_pot"
    for moist in (False, True):
        top = "minecraft:block/farmland_moist" if moist else "minecraft:block/farmland"
        write(f"assets/{FARM}/models/block/{pot}" + ("_moist" if moist else "") + ".json", {
            "parent": "minecraft:block/block", "render_type": "minecraft:cutout",
            "textures": {"particle": "minecraft:block/terracotta", "side": "minecraft:block/terracotta",
                         "top": top, "rim": "minecraft:block/packed_mud"},
            "elements": [
                {"from": [1, 0, 1], "to": [15, 15, 15], "faces": {
                    "down": {"texture": "#side", "cullface": "down"}, "up": {"texture": "#top"},
                    "north": {"texture": "#side"}, "south": {"texture": "#side"},
                    "west": {"texture": "#side"}, "east": {"texture": "#side"}}},
                {"from": [0.5, 13, 0.5], "to": [15.5, 15, 15.5], "faces": {
                    "north": {"texture": "#rim"}, "south": {"texture": "#rim"},
                    "west": {"texture": "#rim"}, "east": {"texture": "#rim"}}},
            ]})
    write(f"assets/{FARM}/blockstates/{pot}.json", {"variants": {
        f"deluxe={d},moisture={m}": {"model": f"{FARM}:block/{pot}" + ("_moist" if m == 7 or d == 'true' else "")}
        for d in ("false", "true") for m in range(8)}})
    write(f"assets/{FARM}/models/item/{pot}.json", {"parent": f"{FARM}:block/{pot}"})
    write(f"data/{FARM}/loot_table/blocks/{pot}.json", {
        "type": "minecraft:block",
        "pools": [{"rolls": 1, "bonus_rolls": 0, "entries": [{"type": "minecraft:item", "name": f"{FARM}:{pot}"}],
                   "conditions": [{"condition": "minecraft:survives_explosion"}]}]})
    lang[f"block.{FARM}.{pot}"] = "Garden Pot"
    mineable_pickaxe.append(f"{FARM}:{pot}")

    # Hyper fertilized sand
    sand = "hyper_fertilized_sand"
    save_png(f"assets/{FARM}/textures/block/overlay/{sand}.png", speckle_texture(0x4FD0A0))
    write(f"assets/{FARM}/models/block/{sand}.json", {
        "parent": "minecraft:block/block", "render_type": "minecraft:cutout",
        "textures": {"particle": "minecraft:block/sand", "all": "minecraft:block/sand",
                     "overlay": f"{FARM}:block/overlay/{sand}"},
        "elements": [box([0, 0, 0], [16, 16, 16], "#all"),
                     {"from": [0, 16.05, 0], "to": [16, 16.05, 16],
                      "faces": {"up": {"uv": [0, 0, 16, 16], "texture": "#overlay"}}}]})
    write(f"assets/{FARM}/blockstates/{sand}.json", {"variants": {"": {"model": f"{FARM}:block/{sand}"}}})
    write(f"assets/{FARM}/models/item/{sand}.json", {"parent": f"{FARM}:block/{sand}"})
    write(f"data/{FARM}/loot_table/blocks/{sand}.json", {
        "type": "minecraft:block",
        "pools": [{"rolls": 1, "bonus_rolls": 0, "entries": [{"type": "minecraft:item", "name": f"{FARM}:{sand}"}],
                   "conditions": [{"condition": "minecraft:survives_explosion"}]}]})
    lang[f"block.{FARM}.{sand}"] = "Hyper Fertilized Sand"
    mineable_shovel.append(f"{FARM}:{sand}")

    # Sprinklers
    for name, radius, look, english in SPRINKLERS:
        write(f"assets/{FARM}/models/block/{name}.json", {
            "parent": "minecraft:block/block",
            "textures": {"particle": look, "metal": look, "pipe": "minecraft:block/copper_block"},
            "elements": [box([5, 0, 5], [11, 2, 11], "#metal"), box([7, 2, 7], [9, 7, 9], "#pipe"),
                         box([5, 7, 5], [11, 9, 11], "#metal"), box([7.5, 9, 7.5], [8.5, 10, 8.5], "#pipe")]})
        write(f"assets/{FARM}/blockstates/{name}.json", {"variants": {"": {"model": f"{FARM}:block/{name}"}}})
        write(f"assets/{FARM}/models/item/{name}.json", {"parent": f"{FARM}:block/{name}"})
        write(f"data/{FARM}/loot_table/blocks/{name}.json", {
            "type": "minecraft:block",
            "pools": [{"rolls": 1, "bonus_rolls": 0, "entries": [{"type": "minecraft:item", "name": f"{FARM}:{name}"}],
                       "conditions": [{"condition": "minecraft:survives_explosion"}]}]})
        lang[f"block.{FARM}.{name}"] = english
        block_tags[f"sprinkler_tier_{radius}"] = [f"{FARM}:{name}"]
        mineable_pickaxe.append(f"{FARM}:{name}")

    # Watering cans
    can_lang = {}
    for name, colour, english in CAN_TIERS:
        save_png(f"assets/{CANS}/textures/item/{name}.png", can_texture(colour))
        write(f"assets/{CANS}/models/item/{name}.json",
              {"parent": "minecraft:item/handheld", "textures": {"layer0": f"{CANS}:item/{name}"}})
        can_lang[f"item.{CANS}.{name}"] = english
    write(f"data/{CANS}/recipe/copper_watering_can.json", {
        "type": "minecraft:crafting_shaped", "category": "equipment",
        "pattern": ["C  ", "CBC", " C "],
        "key": {"C": {"item": "minecraft:copper_ingot"}, "B": {"item": "minecraft:bucket"}},
        "result": {"id": f"{CANS}:copper_watering_can", "count": 1}})
    write("data/sunlitidle/tags/item/watering_cans.json", {"values": [f"{CANS}:{n}" for n, _, _ in CAN_TIERS]})

    # Tags
    for tag, values in block_tags.items():
        write(f"data/{FARM}/tags/block/{tag}.json", {"values": values})
    write("data/dewdrop/tags/block/waterable.json", {"values": ["minecraft:farmland", f"{FARM}:{pot}"] +
                                                     [f"{FARM}:{f[1]}" for f in FERTILIZERS]})
    write(f"data/{FARM}/tags/block/cancel_random_tick.json", {"values": ["#minecraft:crops"]})
    write("data/minecraft/tags/block/mineable/shovel.json", {"values": mineable_shovel})
    write("data/minecraft/tags/block/mineable/pickaxe.json", {"values": mineable_pickaxe})
    write("data/minecraft/tags/block/sand.json", {"values": [f"{FARM}:{sand}"]})

    write(f"assets/{FARM}/lang/en_us.json", dict(sorted(lang.items())))
    write(f"assets/{CANS}/lang/en_us.json", dict(sorted(can_lang.items())))


if __name__ == "__main__":
    main()
