#!/usr/bin/env python3
"""Ports the 1.20.1 worldgen overrides (structures, worldgen JSON, biome tags, biome modifiers) to 1.21.1 (#19).

Reads kubejs/_unported/data, writes kubejs/data/<ns>/... and tools/port/kubejs_tests/worldgenPortData.js.

  - Moog's Voyager Structures (mvs): 1.21 keeps one template per game version (structure/1_21_0/... is the one
    1.21.1 loads), so the pack's edited templates move there. Their jigsaw blocks take the orientation and data of
    the 1.21 template where both have one; jigsaws into pools that 1.21 dropped point to minecraft:empty. The mvs
    has_structure biome tags are gone (1.21 structures use c: tags): dropped. The chest loot tables are ported.
  - Hopo Better Mineshaft: the structures keep the pack's Skull Cavern heights on top of the 1.21 file (new 1.21
    fields such as liquid_settings come from the mod). The zhopo biome tags keep the Skull Cavern biomes
    ("society:skull_cavern" was never a biome: it is society:skull_caves); the new 1.21 lush/dripstone mineshafts
    get empty tags so that no Hopo mineshaft spawns in the overworld, like on 1.20.1.
  - Other structure overrides (vanilla village houses, bakery, brewery, hobbit village, tailor shop) keep their
    path. Every template: blocks of mods that are gone become a close block or air (REMAPPED_BLOCKS, the patterns
    of port_structures_data.py, MISSING_BLOCKS), Splendid Slimes spawners become air, block entity data of
    replaced blocks is dropped, and items in modded block entities get the 1.21 stack format
    ({id, count, components}; Data Fixer Upper only upgrades vanilla block entities of old DataVersions).
  - Dropped (listed in DROPPED_TEMPLATES): meadow templates (the 1.21 mod redrew chalet/chapel/logging camp with
    other blocks and sizes), beautify botanist houses (identical to the 1.21 mod files), society slime wells and
    desert palace (not referenced by any structure, pool or script; Splendid Slimes content), verdantvibes.
  - Structure / placed / configured feature overrides are written on top of the 1.21 mod file when it exists, so
    new 1.21 fields stay. Forge biome modifiers become neoforge ones; disabled ones become neoforge:none.
  - Biome tags only name biomes that exist (others are dropped, see MISSING_BIOMES); forge: tags become c: tags.
  - Trials (the 1.21 backport mod) is gone: its Skull Cavern trial chambers become vanilla minecraft:trial_chambers
    moved into #society:is_skull_cavern (a quest asks for minecraft:trial_chambers).
  - Chest loot tables: 1.21 loot changes (loot_table "value", enchant options, ...), missing items are dropped.

Needs nbtlib (pip install nbtlib). Run from the repository root: python3 tools/port/port_worldgen_data.py
"""
import copy
import gzip
import json
import pathlib
import shutil
import sys

import nbtlib

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import port_structures_data  # noqa: E402  (block remap patterns of the Society structures)

SRC = pathlib.Path("kubejs/_unported/data")
DST = pathlib.Path("kubejs/data")
TEST_DATA = pathlib.Path(__file__).parent / "kubejs_tests" / "worldgenPortData.js"
# 1.21.1 reference data (copied from the 1.21.1 mod jars and the vanilla jar): the structure files the overrides
# are merged onto, the mvs template pool ids and the jigsaw blocks of the 1.21.1 mvs templates.
BASE = pathlib.Path(__file__).parent / "data" / "worldgen_base"

# Output folders this script owns (removed before writing).
OWNED = [
    *(f"{ns}/{sub}" for ns in ("mvs", "hopo", "zhopo", "lios_outlandish_villages", "sewingkit")
      for sub in ("structure", "worldgen", "loot_table", "tags/worldgen")),
    "minecraft/structure/village", "minecraft/worldgen", "minecraft/tags/point_of_interest_type",
    *(f"{ns}/{sub}" for ns in ("atmospheric", "autumnity", "bakery", "brewery", "farm_and_charm", "farmersdelight",
                               "meadow", "oreganized", "pamhc2trees", "vinery", "wildernature", "windswept",
                               "sereneseasons", "veggiesdelight")
      for sub in ("structure", "worldgen", "tags/worldgen")),
    "farmersdelight/neoforge/biome_modifier", "veggiesdelight/neoforge/biome_modifier",
    "oreganized/neoforge/biome_modifier",
]

# Namespaces whose 1.20.1 worldgen content is not ported (mod not in the 1.21.1 pack, or ported elsewhere).
DROPPED_NAMESPACES = {
    "species": "mod not in the pack",
    "bloomingnature": "mod not in the pack",
    "rainbowoaks": "mod not in the pack",
    "verdantvibes": "mod not in the pack",
    "extractinator": "mod not in the pack",
    "vintagedelight": "not a mod on 1.21.1 (items come from KubeJS), its features do not exist",
    "create": "biome modifiers ported in kubejs/data/create/neoforge/biome_modifier",
    "society": "ported by port_structures_data.py / port_skull_cavern_data.py",
    "betterarcheology": "temple_jungle.nbt ported already",
    "trials": "mod not in the pack (its trial chambers become vanilla ones, see main())",
}
DROPPED_TEMPLATES = {
    "meadow/structure/chalet.nbt": "1.21 meadow redrew it (other size and blocks)",
    "meadow/structure/chapel.nbt": "1.21 meadow redrew it (other size and blocks)",
    "meadow/structure/logging_camp.nbt": "1.21 meadow redrew it (other size and blocks)",
    "beautify/structure/botanist_house_desert.nbt": "identical to the 1.21 mod file",
    "beautify/structure/botanist_house_plains.nbt": "identical to the 1.21 mod file",
    "beautify/structure/botanist_house_savanna.nbt": "identical to the 1.21 mod file",
    "beautify/structure/botanist_house_snowy.nbt": "identical to the 1.21 mod file",
    "beautify/structure/botanist_house_taiga.nbt": "identical to the 1.21 mod file",
}
DROPPED_FILES = {
    "mvs/tags/worldgen/biome/has_structure": "1.21 mvs structures use c: biome tags, these tags are unused",
    "lios_outlandish_villages/loot_table/loot_tables": "wrong path on 1.20.1 already (duplicate of chests/general)",
    "wildernature/tags/worldgen/biome/spawns_flamingo.json": "1.21 wildernature has no flamingo",
}

# Blocks of the templates that need another block on 1.21.1 (on top of port_structures_data.REMAPPED_BLOCKS).
REMAPPED_BLOCKS = {
    "decorative_blocks:oak_beam": "minecraft:stripped_oak_log",
    "decorative_blocks:soul_brazier": "minecraft:soul_campfire",
    "decorative_blocks:soul_chandelier": "minecraft:soul_lantern",
    "quark:potted_melon": "minecraft:potted_fern",
    # 1.21 beachparty has no tiki bar; it stood in for the fletching table (no fletcher job site) in village houses.
    "beachparty:tiki_bar": "beachparty:palm_bar",
}
# Blocks that are not registered on 1.21.1 and have no close replacement (become air). Filled from the registry
# dump of the pack's server.
MISSING_BLOCKS = {"society:latte"}  # an item only on 1.21.1
# Items that are not registered on 1.21.1 (dropped from loot tables and block entity inventories).
MISSING_ITEMS = {"moreminecarts:lightspeed_rail", "moreminecarts:lightspeed_powered_rail", "verdantvibes:dragon_tree"}
RENAMED_ITEMS = {"trials:ominous_bottle": "minecraft:ominous_bottle"}
# Biomes named by the 1.20.1 tags that do not exist on 1.21.1.
RENAMED_BIOMES = {"society:skull_cavern": "society:skull_caves"}
MISSING_BIOMES = set()
RENAMED_TAGS = {"forge:is_wet/overworld": "c:is_wet/overworld", "forge:is_desert": "c:is_desert",
                "forge:is_mountain": "c:is_mountain", "forge:is_swamp": "c:is_swamp"}

worldgen_ids = []
loot_ids = []
item_ids = set()


def read_json(path):
    return json.loads(pathlib.Path(path).read_text())


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def rel_id(path, folder):
    """kubejs/data/<ns>/<folder>/<path>.json -> <ns>:<path>"""
    rel = path.relative_to(DST)
    ns = rel.parts[0]
    sub = rel.relative_to(pathlib.Path(ns) / folder)
    return f"{ns}:{sub.with_suffix('').as_posix()}"


def register(registry, path, folder):
    worldgen_ids.append(f"{registry}|{rel_id(path, folder)}")


# ---------------------------------------------------------------------------------------------------------------
# Loot tables


def port_item_id(item):
    return RENAMED_ITEMS.get(item, item)


def port_loot(node):
    if isinstance(node, list):
        return [n for n in (port_loot(n) for n in node) if n is not None]
    if not isinstance(node, dict):
        return node
    out = {key: port_loot(value) for key, value in node.items()}
    if out.get("type") == "minecraft:item":
        out["name"] = port_item_id(out["name"])
        if out["name"] in MISSING_ITEMS:
            return None
        item_ids.add(out["name"])
    if out.get("type") == "minecraft:loot_table" and "name" in out:
        out["value"] = out.pop("name")
    function = out.get("function")
    if function == "minecraft:enchant_with_levels":
        out.pop("treasure", None)  # 1.21 picks from a tag; the default (#in_enchanting_table) fits
    if function == "minecraft:enchant_randomly" and "enchantments" in out:
        out["options"] = out.pop("enchantments")
    if function == "minecraft:looting_enchant":
        out = {"function": "minecraft:enchanted_count_increase", "enchantment": "minecraft:looting",
               **{k: v for k, v in out.items() if k != "function"}}
    if function == "minecraft:set_nbt":
        out = {"function": "minecraft:set_custom_data", **{k: v for k, v in out.items() if k != "function"}}
    return out


def port_loot_table(src, dst):
    table = port_loot(read_json(src))
    for pool in table.get("pools", []):
        pool["entries"] = [e for e in pool["entries"] if e is not None]
    write(dst, table)
    loot_ids.append(rel_id(dst, "loot_table"))


# ---------------------------------------------------------------------------------------------------------------
# Structure templates


def remap_block(name):
    name = REMAPPED_BLOCKS.get(name, name)
    return port_structures_data.remap(name, MISSING_BLOCKS)


def port_stack(stack):
    """1.20.1 item stack NBT -> 1.21 ({id, count, components}); None if the item is gone."""
    item = port_item_id(str(stack["id"]))
    tag = stack.get("tag")
    if item == "supplementaries:bunting" and tag and "Color" in tag:  # one item per color on 1.21
        item = f"supplementaries:bunting_{tag['Color']}"
        tag = None
    if item in MISSING_ITEMS:
        return None
    item_ids.add(item)
    out = nbtlib.Compound({"id": nbtlib.String(item), "count": nbtlib.Int(int(stack.get("Count", 1)))})
    if "Slot" in stack:
        out["Slot"] = stack["Slot"]
    if tag:
        tag = nbtlib.Compound(tag)
        components = nbtlib.Compound()
        damage = tag.pop("Damage", None)
        if damage:
            components["minecraft:damage"] = nbtlib.Int(int(damage))
        if tag:
            components["minecraft:custom_data"] = tag
        if components:
            out["components"] = components
    return out


def port_block_entity(nbt):
    """Modded block entities: drop Forge capability data and give their inventories 1.21 item stacks."""
    for key in ("ForgeCaps", "ForgeData"):
        nbt.pop(key, None)
    for key in ("Items", "Inventory"):
        items = nbt.get(key)
        if isinstance(items, nbtlib.List):
            stacks = [port_stack(s) for s in items]
            nbt[key] = nbtlib.List[nbtlib.Compound]([s for s in stacks if s is not None])
        elif isinstance(items, nbtlib.Compound) and isinstance(items.get("Items"), nbtlib.List):
            stacks = [port_stack(s) for s in items["Items"]]
            items["Items"] = nbtlib.List[nbtlib.Compound]([s for s in stacks if s is not None])


def align_jigsaws(template, reference, known_pools):
    """Give the jigsaws the orientation and data of the 1.21 template (mvs re-authored its connectors).

    reference: the jigsaws of the 1.21 template, [{pos, state (SNBT), nbt (SNBT)}] from mvs_jigsaws.json."""
    palette = template["palettes"][0] if "palettes" in template else template["palette"]
    theirs = {tuple(j["pos"]): j for j in reference}
    for block in template["blocks"]:
        if str(palette[int(block["state"])]["Name"]) != "minecraft:jigsaw":
            continue
        other = theirs.get(tuple(int(v) for v in block["pos"]))
        if other is not None:
            for each in (template["palettes"] if "palettes" in template else [palette]):
                each.append(nbtlib.parse_nbt(other["state"]))
            block["state"] = nbtlib.Int(len(palette) - 1)
            block["nbt"] = nbtlib.parse_nbt(other["nbt"])
        elif str(block["nbt"].get("pool")) not in known_pools:
            block["nbt"]["pool"] = nbtlib.String("minecraft:empty")


def port_template(src, dst, reference=None, known_pools=()):
    template = nbtlib.load(src)
    palettes = template["palettes"] if "palettes" in template else [template["palette"]]
    changed, replaced = {}, set()
    for palette in palettes:
        for index, state in enumerate(palette):
            name = str(state["Name"])
            target = remap_block(name)
            if target != name:
                changed[name] = target
                replaced.add(index)
                state["Name"] = nbtlib.String(target)
                state.pop("Properties", None)
    for block in template["blocks"]:
        if "nbt" not in block:
            continue
        if int(block["state"]) in replaced:
            del block["nbt"]
        elif not str(block["nbt"].get("id", "minecraft:")).startswith("minecraft:"):
            port_block_entity(block["nbt"])
    if reference is not None:
        align_jigsaws(template, reference, known_pools)
    dst.parent.mkdir(parents=True, exist_ok=True)
    # A fixed gzip time keeps reruns byte-identical.
    with gzip.GzipFile(dst, "wb", mtime=0) as out:
        template.write(out)
    return changed


# ---------------------------------------------------------------------------------------------------------------
# Worldgen JSON


def port_tag_entry(value):
    entry = value if isinstance(value, str) else value["id"]
    required = True if isinstance(value, str) else value.get("required", True)
    is_tag = entry.startswith("#")
    name = entry.lstrip("#")
    if is_tag:
        name = RENAMED_TAGS.get(name, name)
        if name.split(":")[0] == "forge":
            return None
    else:
        name = RENAMED_BIOMES.get(name, name)
        if name in MISSING_BIOMES:
            return None
    entry = ("#" if is_tag else "") + name
    return entry if required else {"id": entry, "required": False}


def port_biome_tag(src, dst):
    tag = read_json(src)
    tag.pop("_comment", None)
    tag["values"] = [v for v in (port_tag_entry(v) for v in tag["values"]) if v is not None]
    write(dst, tag)


def base_file(rel):
    path = BASE / rel
    return read_json(path) if path.exists() else None


def overlay(rel, data):
    """The pack's override on top of the 1.21 mod file (keeps fields that 1.21 added)."""
    base = base_file(rel)
    return {**base, **data} if base else data


# Biome modifiers that 1.21 mods split or renamed: 1.20.1 file name -> 1.21.1 ids.
RENAMED_BIOME_MODIFIERS = {"oreganized/overworld_ores": ("add_lead_ores", "add_silver_ores")}


def port_biome_modifier(src, dst):
    renamed = RENAMED_BIOME_MODIFIERS.get(f"{dst.parts[-4]}/{dst.stem}")
    if renamed:
        for name in renamed:
            port_biome_modifier(src, dst.with_name(f"{name}.json"))
        return
    modifier = read_json(src)
    if "forge:conditions" in modifier or modifier.get("type") == "forge:none":
        modifier = {"type": "neoforge:none"}  # disabled; keeps the id registered
    else:
        modifier = json.loads(json.dumps(modifier).replace('"#forge:is_wet/overworld"', '"#c:is_wet/overworld"'))
        modifier["type"] = modifier["type"].replace("forge:", "neoforge:")
    write(dst, modifier)
    register("biome_modifier", dst, "neoforge/biome_modifier")


WORLDGEN_REGISTRIES = {
    "structure": "structure", "structure_set": "structure_set", "template_pool": "template_pool",
    "placed_feature": "placed_feature", "configured_feature": "configured_feature", "biome": "biome",
    "processor_list": "processor_list",
}


def port_worldgen_file(src):
    rel = src.relative_to(SRC)
    ns, _, folder = rel.parts[:3]
    data = read_json(src)
    if folder == "structure":
        data = overlay(rel, data)
    dst = DST / rel
    write(dst, data)
    register(WORLDGEN_REGISTRIES[folder], dst, f"worldgen/{folder}")


# ---------------------------------------------------------------------------------------------------------------


def skipped(rel):
    rel = rel.as_posix()
    if rel.split("/")[0] in DROPPED_NAMESPACES:
        return True
    return any(rel == key or rel.startswith(key + "/") for key in (*DROPPED_TEMPLATES, *DROPPED_FILES))


def in_scope(rel):
    parts = rel.parts
    if parts[0] in ("mvs", "hopo", "zhopo", "lios_outlandish_villages", "sewingkit"):
        return True
    path = rel.as_posix()
    return (parts[1] in ("structure", "worldgen") or path.startswith(f"{parts[0]}/tags/worldgen/")
            or path.startswith(f"{parts[0]}/forge/biome_modifier/")
            or path.startswith("minecraft/tags/point_of_interest_type/"))


def mvs_pools():
    return {line for line in (BASE / "mvs_template_pools.txt").read_text().split()} | {"minecraft:empty"}


def main():
    for owned in OWNED:
        shutil.rmtree(DST / owned, ignore_errors=True)
    changed = {}
    pools = mvs_pools()
    mvs_jigsaws = read_json(BASE / "mvs_jigsaws.json")
    for src in sorted(p for p in SRC.rglob("*") if p.is_file()):
        rel = src.relative_to(SRC)
        if not in_scope(rel) or skipped(rel):
            continue
        ns, folder = rel.parts[0], rel.parts[1]
        path = rel.as_posix()
        if src.suffix == ".nbt":
            if ns == "society" or ns == "verdantvibes":
                continue
            if ns == "mvs":
                sub = rel.relative_to("mvs/structure")
                dst = DST / "mvs" / "structure" / "1_21_0" / sub
                changed.update(port_template(src, dst, mvs_jigsaws[sub.as_posix()], pools))
            else:
                changed.update(port_template(src, DST / rel))
        elif folder == "loot_table":
            port_loot_table(src, DST / rel)
        elif folder == "worldgen":
            port_worldgen_file(src)
        elif path.startswith(f"{ns}/tags/worldgen/biome/"):
            port_biome_tag(src, DST / rel)
        elif path.startswith(f"{ns}/forge/biome_modifier/"):
            port_biome_modifier(src, DST / ns / "neoforge" / "biome_modifier" / src.name)
        elif path.startswith("minecraft/tags/point_of_interest_type/"):
            write(DST / rel, read_json(src))
        else:
            print("  not handled:", path)

    # Hopo 1.21 added two mineshafts that would spawn in the overworld; the pack keeps Hopo in the Skull Cavern.
    for name in ("lush_mineshaft", "dripstone_mineshaft"):
        write(DST / "zhopo" / "tags" / "worldgen" / "biome" / "has_structure" / f"{name}.json",
              {"replace": True, "values": []})

    # Trial chambers: the Trials mod placed them in the Skull Cavern on 1.20.1; 1.21 has them in vanilla.
    trials = read_json(SRC / "trials" / "worldgen" / "structure" / "trials_chambers.json")
    chambers = base_file("minecraft/worldgen/structure/trial_chambers.json")
    chambers["biomes"] = trials["biomes"]
    chambers["start_height"] = trials["start_height"]
    dst = DST / "minecraft" / "worldgen" / "structure" / "trial_chambers.json"
    write(dst, chambers)
    register("structure", dst, "worldgen/structure")

    write_test_data()
    for name, target in sorted(changed.items()):
        print(f"  {name} -> {target}")
    print(f"{len(worldgen_ids)} worldgen entries, {len(loot_ids)} loot tables, {len(changed)} template blocks replaced")


def write_test_data():
    data = {"lootTables": sorted(loot_ids), "items": sorted(item_ids), "worldgen": sorted(worldgen_ids)}
    lines = ["// Generated by tools/port/port_worldgen_data.py; do not edit.",
             f"const worldgenPortData = {json.dumps(data, indent=2)};", ""]
    TEST_DATA.write_text("\n".join(lines))


if __name__ == "__main__":
    main()
