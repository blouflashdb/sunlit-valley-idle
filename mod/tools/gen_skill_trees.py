"""Generates the Pufferfish's Skills categories added by this mod (woodcutting, foraging).

Run: python3 tools/gen_skill_trees.py
"""
import json
import os

ROOT = os.path.join(os.path.dirname(__file__), "..", "src", "main", "resources", "data", "sunlitidle", "puffish_skills")
CURVE = [250, 500, 1000, 2000, 5000, 6000, 8000, 10000, 13000, 16000, 20000, 25000]


def attr(attribute, value):
    return {"type": "puffish_skills:attribute",
            "data": {"attribute": attribute, "value": value, "operation": "addition"}}


def definition(key, icon, rewards, challenge=False):
    d = {"title": {"translate": key}, "description": {"translate": key + ".description"},
         "icon": {"type": "item", "data": {"item": icon}}, "rewards": rewards}
    if challenge:
        d["frame"] = {"type": "advancement", "data": {"frame": "challenge"}}
    return d


def block_test(name, block):
    return {name: {"operations": [{"type": "get_mined_block_state"},
                                  {"type": "puffish_skills:test", "data": {"block": block}}]}}


def tree(skill, title_icon, background, manual_def, manual_icon, idle_icon, sources):
    base = "sunlitidle.skills." + skill
    speed = "sunlitidle:" + skill + "_speed"
    yld = "sunlitidle:" + skill + "_yield"
    defs = {
        "manual": definition(base + ".manual", manual_icon, manual_def),
        "speed": definition(base + ".speed", "minecraft:clock", [attr(speed, 0.1)]),
        "yield": definition(base + ".yield", idle_icon, [attr(yld, 0.1)]),
        "speed_cap": definition(base + ".speed_cap", "minecraft:clock", [attr(speed, 0.25)], True),
        "yield_cap": definition(base + ".yield_cap", idle_icon, [attr(yld, 0.25)], True),
        "master": definition(base + ".master", title_icon, [attr(speed, 0.15), attr(yld, 0.15)], True),
    }
    nodes = {
        "root": ("manual", -256, 0, True),
        "s1": ("speed", -192, 0, False),
        "y1": ("yield", -128, -48, False),
        "y2": ("yield", -64, -48, False),
        "y3": ("yield", 0, -48, False),
        "yc": ("yield_cap", 64, -48, False),
        "p1": ("speed", -128, 48, False),
        "p2": ("manual", -64, 48, False),
        "p3": ("speed", 0, 48, False),
        "pc": ("speed_cap", 64, 48, False),
        "m": ("master", 128, 0, False),
    }
    skills = {k: {"definition": d, "x": x, "y": y, "root": r} for k, (d, x, y, r) in nodes.items()}
    links = [["root", "s1"], ["s1", "y1"], ["y1", "y2"], ["y2", "y3"], ["y3", "yc"], ["yc", "m"],
             ["s1", "p1"], ["p1", "p2"], ["p2", "p3"], ["p3", "pc"], ["pc", "m"]]
    variables = {}
    experience = []
    for name, block, xp in sources:
        variables.update(block_test(name, block))
        experience.append({"condition": name, "expression": str(xp)})
    files = {
        "category.json": {"unlocked_by_default": True, "title": {"translate": base + ".category.title"},
                          "icon": {"type": "item", "data": {"item": title_icon}},
                          "background": background, "spent_points_limit": 12},
        "definitions.json": defs,
        "skills.json": skills,
        "connections.json": {"normal": {"bidirectional": links}},
        "experience.json": {"experience_per_level": {"type": "values", "data": {"values": CURVE}},
                            "sources": [{"type": "puffish_skills:mine_block",
                                         "data": {"variables": variables, "experience": experience}}]},
    }
    folder = os.path.join(ROOT, "categories", skill)
    os.makedirs(folder, exist_ok=True)
    for name, content in files.items():
        with open(os.path.join(folder, name), "w") as f:
            json.dump(content, f, indent=2)
            f.write("\n")


tree("woodcutting", "minecraft:iron_axe", "textures/block/oak_planks.png",
     [attr("puffish_attributes:axe_speed", 3)], "minecraft:iron_axe", "minecraft:oak_log",
     [("log", "#minecraft:logs", 2)])
tree("foraging", "minecraft:sweet_berries", "textures/block/moss_block.png",
     [attr("puffish_skills:fortune", 1)], "minecraft:sweet_berries", "minecraft:poppy",
     [("flower", "#minecraft:flowers", 3), ("grass", "minecraft:grass", 1), ("fern", "minecraft:fern", 1),
      ("brown_mushroom", "minecraft:brown_mushroom", 3), ("red_mushroom", "minecraft:red_mushroom", 3)])

with open(os.path.join(ROOT, "config.json"), "w") as f:
    json.dump({"version": 3, "categories": ["woodcutting", "foraging"]}, f, indent=2)
    f.write("\n")
print("ok")
