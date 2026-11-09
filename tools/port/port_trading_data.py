#!/usr/bin/env python3
"""Ports the Society Trading shops from kubejs/_unported/data to kubejs/data for 1.21.1 (#15).

Society Trading 1.21.1 reads shops with codecs, so:
  - item stacks ({"item", "count", "nbt"}) become ItemStack codec stacks ({"id", "count", "components"}); the
    SNBT of 1.20.1 becomes data components (see components());
  - names and descriptions are text components, so translation keys become {"translate": key};
  - one unknown item breaks the whole shop, so trades with an item from data/town_missing_items.txt are left out
    and a missing JEI catalyst falls back to the villager spawn egg (the mod default);
  - the Cartographer's Quill trade (a map to a Trials chamber) is left out: Trials is gone and Supplementaries
    stores the quill target as a data component now.

Run from the repository root: python3 tools/port/port_trading_data.py
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import snbt  # noqa: E402

SRC = pathlib.Path("kubejs/_unported/data/society_trading")
DST = pathlib.Path("kubejs/data/society_trading")
MISSING_FILE = pathlib.Path(__file__).parent / "data" / "town_missing_items.txt"
SUBSTITUTES = {
    "trials:trial_key_ominous": "minecraft:ominous_trial_key",  # vanilla since 1.21
}
DROPPED_ITEMS = {"supplementaries:cartographers_quill"}
TEXT_FIELDS = ("name", "unlock_description", "image_description")
# Portable Blueprints keeps its own fields in custom data; these were vanilla 1.20.1 item tags.
VANILLA_TAGS = {"display", "Damage"}


def missing_items():
    lines = MISSING_FILE.read_text().splitlines()
    return {line.strip() for line in lines if line.strip() and not line.startswith("#")}


def text(value):
    if isinstance(value, str):
        return {"translate": value}
    return value


def components(item, raw):
    """1.20.1 item SNBT -> 1.21.1 data components."""
    tag = snbt.parse(raw)
    out = {}
    if item == "minecraft:enchanted_book":
        levels = {e["id"]: e["lvl"] for e in tag.pop("StoredEnchantments")}
        out["minecraft:stored_enchantments"] = {"levels": levels}
    if "patchouli:book" in tag:
        out["patchouli:book"] = tag.pop("patchouli:book")
    display = tag.pop("display", {})
    if "Name" in display:
        out["minecraft:custom_name"] = json.loads(display["Name"])
    if "Lore" in display:
        out["minecraft:lore"] = [json.loads(line) for line in display["Lore"]]
    tag.pop("Damage", None)
    if tag:
        out["minecraft:custom_data"] = tag
    return out


def stack(value):
    item = SUBSTITUTES.get(value["item"], value["item"])
    out = {"id": item, "count": value.get("count", 1)}
    if "nbt" in value:
        out["components"] = components(item, value["nbt"])
    return out


def stack_items(trade):
    return [trade[key]["item"] for key in ("request", "second_request", "offer") if key in trade]


def port_trade(trade, missing, dropped):
    items = [SUBSTITUTES.get(item, item) for item in stack_items(trade)]
    gone = [item for item in items if item in missing or item in DROPPED_ITEMS]
    if gone:
        dropped.update(gone)
        return None
    out = {}
    for key, value in trade.items():
        if key in ("request", "second_request", "offer"):
            out[key] = stack(value)
        elif key in TEXT_FIELDS:
            out[key] = text(value)
        elif key in ("isRare", "priceModifier"):
            continue
        else:
            out[key] = value
    return out


def port_shop(shop, missing, dropped):
    out = {}
    trade_count = 0
    for key, value in shop.items():
        if key == "trades":
            trades = [t for t in (port_trade(t, missing, dropped) for t in value) if t]
            trade_count += len(trades)
            out[key] = trades
        elif key == "random_sets":
            sets = []
            for random_set in value:
                ported = dict(random_set)
                ported["trades"] = [t for t in (port_trade(t, missing, dropped) for t in random_set["trades"]) if t]
                trade_count += len(ported["trades"])
                if ported["trades"]:
                    sets.append(ported)
            out[key] = sets
        elif key == "jei_catalyst":
            item = SUBSTITUTES.get(value["item"], value["item"])
            if item not in missing:
                out[key] = stack(value)
        elif key in TEXT_FIELDS:
            out[key] = text(value)
        else:
            out[key] = value
    return out, trade_count


def main():
    missing = missing_items()
    dropped = set()
    written, skipped = [], []
    for path in sorted((SRC / "shops").glob("*.json")):
        shop, trade_count = port_shop(json.loads(path.read_text()), missing, dropped)
        target = DST / "shops" / path.name
        if trade_count == 0:
            skipped.append(path.stem)
            target.unlink(missing_ok=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(shop, indent=2, ensure_ascii=False) + "\n")
        written.append(path.stem)
    for path in sorted((SRC / "selectors").glob("*.json")):
        selector = json.loads(path.read_text())
        selector["name"] = text(selector["name"])
        selector["shop_ids"] = [s for s in selector["shop_ids"] if s in written]
        target = DST / "selectors" / path.name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(selector, indent=2, ensure_ascii=False) + "\n")
    for path in sorted((SRC / "tags").rglob("*.json")):
        target = DST / path.relative_to(SRC)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(path.read_text())
    print(f"{len(written)} shops written, without trades and skipped: {', '.join(skipped) or 'none'}")
    print(f"{len(dropped)} missing items dropped trades")


if __name__ == "__main__":
    main()
