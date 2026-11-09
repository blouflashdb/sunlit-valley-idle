#!/usr/bin/env python3
"""Ports the SVDialog dialogs (NPC chatter, gift answers, intros) from kubejs/_unported/data/dialog to kubejs/data (#15).

SVDialog 1.6 (1.21.1) reads the same JSON as 0.6 (1.20.1), so the files are copied as they are, sorted and
re-indented. Run from the repository root: python3 tools/port/port_dialog_data.py
"""
import json
import pathlib

SRC = pathlib.Path("kubejs/_unported/data/dialog/dialogs")
DST = pathlib.Path("kubejs/data/dialog/dialogs")


def port_dialog(dialog):
    return dialog


def main():
    DST.mkdir(parents=True, exist_ok=True)
    count = 0
    for path in sorted(SRC.glob("*.json")):
        dialog = port_dialog(json.loads(path.read_text()))
        (DST / path.name).write_text(json.dumps(dialog, indent=2, ensure_ascii=False) + "\n")
        count += 1
    print(f"{count} dialogs written")


if __name__ == "__main__":
    main()
