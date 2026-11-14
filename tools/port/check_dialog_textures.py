#!/usr/bin/env python3
"""Fails when a SVDialog dialog or a Society Trading shop names a portrait texture that the pack does not ship (#5).

SVDialog 1.6 loads a portrait path "<ns>:<path>" from <ns>:textures/portraits/<path> and a path without a
namespace from dialog:textures/portraits/<path>. The 1.20.1 portraits came from the Society Tweaks jar (license
ARR), which is not in the 1.21.1 pack, so every portrait must exist as a file in kubejs/assets. The two sample
portraits in the SVDialog jar itself (leaf, tlipoca*) are not used by the pack and do not count. Shops load
"<texture>.png"; a shop texture under textures/portraits must exist in kubejs/assets too (other shop textures
come from mod jars and are not checked here).

Usage (from the repository root): python3 tools/port/check_dialog_textures.py
"""
import json
import pathlib
import sys

DIALOGS = pathlib.Path("kubejs/data/dialog/dialogs")
SHOPS = pathlib.Path("kubejs/data/society_trading/shops")
ASSETS = pathlib.Path("kubejs/assets")


def texture(path):
    namespace, _, rest = path.rpartition(":")
    return ASSETS / (namespace or "dialog") / "textures/portraits" / rest


def main():
    missing = {}
    count = 0
    for file in sorted(DIALOGS.glob("*.json")):
        dialog = json.loads(file.read_text())
        for entry in dialog.get("entries", []):
            for portrait in entry.get("portraits", []):
                path = portrait.get("path", "")
                count += 1
                if not path or path.count(":") > 1 or not texture(path).is_file():
                    missing.setdefault(path, []).append(file.name)
    for file in sorted(SHOPS.glob("*.json")):
        path = json.loads(file.read_text()).get("texture", "")
        if "textures/portraits/" in path:
            count += 1
            namespace, _, rest = path.partition(":")
            if not (ASSETS / namespace / f"{rest}.png").is_file():
                missing.setdefault(path, []).append(file.name)
    for path, files in sorted(missing.items()):
        print(f"missing portrait {path!r} "
              f"in {len(files)} files, e.g. {files[0]}")
    if missing:
        print(f"{len(missing)} unresolved portrait textures; draw them with tools/port/port_dialog_portraits.py")
        return 1
    print(f"all {count} dialog and shop portraits resolve")
    return 0


if __name__ == "__main__":
    sys.exit(main())
