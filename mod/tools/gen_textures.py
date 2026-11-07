"""Generates the simple 16x16 placeholder textures for the Adventurer's Camp.

Run from the repository root: python3 mod/tools/gen_textures.py
"""
import pathlib
import random

from PIL import Image

OUT = pathlib.Path("mod/src/main/resources/assets/sunlitidle/textures/block")
random.seed(7)


def jitter(c, amount=10):
    return tuple(max(0, min(255, v + random.randint(-amount, amount))) for v in c)


def planks():
    img = Image.new("RGBA", (16, 16))
    base = (122, 90, 56, 255)
    for y in range(16):
        for x in range(16):
            c = jitter(base[:3])
            if y % 4 == 3:
                c = (88, 62, 38)
            if (x + (y // 4) * 5) % 8 == 0 and y % 4 != 3:
                c = (100, 74, 46)
            img.putpixel((x, y), c + (255,))
    return img


def side():
    img = planks()
    # Crossed swords emblem.
    steel = (205, 210, 215, 255)
    hilt = (150, 105, 40, 255)
    for i in range(3, 12):
        img.putpixel((i, i), steel)
        img.putpixel((15 - i, i), steel)
    for x, y in [(11, 12), (12, 13), (4, 12), (3, 13)]:
        img.putpixel((x, y), hilt)
    for x, y in [(10, 11), (12, 11), (5, 11), (3, 11)]:
        img.putpixel((x, y), hilt)
    return img


def top():
    img = Image.new("RGBA", (16, 16))
    canvas = (196, 176, 132)
    for y in range(16):
        for x in range(16):
            c = jitter(canvas, 8)
            if x in (0, 15) or y in (0, 15):
                c = (88, 62, 38)
            img.putpixel((x, y), c + (255,))
    # Small campfire in the middle.
    for x, y in [(6, 9), (7, 9), (8, 9), (9, 9), (7, 10), (8, 10)]:
        img.putpixel((x, y), (90, 60, 30, 255))
    for x, y, c in [(7, 7, (255, 170, 40)), (8, 7, (255, 200, 60)), (7, 8, (255, 120, 20)),
                    (8, 8, (255, 150, 30)), (8, 6, (255, 230, 120))]:
        img.putpixel((x, y), c + (255,))
    return img


OUT.mkdir(parents=True, exist_ok=True)
side().save(OUT / "adventurers_camp_side.png")
top().save(OUT / "adventurers_camp_top.png")
planks().save(OUT / "adventurers_camp_bottom.png")
