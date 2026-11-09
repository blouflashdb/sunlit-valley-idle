#!/usr/bin/env python3
"""Ports the Skull Cavern data from kubejs/_unported/data/society to kubejs/data/society for 1.21.1 (#16).

  - dimension, dimension_type, worldgen (biomes, features, noise; not the overworld structures) and the
    cavern structure templates are copied;
  - int and float providers lose their "value" wrapper (1.20.2 codec change);
  - biome spawners of mobs from mods that are gone are dropped (the Trials breeze is vanilla now);
  - blocks of mods that are gone, and renamed vanilla blocks, are replaced in feature configs (REPLACED_BLOCKS);
  - block predicate offsets are clamped to 15 blocks (the 1.21 codec limit);
  - forge biome modifiers become neoforge ones;
  - the loot tables of the cavern blocks get 1.21 tool predicates and lose entries with missing items;
  - block tags list the entries of other mods as optional, so a missing block does not break the tag.

Run from the repository root: python3 tools/port/port_skull_cavern_data.py
"""
import json
import pathlib
import shutil

SRC = pathlib.Path("kubejs/_unported/data/society")
DST = pathlib.Path("kubejs/data/society")
MISSING_FILE = pathlib.Path(__file__).parent / "data" / "town_missing_items.txt"
WORLDGEN = ("biome", "configured_feature", "density_function", "noise", "noise_settings", "placed_feature")
GONE_NAMESPACES = {"species", "legendarycreatures", "trials", "moreminecarts", "extractinator"}
REPLACED_ENTITIES = {"trials:breeze": "minecraft:breeze"}
REPLACED_BLOCKS = {
    "minecraft:grass": "minecraft:short_grass",
    "extractinator:slush": "minecraft:powder_snow",
    "moreminecarts:organic_glass": "minecraft:glass",
    "moreminecarts:chiseled_organic_glass": "minecraft:glass",
    "moreminecarts:organic_glass_pane": "minecraft:glass_pane",
    "moreminecarts:chiseled_organic_glass_pane": "minecraft:glass_pane",
}
CAVERN_LOOT = (
    "stone_boulder", "ice_boulder", "sandstone_boulder", "blackstone_boulder", "end_stone_boulder",
    "oak_supply_crate", "spruce_supply_crate", "palm_supply_crate", "grimwood_supply_crate",
    "geode_node", "magma_geode_node", "omni_geode_node",
    "iridium_ore", "deepslate_iridium_ore", "sparkstone_ore", "deepslate_sparkstone_ore",
)
CAVERN_TAGS = ("skull_cavern_bomb_denied", "skull_cavern_regens", "skull_cavern_unplacable")
# Items that the ported startup scripts register but that the loot tables use before their own slice.
NOT_YET_PORTED = {"society:gnome"}


def missing_items():
    lines = MISSING_FILE.read_text().splitlines()
    return {line.strip() for line in lines if line.strip() and not line.startswith("#")} | NOT_YET_PORTED


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def upgrade(node):
    """Recursive 1.20.1 -> 1.21.1 fixes for worldgen JSON."""
    if isinstance(node, list):
        return [upgrade(n) for n in node]
    if not isinstance(node, dict):
        return node
    if set(node) == {"type", "value"} and isinstance(node["value"], dict):
        return upgrade({"type": node["type"], **node["value"]})
    out = {key: upgrade(value) for key, value in node.items()}
    if isinstance(out.get("Name"), str) and out["Name"] in REPLACED_BLOCKS:
        out["Name"] = REPLACED_BLOCKS[out["Name"]]
        out.pop("Properties", None)
    # 1.21 block predicate offsets must stay below 16 blocks.
    offset = out.get("offset")
    if isinstance(offset, list) and len(offset) == 3 and all(isinstance(v, int) for v in offset):
        out["offset"] = [max(-15, min(15, v)) for v in offset]
    if isinstance(out.get("blocks"), str):
        out["blocks"] = REPLACED_BLOCKS.get(out["blocks"], out["blocks"])
    if isinstance(out.get("blocks"), list):
        out["blocks"] = [REPLACED_BLOCKS.get(b, b) for b in out["blocks"]]
    return out


def port_biome(biome):
    for category, spawners in biome.get("spawners", {}).items():
        kept = []
        for spawner in spawners:
            spawner["type"] = REPLACED_ENTITIES.get(spawner["type"], spawner["type"])
            if spawner["type"].split(":")[0] not in GONE_NAMESPACES:
                kept.append(spawner)
        biome["spawners"][category] = kept
    biome["spawn_costs"] = {
        k: v for k, v in biome.get("spawn_costs", {}).items() if k.split(":")[0] not in GONE_NAMESPACES
    }
    return biome


def port_loot(node, missing):
    if isinstance(node, list):
        return [n for n in (port_loot(n, missing) for n in node) if n is not None]
    if not isinstance(node, dict):
        return node
    if node.get("type") == "minecraft:item" and node.get("name") in missing:
        return None
    out = {key: port_loot(value, missing) for key, value in node.items()}
    if out.get("condition") == "minecraft:match_tool" and "enchantments" in out.get("predicate", {}):
        enchantments = [
            {"enchantments": e["enchantment"], **({"levels": e["levels"]} if "levels" in e else {})}
            for e in out["predicate"].pop("enchantments")
        ]
        out["predicate"].setdefault("predicates", {})["minecraft:enchantments"] = enchantments
    if out.get("condition") == "minecraft:match_tool" and "items" in out.get("predicate", {}):
        items = out["predicate"]["items"]
        if isinstance(items, list) and len(items) == 1:
            out["predicate"]["items"] = items[0]
    return out


def optional_entries(values):
    out = []
    for value in values:
        entry = value if isinstance(value, str) else value["id"]
        namespace = entry.lstrip("#").split(":")[0]
        if namespace in ("minecraft", "society"):
            out.append(value)
        else:
            out.append({"id": entry, "required": False})
    return out


def main():
    missing = missing_items()
    for folder in ("dimension", "dimension_type"):
        shutil.rmtree(DST / folder, ignore_errors=True)
        for path in sorted((SRC / folder).glob("*.json")):
            write(DST / folder / path.name, upgrade(json.loads(path.read_text())))
    for folder in WORLDGEN:
        shutil.rmtree(DST / "worldgen" / folder, ignore_errors=True)
        for path in sorted((SRC / "worldgen" / folder).rglob("*.json")):
            data = upgrade(json.loads(path.read_text()))
            if folder == "biome":
                data = port_biome(data)
            write(DST / path.relative_to(SRC), data)
    shutil.rmtree(DST / "structure" / "skull_cavern", ignore_errors=True)
    for path in sorted((SRC / "structure" / "skull_cavern").glob("*.nbt")):
        target = DST / path.relative_to(SRC)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
    shutil.rmtree(DST / "neoforge", ignore_errors=True)
    for path in sorted((SRC / "forge" / "biome_modifier").glob("*.json")):
        modifier = json.loads(path.read_text())
        modifier["type"] = modifier["type"].replace("forge:", "neoforge:")
        write(DST / "neoforge" / "biome_modifier" / path.name, modifier)
    for name in CAVERN_LOOT:
        path = SRC / "loot_table" / "blocks" / f"{name}.json"
        write(DST / "loot_table" / "blocks" / path.name, port_loot(json.loads(path.read_text()), missing))
    for name in CAVERN_TAGS:
        tag = json.loads((SRC / "tags" / "block" / f"{name}.json").read_text())
        values = list(dict.fromkeys(json.dumps(v, sort_keys=True) for v in tag["values"]))
        tag["values"] = optional_entries([json.loads(v) for v in values])
        write(DST / "tags" / "block" / f"{name}.json", tag)
    print("Skull Cavern data written to", DST)


if __name__ == "__main__":
    main()
