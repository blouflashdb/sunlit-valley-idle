#!/usr/bin/env python3
"""Writes placeholder crop stage models for crops whose models came from Society Tweaks or Vintage Delight.

Each model is a vanilla `block/crop` cross that shows a vanilla crop texture of a similar growth stage
(see docs/porting-1.21.1.md, "Placeholder textures and models"). Usage: run from the repository root.
"""
import json
from pathlib import Path

ASSETS = Path("kubejs/assets")
# model path prefix, number of stages, vanilla texture stages to spread over them
CROPS = {
    "society:block/kubejs/crops/ancient_fruit_crop_stage": (6, "wheat", 8),
    "society:block/kubejs/crops/blueberry_crop_stage": (6, "beetroots", 4),
    "society:block/kubejs/crops/cranberry_crop_stage": (6, "beetroots", 4),
    "society:block/kubejs/crops/eggplant_crop_stage": (5, "potatoes", 4),
    "society:block/kubejs/crops/hops_crop_stage": (5, "wheat", 8),
    "society:block/kubejs/crops/sparkpod_crop_stage": (5, "carrots", 4),
    "society:block/kubejs/crops/tubabacco_plant_stage": (5, "wheat", 8),
    "vintagedelight:block/peanuts_stage": (5, "potatoes", 4),
}
BUSHES = {
    "society:block/kubejs/berry_bush/base": "minecraft:block/sweet_berry_bush_stage1",
    "society:block/kubejs/berry_bush/salmonberry": "minecraft:block/sweet_berry_bush_stage3",
    "society:block/kubejs/berry_bush/boysenberry": "minecraft:block/sweet_berry_bush_stage3",
    "society:block/kubejs/berry_bush/cranberry": "minecraft:block/sweet_berry_bush_stage2",
    "society:block/kubejs/berry_bush/crystalberry": "minecraft:block/sweet_berry_bush_stage2",
}


def write(model, data):
    namespace, path = model.split(":")
    target = ASSETS / namespace / "models" / f"{path}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=2) + "\n")


def main():
    for prefix, (stages, vanilla, vanilla_stages) in CROPS.items():
        for stage in range(stages):
            vanilla_stage = round(stage * (vanilla_stages - 1) / (stages - 1))
            write(f"{prefix}{stage}", {"parent": "minecraft:block/crop",
                                       "textures": {"crop": f"minecraft:block/{vanilla}_stage{vanilla_stage}"}})
    for model, texture in BUSHES.items():
        write(model, {"parent": "minecraft:block/cross", "textures": {"cross": texture}})


if __name__ == "__main__":
    main()
