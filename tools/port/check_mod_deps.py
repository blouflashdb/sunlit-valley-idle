#!/usr/bin/env python3
"""Check the dependencies that the pack's mods declare in META-INF/neoforge.mods.toml (client and server).

NeoForge stops loading when a required dependency is missing or out of range, when an optional dependency is
present but out of range, or when an incompatible mod is present in the given range. A dedicated server boot
only covers the server set, so client-only mods (FancyMenu, Sodium addons, ...) can fail in a real client
only. This script reads every mod jar in pakku-lock.json (plus nested jar-in-jar mods), resolves the
dependency ranges with Maven range rules and reports what NeoForge would reject. "discouraged" dependencies
are printed as warnings.

Usage (from the repository root):
    python3 tools/port/check_mod_deps.py [--extra-mod mod/build/libs/sunlitidle-x.jar] [--side CLIENT|SERVER]
        [--mod-ids-out build/mod-ids-client.json]
With --mod-ids-out the ids of every mod of the install (with jar-in-jar mods) are written to that JSON file;
tools/port/check_config_ids.py reads it to know the client-only mods, which a server registry dump does not list.
"""
import argparse
import concurrent.futures
import io
import json
import pathlib
import re
import sys
import tomllib
import urllib.parse
import urllib.request
import zipfile

UA = {"User-Agent": "sunlit-valley-idle/check-mod-deps (github.com/blouflashdb/sunlit-valley-idle)"}
JAVA = "21"


def fetch(url):
    url = urllib.parse.quote(url, safe=":/%?=&+")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001 - network errors of any kind are retried
            print(f"  {url}: {e}, retry {attempt + 1}", file=sys.stderr, flush=True)
    raise SystemExit(f"Could not download {url}")


# --- Maven versions and ranges (a port of Maven's ComparableVersion, which NeoForge uses) -------------

QUALIFIERS = ["alpha", "beta", "milestone", "rc", "snapshot", "", "sp"]
ALIASES = {"ga": "", "final": "", "release": "", "cr": "rc"}


def _qualifier_key(q):
    q = ALIASES.get(q, q)
    return f"{QUALIFIERS.index(q)}" if q in QUALIFIERS else f"{len(QUALIFIERS)}-{q}"


def parse_version(v):
    """Returns a nested list: ints, ("s", qualifier) strings and sublists, normalized like Maven."""
    v = v.lower()
    root = []
    stack = [root]
    cur = root
    start, is_digit = 0, False

    def item(text, digit, followed_by_digit=False):
        if digit:
            return int(text)
        if followed_by_digit and len(text) == 1:
            text = {"a": "alpha", "b": "beta", "m": "milestone"}.get(text, text)
        return ("s", text)

    def normalize(lst):
        while lst and (lst[-1] == 0 or lst[-1] == ("s", "") or lst[-1] == []
                       or (isinstance(lst[-1], tuple) and ALIASES.get(lst[-1][1]) == "")):
            lst.pop()

    for i, c in enumerate(v):
        if c == ".":
            cur.append(0 if i == start else item(v[start:i], is_digit))
            start = i + 1
        elif c == "-":
            cur.append(0 if i == start else item(v[start:i], is_digit))
            start = i + 1
            sub = []
            cur.append(sub)
            cur = sub
            stack.append(sub)
        elif c.isdigit():
            if not is_digit and i > start:
                cur.append(item(v[start:i], False, True))
                start = i
                sub = []
                cur.append(sub)
                cur = sub
                stack.append(sub)
            is_digit = True
        else:
            if is_digit and i > start:
                cur.append(item(v[start:i], True))
                start = i
                sub = []
                cur.append(sub)
                cur = sub
                stack.append(sub)
            is_digit = False
    if len(v) > start:
        cur.append(item(v[start:], is_digit))
    for lst in reversed(stack):
        normalize(lst)
    return root


def _cmp_item(a, b):
    """Maven's Item.compareTo; None stands for a missing item."""
    if isinstance(a, int):
        if b is None:
            return 0 if a == 0 else 1
        if isinstance(b, int):
            return (a > b) - (a < b)
        return 1  # an int is newer than a qualifier or a sublist
    if isinstance(a, tuple):
        ka = _qualifier_key(a[1])
        if b is None:
            kb = _qualifier_key("")
            return (ka > kb) - (ka < kb)
        if isinstance(b, int) or isinstance(b, list):
            return -1
        kb = _qualifier_key(b[1])
        return (ka > kb) - (ka < kb)
    # a is a list
    if b is None:
        return 0 if not a else _cmp_item(a[0], None)
    if isinstance(b, int):
        return -1
    if isinstance(b, tuple):
        return 1
    for i in range(max(len(a), len(b))):
        x = a[i] if i < len(a) else None
        y = b[i] if i < len(b) else None
        r = _cmp_item(x, y) if x is not None else -_cmp_item(y, None)
        if r:
            return r
    return 0


def compare(a, b):
    return _cmp_item(parse_version(a), parse_version(b))


def in_range(version, spec):
    spec = (spec or "").strip()
    if spec in ("", "*"):
        return True
    if not spec.startswith(("[", "(")):
        return compare(version, spec) >= 0  # a bare version is a soft "at least"
    for part in re.findall(r"[\[(][^\])]*[\])]", spec):
        lo_inc, hi_inc = part[0] == "[", part[-1] == "]"
        bounds = part[1:-1].split(",")
        if len(bounds) == 1:
            if compare(version, bounds[0].strip()) == 0:
                return True
            continue
        lo, hi = bounds[0].strip(), bounds[1].strip()
        ok = True
        if lo:
            c = compare(version, lo)
            ok &= c > 0 or (lo_inc and c == 0)
        if hi:
            c = compare(version, hi)
            ok &= c < 0 or (hi_inc and c == 0)
        if ok:
            return True
    return False


# --- Reading jars -----------------------------------------------------------------------------------------

def read_mods(data, origin, out):
    """Adds every mod in the jar (and its jar-in-jar jars) to out: modid -> (version, origin, deps)."""
    try:
        z = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        return
    names = set(z.namelist())
    jar_version = None
    if "META-INF/MANIFEST.MF" in names:
        m = re.search(r"Implementation-Version: *(\S+)", z.read("META-INF/MANIFEST.MF").decode("utf-8", "replace"))
        jar_version = m.group(1) if m else None
    if "META-INF/neoforge.mods.toml" in names:
        text = z.read("META-INF/neoforge.mods.toml").decode("utf-8", "replace")
        try:
            toml = tomllib.loads(text)
        except tomllib.TOMLDecodeError as e:
            print(f"WARN {origin}: cannot parse neoforge.mods.toml ({e})")
            toml = {}
        deps_all = toml.get("dependencies", {})
        for mod in toml.get("mods", []):
            version = str(mod.get("version", "0"))
            if "${" in version:
                version = jar_version or "0"
            mod_id = mod.get("modId")
            deps = deps_all.get(mod_id, []) if isinstance(deps_all, dict) else []
            # Like NeoForge, keep the highest version when a mod is both standalone and jar-in-jar.
            if mod_id not in out or compare(version, out[mod_id][0]) > 0:
                out[mod_id] = (version, origin, deps)
    for name in names:
        # Jar-in-jar files sit in META-INF/jarjar/ or META-INF/jars/ (see META-INF/jarjar/metadata.json).
        if name.startswith("META-INF/") and name.endswith(".jar"):
            read_mods(z.read(name), f"{origin} > {name.rsplit('/', 1)[1]}", out)


def dep_type(dep):
    t = str(dep.get("type", "")).lower()
    if t:
        return t
    return "required" if dep.get("mandatory", False) else "optional"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--extra-mod", action="append", default=[], help="local mod jar to add")
    ap.add_argument("--side", choices=["CLIENT", "SERVER"], default="CLIENT",
                    help="which install to check (SERVER leaves out client-only mods)")
    ap.add_argument("--mod-ids-out", help="write the mod ids of the install to this JSON file")
    args = ap.parse_args()

    lock = json.loads(pathlib.Path("pakku-lock.json").read_text())
    mods = [p for p in lock["projects"] if p["type"] == "MOD"
            and not (args.side == "SERVER" and p.get("side") == "CLIENT")]
    found = {"minecraft": (lock["mc_versions"][0], "game", []), "neoforge": (lock["loaders"]["neoforge"], "loader", []),
             "java": (JAVA, "runtime", [])}
    with concurrent.futures.ThreadPoolExecutor(8) as pool:
        datas = list(pool.map(lambda p: (p["files"][0]["file_name"], fetch(p["files"][0]["url"])), mods))
    for name, data in datas:
        read_mods(data, name, found)
    for jar in args.extra_mod:
        read_mods(pathlib.Path(jar).read_bytes(), pathlib.Path(jar).name, found)

    if args.mod_ids_out:
        out = pathlib.Path(args.mod_ids_out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(sorted(m for m in found if m != "java"), indent=1) + "\n")

    errors, warnings = [], []
    side = args.side
    for mod_id, (version, origin, deps) in sorted(found.items()):
        for dep in deps:
            dep_side = str(dep.get("side", "BOTH")).upper()
            if side == "SERVER" and dep_side == "CLIENT" or side == "CLIENT" and dep_side == "SERVER":
                continue
            other, spec, kind = dep.get("modId"), dep.get("versionRange", ""), dep_type(dep)
            if other == "minecraft":
                # Many 1.21.1 builds declare [1.21,1.21.1) and still load on 1.21.1; the lock only holds
                # 1.21.1 files, and the boot tests catch real Minecraft mismatches.
                continue
            have = found.get(other)
            where = f"{mod_id} {version} ({origin})"
            if kind == "required":
                if not have:
                    errors.append(f"{where} requires {other} {spec}, which is not in the pack")
                elif not in_range(have[0], spec):
                    errors.append(f"{where} requires {other} {spec}, the pack has {have[0]} ({have[1]})")
            elif kind == "optional":
                if have and not in_range(have[0], spec):
                    errors.append(f"{where} supports {other} {spec} only, the pack has {have[0]} ({have[1]})")
            elif kind == "incompatible":
                if have and in_range(have[0], spec):
                    errors.append(f"{where} is incompatible with {other} {spec}, the pack has {have[0]} ({have[1]})")
            elif kind == "discouraged":
                if have and in_range(have[0], spec):
                    warnings.append(f"{where} discourages {other} {spec}, the pack has {have[0]}")

    print(f"Checked {len(found)} mods ({side} install).")
    for w in warnings:
        print("WARN " + w)
    for e in errors:
        print("ERROR " + e)
    if errors:
        raise SystemExit(f"{len(errors)} dependency problem(s)")


if __name__ == "__main__":
    main()
