#!/usr/bin/env python3
"""Ports the rest of the pack's own data and its vanilla and forge overrides from kubejs/_unported/data to kubejs/data
for 1.21.1 (Slice 14, #19):

  - society: advancements, block and gold rush loot tables, item and block tags, Curios slots and the Pufferfish's
    Skills trees (farming, husbandry, mining, fishing, adventuring, mastery, books); the blueberry ice cream recipe
    is not ported (Beachparty 1.21 has no mini fridge recipes);
  - sunlitidle: the dungeon loot tables (they replace the sunlitidle mod's own tables);
  - minecraft: block, chest and mob loot tables, the recipe overrides and the item and block tags;
  - forge and c tags: forge tags become c tags; quality_food tags;
  - perfectplushieapi: its plushie loot modifiers are disabled (PLUSHIE_MODIFIERS).

What changes for 1.21:
  - loot tables: "minecraft:loot_table" entries use "value"; looting_enchant becomes enchanted_count_increase;
    random_chance_with_looting becomes random_chance_with_enchanted_bonus; set_nbt becomes set_custom_data;
    set_contents needs a "component"; match_tool tag and enchantment predicates use the 1.21 item predicate;
    location_check biome/structure became biomes/structures;
  - recipes and advancements: {"item"} results and icons become {"id"}; item predicate tags become "items": "#tag";
  - forge tags become c tags (TAGS for renamed ones);
  - items that are gone on 1.21.1 (MISSING, from the CI registry dump of the pack) are left out: a loot entry or tag
    value with such an item is dropped, a recipe or advancement that needs one is not written (SKIPPED_ITEMS lists
    replacements where one is obvious).

Also writes tools/port/kubejs_tests/societyPortData.js for portedDataTest.js.
Run from the repository root: python3 tools/port/port_society_data.py [--registry <dump dir>]
"""
import json
import pathlib
import shutil
import sys

SRC = pathlib.Path("kubejs/_unported/data")
DST = pathlib.Path("kubejs/data")
DATA = pathlib.Path(__file__).parent / "data"
TEST_DATA = pathlib.Path("tools/port/kubejs_tests/societyPortData.js")

# (namespace, folder) pairs this script ports. Structures and worldgen are ported by port_worldgen_data.py.
PARTS = (
    ("society", "advancement"),
    ("society", "curios"),
    ("society", "loot_table/blocks"),
    ("society", "loot_table/util"),
    ("society", "puffish_skills"),
    ("society", "tags/block"),
    ("society", "tags/item"),
    ("sunlitidle", "loot_table"),
    ("minecraft", "loot_table"),
    ("minecraft", "recipe"),
    ("minecraft", "tags/block"),
    ("minecraft", "tags/item"),
    ("forge", "tags/item"),
    ("c", "tags/block"),
    ("quality_food", "tags"),
)
# Files of PARTS that earlier slices ported (#16, #64); they stay as they are.
ALREADY_PORTED = {
    "society/loot_table/blocks": (
        "blackstone_boulder deepslate_iridium_ore deepslate_sparkstone_ore end_stone_boulder geode_node "
        "grimwood_supply_crate ice_boulder iridium_ore magma_geode_node oak_supply_crate omni_geode_node "
        "palm_supply_crate sandstone_boulder sparkstone_ore spruce_supply_crate stone_boulder"
    ),
    "society/tags/block": "hay_golem_improvable skull_cavern_bomb_denied skull_cavern_regens skull_cavern_unplacable",
    "society/tags/item": (
        "bouquet_bag_flowers frozen_geode_bonus frozen_geode_relic frozen_geode_treasure geode_bonus geode_junk "
        "geode_relic geode_treasure geodes magma_geode_bonus magma_geode_relic magma_geode_treasure omni_geode_bonus "
        "omni_geode_special omni_geode_treasure prismatic_shards"
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
    "forge:tools/knives": "c:tools/knife",
}
# Renamed items: the 1.21.1 id of the same thing.
RENAMED = {
    "minecraft:grass": "minecraft:short_grass",
    "minecraft:scute": "minecraft:turtle_scute",
    "meadow:cheese_block": "meadow:cheese_wheel",
    "meadow:piece_of_cheese": "meadow:cheese_slice",
}
for _kind in ("amethyst", "buffalo", "goat", "grain", "sheep", "warped"):
    RENAMED[f"meadow:{_kind}_cheese_block"] = f"meadow:{_kind}_cheese_wheel"
    RENAMED[f"meadow:piece_of_{_kind}_cheese"] = f"meadow:{_kind}_cheese_slice"
# Item ids that are not registered on 1.21.1. With --registry <dir> (a CI registry dump with item.txt) the list is
# rebuilt from the dump and saved here, so later runs do not need the dump.
MISSING_FILE = DATA / "society_missing_items.txt"
REGISTRY = None  # {"item": set, "block": set} from --registry
MISSING = set()  # "item <id>" / "block <id>"

LOOT_KEYS = ("pools", "entries", "children", "functions", "conditions", "terms", "term")


def tag(name):
    name = name[1:] if name.startswith("#") else name
    if name in TAGS:
        return TAGS[name]
    return "c:" + name[len("forge:"):] if name.startswith("forge:") else name


def item(name):
    name = name if ":" in name else "minecraft:" + name
    return RENAMED.get(name, name)


def missing(name, kind="item"):
    if REGISTRY is not None:
        if name not in REGISTRY[kind]:
            MISSING.add(f"{kind} {name}")
            return True
        return False
    return f"{kind} {name}" in MISSING


class Missing(Exception):
    pass


# --- loot tables -----------------------------------------------------------------------------------------------


def port_item_predicate(pred):
    pred = dict(pred)
    out = {}
    if "items" in pred:
        items = [item(i) for i in pred.pop("items") if not missing(item(i))]
        if not items:
            raise Missing("predicate items")
        out["items"] = items[0] if len(items) == 1 else items
    if "tag" in pred:
        out["items"] = "#" + tag(pred.pop("tag"))
    if "enchantments" in pred:
        out.setdefault("predicates", {})["minecraft:enchantments"] = [
            {"enchantments": e["enchantment"], **({"levels": e["levels"]} if "levels" in e else {})}
            for e in pred.pop("enchantments")
        ]
    if "nbt" in pred:
        raise Missing("nbt predicate")
    out.update(pred)
    return out


def port_condition(cond):
    cond = dict(cond)
    kind = cond.get("condition", "")
    if not kind.startswith(("minecraft:", "neoforge:", "forge:")) and ":" not in kind:
        cond["condition"] = kind = "minecraft:" + kind
    if kind == "forge:loot_table_id":
        cond["condition"] = "neoforge:loot_table_id"
    if kind == "minecraft:match_tool" and "predicate" in cond:
        cond["predicate"] = port_item_predicate(cond["predicate"])
    if kind == "minecraft:random_chance_with_looting":
        chance, mult = cond["chance"], cond["looting_multiplier"]
        return {
            "condition": "minecraft:random_chance_with_enchanted_bonus",
            "enchantment": "minecraft:looting",
            "unenchanted_chance": chance,
            "enchanted_chance": {"type": "minecraft:linear", "base": chance + mult, "per_level_above_first": mult},
        }
    if kind == "minecraft:location_check":
        pred = dict(cond.get("predicate", {}))
        if "biome" in pred:
            pred["biomes"] = pred.pop("biome")
        if "structure" in pred:
            pred["structures"] = pred.pop("structure")
        cond["predicate"] = pred
    for key in ("terms", "term"):
        if key in cond:
            cond[key] = [port_condition(c) for c in cond[key]] if isinstance(cond[key], list) else port_condition(cond[key])
    return cond


def port_function(fn):
    fn = dict(fn)
    kind = fn["function"] if ":" in fn["function"] else "minecraft:" + fn["function"]
    fn["function"] = kind
    if kind == "minecraft:looting_enchant":
        fn = {"function": "minecraft:enchanted_count_increase", "enchantment": "minecraft:looting",
              **{k: v for k, v in fn.items() if k in ("count", "limit", "conditions")}}
    elif kind == "minecraft:set_nbt":
        fn = {"function": "minecraft:set_custom_data", "tag": fn["tag"], **({"conditions": fn["conditions"]} if "conditions" in fn else {})}
    elif kind == "minecraft:set_contents":
        fn.pop("type", None)
        fn["component"] = "minecraft:container"
        fn["entries"] = port_entries(fn["entries"])
    elif kind == "minecraft:enchant_randomly" and "enchantments" in fn:
        fn["options"] = fn.pop("enchantments")
    elif kind == "minecraft:enchant_with_levels":
        if fn.pop("treasure", False):
            fn["options"] = "#minecraft:on_random_loot"
    if "conditions" in fn:
        fn["conditions"] = [port_condition(c) for c in fn["conditions"]]
    return fn


def port_entry(entry):
    entry = dict(entry)
    kind = entry["type"] if ":" in entry["type"] else "minecraft:" + entry["type"]
    entry["type"] = kind
    if kind == "minecraft:item":
        entry["name"] = item(entry["name"])
        if missing(entry["name"]):
            return None
    elif kind == "minecraft:loot_table":
        entry["value"] = entry.pop("name", entry.get("value"))
    elif kind == "minecraft:tag":
        entry["name"] = tag(entry["name"])
    if "children" in entry:
        entry["children"] = port_entries(entry["children"])
        if not entry["children"]:
            return None
    if "functions" in entry:
        entry["functions"] = [port_function(f) for f in entry["functions"]]
    if "conditions" in entry:
        entry["conditions"] = [port_condition(c) for c in entry["conditions"]]
    return entry


def port_entries(entries):
    out = []
    for entry in entries:
        try:
            ported = port_entry(entry)
        except Missing:
            ported = None
        if ported is not None:
            out.append(ported)
    return out


def port_loot_table(table):
    table = dict(table)
    pools = []
    for pool in table.get("pools", []):
        pool = dict(pool)
        pool["entries"] = port_entries(pool.get("entries", []))
        if not pool["entries"]:
            continue
        if "functions" in pool:
            pool["functions"] = [port_function(f) for f in pool["functions"]]
        if "conditions" in pool:
            pool["conditions"] = [port_condition(c) for c in pool["conditions"]]
        pools.append(pool)
    table["pools"] = pools
    if "functions" in table:
        table["functions"] = [port_function(f) for f in table["functions"]]
    return table


# --- recipes, advancements, tags --------------------------------------------------------------------------------


def port_ingredient(value):
    if isinstance(value, list):
        out = [port_ingredient(v) for v in value]
        out = [v for v in out if v is not None]
        if not out:
            raise Missing("ingredient")
        return out
    if "item" in value:
        name = item(value["item"])
        if missing(name):
            raise Missing(name)
        return {"item": name}
    if "tag" in value:
        return {"tag": tag(value["tag"])}
    return value


def port_result(result):
    if isinstance(result, str):
        result = {"item": result}
    name = item(result.get("item", result.get("id")))
    if missing(name):
        raise Missing(name)
    out = {"id": name, "count": result.get("count", 1)}
    if "nbt" in result:
        raise Missing("result nbt")
    return out


def port_recipe(recipe):
    recipe = dict(recipe)
    conditions = recipe.pop("forge:conditions", None) or recipe.pop("conditions", None)
    if conditions == [{"type": "forge:false"}]:
        return {"neoforge:conditions": [{"type": "neoforge:false"}]}
    if "key" in recipe:
        recipe["key"] = {k: port_ingredient(v) for k, v in recipe["key"].items()}
    for key in ("ingredients",):
        if key in recipe:
            recipe[key] = [port_ingredient(v) for v in recipe[key]]
    for key in ("ingredient", "base", "addition", "template"):
        if key in recipe:
            recipe[key] = port_ingredient(recipe[key])
    if "result" in recipe:
        recipe["result"] = port_result(recipe["result"])
    if conditions:
        raise Missing("conditions")  # none of the ported recipes has other conditions
    return recipe


def port_advancement(adv):
    adv = dict(adv)
    if "display" in adv:
        display = dict(adv["display"])
        icon = dict(display["icon"])
        name = item(icon.pop("item"))
        if missing(name):
            raise Missing(name)
        icon.pop("nbt", None)
        display["icon"] = {"id": name, **icon}
        adv["display"] = display
    criteria = {}
    for key, criterion in adv["criteria"].items():
        criterion = dict(criterion)
        conditions = dict(criterion.get("conditions", {}))
        if "items" in conditions:
            conditions["items"] = [port_item_predicate(p) for p in conditions["items"]]
        if "item" in conditions:
            conditions["item"] = port_item_predicate(conditions["item"])
        if conditions:
            criterion["conditions"] = conditions
        criteria[key] = criterion
    adv["criteria"] = criteria
    return adv


def port_tag(data, kind="item"):
    values = []
    for value in data["values"]:
        if isinstance(value, dict):
            name, required = value["id"], value.get("required", True)
        else:
            name, required = value, True
        name = "#" + tag(name) if name.startswith("#") else item(name)
        if not name.startswith("#") and missing(name, kind):
            continue
        values.append(name if required else {"id": name, "required": False})
    return {**({"replace": data["replace"]} if "replace" in data else {}), "values": values}


def port_skills(value):
    """Pufferfish's Skills 0.19 reads the same format; its attributes moved to the puffish_attributes namespace."""
    if isinstance(value, dict):
        return {k: port_skills(v) for k, v in value.items()}
    if isinstance(value, list):
        return [port_skills(v) for v in value]
    if isinstance(value, str) and value in ("puffish_skills:fortune", "puffish_skills:stamina"):
        return value.replace("puffish_skills:", "puffish_attributes:")
    return value


# Perfect Plushies loot modifiers draw from the perfectplushieapi plushie tags, which server_scripts/tags/
# handleItemBlockFluidTags.js empties (plushies come from the pack's own systems); an empty tag crashes the modifier.
PLUSHIE_CHESTS = (
    "buried_treasure", "shipwreck_treasure", "simple_dungeon", "underwater_ruin_big", "underwater_ruin_small",
    *(f"village_{v}" for v in ("armorer", "butcher", "cartographer", "desert_house", "fisher", "mason", "plains_house",
                               "savanna_house", "shepherd", "snowy_house", "taiga_house", "tannery", "temple",
                               "toolsmith", "weaponsmith")),
)
PLUSHIE_MODIFIERS = [f"archaeology_{p}_loot" for p in (
    "desert_pyramid", "desert_well", "ocean_ruin_cold", "ocean_ruin_warm", "trail_ruins_common", "trail_ruins_rare")
] + [f"{chest}_loot{tier}" for chest in PLUSHIE_CHESTS for tier in ("", "_epic", "_rare")]


def disable_plushie_loot():
    out = DST / "perfectplushieapi" / "loot_modifiers"
    shutil.rmtree(out, ignore_errors=True)
    for name in PLUSHIE_MODIFIERS:
        write(out / f"{name}.json", {"neoforge:conditions": [{"type": "neoforge:false"}]})


# --- driver ------------------------------------------------------------------------------------------------------


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def items_in(value, out):
    if isinstance(value, dict):
        for key in ("item", "id", "name"):
            v = value.get(key)
            if isinstance(v, str) and ":" in v and value.get("type") not in ("minecraft:loot_table", "minecraft:tag"):
                out.add(v)
        for v in value.values():
            items_in(v, out)
    elif isinstance(value, list):
        for v in value:
            items_in(v, out)
    return out


def main():
    global REGISTRY, MISSING
    if len(sys.argv) == 3 and sys.argv[1] == "--registry":
        REGISTRY = {k: set((pathlib.Path(sys.argv[2]) / f"{k}.txt").read_text().split()) for k in ("item", "block")}
    elif MISSING_FILE.exists():
        MISSING = {l for l in MISSING_FILE.read_text().splitlines() if l and not l.startswith("#")}
    test = {"recipes": [], "lootTables": [], "advancements": [], "itemTags": [], "items": set()}
    skipped = []
    for namespace, folder in PARTS:
        src_root = SRC / namespace / folder
        if f"{namespace}/{folder}" in ALREADY_PORTED:
            done = {pathlib.Path(name + ".json") for name in ALREADY_PORTED[f"{namespace}/{folder}"].split()}
        else:
            done = set()
            out_ns = "c" if namespace == "forge" else namespace
            if namespace not in ("forge", "c"):
                shutil.rmtree(DST / out_ns / folder, ignore_errors=True)
        for src in sorted(src_root.rglob("*.json")):
            rel = src.relative_to(src_root)
            if rel in done:
                continue
            data = json.loads(src.read_text())
            out_ns = "c" if namespace == "forge" else namespace
            path = pathlib.Path(folder) / rel
            res_id = f"{out_ns}:{'/'.join(path.parts[1:])[:-5]}" if not folder.startswith("tags") else None
            try:
                if folder.startswith("loot_table"):
                    data = port_loot_table(data)
                    test["lootTables"].append(f"{out_ns}:{'/'.join(path.parts[1:])[:-5]}")
                elif folder.startswith("recipe"):
                    data = port_recipe(data)
                    if "type" in data:
                        test["recipes"].append(res_id)
                elif folder == "advancement":
                    data = port_advancement(data)
                    test["advancements"].append(res_id)
                elif folder.startswith("tags"):
                    kind = path.parts[1]
                    data = port_tag(data, "block" if kind == "block" else "item")
                    # Only tags with a registered item of their own must be non-empty; the rest may wait for others.
                    if kind == "item" and any(isinstance(v, str) and not v.startswith("#") for v in data["values"]):
                        test["itemTags"].append(f"{out_ns}:{'/'.join(path.parts[2:])[:-5]}")
                elif folder == "puffish_skills":
                    data = port_skills(data)
            except Missing as e:
                skipped.append(f"{namespace}/{path} ({e})")
                continue
            if not folder.startswith("tags") and folder != "puffish_skills":
                items_in(data, test["items"])
            write(DST / out_ns / path, data)
    disable_plushie_loot()
    test["items"] = sorted(i for i in test["items"] if not i.startswith("#") and ":" in i and "/" not in i.split(":")[0])
    TEST_DATA.write_text(
        "// Generated by tools/port/port_society_data.py: what portedDataTest.js checks for the society scope.\n"
        f"const societyPortData = {json.dumps({k: sorted(v) for k, v in test.items()})};\n"
    )
    if REGISTRY is not None:
        MISSING_FILE.write_text(
            "# Item and block ids of the data ported by port_society_data.py that are not registered on 1.21.1 (CI registry dump).\n"
            + "\n".join(sorted(MISSING)) + "\n"
        )
    for name in skipped:
        print("  not ported:", name)
    print({k: len(v) for k, v in test.items()}, f"{len(skipped)} skipped")


if __name__ == "__main__":
    main()
