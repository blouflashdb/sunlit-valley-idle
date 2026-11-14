#!/usr/bin/env python3
"""Checks the loading screen tips under kubejs/assets/*/tips (#18).

Tips 21.1 for 1.21.1 reads {"type": "tipsmod:simple", "text": <component>}; the 1.20.1 {"tip": ...} files are
skipped without an error. Every translated tip must also have an English lang entry.
Exits non-zero and lists the problems if any tip is wrong.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]


def main():
    assets = ROOT / "kubejs" / "assets"
    english = {}
    for lang in assets.glob("*/lang/en_us.json"):
        english.update(json.loads(lang.read_text(encoding="utf-8")))
    problems = []
    tips = sorted(assets.glob("*/tips/*.json"))
    for tip in tips:
        data = json.loads(tip.read_text(encoding="utf-8"))
        name = tip.relative_to(ROOT)
        if data.get("type") != "tipsmod:simple" or "text" not in data:
            problems.append(f"{name}: not a tipsmod:simple tip with a text")
            continue
        key = data["text"].get("translate") if isinstance(data["text"], dict) else None
        if key and key not in english:
            problems.append(f"{name}: no English text for {key}")
    print(f"{len(tips)} tips, {len(problems)} problems")
    for problem in problems:
        print(problem)
    return 1 if problems or not tips else 0


if __name__ == "__main__":
    sys.exit(main())
