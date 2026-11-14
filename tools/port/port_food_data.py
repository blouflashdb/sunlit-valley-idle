#!/usr/bin/env python3
"""Ports the pack's data overrides of the food mods (Let's Do, Farmer's Delight and its addons, Nether Depths Upgrade,
Create Central Kitchen) from kubejs/_unported/data to kubejs/data for 1.21.1. Slice 14, scope "food".

Structures, worldgen, worldgen tags and biome modifiers of these namespaces belong to the worldgen scope and are not
touched here. Everything else (recipes, loot tables, loot modifiers, tags, advancements) is handled per file:

  - An override only replaces the mod's file with the same path. Overrides that were identical to the 1.20.1 mod's
    own file are no-ops and are not ported (UNCHANGED). Overrides whose 1.21.1 file moved are written to the new
    path (MOVED); overrides whose target or recipe type is gone are not ported (DROPPED, with the reason).
  - "Disable" overrides ({"forge:conditions": [{"type": "forge:false"}]}) become neoforge:false at the same path, but
    only where the 1.21.1 mod still has that file (else they are listed in DROPPED).
  - Recipes are rewritten to the 1.21.1 format of their type (compared with the 1.21.1 mod jars): item results become
    {"id", "count"}; Let's Do stove/roaster need "requiresLearning" and "experience"; the herbal brews kettle has
    fluid_amount/heat_amount/effect/effect_duration at top level; meadow cheese results are stacks, the cooking pot
    container is an item id; brewery results are {"id"}; Farmer's Delight cutting results are {"item": stack, "chance"};
    beachparty's tiki bar became the palm bar (beachparty:palm_bar_mixing); Create fluid ingredients become
    {"type": "fluid_stack" | "fluid_tag", ...} and Create keys are snake_case; "forge:conditional" becomes the first
    recipe with its conditions.
  - forge tags become c tags (TAGS for renamed ones); "conditions"/"forge:conditions" become "neoforge:conditions".
  - Loot tables: forge:loot_table_id -> neoforge:loot_table_id, set_nbt -> set_custom_data, looting_enchant ->
    enchanted_count_increase, match_tool/location_check predicates in the 1.21 shape.
  - Advancements: icon {"item"} -> {"id"}, item predicates with tags -> "#tag".
  - Items, tags and fluids that are not registered on 1.21.1 are replaced (ITEMS) or removed (GONE_ITEMS,
    GONE_TAGS): an ingredient loses that option, a loot table loses that entry, a tag loses that value; a recipe whose
    result or a whole ingredient is gone is not ported (printed as "skipped").

Also writes tools/port/kubejs_tests/foodPortData.js for portedDataTest.js (recipes, loot tables, advancements, item
tags and items that must load on the CI server).

Run from the repository root: python3 tools/port/port_food_data.py
"""
import copy
import json
import pathlib
import re
import shutil

SRC = pathlib.Path("kubejs/_unported/data")
DST = pathlib.Path("kubejs/data")
TEST_DATA = pathlib.Path("tools/port/kubejs_tests/foodPortData.js")
NAMESPACES = (
    "bakery", "beachparty", "brewery", "candlelight", "farm_and_charm", "herbalbrews", "meadow", "vinery",
    "wildernature", "furniture", "farmersdelight", "crabbersdelight", "veggiesdelight", "vintagedelight",
    "netherdepthsupgrade", "nethervinery", "displaydelight", "create_central_kitchen",
)
# Folders this script writes in each namespace (the worldgen scope owns structure/, worldgen/, tags/worldgen/ and
# neoforge/biome_modifier/).
OWN_FOLDERS = ("recipe", "loot_table", "loot_modifiers", "advancement", "tags/item", "tags/block")
WORLDGEN = re.compile(r"^[^/]+/(structure|worldgen|tags/worldgen|forge/biome_modifier)/")
DROPPED_NAMESPACES = {"nethervinery": "Nether Vinery is not in the 1.21.1 pack"}

# --- Filled from the 1.20.1 and 1.21.1 mod jars -------------------------------------------------------------------
# Overrides that are identical to the 1.20.1 mod's own file: nothing to port.
UNCHANGED = set()
# Overrides whose recipe/loot table has another path in the 1.21.1 mod.
MOVED = {}
# Files that are not ported, with the reason.
DROPPED = {}
# Values for fields that 1.21.1 requires and the pack's 1.20.1 file does not have, per file.
EXTRA_FIELDS = {}

# --- Ids -----------------------------------------------------------------------------------------------------------
# forge tags whose c tag has another name; every other forge:x becomes c:x.
TAGS = {
    "forge:chests": "c:chests",
    "forge:eggs": "c:eggs",
    "forge:ender_pearls": "c:ender_pearls",
    "forge:glass": "c:glass_blocks",
    "forge:netherrack": "c:netherracks",
    "forge:rope": "c:ropes",
    "forge:slimeballs": "c:slime_balls",
    "forge:stone": "c:stones",
    "letsdo_addon_compat:tools/knives": "c:tools/knife",
}
# Items (and fluids) renamed on 1.21.1.
ITEMS = {}
# Items, tags and fluids that are not registered on 1.21.1.
GONE_ITEMS = set()
GONE_TAGS = set()

# Recipe types renamed on 1.21.1, with keys the new type needs.
RECIPE_TYPES = {
    "beachparty:tiki_bar_mixing": "beachparty:palm_bar_mixing",
    "beachparty:mini_fridge_mixing": "beachparty:mini_fridge_freezing",
}
CREATE_KEYS = {
    "acceptMirrored": "accept_mirrored",
    "heatRequirement": "heat_requirement",
    "keepHeldItem": "keep_held_item",
    "processingTime": "processing_time",
    "transitionalItem": "transitional_item",
}


class Gone(Exception):
    """The file cannot work on 1.21.1 (a result or a whole ingredient is not registered)."""


def tag_id(name):
    name = TAGS.get(name, name)
    return "c:" + name[len("forge:"):] if name.startswith("forge:") else name


def item_id(name):
    return ITEMS.get(name, name)


def condition(c):
    c = dict(c)
    c["type"] = c["type"].replace("forge:", "neoforge:")
    if c["type"] == "neoforge:and":
        values = [condition(v) for v in c["values"]]
        return values[0] if len(values) == 1 else {"type": "neoforge:and", "values": values}
    if "values" in c:
        c["values"] = [condition(v) for v in c["values"]]
    if "value" in c:
        c["value"] = condition(c["value"])
    return c


def pop_conditions(data):
    conditions = data.pop("forge:conditions", None) or data.pop("conditions", None)
    return [condition(c) for c in conditions] if conditions else None


def is_disable(data):
    conditions = data.get("forge:conditions") or data.get("conditions") or []
    return isinstance(data, dict) and any(c.get("type") == "forge:false" for c in conditions if isinstance(c, dict))


# --- Recipes -------------------------------------------------------------------------------------------------------
def ingredient(value):
    """A vanilla ingredient: {"item"}, {"tag"} or a list of them. Raises Gone when nothing is left."""
    if isinstance(value, list):
        out = []
        for v in value:
            try:
                out.append(ingredient(v))
            except Gone:
                pass
        if not out:
            raise Gone(json.dumps(value))
        return out[0] if len(out) == 1 else out
    if not isinstance(value, dict):
        return value
    if "fluid" in value or "fluidTag" in value:
        return create_fluid(value)
    value = dict(value)
    if "item" in value:
        value["item"] = item_id(value["item"])
        if value["item"] in GONE_ITEMS:
            raise Gone(value["item"])
    if "tag" in value:
        value["tag"] = tag_id(value["tag"])
        if value["tag"] in GONE_TAGS:
            raise Gone("#" + value["tag"])
    return value


def create_fluid(value):
    if "fluidTag" in value:
        out = {"type": "fluid_tag", "fluid_tag": tag_id(value["fluidTag"]), "amount": value["amount"]}
        if out["fluid_tag"] in GONE_TAGS:
            raise Gone("#" + out["fluid_tag"])
        return out
    fluid = item_id(value["fluid"])
    if fluid in GONE_ITEMS:
        raise Gone(fluid)
    return {"type": "fluid_stack", "fluid": fluid, "amount": value["amount"]}


def stack(value, count_key=True):
    """An item result: "id", {"item"} or {"id"} -> {"id", "count"}. Raises Gone when the item is not registered."""
    if isinstance(value, str):
        value = {"item": value}
    if "fluid" in value:
        fluid = item_id(value["fluid"])
        if fluid in GONE_ITEMS:
            raise Gone(fluid)
        return {"id": fluid, "amount": value["amount"]}
    out = {"id": item_id(value.get("item") or value.get("id"))}
    if out["id"] in GONE_ITEMS:
        raise Gone(out["id"])
    if count_key or value.get("count", 1) != 1:
        out["count"] = value.get("count", 1)
    if "nbt" in value:
        nbt = value["nbt"]
        out["components"] = {"minecraft:custom_data": json.loads(nbt) if isinstance(nbt, str) else nbt}
    return out


def ingredients(values):
    return [ingredient(v) for v in values]


def convert_recipe(data, rel):
    if data.get("type") == "forge:conditional":
        first = data["recipes"][0]
        recipe = convert_recipe(first["recipe"], rel)
        return {"neoforge:conditions": [condition(c) for c in first["conditions"]], **recipe}
    data = copy.deepcopy(data)
    conditions = pop_conditions(data)
    kind = RECIPE_TYPES.get(data["type"], data["type"])
    data["type"] = kind
    data.pop("category", None) if kind.split(":")[0] not in ("minecraft",) else None
    # Results.
    if kind in ("farm_and_charm:stove", "veggiesdelight:stove") or ("item" in data and "result" not in data):
        if "item" in data:
            data["result"] = {"item": data.pop("item"), "count": data.pop("count", 1)}
    if kind == "farmersdelight:cutting":
        data["result"] = [cutting_result(r) for r in data["result"]]
        data["tool"] = ingredient(data["tool"])
    elif kind == "herbalbrews:kettle_brewing":
        result = data["result"]
        data["fluid_amount"] = data.pop("fluid", [{"amount": 0}])[0]["amount"] if "fluid" in data else data.get("fluid_amount", 0)
        data["heat_amount"] = data.pop("heat_needed", [{"amount": 0}])[0]["amount"] if "heat_needed" in data else data.get("heat_amount", 0)
        if "effect" in result:
            data["effect"] = result["effect"]
            data["effect_duration"] = result.get("effectduration", 1800)
        data["result"] = stack({"item": result.get("item") or result.get("id")}, count_key=False)
    elif kind in ("create:mixing", "create:compacting"):
        data["results"] = [stack(r) for r in data["results"]]
    elif kind == "brewery:brewing":
        data["result"] = stack(data["result"], count_key=False)
    elif kind in ("vinery:apple_fermenting", "vinery:apple_mashing"):
        data["output"] = stack(data["output"])
    elif "result" in data:
        data["result"] = stack(data["result"])
    # Ingredients.
    for key in ("ingredients",):
        if key in data:
            data[key] = ingredients(data[key])
    for key in ("ingredient", "input", "bucket"):
        if key in data:
            data[key] = ingredient(data[key])
    if "key" in data:
        data["key"] = {k: ingredient(v) for k, v in data["key"].items()}
    # Type specific fields.
    if kind == "farmersdelight:cooking" and "container" in data:
        data["container"] = stack(data["container"])
    if kind == "meadow:cooking" and "container" in data:
        container = data["container"]
        data["container"] = item_id(container["item"] if isinstance(container, dict) else container)
        if data["container"] in GONE_ITEMS:
            raise Gone(data["container"])
    if kind == "farm_and_charm:roaster" and "container" in data:
        data["container"] = stack(data["container"])
    if kind in ("farm_and_charm:stove", "farm_and_charm:roaster"):
        data.setdefault("requiresLearning", False)
        data.setdefault("experience", 0.0)
    if kind.startswith("create:"):
        data = {CREATE_KEYS.get(k, k): v for k, v in data.items()}
    data.update(EXTRA_FIELDS.get(rel, {}))
    if conditions:
        data = {"neoforge:conditions": conditions, **data}
    return data


def cutting_result(value):
    out = {"item": stack(value)}
    if "chance" in value:
        out["chance"] = value["chance"]
    return out


# --- Loot tables and loot modifiers --------------------------------------------------------------------------------
def loot(value):
    """Rewrites a loot table, loot modifier or one of their parts. Entries with gone items are removed."""
    if isinstance(value, list):
        out = []
        for v in value:
            try:
                out.append(loot(v))
            except Gone:
                pass
        return out
    if not isinstance(value, dict):
        return value
    value = dict(value)
    if value.get("type") == "minecraft:item" and "name" in value:
        value["name"] = item_id(value["name"])
        if value["name"] in GONE_ITEMS:
            raise Gone(value["name"])
    if value.get("type") == "minecraft:tag" and "name" in value:
        value["name"] = tag_id(value["name"])
        if value["name"] in GONE_TAGS:
            raise Gone(value["name"])
    if value.get("type") == "minecraft:loot_table" and "name" in value:
        value["value"] = value.pop("name")
    function = value.get("function")
    if function == "minecraft:set_nbt":
        value["function"] = "minecraft:set_custom_data"
    elif function == "minecraft:looting_enchant":
        value["function"] = "minecraft:enchanted_count_increase"
        value["enchantment"] = "minecraft:looting"
    elif function == "minecraft:set_contents":
        value.setdefault("component", "minecraft:container")
    elif function == "minecraft:enchant_randomly" and "enchantments" in value:
        value["options"] = value.pop("enchantments")
    cond = value.get("condition")
    if cond == "forge:loot_table_id":
        value["condition"] = "neoforge:loot_table_id"
    elif cond == "minecraft:random_chance_with_looting":
        value["condition"] = "minecraft:random_chance_with_enchanted_bonus"
    elif cond == "minecraft:match_tool" and "predicate" in value:
        value["predicate"] = item_predicate(value["predicate"])
    elif cond == "minecraft:location_check" and "predicate" in value:
        predicate = dict(value["predicate"])
        if "biome" in predicate:
            predicate["biomes"] = predicate.pop("biome")
        if "structure" in predicate:
            predicate["structures"] = predicate.pop("structure")
        value["predicate"] = predicate
    if "item" in value and isinstance(value["item"], str) and "type" in value and "add_item" in value["type"]:
        value["item"] = item_id(value["item"])
        if value["item"] in GONE_ITEMS:
            raise Gone(value["item"])
    for key, v in list(value.items()):
        if key == "predicate" or not isinstance(v, (dict, list)):
            continue
        value[key] = loot(v)
    return value


def item_predicate(predicate):
    predicate = dict(predicate)
    if "tag" in predicate:
        predicate["items"] = "#" + tag_id(predicate.pop("tag"))
    elif "items" in predicate and isinstance(predicate["items"], list):
        items = [item_id(i) for i in predicate["items"] if item_id(i) not in GONE_ITEMS]
        if not items:
            raise Gone(json.dumps(predicate["items"]))
        predicate["items"] = items[0] if len(items) == 1 else items
    if "enchantments" in predicate:
        predicate.setdefault("predicates", {})["minecraft:enchantments"] = [
            {"enchantments": e["enchantment"], "levels": e.get("levels", {"min": 1})} for e in predicate.pop("enchantments")
        ]
    if "nbt" in predicate:
        predicate.setdefault("predicates", {})["minecraft:custom_data"] = predicate.pop("nbt")
    return predicate


def convert_loot(data):
    data = copy.deepcopy(data)
    conditions = pop_conditions(data) if "forge:conditions" in data else None
    out = loot(data)
    if conditions:
        out = {"neoforge:conditions": conditions, **out}
    return out


# --- Advancements and tags -----------------------------------------------------------------------------------------
def convert_advancement(data):
    data = copy.deepcopy(data)
    display = data.get("display")
    if display and "icon" in display:
        icon = display["icon"]
        display["icon"] = stack(icon)
        display["icon"].pop("count", None)
    for criterion in data.get("criteria", {}).values():
        conditions = criterion.get("conditions", {})
        if "items" in conditions:
            conditions["items"] = [item_predicate(p) for p in conditions["items"]]
        if "item" in conditions:
            conditions["item"] = item_predicate(conditions["item"])
    return data


def convert_tag(data):
    out = []
    for value in data["values"]:
        required = True
        if isinstance(value, dict):
            required = value.get("required", True)
            value = value["id"]
        if value.startswith("#"):
            value = "#" + tag_id(value[1:])
            gone = value[1:] in GONE_TAGS
        else:
            value = item_id(value)
            gone = value in GONE_ITEMS or value == "minecraft:air"
        if gone:
            continue
        out.append(value if required else {"id": value, "required": False})
    data = dict(data)
    data["values"] = out
    return data


# --- Main ----------------------------------------------------------------------------------------------------------
def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def file_id(rel, folder):
    """kubejs path "ns/<folder>/a/b.json" -> "ns:a/b"."""
    namespace, rest = rel.split("/", 1)
    return f"{namespace}:{rest[len(folder) + 1:-len('.json')]}"


def items_in(value, out):
    if isinstance(value, dict):
        for key in ("item", "id", "name"):
            v = value.get(key)
            if isinstance(v, str) and ":" in v and not v.startswith("#") and "amount" not in value:
                if key != "name" or value.get("type") == "minecraft:item":
                    out.add(v)
        for k, v in value.items():
            if k not in ("neoforge:conditions", "predicate", "criteria", "parent", "type"):
                items_in(v, out)
    elif isinstance(value, list):
        for v in value:
            items_in(v, out)
    return out


def main():
    data_out = {"recipes": set(), "lootTables": set(), "advancements": set(), "itemTags": set(), "items": set()}
    counts, dropped, skipped = {}, [], []
    for namespace in NAMESPACES:
        for folder in OWN_FOLDERS:
            shutil.rmtree(DST / namespace / folder, ignore_errors=True)
        for src in sorted((SRC / namespace).rglob("*.json")):
            rel = str(src.relative_to(SRC))
            if WORLDGEN.match(rel):
                continue
            count = counts.setdefault(namespace, [0, 0])
            reason = DROPPED_NAMESPACES.get(namespace) or DROPPED.get(rel)
            if rel in UNCHANGED:
                reason = "identical to the 1.20.1 mod file"
            if reason:
                dropped.append(f"{rel}: {reason}")
                count[1] += 1
                continue
            data = json.loads(src.read_text())
            out_rel = MOVED.get(rel, rel)
            kind = out_rel.split("/")[1]
            try:
                if is_disable(data):
                    out = {"neoforge:conditions": [{"type": "neoforge:false"}]}
                elif kind == "recipe":
                    out = convert_recipe(data, rel)
                elif kind in ("loot_table", "loot_modifiers"):
                    out = convert_loot(data)
                elif kind == "advancement":
                    out = convert_advancement(data)
                elif kind == "tags":
                    out = convert_tag(data)
                else:
                    raise ValueError(rel)
            except Gone as missing:
                skipped.append(f"{rel}: {missing} is not registered on 1.21.1")
                count[1] += 1
                continue
            write(DST / out_rel, out)
            count[0] += 1
            if "neoforge:false" in json.dumps(out.get("neoforge:conditions", [])):
                continue
            if kind == "recipe":
                data_out["recipes"].add(file_id(out_rel, "recipe"))
                items_in(out, data_out["items"])
            elif kind == "loot_table":
                data_out["lootTables"].add(file_id(out_rel, "loot_table"))
                items_in(out, data_out["items"])
            elif kind == "loot_modifiers":
                items_in(out, data_out["items"])
            elif kind == "advancement":
                data_out["advancements"].add(file_id(out_rel, "advancement"))
            elif kind == "tags" and out_rel.split("/")[2] == "item":
                values = [v for v in out["values"] if isinstance(v, str)]
                if values:
                    data_out["itemTags"].add(file_id(out_rel, "tags/item"))
                data_out["items"].update(v for v in values if not v.startswith("#"))
    lines = ",\n".join(f"  {k}: {json.dumps(sorted(v))}" for k, v in data_out.items())
    TEST_DATA.write_text(f"// Generated by tools/port/port_food_data.py.\nconst foodPortData = {{\n{lines},\n}};\n")
    for line in dropped:
        print(f"  dropped: {line}")
    for line in skipped:
        print(f"  skipped: {line}")
    for namespace, (ported, lost) in counts.items():
        print(f"{namespace}: {ported} ported, {lost} not ported")


if __name__ == "__main__":
    main()
