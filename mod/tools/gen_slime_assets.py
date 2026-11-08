"""Generates the item models and names of the plorts and Slime Hearts (#13) and the Slime Ranching lang keys.

Plorts use the snowball texture and hearts the firework star, tinted with the breed color in ClientSetup.
Run: python3 tools/gen_slime_assets.py
"""
import json
import os
import sys

sys.dont_write_bytecode = True
from slime_breeds import BREEDS  # noqa: E402

RES = os.path.join(os.path.dirname(__file__), "..", "src", "main", "resources")
NS = "splendid_slimes"


def write(path, data):
    path = os.path.join(RES, path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def merge_lang(path, entries):
    path = os.path.join(RES, path)
    with open(path) as f:
        lang = json.load(f)
    lang.update(entries)
    with open(path, "w") as f:
        json.dump(lang, f, indent=2, ensure_ascii=False)
        f.write("\n")


def tinted(texture):
    return {"parent": "minecraft:item/generated", "textures": {"layer0": texture}}


en, de = {}, {}
for breed, name, *_ in BREEDS:
    write(f"assets/{NS}/models/item/plort_{breed}.json", tinted("minecraft:item/snowball"))
    write(f"assets/{NS}/models/item/slime_heart_{breed}.json", tinted("minecraft:item/firework_star"))
    en[f"item.{NS}.plort_{breed}"] = f"{name} Plort"
    en[f"item.{NS}.slime_heart_{breed}"] = f"{name} Slime Heart"
    de[f"item.{NS}.plort_{breed}"] = f"{name}-Plort"
    de[f"item.{NS}.slime_heart_{breed}"] = f"{name}-Schleimherz"
write(f"assets/{NS}/lang/en_us.json", en)
write(f"assets/{NS}/lang/de_de.json", de)

skill = {
    "en": {"name": "Slime Ranching", "lower": "slime ranching", "pen": "%s Slimes", "treat": "%s Slimes (favorite food)"},
    "de": {"name": "Schleimzucht", "lower": "Schleimzucht", "pen": "%s-Schleime", "treat": "%s-Schleime (Lieblingsfutter)"},
}
for lang, t in skill.items():
    keys = {
        "sunlitidle.skill.slime_ranching": t["name"],
        "sunlitidle.skills.slime_ranching.category.title": t["name"],
        "attribute.name.sunlitidle.slime_ranching_speed": ("Idle slime ranching speed" if lang == "en" else "Idle-Tempo Schleimzucht"),
        "attribute.name.sunlitidle.slime_ranching_yield": ("Idle slime ranching yield" if lang == "en" else "Idle-Ertrag Schleimzucht"),
    }
    if lang == "en":
        perks = {
            "manual": ("+5% idle yield", "More chance for an extra output."),
            "speed": ("+10% idle speed", "Idle slime ranching actions finish faster."),
            "yield": ("+10% idle yield", "More chance for extra plorts."),
            "speed_cap": ("+25% idle speed", "Idle slime ranching actions finish faster."),
            "yield_cap": ("+25% idle yield", "More chance for extra plorts."),
            "master": ("Master of slime ranching", "+15% idle speed and yield."),
        }
    else:
        perks = {
            "manual": ("+5% Idle-Ertrag", "Mehr Chance auf ein zusätzliches Ergebnis."),
            "speed": ("+10% Idle-Tempo", "Idle-Aktionen für Schleimzucht sind schneller fertig."),
            "yield": ("+10% Idle-Ertrag", "Mehr Chance auf zusätzliche Plorts."),
            "speed_cap": ("+25% Idle-Tempo", "Idle-Aktionen für Schleimzucht sind schneller fertig."),
            "yield_cap": ("+25% Idle-Ertrag", "Mehr Chance auf zusätzliche Plorts."),
            "master": ("Meister: Schleimzucht", "+15% Idle-Tempo und -Ertrag."),
        }
    for perk, (title, desc) in perks.items():
        keys[f"sunlitidle.skills.slime_ranching.{perk}"] = title
        keys[f"sunlitidle.skills.slime_ranching.{perk}.description"] = desc
    for breed, name, *_ in BREEDS:
        keys[f"sunlitidle.action.slime_ranching.{breed}"] = t["pen"] % name
        keys[f"sunlitidle.action.slime_ranching.{breed}_treat"] = t["treat"] % name
    merge_lang(f"assets/sunlitidle/lang/{lang}_us.json" if lang == "en" else "assets/sunlitidle/lang/de_de.json", keys)
print("ok")
