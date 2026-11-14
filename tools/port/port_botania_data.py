#!/usr/bin/env python3
"""Ports the pack's Botania data from kubejs/_unported/data to kubejs/data for Botania Revived on 1.21.1 (#14).

Botania Revived keeps the 1.20.1 item and recipe ids, so files keep their paths (an override replaces the
Botania recipe of the same id). What changes:
  - items that are gone on 1.21.1 are replaced (SUBSTITUTES);
  - item results ({"item": x, "count": n}) become {"id": x, "count": n};
  - recipes that use items of other mods or of KubeJS get neoforge:item_exists conditions, so a missing item
    only drops that recipe instead of logging a broken one;
  - the chest loot injects that turned Botania's dungeon loot off are empty tables ({"pools": []});
  - the Cropnolia recipe (Croptania) moves to kubejs/data/croptania;
  - the mystical flower seed recipes (Botania Seeds, startup_scripts/mana/mysticalFlowerCrops.js) are written to
    kubejs/data/botania_seeds: four of a crop plus any seed in the petal apothecary give four seeds.

Run from the repository root: python3 tools/port/port_botania_data.py
"""
import json
import pathlib

SRC = pathlib.Path("kubejs/_unported/data")
DST = pathlib.Path("kubejs/data")
# Namespaces whose items are always there.
ALWAYS = {"minecraft", "botania"}
RESULT_KEYS = ("output", "result")
# Items that are gone on 1.21.1, with what the recipe uses instead.
SUBSTITUTES = {
    "trials:breeze_rod": "minecraft:breeze_rod",  # vanilla since 1.21
    "unusualfishmod:raw_snowflake": "minecraft:snow_block",  # not in Unusual Fish Mod 1.21.1
}

# Crop -> mystical flower seed color (from the 1.20.1 addMysticalFlowerSeedRecipes.js).
SEED_CROPS = {
    "green": "vintagedelight:cucumber",
    "cyan": "supplementaries:flax",
    "light_blue": "society:ancient_fruit",
    "blue": "society:blueberry",
    "purple": "society:eggplant",
    "magenta": "vintagedelight:gearo_berry",
    "pink": "farm_and_charm:strawberry",
    "white": "veggiesdelight:cauliflower",
    "light_gray": "veggiesdelight:garlic",
    "gray": "atmospheric:currant",
    "black": "vintagedelight:ghost_charcoal",
    "brown": "snowyspirit:ginger",
    "red": "minecraft:beetroot",
    "orange": "veggiesdelight:bellpepper",
    "yellow": "farm_and_charm:corn",
    "lime": "farmersdelight:cabbage",
}


def convert_stack(stack):
    if isinstance(stack, dict) and "item" in stack and "type" not in stack:
        return {"count": stack.get("count", 1), "id": stack["item"]}
    return stack


def ids_in(value, out):
    """Item and block ids a recipe names (ingredients, results, orechid blocks), not tags."""
    if isinstance(value, dict):
        for key in ("item", "id", "block"):
            if isinstance(value.get(key), str):
                out.add(value[key])
        for v in value.values():
            ids_in(v, out)
    elif isinstance(value, list):
        for v in value:
            ids_in(v, out)
    return out


def with_conditions(recipe):
    foreign = sorted(i for i in ids_in(recipe, set()) if i.split(":")[0] not in ALWAYS)
    if not foreign:
        return recipe
    conditions = [{"type": "neoforge:item_exists", "item": i} for i in foreign]
    return {"neoforge:conditions": conditions, **recipe}


def substitute(value):
    if isinstance(value, dict):
        return {k: SUBSTITUTES.get(v, v) if isinstance(v, str) else substitute(v) for k, v in value.items()}
    if isinstance(value, list):
        return [substitute(v) for v in value]
    return value


def convert_recipe(recipe):
    recipe = substitute(dict(recipe))
    for key in RESULT_KEYS:
        if key not in recipe:
            continue
        value = recipe[key]
        recipe[key] = [convert_stack(v) for v in value] if isinstance(value, list) else convert_stack(value)
    return with_conditions(recipe)


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def main():
    for src in sorted((SRC / "botania").rglob("*.json")):
        rel = src.relative_to(SRC)
        data = json.loads(src.read_text())
        kind = rel.parts[1]
        if kind == "recipe":
            data = convert_recipe(data)
        elif kind == "loot_table":
            data = {"pools": []}
        write(DST / rel, data)

    cropnolia = json.loads((SRC / "croptania/recipe/cropnolia.json").read_text())
    write(DST / "croptania/recipe/cropnolia.json", convert_recipe(cropnolia))

    for color, crop in SEED_CROPS.items():
        recipe = {
            "type": "botania:petal_apothecary",
            "ingredients": [{"item": crop}] * 4,
            "output": {"item": f"botania_seeds:{color}_mystical_flower_seeds", "count": 4},
            "reagent": {"tag": "botania:seed_apothecary_reagent"},
        }
        write(DST / f"botania_seeds/recipe/petal_apothecary/{color}_mystical_flower_seeds.json",
              convert_recipe(recipe))


if __name__ == "__main__":
    main()
