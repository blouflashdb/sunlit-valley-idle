#!/usr/bin/env python3
"""Draws our own placeholder NPC portraits for the SVDialog dialogs and points the dialogs at them (#5).

The dialogs in kubejs/data/dialog/dialogs name a portrait per entry. SVDialog 1.6 loads "<ns>:<path>" from
<ns>:textures/portraits/<path> and a path without a namespace from dialog:textures/portraits/<path>. The 1.20.1
pack took those images from the Society Tweaks jar (license ARR, no 1.21.1 build), so every portrait was missing.
The Wise Oak dialogs named "mysticaloaktree:textures/block/wise_oak.png", which SVDialog turns into
mysticaloaktree:textures/portraits/textures/block/wise_oak.png, a file that never existed. The Society Trading
shops show the same portraits ("texture": "dialog:textures/portraits/<npc>", loaded with ".png" appended).

This script draws simple busts (one colour scheme and hat per NPC, one face per gift mood) into
kubejs/assets/sunlitidle/textures/portraits and rewrites each dialog portrait path to "sunlitidle:<path>" and each shop
portrait to "sunlitidle:textures/portraits/<npc>". Real art can
replace the files later under the same names. tools/port/port_dialog_data.py and tools/port/port_trading_data.py apply the same rewrites, and
tools/port/check_dialog_textures.py checks that every portrait exists.
Run from the repository root: python3 tools/port/port_dialog_portraits.py
"""
import json
import math
import pathlib

DIALOGS = pathlib.Path("kubejs/data/dialog/dialogs")
SHOPS = pathlib.Path("kubejs/data/society_trading/shops")
OUT = pathlib.Path("kubejs/assets/sunlitidle/textures/portraits")
NAMESPACE = "sunlitidle"
SIZE = 128
SCALE = 4  # drawn larger, then scaled down for smooth edges
MOODS = ("", "liked", "loved", "disliked", "hated")
WISE_OAK_OLD = "mysticaloaktree:textures/block/wise_oak.png"
SHOP_OLD = "dialog:textures/portraits/"

SKIN = (236, 196, 160)
# background, clothes, accent, hair, hat
NPCS = {
    "banker": ((214, 232, 210), (46, 92, 64), (212, 175, 55), (70, 50, 40), "top_hat"),
    "blacksmith": ((226, 214, 204), (110, 72, 44), (120, 120, 128), (40, 30, 25), "beard"),
    "carpenter": ((240, 222, 196), (176, 52, 48), (240, 196, 40), (120, 70, 30), "hard_hat"),
    "fisher": ((206, 224, 240), (40, 64, 112), (244, 200, 40), (90, 60, 40), "sou_wester"),
    "librarian": ((226, 216, 240), (102, 70, 140), (250, 240, 220), (60, 40, 30), "bun"),
    "market": ((240, 228, 204), (228, 124, 40), (70, 140, 60), (150, 90, 40), "cap"),
    "shepherd": ((222, 238, 206), (220, 206, 180), (150, 110, 70), (200, 160, 90), "straw_hat"),
    "trader": ((206, 236, 232), (36, 140, 140), (220, 170, 60), (40, 30, 30), "wrap"),
    "witch": ((222, 212, 232), (48, 36, 64), (120, 200, 90), (40, 30, 50), "witch_hat"),
    "goddess": ((248, 244, 220), (250, 250, 240), (236, 200, 90), (250, 226, 150), "halo"),
}


def new_path(old):
    """Maps a 1.20.1 portrait path to the path of our placeholder ("sunlitidle:<path>")."""
    if old == WISE_OAK_OLD:
        old = "wise_oak.png"
    if ":" in old:
        return old
    return f"{NAMESPACE}:{old}"


def shop_texture(texture):
    """Maps a shop texture (loaded as <texture>.png) from the Society Tweaks portraits to our placeholder."""
    if texture.startswith(SHOP_OLD):
        return f"{NAMESPACE}:textures/portraits/{texture[len(SHOP_OLD):]}"
    return texture


def port_portraits(dialog):
    for entry in dialog["entries"]:
        for portrait in entry.get("portraits", []):
            portrait["path"] = new_path(portrait["path"])
    return dialog


def face(draw, cx, cy, r, mood, s):
    """Eyes, brows and mouth for a gift mood ("" is neutral)."""
    eye = (40, 30, 30, 255)
    w = max(2, round(s * 0.012))
    ex, ey, er = r * 0.38, cy - r * 0.08, r * 0.09
    for side in (-1, 1):
        draw.ellipse((cx + side * ex - er, ey - er, cx + side * ex + er, ey + er), fill=eye)
        bx = cx + side * ex
        if mood == "hated":
            draw.line((bx - side * r * 0.22, ey - r * 0.36, bx + side * r * 0.18, ey - r * 0.2), fill=eye, width=w)
        elif mood == "disliked":
            draw.line((bx - r * 0.18, ey - r * 0.26, bx + r * 0.18, ey - r * 0.26), fill=eye, width=w)
        else:
            draw.arc((bx - r * 0.2, ey - r * 0.4, bx + r * 0.2, ey - r * 0.16), 200, 340, fill=eye, width=w)
    my, mw = cy + r * 0.4, r * 0.32
    if mood in ("liked", "loved"):
        draw.chord((cx - mw, my - mw * 0.8, cx + mw, my + mw * 0.6), 0, 180,
                   fill=(170, 60, 60, 255) if mood == "loved" else None, outline=eye, width=w)
        cheek = (240, 140, 140, 150)
        for side in (-1, 1):
            x = cx + side * r * 0.6
            draw.ellipse((x - r * 0.13, my - r * 0.28, x + r * 0.13, my - r * 0.1), fill=cheek)
    elif mood in ("disliked", "hated"):
        draw.arc((cx - mw * 0.8, my - r * 0.02, cx + mw * 0.8, my + r * 0.4), 200, 340, fill=eye, width=w)
    else:
        draw.line((cx - mw * 0.6, my + r * 0.05, cx + mw * 0.6, my + r * 0.05), fill=eye, width=w)
    if mood == "loved":
        heart(draw, cx + r * 1.15, cy - r * 0.9, r * 0.32, (220, 60, 90, 255))
    elif mood == "hated":
        mark = (200, 40, 40, 255)
        x, y, m = cx + r * 1.1, cy - r * 0.95, r * 0.18
        for dx, dy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            draw.line((x + dx * m * 0.3, y + dy * m * 0.3, x + dx * m * 1.2, y + dy * m * 1.2), fill=mark, width=w * 2)


def heart(draw, x, y, r, color):
    draw.ellipse((x - r, y - r * 0.5, x, y + r * 0.5), fill=color)
    draw.ellipse((x, y - r * 0.5, x + r, y + r * 0.5), fill=color)
    draw.polygon(((x - r * 0.97, y + r * 0.15), (x + r * 0.97, y + r * 0.15), (x, y + r * 1.2)), fill=color)


def headwear(draw, kind, cx, cy, r, accent, hair, s):
    a, h = accent + (255,), hair + (255,)
    if kind == "top_hat":
        draw.rectangle((cx - r * 1.05, cy - r * 0.85, cx + r * 1.05, cy - r * 0.7), fill=(30, 30, 30, 255))
        draw.rectangle((cx - r * 0.65, cy - r * 1.75, cx + r * 0.65, cy - r * 0.8), fill=(30, 30, 30, 255))
        draw.rectangle((cx - r * 0.65, cy - r * 1.0, cx + r * 0.65, cy - r * 0.85), fill=a)
    elif kind == "beard":
        draw.chord((cx - r, cy - r, cx + r, cy + r * 0.2), 180, 360, fill=h)
        draw.chord((cx - r * 0.95, cy - r * 0.3, cx + r * 0.95, cy + r * 1.35), 20, 160, fill=h)
    elif kind == "hard_hat":
        draw.chord((cx - r * 1.05, cy - r * 1.25, cx + r * 1.05, cy + r * 0.3), 180, 360, fill=a)
        draw.rectangle((cx - r * 1.25, cy - r * 0.5, cx + r * 1.25, cy - r * 0.38), fill=a)
    elif kind == "sou_wester":
        draw.chord((cx - r * 1.05, cy - r * 1.3, cx + r * 1.05, cy + r * 0.3), 180, 360, fill=a)
        draw.polygon(((cx - r * 1.4, cy - r * 0.2), (cx + r * 1.4, cy - r * 0.2),
                      (cx + r * 1.05, cy - r * 0.5), (cx - r * 1.05, cy - r * 0.5)), fill=a)
    elif kind == "bun":
        draw.ellipse((cx - r * 0.45, cy - r * 1.6, cx + r * 0.45, cy - r * 0.75), fill=h)
        draw.chord((cx - r, cy - r, cx + r, cy + r * 0.1), 180, 360, fill=h)
        w = max(2, round(s * 0.01))
        for side in (-1, 1):
            x = cx + side * r * 0.38
            draw.ellipse((x - r * 0.24, cy - r * 0.32, x + r * 0.24, cy + r * 0.16), outline=(60, 40, 30, 255), width=w)
    elif kind == "cap":
        draw.chord((cx - r, cy - r * 1.1, cx + r, cy + r * 0.2), 180, 360, fill=a)
        draw.ellipse((cx - r * 0.2, cy - r * 0.62, cx + r * 1.5, cy - r * 0.32), fill=a)
    elif kind == "straw_hat":
        draw.ellipse((cx - r * 1.5, cy - r * 0.85, cx + r * 1.5, cy - r * 0.35), fill=(226, 196, 110, 255))
        draw.chord((cx - r * 0.8, cy - r * 1.5, cx + r * 0.8, cy - r * 0.2), 180, 360, fill=(226, 196, 110, 255))
        draw.rectangle((cx - r * 0.8, cy - r * 0.78, cx + r * 0.8, cy - r * 0.62), fill=a)
    elif kind == "wrap":
        draw.chord((cx - r * 1.08, cy - r * 1.45, cx + r * 1.08, cy + r * 0.1), 180, 360, fill=a)
        draw.ellipse((cx - r * 0.18, cy - r * 0.95, cx + r * 0.18, cy - r * 0.6), fill=(180, 40, 60, 255))
    elif kind == "witch_hat":
        draw.ellipse((cx - r * 1.5, cy - r * 0.9, cx + r * 1.5, cy - r * 0.45), fill=(48, 36, 64, 255))
        draw.polygon(((cx - r * 0.8, cy - r * 0.7), (cx + r * 0.8, cy - r * 0.7), (cx + r * 0.5, cy - r * 2.3)),
                     fill=(48, 36, 64, 255))
        draw.rectangle((cx - r * 0.74, cy - r * 0.95, cx + r * 0.74, cy - r * 0.78), fill=a)
    elif kind == "halo":
        w = max(3, round(s * 0.02))
        draw.ellipse((cx - r * 0.8, cy - r * 1.55, cx + r * 0.8, cy - r * 1.15), outline=a, width=w)
        draw.chord((cx - r, cy - r, cx + r, cy + r * 0.1), 180, 360, fill=h)


def bust(npc, mood):
    from PIL import Image, ImageDraw
    background, clothes, accent, hair, kind = NPCS[npc]
    s = SIZE * SCALE
    image = Image.new("RGBA", (s, s))
    draw = ImageDraw.Draw(image, "RGBA")
    draw.rounded_rectangle((0, 0, s - 1, s - 1), radius=s * 0.1, fill=background + (255,))
    if npc == "goddess":
        for i in range(6, 0, -1):
            g = s * (0.2 + 0.05 * i)
            draw.ellipse((s / 2 - g, s * 0.42 - g, s / 2 + g, s * 0.42 + g), fill=accent + (28,))
    cx, cy, r = s / 2, s * 0.44, s * 0.2
    draw.chord((s * 0.14, s * 0.68, s * 0.86, s * 1.3), 180, 360, fill=clothes + (255,))
    draw.polygon(((cx - s * 0.06, s * 0.68), (cx + s * 0.06, s * 0.68), (cx, s * 0.8)), fill=accent + (255,))
    draw.rectangle((cx - r * 0.3, cy + r * 0.8, cx + r * 0.3, s * 0.7), fill=SKIN + (255,))
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=SKIN + (255,))
    headwear(draw, kind, cx, cy, r, accent, hair, s)
    face(draw, cx, cy, r, mood, s)
    return image.resize((SIZE, SIZE), Image.LANCZOS)


def wise_oak():
    """A tree with a face: a leafy crown over a bark trunk."""
    from PIL import Image, ImageDraw
    s = SIZE * SCALE
    image = Image.new("RGBA", (s, s))
    draw = ImageDraw.Draw(image, "RGBA")
    draw.rounded_rectangle((0, 0, s - 1, s - 1), radius=s * 0.1, fill=(214, 234, 200, 255))
    for i in range(9):
        a = 2 * math.pi * i / 9
        x, y = s / 2 + s * 0.26 * math.cos(a), s * 0.3 + s * 0.14 * math.sin(a)
        draw.ellipse((x - s * 0.16, y - s * 0.14, x + s * 0.16, y + s * 0.14), fill=(70, 130, 60, 255))
    draw.rectangle((s * 0.3, s * 0.38, s * 0.7, s), fill=(112, 80, 50, 255))
    for x in (0.38, 0.5, 0.62):
        draw.line((s * x, s * 0.72, s * x, s), fill=(90, 62, 38, 255), width=round(s * 0.012))
    draw.ellipse((s * 0.34, s * 0.44, s * 0.66, s * 0.74), fill=(176, 140, 98, 255))
    face(draw, s / 2, s * 0.58, s * 0.14, "", s)
    return image.resize((SIZE, SIZE), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for npc in NPCS:
        for mood in MOODS if npc != "goddess" else ("",):
            path = OUT / mood / f"{npc}.png"
            path.parent.mkdir(parents=True, exist_ok=True)
            bust(npc, mood).save(path, optimize=True)
    wise_oak().save(OUT / "wise_oak.png", optimize=True)
    count = 0
    for path in sorted(DIALOGS.glob("*.json")):
        dialog = json.loads(path.read_text())
        before = json.dumps(dialog)
        port_portraits(dialog)
        if json.dumps(dialog) != before:
            path.write_text(json.dumps(dialog, indent=2, ensure_ascii=False) + "\n")
            count += 1
    shops = 0
    for path in sorted(SHOPS.glob("*.json")):
        shop = json.loads(path.read_text())
        if "texture" in shop and shop_texture(shop["texture"]) != shop["texture"]:
            shop["texture"] = shop_texture(shop["texture"])
            path.write_text(json.dumps(shop, indent=2, ensure_ascii=False) + "\n")
            shops += 1
    print(f"portraits drawn, {count} dialogs and {shops} shops rewritten")


if __name__ == "__main__":
    main()
