#!/usr/bin/env python3
"""Ports the pack's data overrides of ~50 content mods (scope "mods", see NAMESPACES) from kubejs/_unported/data to
kubejs/data for 1.21.1. Structures, worldgen and biome modifiers of these namespaces are another script's job.

Files keep their path (so an override still replaces the mod file of the same id) unless the 1.21 mod moved it:
  - etcetera/processes -> etcetera/process, supplementaries/moonlight/villager_trades -> .../villager_trade;
  - gamediscs: the 1.20 per-disc chest modifiers (all disabled) are one modifier per chest on 1.21
    (gamediscs/loot_modifiers/disc_from_chests/<chest>), so those are disabled instead;
  - farmingforblockheads_compat groups are market presets + farmingforblockheads:market recipes on 1.21 (FFB_*);
  - longwings brews used vintagedelight:fermenting (gone, the Fermenting Jar is a KubeJS machine now): the 1.21
    crafting recipes at the same path are disabled, as the override meant;
  - atmospheric/modifiers/loot_tables (Blueprint loot modifiers, gone in Blueprint 1.21) -> a NeoForge
    neoforge:add_table modifier plus an inject loot table (the coordinator lists it in global_loot_modifiers.json).
Format changes: forge conditions -> neoforge, forge:conditional -> first recipe, forge tags -> c tags, item results
{"item"} -> {"id"}, nbt -> components, Create snake_case keys (via port_recipe_data); per recipe type (refurbished
furniture, extruder blockIngredients, herbalbrews kettle, FD cooking container, farm_and_charm stove, littlejoys tool
conditions, toolbelt sewing upgrades, golem construction blocks); loot tables (entry types, loot_table "value",
looting -> enchanted_count_increase / random_chance_with_enchanted_bonus, match_tool tags/enchantments,
enchant_with_levels treasure -> options, set_contents -> set_loot_table, biome tags); trades Count -> count and
global_conditions -> neoforge:conditions.
Ids that are not registered on 1.21.1 (tools/port/data/mods_missing_ids.txt, from the 1.21.1 registry dump) are
substituted (SUBSTITUTES) or dropped: loot entries, tag values, market/trade/process entries go; a recipe or file
that needs one is not ported (DROPPED / printed). Writes tools/port/kubejs_tests/modsPortData.js for
portedDataTest.js.

Run from the repository root: python3 tools/port/port_mods_data.py
"""
import copy
import json
import pathlib
import re
import shutil
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from port_recipe_data import convert_condition, convert_recipe, tag  # noqa: E402

SRC = pathlib.Path("kubejs/_unported/data")
DST = pathlib.Path("kubejs/data")
DATA = pathlib.Path("tools/port/data")
TEST_DATA = pathlib.Path("tools/port/kubejs_tests/modsPortData.js")
NAMESPACES = (
    "aquaculture atmospheric autumnity beautify buildinggadgets2 buzzier_bees cluttered comforts "
    "create_factory_logistics create_hypertube create_mechanical_extruder crittersandcompanions curios emojiful "
    "etcetera farmingforblockheads gag gamediscs golemoverhaul jeed littlejoys longwings numismatics oreganized "
    "pamhc2trees paraglider portable_blueprints quark refurbished_furniture rehooked rottencreatures "
    "rsinfinitybooster sawmill sereneseasons simplehats simplemagnets smallships snowrealmagic snowyspirit snuffles "
    "stardew_fishing supplementaries tanukidecor toolbelt twigs untitledduckmod unusualfishmod whimsy_deco windswept "
    "zetter"
).split()
EXCLUDED = ("structure/", "worldgen/", "tags/worldgen/", "forge/biome_modifier/")
# Folders of kubejs/data/<ns> this script owns (cleared before writing).
OWNED = ("recipe", "loot_table", "loot_modifiers", "tags/item", "tags/block", "tags/entity_type", "advancement",
         "process", "moonlight", "farmingforblockheads_compat", "market_presets", "curios")
# Files outside NAMESPACES that this script writes (FFB market presets of other mods).
EXTRA_OWNED = []

# 1.20 ids -> the 1.21.1 id of the same thing (or an obvious equivalent).
SUBSTITUTES = {
    "diagonalfences:minecraft/oak_fence": "minecraft:oak_fence",
    "minecraft:scute": "minecraft:turtle_scute",
    "minecraft:grass": "minecraft:short_grass",
    "farm_and_charm:strawberry_seed": "farm_and_charm:strawberry_seeds",
    "beachparty:palm_sapling": "crabbersdelight:palm_sapling",  # Beachparty 1.21 has no palm sapling
    "#c:shears": "#c:tools/shear",
    "#meadow:cheeses": "#c:cheeses",
    "#c:stained_glass": "#c:glass_blocks",  # no stained glass tag on 1.21; any glass block
    "#c:stained_glass_panes": "#c:glass_panes",
}
# Condition types that were renamed.
CONDITIONS = {"quark:flag": "zeta:flag"}
FILE_SUBSTITUTES = {}  # filled per file where an id needs a file-specific replacement
# 1.20 forge biome tags (aquaculture biome_tag_check) -> c biome tags.
BIOME_TAGS = {"forge:is_water": "c:is_aquatic"}
# Files that are not ported, with the reason (on top of files whose ids are missing).
DROPPED = {
    "simplehats/loot_modifiers/hat_lootinject_entity.json": "Simple Hats 1.21 has no loot modifiers (hat drops are built in)",
    "simplehats/loot_table/inject/hatbag_entity.json": "Simple Hats 1.21 has no inject loot table",
    "sereneseasons/tags/block/greenhouse_glass.json": "only listed More Minecarts glass (mod removed); the default greenhouse glass stays",
}
TRIALS_SUFFIX = re.compile(r"^trials:(waxed_)?(.+?)_(oxidized|weathered|exposed)$")
ID = re.compile(r"^#?[a-z0-9_.-]+:[a-z0-9_./-]+$")


def read_list(name):
    path = DATA / name
    if not path.exists():
        return set()
    return {line.strip() for line in path.read_text().splitlines() if line.strip() and not line.startswith("#")}


MISSING = read_list("mods_missing_ids.txt")
dropped_log = []  # (file, reason)
entry_log = []  # (file, removed id)
disabled_log = []  # (file, why the 1.21 file at that path is disabled)
used_items = set()


def remap(value):
    """1.21 id of a 1.20 id (trials backport ids -> vanilla, SUBSTITUTES)."""
    if not isinstance(value, str) or not ID.match(value):
        return value
    prefix, raw = ("#", value[1:]) if value.startswith("#") else ("", value)
    if raw.startswith("forge:") and prefix:
        raw = tag(raw)
    if prefix and prefix + raw in SUBSTITUTES:
        return SUBSTITUTES[prefix + raw]
    if raw.startswith("trials:"):
        m = TRIALS_SUFFIX.match(raw)
        raw = f"minecraft:{m.group(1) or ''}{m.group(3)}_{m.group(2)}" if m else "minecraft:" + raw[7:]
        raw = raw.replace("minecraft:waxed_oxidized_chiseled_copper", "minecraft:waxed_oxidized_chiseled_copper")
    return prefix + SUBSTITUTES.get(raw, raw)


def remap_all(value):
    if isinstance(value, dict):
        value = {k: ("minecraft:" + v if k in ("item", "id") and isinstance(v, str) and v and ":" not in v else v)
                 for k, v in value.items()}
        if isinstance(value.get("tag"), str):
            value["tag"] = remap("#" + value["tag"])[1:]
        if isinstance(value.get("type"), str) and value["type"] in CONDITIONS:
            value["type"] = CONDITIONS[value["type"]]
        return {remap(k) if ":" in k else k: remap_all(v) for k, v in value.items()}
    if isinstance(value, list):
        return [remap_all(v) for v in value]
    return remap(value)


def missing(value):
    if not isinstance(value, str):
        return False
    return value in MISSING or (value.startswith("#") and value in MISSING)


def ids_in(value, out):
    """Every item/block/tag-like id in a recipe-ish structure (ingredient and result keys)."""
    if isinstance(value, dict):
        for key in ("item", "id", "tag", "name", "blocks", "fluid", "Name"):
            v = value.get(key)
            if isinstance(v, str):
                out.add("#" + v if key == "tag" else v)
        for v in value.values():
            ids_in(v, out)
    elif isinstance(value, list):
        for v in value:
            ids_in(v, out)
    return out


def write(rel, data):
    path = DST / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def drop(rel, reason):
    dropped_log.append((rel, reason))


DISABLED = {"neoforge:conditions": [{"type": "neoforge:false"}]}


def is_disabled(data):
    conds = data.get("forge:conditions") or data.get("conditions") or []
    return isinstance(conds, list) and any(isinstance(c, dict) and c.get("type") == "forge:false" for c in conds)


# ---------------------------------------------------------------- recipes

def stack(value, count_key="count"):
    """{"item": x, "count": n, "nbt": ...} or "x" -> {"id": x, "count": n}."""
    if isinstance(value, str):
        return {"id": value, "count": 1}
    out = {"id": value.get("item", value.get("id")), "count": value.get(count_key, value.get("count", 1))}
    if "nbt" in value:
        out["components"] = {"minecraft:custom_data": value["nbt"]}
    return out


def port_recipe(ns, rel, data):
    t = data.get("type", "")
    if t == "forge:conditional":
        first = data["recipes"][0]
        data = {"conditions": first["conditions"], **first["recipe"]}
        t = data["type"]
    if "global_conditions" in data:
        data = dict(data)
        data["conditions"] = data.pop("global_conditions")
    if t == "jeed:effect_provider":
        # JEED is client-only (no serializer on the server): load it only where JEED is, like Supplementaries does.
        providers = [p for p in data["providers"] if not missing(remap(p.get("item", "")))]
        if not providers:
            return None, "every provider item is missing on 1.21.1"
        return {"neoforge:conditions": [{"type": "neoforge:mod_loaded", "modid": "jeed"}], "type": t,
                "effect": data["effect"], "providers": providers}, None
    if t == "vintagedelight:fermenting":
        return DISABLED, "vintagedelight:fermenting is gone; the 1.21 recipe at this path is disabled (Fermenting Jar makes brews)"
    if t.startswith("refurbished_furniture:"):
        data = dict(data)
        count = data.pop("count", 1)
        if isinstance(data.get("result"), str):
            data["result"] = {"id": data["result"], "count": count}
        if "materials" in data:
            data["materials"] = [{"count": m.get("count", 1), "ingredient": {k: v for k, v in m.items() if k != "count"}}
                                 for m in data["materials"]]
        data.pop("show_notification", None)
    elif t == "create_mechanical_extruder:extruding":
        fluids = [i["fluid"] for i in data["ingredients"]]
        data = {"type": t, "blockIngredients": {"first": {"blocks": fluids[1]}, "second": {"blocks": fluids[0]}},
                "result": {"id": data["result"]["item"]}}
    elif t == "herbalbrews:kettle_brewing":
        result = data["result"]
        data = {"type": t, "experience": data.get("experience", 0.0), "crafting_duration": data["crafting_duration"],
                "fluid_amount": data["fluid"][0]["amount"], "heat_amount": data["heat_needed"][0]["amount"],
                "ingredients": data["ingredients"], "result": {"id": result["item"]},
                "effect": result["effect"], "effect_duration": result["effectduration"]}
    elif t == "farmersdelight:cooking":
        data = dict(data)
        if "container" in data:
            data["container"] = stack(data["container"])
    elif t == "farm_and_charm:stove":
        data = dict(data)
        data["result"] = {"id": data.pop("item"), "count": data.pop("count", 1)}
        data["requiresLearning"] = False
    elif t in ("littlejoys:gold_rush", "littlejoys:dig_spot", "littlejoys:drop_rush"):
        data = dict(data)
        if t == "littlejoys:gold_rush":
            data["eventCondition"] = {"type": "all", "conditions": [
                data["eventCondition"],
                {"type": "is_tool", "item": "#littlejoys:can_trigger_goldrush"},
                {"type": "not", "condition": {"type": "is_tool", "item": "#littlejoys:cannot_trigger_goldrush"}}]}
    elif t == "toolbelt:sewing_upgrade":
        mats = copy.deepcopy(data["materials"])
        for m in mats:
            ing = m["ingredient"]
            if ing.get("type") == "toolbelt:belt_upgrade_level":
                m["ingredient"] = {"type": "toolbelt:belt_upgrade_level", "size": ing["upgrade_level"] + 2}
        data = {"conditions": data.get("conditions", []), "type": t, "group": "toolbelt_belt_upgrade",
                "materials": mats,
                "result": {"components": {"toolbelt:belt_size": data["result"]["nbt"]["Size"]}, "count": 1,
                           "id": data["result"]["item"]},
                "tool": {"tag": "sewingkit:needles/iron_or_higher"}}
    elif t == "sewingkit:sewing":
        data = dict(data)
        data["tool"] = {"tag": "sewingkit:needles/iron_or_higher"}
    elif t == "golemoverhaul:golem_construction":
        data = dict(data)
    elif t == "sawmill:woodcutting":
        data = dict(data)
        data["result"] = {"id": data["result"], "count": data.pop("count", 1)}
    elif t == "crafting_shaped" or t == "crafting_shapeless":
        data = dict(data, type="minecraft:" + t)
    data = convert_recipe(data)
    if t == "create:crushing" or t == "create:sequenced_assembly":
        pass
    return data, None


def recipe_ok(rel, data):
    bad = sorted(i for i in ids_in(data, set()) if missing(i))
    if bad:
        drop(rel, "missing on 1.21.1: " + " ".join(bad))
        return False
    return True


# ---------------------------------------------------------------- loot tables

def port_predicate_tool(pred):
    out = {}
    if "item" in pred:
        out["items"] = [pred["item"]]
    if "items" in pred:
        out["items"] = pred["items"]
    if "tag" in pred:
        out["items"] = "#" + tag(pred["tag"])
    if "enchantments" in pred:
        out["predicates"] = {"minecraft:enchantments": [
            {"enchantments": e["enchantment"], **({"levels": e["levels"]} if "levels" in e else {})}
            for e in pred["enchantments"]]}
    return out


def port_condition(c):
    c = dict(c)
    name = c.get("condition", "")
    if not name.startswith(("minecraft:", "forge:", "neoforge:")) and ":" not in name:
        name = "minecraft:" + name
    c["condition"] = name.replace("forge:", "neoforge:")
    name = c["condition"]
    if name == "minecraft:match_tool":
        c["predicate"] = port_predicate_tool(c["predicate"])
    elif name == "minecraft:random_chance_with_looting":
        chance, mult = c["chance"], c["looting_multiplier"]
        c = {"condition": "minecraft:random_chance_with_enchanted_bonus", "enchantment": "minecraft:looting",
             "unenchanted_chance": chance,
             "enchanted_chance": {"type": "minecraft:linear", "base": chance + mult, "per_level_above_first": mult}}
    elif name == "minecraft:location_check":
        p = dict(c["predicate"])
        if "biome" in p:
            p["biomes"] = p.pop("biome")
        c["predicate"] = p
    elif name == "aquaculture:biome_tag_check":
        p = dict(c["predicate"])
        for k in ("include", "exclude"):
            if k in p:
                p[k] = [BIOME_TAGS.get(x, tag(x)) for x in p[k]]
        c["predicate"] = p
    for k in ("terms", "conditions"):
        if k in c and isinstance(c[k], list):
            c[k] = [port_condition(x) for x in c[k]]
    if "term" in c:
        c["term"] = port_condition(c["term"])
    return c


def port_function(f):
    f = dict(f)
    if ":" not in f["function"]:
        f["function"] = "minecraft:" + f["function"]
    name = f["function"]
    if name == "minecraft:looting_enchant":
        out = {"function": "minecraft:enchanted_count_increase", "enchantment": "minecraft:looting", "count": f["count"]}
        if "limit" in f:
            out["limit"] = f["limit"]
        if "conditions" in f:
            out["conditions"] = f["conditions"]
        f = out
    elif name == "minecraft:enchant_randomly" and "enchantments" in f:
        f["options"] = f.pop("enchantments")
    elif name == "minecraft:enchant_with_levels":
        if f.pop("treasure", False):
            f["options"] = "#minecraft:on_random_loot"
    elif name == "minecraft:set_contents":
        # Aquaculture's Neptune's Bounty is a loot container: give it its loot table instead of rolled contents.
        table = f["entries"][0]["name"]
        f = {"function": "minecraft:set_loot_table", "name": table, "type": f["type"]}
    if "conditions" in f:
        f["conditions"] = [port_condition(c) for c in f["conditions"]]
    return f


def port_entry(e, rel):
    e = dict(e)
    t = e.get("type", "")
    if ":" not in t:
        t = "minecraft:" + t
    e["type"] = t
    e.pop("entryName", None)
    if t == "minecraft:loot_table":
        e["value"] = e.pop("name")
    if "functions" in e:
        e["functions"] = [port_function(f) for f in e["functions"]]
    if "conditions" in e:
        e["conditions"] = [port_condition(c) for c in e["conditions"]]
    if "children" in e:
        e["children"] = [x for x in (port_entry(c, rel) for c in e["children"]) if x]
    target = e.get("name") or e.get("value")
    if isinstance(target, str):
        target = remap(target)
        if t == "minecraft:tag":
            check = "#" + target
        else:
            check = target
        if missing(check) or (t in ("minecraft:item", "stardew_fishing:optional") and target in MISSING):
            entry_log.append((rel, target))
            return None
        e["name" if "name" in e else "value"] = target
        if t in ("minecraft:item", "stardew_fishing:optional"):
            used_items.add(target)
    return e


def port_loot(rel, data):
    data = dict(data)
    data.pop("replace", None)
    pools = []
    for pool in data.get("pools", []):
        pool = dict(pool)
        pool.pop("name", None)
        pool["entries"] = [x for x in (port_entry(e, rel) for e in pool.get("entries", [])) if x]
        if "functions" in pool:
            pool["functions"] = [port_function(f) for f in pool["functions"]]
        if "conditions" in pool:
            pool["conditions"] = [port_condition(c) for c in pool["conditions"]]
        pools.append(pool)
    if "pools" in data:
        data["pools"] = pools
    if "functions" in data:
        data["functions"] = [port_function(f) for f in data["functions"]]
    return data


# ---------------------------------------------------------------- tags

def port_tag(rel, data):
    values = []
    for v in data.get("values", []):
        if isinstance(v, dict):
            vid = remap(v["id"])
            if vid.startswith("#forge:"):
                vid = "#" + tag(vid[1:])
            if v.get("required", True) and missing(vid):
                entry_log.append((rel, vid))
                continue
            values.append(dict(v, id=vid))
            continue
        vid = remap(v)
        if vid.startswith("#forge:"):
            vid = "#" + tag(vid[1:])
        if missing(vid):
            entry_log.append((rel, vid))
            continue
        values.append(vid)
    out = {"values": values}
    if data.get("replace"):
        out = {"replace": True, "values": values}
    return out


# ---------------------------------------------------------------- other mod data

FFB_PRESETS = {  # 1.20 compat file -> the 1.21 preset(s) it replaces
    "create_fertilizer.json": ["create:fertilizer"],
    "farmersdelight_seeds.json": ["farmersdelight:seeds"],
    "supplementaries_seeds.json": ["supplementaries:seeds"],
    "vanilla_bone_meal.json": ["minecraft:bone_meal"],
    "vanilla_crops.json": ["minecraft:crops"],
    "vanilla_seeds.json": ["minecraft:seeds"],
    "vanilla_saplings.json": ["minecraft:saplings"],
    "pamhc2trees_saplings.json": ["pamhc2trees:saplings"],
}


def payment(p):
    return {"ingredient": {"item": p["item"]}, "count": p.get("count", 1)}


def port_ffb(rel, name, data, recipe_ids):
    """1.20 compat group -> its 1.21 preset(s) disabled + (if enabled) a sunlit preset with market recipes."""
    group = data["group"]
    pay = payment(group["defaultPayment"])
    for preset in FFB_PRESETS[name]:
        pns, ppath = preset.split(":")
        out = f"{pns}/market_presets/{ppath}.json"
        write(out, {"enabled": False, "payment": pay})
        EXTRA_OWNED.append(out)
    if not group.get("enabledByDefault", True):
        return 0
    preset_name = "sunlit_" + name[:-5]
    write(f"farmingforblockheads/market_presets/{preset_name}.json", {"payment": pay})
    count = 0
    for entry in data.get("customEntries", []):
        output = entry["output"]
        item = remap(output["item"] if isinstance(output, dict) else output)
        p = entry.get("payment")
        if missing(item) or (p and missing(p["item"])):
            entry_log.append((rel, item))
            continue
        recipe = {"type": "farmingforblockheads:market", "category": group["defaultCategory"],
                  "preset": f"farmingforblockheads:{preset_name}", "result": {"item": item}}
        if p:
            recipe["payment"] = payment(p)
        rid = f"market/{preset_name}/{item.replace(':', '_')}"
        write(f"farmingforblockheads/recipe/{rid}.json", recipe)
        recipe_ids.add(f"farmingforblockheads:{rid}")
        used_items.add(item)
        count += 1
    return count


def port_trade(rel, data):
    data = copy.deepcopy(data)
    conds = data.pop("global_conditions", None)
    trade = data["trade"]
    for key in ("price", "price_secondary", "offer"):
        if key in trade:
            s = trade[key]
            if "Count" in s:
                s["count"] = s.pop("Count")
            s["id"] = remap(s["id"])
            if missing(s["id"]):
                drop(rel, "missing on 1.21.1: " + s["id"])
                return None
            used_items.add(s["id"])
    out = {}
    if conds:
        out["neoforge:conditions"] = [convert_condition(c) for c in conds]
    out.update(data)
    return out


def port_pairs(rel, entries):
    """etcetera process entries {block: block} without the missing ones."""
    out = {}
    for k, v in entries.items():
        k2, v2 = remap(k), remap(v)
        if missing(k2) or missing(v2):
            entry_log.append((rel, k2 if missing(k2) else v2))
            continue
        out[k2] = v2
    return out


def port_keyed(rel, entries):
    out = {}
    for k, v in entries.items():
        k2 = remap(k)
        if ":" in k2 and missing(k2):
            entry_log.append((rel, k2))
            continue
        out[k2] = v
    return out


# ---------------------------------------------------------------- main

def main():
    recipe_ids, loot_ids, item_tags, adv_ids = set(), set(), set(), set()
    ported = {ns: 0 for ns in NAMESPACES}
    for ns in NAMESPACES:
        for folder in OWNED:
            shutil.rmtree(DST / ns / folder, ignore_errors=True)
    for ns in ("minecraft", "create", "farmersdelight", "supplementaries", "pamhc2trees"):
        shutil.rmtree(DST / ns / "market_presets", ignore_errors=True)

    for ns in NAMESPACES:
        root = SRC / ns
        for src in sorted(root.rglob("*.json")):
            rel = str(src.relative_to(SRC))
            inner = str(src.relative_to(root))
            if inner.startswith(EXCLUDED):
                continue
            if rel in DROPPED:
                drop(rel, DROPPED[rel])
                continue
            data = json.loads(src.read_text())
            kind = inner.split("/")[0]
            out_rel, out = rel, None

            if is_disabled(data):
                if ns == "gamediscs":
                    out_rel = f"gamediscs/loot_modifiers/disc_from_chests/{src.name}"
                    if (DST / out_rel).exists():
                        continue  # same chest of another disc
                out = DISABLED
            elif kind == "recipe":
                out, note = port_recipe(ns, rel, data)
                if note:
                    (disabled_log if out is DISABLED else dropped_log).append((rel, note))
                if out is None:
                    continue
                if out is not None and out is not DISABLED:
                    out = remap_all(out)
                    if not recipe_ok(rel, out):
                        continue
                    if ns == "golemoverhaul":
                        out["key"] = {k: remap(v) for k, v in out["key"].items()}
                    if out.get("type") != "jeed:effect_provider":
                        recipe_ids.add(f"{ns}:{inner[len('recipe/'):-5]}")
                    used_items.update(i for i in ids_in({k: v for k, v in out.items() if k != "neoforge:conditions"}, set())
                                      if not i.startswith("#") and out.get("type") not in (
                                          "create_mechanical_extruder:extruding", "golemoverhaul:golem_construction")
                                      and not (out.get("type", "").startswith("littlejoys")))
            elif kind == "loot_table":
                out = port_loot(rel, data)
                if ns == "stardew_fishing":
                    out["type"] = "minecraft:generic"
                loot_ids.add(f"{ns}:{inner[len('loot_table/'):-5]}")
            elif kind == "tags":
                out = port_tag(rel, data)
                if inner.startswith("tags/item/") and out["values"]:
                    item_tags.add(f"{ns}:{inner[len('tags/item/'):-5]}")
            elif kind == "loot_modifiers":
                out = remap_all(data)
                out.pop("forge:conditions", None)
                if "conditions" in out:
                    out["conditions"] = [port_condition(c) for c in out["conditions"]]
                items = out.get("item")
                if isinstance(items, list):
                    kept = [i for i in items if not missing(i)]
                    for i in items:
                        if missing(i):
                            entry_log.append((rel, i))
                    out["item"] = kept
                    used_items.update(kept)
            elif kind == "etcetera" or kind == "processes":
                out_rel = f"{ns}/process/{src.name}"
                out = {"entries": port_pairs(rel, data["entries"])}
            elif kind == "moonlight":
                out_rel = rel.replace("/villager_trades/", "/villager_trade/")
                out = port_trade(rel, data)
            elif kind == "farmingforblockheads_compat":
                n = port_ffb(rel, src.name, data, recipe_ids)
                ported[ns] += 1
                continue
            elif kind == "modifiers":  # atmospheric Blueprint loot modifier
                table = f"{ns}/loot_table/inject/ruined_portal.json"
                entry = port_entry(data["modifiers"][0]["config"]["entries"][0], rel)
                entry.pop("weight", None)
                write(table, {"type": "minecraft:chest", "pools": [{"rolls": 1, "bonus_rolls": 0.0, "entries": [entry],
                              "conditions": [{"condition": "minecraft:random_chance", "chance": 0.08}]}]})
                loot_ids.add(f"{ns}:inject/ruined_portal")
                out_rel = f"{ns}/loot_modifiers/ruined_portal_passion_fruit.json"
                out = {"type": "neoforge:add_table", "conditions": [
                    {"condition": "neoforge:loot_table_id", "loot_table_id": data["selector"]}],
                    "table": f"{ns}:inject/ruined_portal"}
            elif inner in ("fish_behaviors.json",):
                out = dict(data)
                out["behaviors"] = port_keyed(rel, data["behaviors"])
            elif inner in ("minigame_modifiers.json",):
                out = {"modifiers": port_keyed(rel, data["modifiers"])}
            elif kind == "advancement":
                out = remap_all(data)
            else:
                drop(rel, "unknown data type")
                continue
            if out is None:
                continue
            write(out_rel, out)
            ported[ns] += 1

    items = sorted(i for i in used_items if isinstance(i, str) and ":" in i and not i.startswith("#"))
    TEST_DATA.write_text(
        "// Generated by tools/port/port_mods_data.py: the mod data overrides ported from kubejs/_unported/data.\n"
        "const modsPortData = " + json.dumps({
            "recipes": sorted(recipe_ids), "lootTables": sorted(loot_ids), "advancements": sorted(adv_ids),
            "itemTags": sorted(item_tags), "items": items}, indent=1) + ";\n")
    for rel, reason in dropped_log:
        print(f"  not ported: {rel}: {reason}")
    for rel, reason in disabled_log:
        print(f"  disabled: {rel}: {reason}")
    for rel, i in entry_log:
        print(f"  entry dropped: {rel}: {i}")
    print(f"{sum(ported.values())} files written, {len(dropped_log)} not ported, {len(entry_log)} entries dropped")
    for ns, n in ported.items():
        print(f"  {ns}: {n}")


if __name__ == "__main__":
    main()
