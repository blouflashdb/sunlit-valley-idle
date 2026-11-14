#!/usr/bin/env python3
"""Check that the FancyMenu/Drippy layouts only target widgets and elements that exist on 1.21.1.

A layout entry that FancyMenu cannot match is ignored without an error, so the widget it should move or hide
stays at its vanilla place (for example the language and accessibility buttons on top of the moved menu
buttons). This check reads the FancyMenu and Drippy jars from pakku-lock.json and fails when a layout uses:

  1. a vanilla widget identifier that FancyMenu does not define;
  2. an identifier that FancyMenu finds by a message key (its *WidgetIdentificationContext classes), when no
     1.21.1 widget carries that key: the key is in no class of the vanilla client or NeoForge, and our mod
     (mod/src) does not set it;
  3. a numeric identifier (FancyMenu's position-based fallback; it changes with the game version and the
     window size);
  4. a deep element type that FancyMenu or Drippy does not have (for example Forge-only title screen texts).

Usage (from the repository root):
    python3 tools/port/check_fancymenu_layouts.py
"""
import io
import json
import pathlib
import re
import struct
import sys
import urllib.parse
import urllib.request
import zipfile

LAYOUTS = pathlib.Path("config/fancymenu/customization")
MOD_SOURCES = pathlib.Path("mod/src/main/java")
MANIFEST = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"
NEOFORGE = "https://maven.neoforged.net/releases/net/neoforged/neoforge/{v}/neoforge-{v}-universal.jar"
UA = {"User-Agent": "sunlit-valley-idle/check-fancymenu-layouts (github.com/blouflashdb/sunlit-valley-idle)"}


def fetch(url):
    url = urllib.parse.quote(url, safe=":/%?=&+")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001 - network errors of any kind are retried
            print(f"  {url}: {e}, retry {attempt + 1}", file=sys.stderr, flush=True)
    raise SystemExit(f"Could not download {url}")


def class_strings(data):
    """The CONSTANT_Utf8 entries of a class file, in constant pool order."""
    if data[:4] != b"\xca\xfe\xba\xbe":
        return []
    count = struct.unpack(">H", data[8:10])[0]
    pos, i, out = 10, 1, []
    sizes = {3: 4, 4: 4, 5: 8, 6: 8, 7: 2, 8: 2, 9: 4, 10: 4, 11: 4, 12: 4, 15: 3, 16: 2, 17: 4, 18: 4, 19: 2, 20: 2}
    while i < count:
        tag = data[pos]
        if tag == 1:
            length = struct.unpack(">H", data[pos + 1:pos + 3])[0]
            out.append(data[pos + 3:pos + 3 + length].decode("utf-8", "replace"))
            pos += 3 + length
        else:
            pos += 1 + sizes[tag]
        i += 2 if tag in (5, 6) else 1
    return out


def jar_classes(data):
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        for name in z.namelist():
            if name.endswith(".class"):
                yield name, class_strings(z.read(name))
            elif name.endswith(".jar"):
                yield from jar_classes(z.read(name))


def lock_jar(lock, slug):
    project = next(p for p in lock["projects"] if p["slug"].get("curseforge") == slug)
    return fetch(project["files"][0]["url"])


def layout_entries(path):
    """(element block type, element_type, instance_identifier) of every element in a layout file."""
    text = path.read_text()
    meta = re.search(r"layout-meta \{.*?\n  identifier = (\S+)", text, re.S)
    for block in re.split(r"(?<=\n)(?=[a-z_-]+ \{\n)", text):
        head = block.split(" {", 1)[0].strip()
        element_type = re.search(r"\n  element_type = (\S+)", block)
        identifier = re.search(r"\n  instance_identifier = (\S+)", block)
        if element_type and identifier:
            yield meta.group(1) if meta else "?", head, element_type.group(1), identifier.group(1)


def main():
    lock = json.loads(pathlib.Path("pakku-lock.json").read_text())
    known = set()  # every string constant of FancyMenu and Drippy (explicit widget ids, element types)
    by_key = {}  # identifier -> message key FancyMenu matches it by
    for slug in ("fancymenu", "drippy-loading-screen"):
        for name, strings in jar_classes(lock_jar(lock, slug)):
            known.update(strings)
            if name.endswith("WidgetIdentificationContext.class"):
                for key, ident in zip(strings, strings[1:]):
                    if re.fullmatch(r"[a-z]+_[a-z_]+_(button|widget)", ident) and re.fullmatch(r"[\w.]+", key):
                        by_key.setdefault(ident, key)

    game_keys = set()
    manifest = json.loads(fetch(MANIFEST))
    meta = json.loads(fetch(next(v["url"] for v in manifest["versions"] if v["id"] == lock["mc_versions"][0])))
    for url in (meta["downloads"]["client"]["url"], NEOFORGE.format(v=lock["loaders"]["neoforge"])):
        for _, strings in jar_classes(fetch(url)):
            game_keys.update(strings)
    for source in MOD_SOURCES.rglob("*.java"):
        game_keys.update(re.findall(r'"([\w.]+)"', source.read_text()))

    errors, checked = [], 0
    for path in sorted(LAYOUTS.glob("*.txt")):
        for screen, head, element_type, ident in layout_entries(path):
            where = f"{path.name} ({screen})"
            if head == "deep_element":
                checked += 1
                if element_type not in known:
                    errors.append(f"{where}: deep element {element_type} does not exist in FancyMenu/Drippy")
                continue
            if element_type != "vanilla_button":
                continue
            checked += 1
            if ident.isdigit():
                errors.append(f"{where}: numeric widget identifier {ident} (1.20.1 position-based fallback)")
            elif ident in by_key:
                if by_key[ident] not in game_keys:
                    errors.append(f"{where}: {ident} is matched by the message key {by_key[ident]!r}, which no "
                                  f"1.21.1 widget carries (vanilla, NeoForge or mod/src)")
            elif ident not in known:
                errors.append(f"{where}: widget identifier {ident} does not exist in FancyMenu/Drippy")

    for e in errors:
        print("ERROR " + e)
    if errors:
        raise SystemExit(f"{len(errors)} layout problem(s)")
    print(f"Checked {checked} vanilla widget and deep element references in {LAYOUTS}: all exist on 1.21.1.")


if __name__ == "__main__":
    main()
