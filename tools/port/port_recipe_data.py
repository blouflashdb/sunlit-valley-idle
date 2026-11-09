#!/usr/bin/env python3
"""Ports the pack's recipe, tag, loot and biome modifier overrides of other mods from kubejs/_unported/data to
kubejs/data for 1.21.1, one group of namespaces per slice (GROUPS; #17 is "storage").

Files keep their paths, so an override still replaces the mod's file of the same id. What changes:
  - "forge:conditions" and forge condition types become neoforge ones; "forge:conditional" recipes (gone on 1.21)
    become their first recipe with that recipe's conditions;
  - forge item tags become c tags (TAGS for the ones that were renamed);
  - item results ({"item": x, "count": n}) become {"id": x, "count": n}, also in Create results, Create sequenced
    assembly steps and transitional items, and Functional Storage compacting inputs;
  - Create fluid ingredients become {"type": "fluid_stack", "fluid": x, "amount": n};
  - forge biome modifiers move to neoforge/biome_modifier;
  - items that are gone on 1.21.1 are replaced (SUBSTITUTES);
  - Create 6 recipe keys are snake_case (RENAMED_KEYS);
  - overrides of items or recipe types that are gone are not ported (SKIPPED);
  - recipes that use the pack's own fluids or items of a later slice wait for it (DEFERRED_FLUID_NAMESPACES,
    DEFERRED_ITEMS) and are skipped.

Also writes tools/port/kubejs_tests/portedRecipesData.js: the recipe ids and the items of every ported group, which
portedRecipesTest.js checks.

Run from the repository root: python3 tools/port/port_recipe_data.py
"""
import json
import pathlib
import shutil

SRC = pathlib.Path("kubejs/_unported/data")
DST = pathlib.Path("kubejs/data")
TEST_DATA = pathlib.Path("tools/port/kubejs_tests/portedRecipesData.js")
GROUPS = {
    "storage": (
        "create", "create_enchantment_industry", "copycats", "classicpipes", "pipez", "refinedstorage",
        "functionalstorage", "sophisticatedstorage", "sophisticatedbackpacks",
    ),
}
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
    "forge:stripped_logs": "c:stripped_logs",
}
# Items that are gone on 1.21.1, with what the recipes use instead.
SUBSTITUTES = {
    "createutilities:graviton_tube": "minecraft:ender_eye",  # Create Utilities is gone
    "createutilities:void_casing": "create:railway_casing",
    "moreminecarts:hard_light_lens": "create:electron_tube",  # not in More Minecarts 1.21.1
    "translocators:item_translocator": "create:brass_funnel",  # Translocators is gone
}
# Overrides that are not ported: the item or the recipe type is gone on 1.21.1.
SKIPPED = {
    "pipez:recipe/clear_upgrade.json",  # Pipez 1.21 has no clear_nbt / copy_nbt recipes; its own ones stay
    "pipez:recipe/copy_upgrade_advanced.json",
    "refinedstorage:recipe/filter.json",  # Refined Storage 2 has no filter or fluid grid
    "refinedstorage:recipe/fluid_grid/fluid_grid.json",
}
# Recipes whose items a later slice registers.
DEFERRED_ITEMS = {"society:sturdy_bamboo_block"}
# Create 6 recipe keys are snake_case.
RENAMED_KEYS = {
    "acceptMirrored": "accept_mirrored",
    "heatRequirement": "heat_requirement",
    "keepHeldItem": "keep_held_item",
    "processingTime": "processing_time",
    "transitionalItem": "transitional_item",
}
DEFERRED_FLUID_NAMESPACES = {"society", "vinery", "nethervinery"}
STACK_KEYS = ("result", "results", "transitionalItem", "higher_input", "lower_input", "output")


def tag(name):
    if name in TAGS:
        return TAGS[name]
    return "c:" + name[len("forge:"):] if name.startswith("forge:") else name


def convert_condition(condition):
    condition = dict(condition)
    condition["type"] = condition["type"].replace("forge:", "neoforge:")
    if condition["type"] == "neoforge:and":
        values = [convert_condition(c) for c in condition["values"]]
        return values[0] if len(values) == 1 else {"type": "neoforge:and", "values": values}
    if "values" in condition:
        condition["values"] = [convert_condition(c) for c in condition["values"]]
    if "value" in condition:
        condition["value"] = convert_condition(condition["value"])
    return condition


def convert_stack(stack):
    if isinstance(stack, list):
        return [convert_stack(s) for s in stack]
    if not isinstance(stack, dict):
        return stack
    if "fluid" in stack and "amount" in stack:
        return {"id": stack["fluid"], "amount": stack["amount"]}
    if "item" in stack and "type" not in stack:
        out = {"id": SUBSTITUTES.get(stack["item"], stack["item"]), "count": stack.get("count", 1)}
        if "chance" in stack:
            out["chance"] = stack["chance"]
        return out
    return stack


def convert_value(value):
    """Ingredients and everything else: tags, item substitutes, fluid ingredients, nested recipes."""
    if isinstance(value, list):
        return [convert_value(v) for v in value]
    if not isinstance(value, dict):
        return value
    if "fluid" in value and "amount" in value and "type" not in value:
        return {"type": "fluid_stack", "fluid": value["fluid"], "amount": value["amount"]}
    if "fluidTag" in value:
        return {"type": "fluid_tag", "fluid_tag": tag(value["fluidTag"]), "amount": value["amount"]}
    out = {}
    for key, v in value.items():
        if key == "tag" and isinstance(v, str):
            out[key] = tag(v)
        elif key == "item" and isinstance(v, str):
            out[key] = SUBSTITUTES.get(v, v)
        elif key in STACK_KEYS:
            out[key] = convert_stack(convert_value(v)) if key != "results" else [convert_stack(convert_value(s)) for s in v]
        elif key == "sequence":
            out[key] = [convert_recipe(step) for step in v]
        else:
            out[key] = convert_value(v)
    return {RENAMED_KEYS.get(k, k): v for k, v in out.items()}


def convert_recipe(recipe):
    if recipe.get("type") == "forge:conditional":
        first = recipe["recipes"][0]
        return {"neoforge:conditions": [convert_condition(c) for c in first["conditions"]], **convert_recipe(first["recipe"])}
    recipe = dict(recipe)
    conditions = recipe.pop("forge:conditions", None) or recipe.pop("conditions", None)
    recipe = convert_value(recipe)
    if conditions:
        recipe = {"neoforge:conditions": [convert_condition(c) for c in conditions], **recipe}
    return recipe


def fluids_in(value, out):
    if isinstance(value, dict):
        if isinstance(value.get("fluid"), str):
            out.add(value["fluid"])
        for v in value.values():
            fluids_in(v, out)
    elif isinstance(value, list):
        for v in value:
            fluids_in(v, out)
    return out


def items_in(value, out):
    if isinstance(value, dict):
        for key in ("item", "id"):
            if isinstance(value.get(key), str) and "amount" not in value:
                out.add(value[key])
        for k, v in value.items():
            if k != "neoforge:conditions":
                items_in(v, out)
    elif isinstance(value, list):
        for v in value:
            items_in(v, out)
    return out


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def disabled(recipe):
    return any(c.get("type") == "neoforge:false" for c in recipe.get("neoforge:conditions", []))


def main():
    recipe_ids, items, deferred = set(), set(), []
    for namespaces in GROUPS.values():
        for namespace in namespaces:
            src_root = SRC / namespace
            for folder in ("recipe", "tags", "loot_table", "neoforge"):
                shutil.rmtree(DST / namespace / folder, ignore_errors=True)
            for src in sorted(src_root.rglob("*")):
                if src.is_dir():
                    continue
                rel = src.relative_to(src_root)
                data = json.loads(src.read_text())
                kind = rel.parts[0]
                if f"{namespace}:{rel}" in SKIPPED:
                    continue
                if kind == "recipe":
                    if items_in(data, set()) & DEFERRED_ITEMS:
                        deferred.append(f"{namespace}:{rel}")
                        continue
                    if any(f.split(":")[0] in DEFERRED_FLUID_NAMESPACES for f in fluids_in(data, set())):
                        deferred.append(f"{namespace}:{rel}")
                        continue
                    data = convert_recipe(data)
                    path = rel.with_suffix("") if rel.suffix == ".json" else rel
                    if not disabled(data):
                        recipe_ids.add(f"{namespace}:{'/'.join(path.parts[1:])}")
                        items_in(data, items)
                    write(DST / namespace / rel.with_suffix(".json"), data)
                elif kind == "forge" and rel.parts[1] == "biome_modifier":
                    data["type"] = data["type"].replace("forge:", "neoforge:")
                    write(DST / namespace / "neoforge" / "biome_modifier" / rel.name, data)
                else:
                    write(DST / namespace / rel, data)
    TEST_DATA.write_text(
        "// Generated by tools/port/port_recipe_data.py: the recipes ported from kubejs/_unported/data and their items.\n"
        f"const portedRecipeIds = {json.dumps(sorted(recipe_ids))};\n"
        f"const portedRecipeItems = {json.dumps(sorted(i for i in items if not i.startswith('#')))};\n"
    )
    for name in deferred:
        print(f"  waits for the pack fluids or items: {name}")
    print(f"{len(recipe_ids)} recipes ported, {len(deferred)} deferred, {len(items)} items")


if __name__ == "__main__":
    main()
