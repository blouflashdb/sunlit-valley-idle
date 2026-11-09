#!/usr/bin/env python3
"""Ports the SVDialog dialogs (NPC chatter, gift answers, intros) from kubejs/_unported/data/dialog to kubejs/data (#15).

SVDialog 1.6 (1.21.1) reads the same JSON as 0.6 (1.20.1). One change: Society Trading 1.2.12 looks up the shops
of a custom selector by the selector id instead of the shop ids, so `openselector @p building_shop` opens an empty
list. An option with such a command leads to a new entry "<selector>_shops" instead, with one option per shop of
the selector (kubejs/data/society_trading/selectors) that runs `openshop`. Run from the repository root: python3 tools/port/port_dialog_data.py
"""
import json
import pathlib

SRC = pathlib.Path("kubejs/_unported/data/dialog/dialogs")
DST = pathlib.Path("kubejs/data/dialog/dialogs")
TRADING = pathlib.Path("kubejs/data/society_trading")


def load_selectors():
    shop_names = {}
    for path in (TRADING / "shops").glob("*.json"):
        shop = json.loads(path.read_text())
        shop_names[shop["shop_id"]] = shop["name"]
    selectors = {}
    for path in (TRADING / "selectors").glob("*.json"):
        selector = json.loads(path.read_text())
        selectors[selector["selector_id"]] = [(s, shop_names[s]) for s in selector["shop_ids"] if s in shop_names]
    return selectors


def port_dialog(dialog, selectors):
    """Points openselector options at new entries listing the selector's shops, right after the entry."""
    entries = []
    added_ids = set()
    for entry in dialog["entries"]:
        entries.append(entry)
        for option in entry.get("options", []):
            commands = option.get("command", [])
            opened = [c.split()[-1] for c in commands if c.startswith("openselector ")]
            if not opened:
                continue
            selector = opened[0]
            option["command"] = [c for c in commands if not c.startswith("openselector ")]
            if not option["command"]:
                del option["command"]
            option["target"] = f"{selector}_shops"
            if option["target"] in added_ids:
                continue
            added_ids.add(option["target"])
            speaking = next((e for e in [entry] + dialog["entries"] if "speaker" in e), {})
            entries.append({
                "id": option["target"],
                "speaker": speaking.get("speaker", {"text": ""}),
                "text": [option["text"]],
                "portraits": speaking.get("portraits", []),
                "options": [
                    {"text": name, "target": "end", "command": [f"openshop @p {shop}"]}
                    for shop, name in selectors[selector]
                ],
            })
    dialog["entries"] = entries
    return dialog


def main():
    DST.mkdir(parents=True, exist_ok=True)
    selectors = load_selectors()
    count = 0
    for path in sorted(SRC.glob("*.json")):
        dialog = port_dialog(json.loads(path.read_text()), selectors)
        (DST / path.name).write_text(json.dumps(dialog, indent=2, ensure_ascii=False) + "\n")
        count += 1
    print(f"{count} dialogs written")


if __name__ == "__main__":
    main()
