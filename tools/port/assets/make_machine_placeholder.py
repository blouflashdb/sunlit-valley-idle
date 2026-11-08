#!/usr/bin/env python3
"""Write placeholder block models for an artisan machine that uses global.getCardinalMultipartJson.

The Society Tweaks models are ARR (#22), so the placeholders are our own boxes that only reference textures
already in the pack. Every state gets its own model so the original models can replace them file by file.

Usage (from the repository root):
    python3 tools/port/assets/make_machine_placeholder.py crystalarium \\
        --side minecraft:block/calcite --top minecraft:block/smooth_stone \\
        --working minecraft:block/budding_amethyst --done minecraft:block/amethyst_block

Writes kubejs/assets/society/models/block/kubejs/<name>/<name>{,_off,_done}{,_upgraded}.json and
<name>_particle.json. "off" uses --side, "working" --working, "done" --done on the four sides; the upgraded
models put --upgraded (gold by default) on the top face. Existing files are overwritten.
"""
import argparse
import json
import pathlib

MODELS = pathlib.Path("kubejs/assets/society/models/block/kubejs")
PARENT = "society:block/kubejs/placeholder/machine"


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--side", required=True, help="side texture while the machine is off")
    ap.add_argument("--top", required=True)
    ap.add_argument("--bottom", help="defaults to --top")
    ap.add_argument("--working", help="side texture while working, defaults to --side")
    ap.add_argument("--done", help="side texture when the product is ready, defaults to --working")
    ap.add_argument("--upgraded", default="minecraft:block/gold_block", help="top texture of the upgraded models")
    args = ap.parse_args()

    working = args.working or args.side
    done = args.done or working
    folder = MODELS / args.name
    for state, side in (("", working), ("_off", args.side), ("_done", done)):
        for upgraded in (False, True):
            textures = {
                "side": side,
                "front": side,
                "top": args.upgraded if upgraded else args.top,
                "bottom": args.bottom or args.top,
                "particle": args.side,
            }
            name = f"{args.name}{state}{'_upgraded' if upgraded else ''}"
            write(folder / f"{name}.json", {"parent": PARENT, "textures": textures})
    write(folder / f"{args.name}_particle.json", {"textures": {"particle": args.side}})


if __name__ == "__main__":
    main()
