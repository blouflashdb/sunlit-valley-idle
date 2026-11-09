#!/usr/bin/env python3
"""Ports the FTB Quests book (config/ftbquests/quests) to FTB Quests 1.21.1 (#18).

FTB Quests 1.21.1 still reads 1.20.1 item stacks, but only their id and count: it drops the NBT. So this script:
  - writes item stacks as {count, id, components}, the 1.20.1 NBT becoming data components (components());
  - replaces Item Filters items (gone on 1.21.1) with FTB Filter System smart filters: itemfilters:or becomes
    or(item(...)...), itemfilters:tag becomes item_tag(...);
  - turns match_nbt into match_components ("fuzzy": the item must have the task's components);
  - replaces items of mods that are gone (SUBSTITUTES) and removes tasks and rewards whose item has no
    replacement (REMOVED), along with icons of them;
  - renames forge tags to c tags.
The tasks and rewards it removes are printed. questsTest.js checks in CI that no item of the book is missing.

Run from the repository root: python3 tools/port/port_quests.py
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import ftb_snbt  # noqa: E402
from ftb_snbt import Raw, quote  # noqa: E402

QUESTS = pathlib.Path("config/ftbquests/quests")
# Items of mods that are gone, with what the quests use instead.
SUBSTITUTES = {}
# Items that are gone without a replacement: tasks and rewards with them are removed.
REMOVED = set()
# forge tags whose c tag has another name; every other forge:x becomes c:x.
TAGS = {}
# Relic item data (Relics regenerates it on 1.21.1), dropped.
RELIC_KEYS = {"abilities", "points", "stats", "relic_data", "leveling"}
# NBT that only decorated an icon on 1.20.1 and has no 1.21.1 counterpart.
DROPPED_KEYS = {"Year", "StoredEffects", "Damage"}


def number(raw):
    return int(str(raw).rstrip("bBsSlL"))


def tag(name):
    if name in TAGS:
        return TAGS[name]
    return "c:" + name[len("forge:"):] if name.startswith("forge:") else name


def item_id(raw):
    item = raw.text if isinstance(raw, Raw) else raw
    return SUBSTITUTES.get(item, item)


def components(item, nbt, removed):
    """1.20.1 item NBT (an ftb_snbt compound) -> 1.21.1 data components."""
    nbt = dict(nbt)
    out = {}
    if item.startswith("relics:") or RELIC_KEYS & set(nbt):
        for key in list(nbt):
            if key in RELIC_KEYS or item.startswith("relics:"):
                nbt.pop(key)
    damage = nbt.get("Damage")
    if damage is not None and number(damage) > 0:
        out["minecraft:damage"] = Raw(str(number(damage)))
    for key in DROPPED_KEYS:
        nbt.pop(key, None)
    display = nbt.pop("display", {})
    if "Name" in display:
        out["minecraft:custom_name"] = display["Name"]
    if "Lore" in display:
        out["minecraft:lore"] = display["Lore"]
    if "quality_food" in nbt:
        quality = number(nbt.pop("quality_food").get("quality", Raw("0")))
        if quality > 0:
            out.update(quality_component(quality))
    if "StoredEnchantments" in nbt:
        out["minecraft:stored_enchantments"] = enchantments(nbt.pop("StoredEnchantments"))
    if "Enchantments" in nbt:
        out["minecraft:enchantments"] = enchantments(nbt.pop("Enchantments"))
    if "Potion" in nbt:
        out["minecraft:potion_contents"] = {"potion": nbt.pop("Potion")}
    if "EntityTag" in nbt:
        out["minecraft:entity_data"] = nbt.pop("EntityTag")
    if "BlockEntityTag" in nbt:
        out.update(block_entity_component(item, nbt.pop("BlockEntityTag")))
    if "patchouli:book" in nbt:
        out["patchouli:book"] = nbt.pop("patchouli:book")
    if nbt:
        out["minecraft:custom_data"] = nbt
    return out


QUALITY_TYPES = {1: "iron", 2: "gold", 3: "diamond"}


def quality_component(quality):
    """Quality Food 1.21.1 stores {type, level} (globalBlockEntityHandlers.js withItemQuality)."""
    level = min(3, quality)
    return {"quality_food:quality": {"level": Raw(str(level)), "type": quote(f"quality_food:{QUALITY_TYPES[level]}")}}


def block_entity_component(item, data):
    """A trophy base's trophy becomes the trofers:trophy component. Other block entity data (a Supplementaries jar
    holding lava) has no simple 1.21.1 form and is dropped: the reward gives the plain block."""
    if "Trophy" in data:
        return {"trofers:trophy": quote(data["Trophy"].text)}
    return {}


def enchantments(entries):
    return {"levels": {e["id"].text: Raw(str(number(e["lvl"]))) for e in entries}}


def smart_filter(item, nbt):
    if item == "itemfilters:tag":
        expression = f"item_tag({tag(nbt['value'].text)})"
    elif item == "itemfilters:or":
        ids = [item_id(i["id"]) for i in nbt.get("items", [])]
        ids = [i for i in ids if i not in REMOVED]
        expression = "or(" + "".join(f"item({i})" for i in ids) + ")"
    else:
        raise ValueError(f"unknown item filter {item}")
    return {"components": {"ftbfiltersystem:filter": quote(expression)}, "count": Raw("1"),
            "id": quote("ftbfiltersystem:smart_filter")}


def stack(value, removed):
    """A 1.20.1 item stack (an id string or {Count, id, tag}) -> a 1.21.1 one, or None when its item is gone."""
    if isinstance(value, Raw):
        item = item_id(value)
        return None if item in REMOVED else quote(item)
    item = item_id(value["id"])
    if item in REMOVED:
        return None
    nbt = value.get("tag", {})
    if item.startswith("itemfilters:"):
        return smart_filter(item, nbt)
    out = {}
    parts = components(item, nbt, removed)
    if parts:
        out["components"] = parts
    count = number(value.get("Count", value.get("count", Raw("1"))))
    out["count"] = Raw(str(count))
    out["id"] = quote(item)
    return out


def port(value, where, removed):
    """Walks a quest file; returns the ported value or None when the object it is should be removed."""
    if isinstance(value, list):
        out = [port(v, where, removed) for v in value]
        return type(value)(value.prefix, [v for v in out if v is not None]) if isinstance(value, ftb_snbt.TypedList) \
            else [v for v in out if v is not None]
    if not isinstance(value, dict):
        return value
    out = {}
    for key, v in value.items():
        if key in ("item", "icon") and (isinstance(v, dict) and "id" in v or isinstance(v, Raw) and ":" in v):
            ported = stack(v, removed)
            if ported is None:
                if key == "icon":
                    continue
                removed.append(f"{where}: {value.get('type', Raw('?')).text} {v if isinstance(v, Raw) else v['id']}")
                return None
            out[key] = ported
        elif key == "match_nbt":
            if v == "true":
                out["match_components"] = quote("fuzzy")
        else:
            out[key] = port(v, where, removed)
    if out.get("type") == quote("item") and "item" in out and "components" not in (out["item"] if isinstance(out["item"], dict) else {}):
        out.pop("match_components", None)
    return out


def main():
    removed = []
    for path in sorted(QUESTS.rglob("*.snbt")):
        data = ftb_snbt.read(path.read_text())
        ported = port(data, path.relative_to(QUESTS).as_posix(), removed)
        text = ftb_snbt.write(ported)
        if text != path.read_text():
            path.write_text(text)
    for line in removed:
        print(f"  removed {line}")
    print(f"{len(removed)} tasks and rewards removed")


if __name__ == "__main__":
    main()
