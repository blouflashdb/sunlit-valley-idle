#!/usr/bin/env python3
"""Ports the FTB Quests book (config/ftbquests/quests) to FTB Quests 1.21.1 (#18).

FTB Quests 1.21.1 still reads 1.20.1 item stacks, but only their id and count: it drops the NBT. So this script:
  - writes item stacks as {count, id, components}, the 1.20.1 NBT becoming data components (components());
  - replaces Item Filters items (gone on 1.21.1) with FTB Filter System smart filters: itemfilters:or becomes
    or(item(...)...), itemfilters:tag becomes item_tag(...);
  - turns match_nbt into match_components ("fuzzy": the item must have the task's components);
  - replaces items of mods that are gone (SUBSTITUTES) and removes tasks and rewards whose item has no
    replacement (REMOVED), along with icons of them; a quest that loses every task is removed with its texts
    (kubejs/assets/ftbquestlocalizer/lang), and the quests after it depend on its dependencies instead;
  - renames forge tags to c tags.
The tasks and rewards it removes are printed. questsTest.js checks in CI that no item of the book is missing.

Run from the repository root: python3 tools/port/port_quests.py
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import ftb_snbt  # noqa: E402
from ftb_snbt import Raw, quote  # noqa: E402

QUESTS = pathlib.Path("config/ftbquests/quests")
LANG = pathlib.Path("kubejs/assets/ftbquestlocalizer/lang")
# Quests whose every task is gone, with their dependencies (filled by port()).
REMOVED_QUESTS = {}
# Items of mods that are gone, with what the quests use instead.
SUBSTITUTES = {
    # Construction Wand is replaced by Building Gadgets (tools/port/mods-1.21.1.json).
    "constructionwand:stone_wand": "buildinggadgets2:gadget_building",
    "constructionwand:iron_wand": "buildinggadgets2:gadget_building",
    "constructionwand:diamond_wand": "buildinggadgets2:gadget_building",
    "constructionwand:infinity_wand": "buildinggadgets2:gadget_building",
    # Renamed on 1.21.1.
    "crabbersdelight:frog_leg_kebob": "crabbersdelight:frog_leg_kebab",
    "crabbersdelight:squid_kebob": "crabbersdelight:squid_kebab",
    "smallships:sail": "smallships:cotton_sails",
    "refinedstorageaddons:wireless_crafting_grid": "refinedstorage:wireless_grid",
    "meadow:fire_log": "meadow:firewood",
    "supplementaries:sign_post_oak": "supplementaries:way_sign_oak",
}
# Items that are gone without a replacement: tasks and rewards with them are removed.
REMOVED = {
    # Automobility, Construction Wand, Create Utilities, Dracovita Farm Life (farmlife), Domestication Innovation,
    # More Minecarts, Nether Vinery, Refined Storage Addons, Species and Verdant Vibes have no 1.21.1 build in the pack (tools/port/mods-1.21.1.json).
    "automobility:auto_mechanic_table", "automobility:automobile_assembler", "automobility:crowbar",
    "createutilities:void_motor", "createutilities:void_steel_ingot", "createutilities:void_tank",
    "domesticationinnovation:collar_tag", "domesticationinnovation:drum", "domesticationinnovation:pet_bed_white",
    "domesticationinnovation:wayward_lantern",
    "moreminecarts:chiseled_organic_glass", "moreminecarts:glass_cactus", "moreminecarts:lightspeed_powered_rail",
    "moreminecarts:lightspeed_rail", "moreminecarts:maglev_powered_rail", "moreminecarts:maglev_rail",
    "moreminecarts:wooden_cross_rail", "moreminecarts:coupler", "moreminecarts:maglev_projector_rail",
    "moreminecarts:projector_rail", "moreminecarts:wooden_projector_rail", "moreminecarts:wooden_rail", "moreminecarts:wooden_rail_turn",
    "nethervinery:blazewine_pinot", "nethervinery:crimson_grape", "nethervinery:crimson_grape_juice_bucket",
    "nethervinery:ghastly_grenache", "nethervinery:improved_lava_fizz", "nethervinery:improved_nether_fizz",
    "nethervinery:crimson_grapejuice", "nethervinery:warped_grapejuice", "nethervinery:lava_fizz", "nethervinery:nether_fizz", "nethervinery:netherite_nectar", "nethervinery:warped_grape",
    "constructionwand:core_angel", "constructionwand:core_destruction",
    "farmlife:domestic_tribull_spawn_egg", "farmlife:galliraptor_spawn_egg",
    "species:alphacene_mushroom", "species:youth_potion", "verdantvibes:bracket_mushroom",
    # Items the 1.21.1 builds of mods in the pack no longer have; the Fantasy Catalog went with Fantasy's
    # Furniture (#15).
    "create_central_kitchen:cooking_guide", "create_enchantment_industry:disenchanter",
    "create_enchantment_industry:hyper_experience_bottle", "beachparty:chocolate_icecream",
    "beachparty:sweetberry_milkshake", "society:fantasy_catalog",
    "society:car_key",  # parks an Automobility car
    "candlelight:khinkali", "netherdepthsupgrade:baked_lava_pufferfish_stew",
    # Icons only: Let's Do moved the bakery and candlelight standards and the hearth out of 1.21.1, Fantasy's
    # Furniture is gone.
    "bakery:bakery_standard", "candlelight:candlelight_standard", "candlelight:hearth",
    "fantasyfurniture:decorations/bone_skeleton_skull_blossoms",
    "relics:arrow_quiver", "relics:horse_flute", "relics:spatial_sign", "unusualfishmod:raw_snowflake",
}
# Quest texts (en_us of kubejs/assets/ftbquestlocalizer/lang) that describe replaced content. The other languages
# lose these keys, so they show the English text until they are translated again.
TEXTS = {
    "ftbquests.chapter.tools.quest2193ACEC05CC5B07.title": "Building Gadgets",
    "ftbquests.chapter.tools.quest2193ACEC05CC5B07.description1": "The &6Building Gadget&r places blocks in a line, "
    "a surface or a whole shape at once. It runs on energy instead of durability.",
    "ftbquests.chapter.tools.quest2193ACEC05CC5B07.task.8111881249018882787.title": "Building Gadget",
    "ftbquests.chapter.transportation.questE93089181D8EE7B.description1": "Minecarts can be linked using Create's "
    "&6Minecart Coupling&r.",
    "ftbquests.chapter.transportation.questE93089181D8EE7B.task.4800438316975324135.title": "Minecart Coupling",
}
# Quest description lines about removed content: dropped from the quest and from every language.
DROPPED_TEXTS = {
    "ftbquests.chapter.ivi__mechanical_farming.quest162C1DFB58132D45.description2",  # the CEI Disenchanter
    "ftbquests.chapter.ivi__mechanical_farming.quest162C1DFB58132D45.description3",  # CEI Hyper Experience
}
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
    if item.startswith("longwings:") and "variant" in nbt:
        out["longwings:variant"] = nbt.pop("variant")
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
        ids = list(dict.fromkeys(i for i in ids if i not in REMOVED))
        if not ids:
            return None
        if len(ids) == 1:
            return {"count": Raw("1"), "id": quote(ids[0])}
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
    parts = value["components"] if "components" in value else components(item, nbt, removed)
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
        elif key == "tasks" and isinstance(v, list) and v:
            tasks = port(v, where, removed)
            if not tasks:
                # every task's item is gone: the quest goes, and the quests after it depend on its dependencies
                REMOVED_QUESTS[value["id"].text] = [d.text for d in value.get("dependencies", [])]
                removed.append(f"{where}: quest {value['id'].text}")
                return None
            out[key] = tasks
        elif key == "description" and isinstance(v, list):
            lines = [line for line in v if line.text.strip("{}") not in DROPPED_TEXTS]
            # no empty line left at the end or twice in a row
            lines = [line for i, line in enumerate(lines) if line.text or (0 < i < len(lines) - 1 and lines[i + 1].text)]
            out[key] = lines
        elif key == "match_nbt":
            if v == "true":
                out["match_components"] = quote("fuzzy")
        else:
            out[key] = port(v, where, removed)
    if out.get("type") == quote("item") and "item" in out and "components" not in (out["item"] if isinstance(out["item"], dict) else {}):
        out.pop("match_components", None)
    return out


def dependencies(ids):
    """The dependencies with every removed quest replaced by its own dependencies."""
    out = []
    for quest in ids:
        for dep in dependencies(REMOVED_QUESTS[quest]) if quest in REMOVED_QUESTS else [quest]:
            if dep not in out:
                out.append(dep)
    return out


def rewire(value):
    if isinstance(value, list):
        for v in value:
            rewire(v)
    elif isinstance(value, dict):
        if isinstance(value.get("dependencies"), list) and any(d.text in REMOVED_QUESTS for d in value["dependencies"]):
            value["dependencies"] = [quote(d) for d in dependencies([d.text for d in value["dependencies"]])]
        for v in value.values():
            rewire(v)


def edit_lang(removed_quests):
    """Drops the texts of the removed quests and DROPPED_TEXTS from the quest lang files (FTB Quest Localizer keys)
    and applies TEXTS to en_us (other languages lose those keys). Lines are edited in place, so the files keep their
    layout and line endings."""
    quests = "|".join(re.escape(i.lstrip("0")) for i in removed_quests) or "(?!)"
    removed = re.compile(r'^\s*"[^"]*\.quest(' + quests + r')(\.[^"]*)?"\s*:')
    key_of = re.compile(r'^\s*"([^"]*)"\s*:')
    for path in sorted(LANG.glob("*.json")):
        text = path.read_bytes().decode("utf-8")
        lines = text.splitlines(keepends=True)
        kept = []
        for line in lines:
            match = key_of.match(line)
            key = match.group(1) if match else None
            if removed.match(line) or key in DROPPED_TEXTS:
                continue
            if key in TEXTS:
                if path.stem != "en_us":
                    continue
                ending = line[len(line.rstrip("\r\n")):]
                comma = "," if line.rstrip("\r\n").endswith(",") else ""
                line = line[:match.start(1) - 1] + json.dumps(key) + ": " + json.dumps(TEXTS[key], ensure_ascii=False) + comma + ending
            kept.append(line)
        if kept == lines:
            continue
        # the entry before the closing brace has no comma
        for i in range(len(kept) - 1, -1, -1):
            if kept[i].strip() and kept[i].strip() != "}":
                body = kept[i].rstrip("\r\n")
                kept[i] = body.rstrip(",") + kept[i][len(body):]
                break
        out = "".join(kept)
        json.loads(out)
        path.write_bytes(out.encode("utf-8"))


def main():
    removed = []
    files = {}
    for path in sorted(QUESTS.rglob("*.snbt")):
        files[path] = port(ftb_snbt.read(path.read_text()), path.relative_to(QUESTS).as_posix(), removed)
    for path, ported in files.items():
        rewire(ported)
        text = ftb_snbt.write(ported)
        if text != path.read_text():
            path.write_text(text)
    edit_lang(REMOVED_QUESTS)
    for line in removed:
        print(f"  removed {line}")
    print(f"{len(removed)} tasks and rewards removed")


if __name__ == "__main__":
    main()
