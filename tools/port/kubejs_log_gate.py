#!/usr/bin/env python3
"""The KubeJS error gate of CI (#19: "KubeJS log: 0 errors at startup and after 1 in-game year").

Collects the [ERROR] lines of KubeJS logs (logs/kubejs/startup.log, server.log, client.log), drops the ones the
allowlist names (known errors of slices that are still being ported, each with its owner), prints a clear list
and fails if any error is left. Allowlist entries that matched nothing are printed as stale so they can be removed.

Allowlist format (tools/port/kubejs_error_allowlist.txt), one entry per line, "#" starts a comment:
    <owner> | <python regex searched in the error line>
    #18 | townEconomy\\.js#\\d+: .*coinLeaderboard

Usage (from the repository root):
    python3 tools/port/kubejs_log_gate.py [--allowlist FILE] LOG [LOG ...]
"""
import argparse
import pathlib
import re
import sys

DEFAULT_ALLOWLIST = pathlib.Path(__file__).with_name("kubejs_error_allowlist.txt")
ERROR = "] [ERROR] "
TIME_PREFIX = re.compile(r"^\[\d\d:\d\d:\d\d\] ")


def load_allowlist(path):
    entries = []
    path = pathlib.Path(path)
    if not path.exists():
        return entries
    for number, raw in enumerate(path.read_text().splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "|" not in line:
            raise SystemExit(f"{path}:{number}: expected '<owner> | <regex>', got {raw!r}")
        owner, pattern = (part.strip() for part in line.split("|", 1))
        entries.append({"owner": owner, "pattern": re.compile(pattern), "source": pattern, "hits": 0})
    return entries


def error_lines(log, label=None):
    """The [ERROR] lines of one KubeJS log, as (label, message without the time stamp)."""
    log = pathlib.Path(log)
    if not log.exists():
        return []
    label = label or log.name
    return [(label, TIME_PREFIX.sub("", line)) for line in log.read_text(errors="replace").splitlines()
            if ERROR in line]


def gate(errors, allowlist, title="KubeJS errors"):
    """Prints the errors, split into allowed and unexpected ones. Returns the number of unexpected errors."""
    unexpected = {}
    allowed = {}
    for label, message in errors:
        entry = next((e for e in allowlist if e["pattern"].search(message)), None)
        bucket = unexpected if entry is None else allowed
        key = (message, entry["owner"] if entry else None)
        bucket.setdefault(key, set()).add(label)
        if entry:
            entry["hits"] += 1
    print(f"=== {title}: {sum(len(v) for v in unexpected.values())} unexpected, "
          f"{sum(len(v) for v in allowed.values())} allowed", flush=True)
    for (message, _), labels in sorted(unexpected.items()):
        print(f"  ERROR [{', '.join(sorted(labels))}] {message}")
    for (message, owner), labels in sorted(allowed.items()):
        print(f"  allowed ({owner}) [{', '.join(sorted(labels))}] {message}")
    return len(unexpected)


def report_stale(allowlist):
    for entry in allowlist:
        if entry["hits"] == 0:
            print(f"  stale allowlist entry ({entry['owner']}), matched nothing: {entry['source']}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--allowlist", default=str(DEFAULT_ALLOWLIST))
    ap.add_argument("logs", nargs="+")
    args = ap.parse_args()
    allowlist = load_allowlist(args.allowlist)
    errors = [e for log in args.logs for e in error_lines(log)]
    failed = gate(errors, allowlist)
    report_stale(allowlist)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
