#!/usr/bin/env python3
"""Replaces the chapter images of the quest book that came from Society Tweaks (#18).

The quest chapters drew society:textures/gui/*.png and dialog:textures/portraits/*.png images. Both came from the
Society Tweaks jar (license ARR, no 1.21.1 build), so FTB Quests shows them as missing textures. This script:
  - draws our own simple shapes for the plain ones (circles behind quests, seals, background panels, the sheet,
    lattices and boards) into kubejs/assets/sunlitidle/textures/gui/quests and points the chapters at them;
  - removes the picture images (butterflies, slimes, fruits, gems, the Community Center pictures, the NPC
    portraits and the fish pond example in a quest text) from the chapters and the quest texts. Real art can come
    back later as files in kubejs/assets/sunlitidle/textures/gui/quests.
Run from the repository root: python3 tools/port/port_quest_images.py. tools/port/check_quest_refs.py checks
that every image of the book exists.
"""
import colorsys
import math
import pathlib
import re
import sys

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import ftb_snbt  # noqa: E402
from ftb_snbt import Raw, quote  # noqa: E402

CHAPTERS = pathlib.Path("config/ftbquests/quests/chapters")
LANG = pathlib.Path("kubejs/assets/ftbquestlocalizer/lang")
OUT = pathlib.Path("kubejs/assets/sunlitidle/textures/gui/quests")
NAMESPACE = "sunlitidle:textures/gui/quests"
OLD = re.compile(r"^(society:textures/gui|dialog:textures/portraits)/([a-z0-9_]+)\.png$")

CIRCLES = {
    "circle": (217, 217, 217), "circle_white": (255, 255, 255), "circle_teal": (63, 181, 168),
    "circle_light_blue": (140, 203, 235), "circle_blue": (74, 120, 201), "circle_red": (212, 85, 85),
}
SEALS = {
    "seal_brown": (139, 90, 43), "seal_gray": (138, 138, 138), "seal_green": (95, 163, 90),
    "seal_indigo": (75, 79, 168), "seal_iridescent": None, "seal_light_blue": (110, 180, 220),
    "seal_red": (184, 58, 58), "seal_slime": (124, 196, 78), "seal_teal": (52, 160, 150),
}
PANELS = {
    "background_red": (196, 90, 90), "background_light_blue": (167, 211, 238), "background_crops": (201, 217, 138),
    "background_slime": (166, 217, 140), "background_river": (127, 183, 217), "background_ocean": (61, 111, 168),
    "background_fresh": (191, 227, 192), "background_brown": (156, 118, 80), "cave_background": (74, 70, 80),
    "background_gradient": None, "sheet": (244, 238, 220),
}
PATTERNS = {"lattice": (160, 122, 79), "lattice_dark": (94, 70, 48), "boards1": (165, 124, 82)}
SCALE = 4  # drawn larger, then scaled down for smooth edges


def shade(color, factor):
    return tuple(max(0, min(255, round(c * factor))) for c in color)


def finish(image, size):
    return image.resize((size, size), Image.LANCZOS)


def circle(color, size=64):
    s = size * SCALE
    image = Image.new("RGBA", (s, s))
    draw = ImageDraw.Draw(image)
    draw.ellipse((SCALE, SCALE, s - SCALE, s - SCALE), fill=color + (255,))
    return finish(image, size)


def seal(color, size=64):
    """A wax seal: a wavy disc with an inner ring. The iridescent seal shifts its hue around the disc."""
    s = size * SCALE
    image = Image.new("RGBA", (s, s))
    draw = ImageDraw.Draw(image)
    c = s / 2
    points = []
    for i in range(240):
        a = 2 * math.pi * i / 240
        r = s * (0.44 + 0.03 * math.sin(a * 14))
        points.append((c + r * math.cos(a), c + r * math.sin(a)))
    draw.polygon(points, fill=(255, 255, 255, 255))
    if color is None:
        pixels = image.load()
        for y in range(s):
            for x in range(s):
                if pixels[x, y][3]:
                    hue = (math.atan2(y - c, x - c) / (2 * math.pi) + 0.5 + (x + y) / (4 * s)) % 1
                    pixels[x, y] = tuple(round(v * 255) for v in colorsys.hsv_to_rgb(hue, 0.35, 0.95)) + (255,)
        ring = (255, 255, 255, 170)
    else:
        draw.polygon(points, fill=color + (255,))
        ring = shade(color, 0.75) + (255,)
    w = s * 0.05
    draw.ellipse((c - s * 0.3, c - s * 0.3, c + s * 0.3, c + s * 0.3), outline=ring, width=round(w))
    return finish(image, size)


def panel(color, size=128):
    """A rounded panel with a darker border; the gradient panel goes from cream to tan."""
    s = size * SCALE
    if color is None:
        top, bottom = (245, 230, 200), (217, 185, 140)
        fill = Image.new("RGBA", (s, s))
        draw = ImageDraw.Draw(fill)
        for y in range(s):
            t = y / (s - 1)
            draw.line((0, y, s, y), fill=tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)) + (255,))
        border = shade(bottom, 0.8)
    else:
        fill = Image.new("RGBA", (s, s), color + (255,))
        border = shade(color, 0.8)
    mask = Image.new("L", (s, s))
    ImageDraw.Draw(mask).rounded_rectangle((SCALE, SCALE, s - SCALE, s - SCALE), radius=s * 0.08, fill=255)
    image = Image.new("RGBA", (s, s))
    image.paste(fill, mask=mask)
    ImageDraw.Draw(image).rounded_rectangle((SCALE, SCALE, s - SCALE, s - SCALE), radius=s * 0.08,
                                            outline=border + (255,), width=s // 40)
    return finish(image, size)


def pattern(name, color, size=128):
    """Lattices are crossed wooden slats; boards are horizontal planks."""
    s = size * SCALE
    image = Image.new("RGBA", (s, s))
    draw = ImageDraw.Draw(image)
    dark = shade(color, 0.7) + (255,)
    if name.startswith("lattice"):
        width = s // 14
        for i in range(-s, 2 * s, s // 5):
            draw.line((i, 0, i + s, s), fill=color + (255,), width=width)
        for i in range(-s, 2 * s, s // 5):
            draw.line((i + s, 0, i, s), fill=shade(color, 0.85) + (255,), width=width)
        draw.rectangle((0, 0, s - 1, s - 1), outline=dark, width=width)
    else:
        rows = 5
        for row in range(rows):
            y0, y1 = row * s // rows, (row + 1) * s // rows
            draw.rectangle((0, y0, s, y1), fill=shade(color, 1 - 0.06 * (row % 2)) + (255,))
            draw.line((0, y1 - SCALE, s, y1 - SCALE), fill=dark, width=SCALE * 2)
            joint = (row * 37 % 5 + 1) * s // 6
            draw.line((joint, y0, joint, y1), fill=dark, width=SCALE * 2)
    return finish(image.filter(ImageFilter.SMOOTH), size)


def draw_images():
    OUT.mkdir(parents=True, exist_ok=True)
    images = {}
    images.update({name: circle(color) for name, color in CIRCLES.items()})
    images.update({name: seal(color) for name, color in SEALS.items()})
    images.update({name: panel(color) for name, color in PANELS.items()})
    images.update({name: pattern(name, color) for name, color in PATTERNS.items()})
    for name, image in images.items():
        image.save(OUT / f"{name}.png", optimize=True)
    return set(images)


def port_chapter(path, drawn, removed):
    data = ftb_snbt.read(path.read_text())
    images = data.get("images")
    if not isinstance(images, list):
        return
    kept = []
    for image in images:
        match = OLD.match(image["image"].text)
        if not match:
            kept.append(image)
        elif match.group(2) in drawn:
            image["image"] = quote(f"{NAMESPACE}/{match.group(2)}.png")
            kept.append(image)
        else:
            removed.append(f"{path.stem}: {image['image'].text}")
    data["images"] = kept
    text = ftb_snbt.write(data)
    if text != path.read_text():
        path.write_text(text)


def drop_text_images():
    """Removes quest text lines that only show a Society Tweaks image, from the quests and every language."""
    keys = set()
    for path in sorted(LANG.glob("*.json")):
        for line in path.read_text(encoding="utf-8").splitlines():
            match = re.match(r'^\s*"([^"]+)"\s*:\s*"\{image:(society|dialog):textures/', line)
            if match:
                keys.add(match.group(1))
    for path in sorted(CHAPTERS.glob("*.snbt")):
        data = ftb_snbt.read(path.read_text())
        changed = False
        for quest in data.get("quests", []):
            lines = quest.get("description")
            if not isinstance(lines, list) or not any(line.text.strip("{}") in keys for line in lines):
                continue
            lines = [line for line in lines if line.text.strip("{}") not in keys]
            while lines and not lines[-1].text:
                lines.pop()
            quest["description"] = lines
            changed = True
        if changed:
            path.write_text(ftb_snbt.write(data))
    for path in sorted(LANG.glob("*.json")):
        raw = path.read_bytes().decode("utf-8")
        lines = raw.splitlines(keepends=True)
        kept = [line for line in lines if not any(f'"{key}"' in line for key in keys)]
        if kept == lines:
            continue
        for i in range(len(kept) - 1, -1, -1):
            if kept[i].strip() and kept[i].strip() != "}":
                body = kept[i].rstrip("\r\n")
                kept[i] = body.rstrip(",") + kept[i][len(body):]
                break
        path.write_bytes("".join(kept).encode("utf-8"))
    return sorted(keys)


def main():
    drawn = draw_images()
    removed = []
    for path in sorted(CHAPTERS.glob("*.snbt")):
        port_chapter(path, drawn, removed)
    for key in drop_text_images():
        removed.append(f"text {key}")
    for line in removed:
        print(f"  removed {line}")
    print(f"{len(drawn)} images drawn, {len(removed)} images removed")


if __name__ == "__main__":
    main()
