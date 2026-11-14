#!/usr/bin/env python3
"""Mod config gate of the boot tests: errors that mods report outside the KubeJS logs.

The KubeJS error gate only reads logs/kubejs/*.log. Some mods report broken pack configs elsewhere:
- InControl logs every bad rule ("Unknown mob 'x:y'!", "JSON error in 'spawner.json'") as an ERROR of its logger
  in logs/latest.log and repeats it in chat to every player who joins;
- NeoForge corrects a shipped TOML config that does not match the mod's current spec ("is not correct.
  Correcting"): it drops renamed keys, resets invalid values and, for files in config/, writes <name>-1.toml.bak;
  server configs from defaultconfigs/ are corrected in config/ without a backup. Both show as a shipped file whose
  values differ from the file in the instance after the boot (rewritten_configs);
- mods archive or back up a config they cannot read and write a fresh default one (CSC moves config/CSC/config.toml
  to config_old_<date>.toml when its ConfigVersion changed; other mods write *.bak / *.old files).

This module collects both, as (label, message) pairs for kubejs_log_gate.gate(), so the same allowlist format and
output apply. Known upstream problems go into tools/port/config_gate_allowlist.txt ("<owner> | <regex>").

Usage as a script (from the repository root), for example on a finished server folder:
    python3 tools/port/config_gate.py --root build/server [--snapshot snapshot.json]
"""
import argparse
import json
import pathlib
import re
import sys
import tomllib

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import kubejs_log_gate  # noqa: E402

DEFAULT_ALLOWLIST = pathlib.Path(__file__).with_name("config_gate_allowlist.txt")
# Folders of an instance that hold mod configs.
CONFIG_DIRS = ("config", "defaultconfigs", "world/serverconfig")
# File names that a mod writes when it archives or backs up a config it replaced.
BACKUP_NAME = re.compile(r"(^config_old_|_old_\d{4}|\.bak\d*$|\.old$|\.backup$|\.broken$|\.invalid$|"
                         r"\.toml\.\d+$|\.json\.\d+$)", re.IGNORECASE)
# Log lines of mods that report a broken pack config (vanilla log format: [time] [thread/LEVEL] [logger/]: message).
LOG_LINE = re.compile(r"^\[[^\]]+\] \[[^\]]+/(ERROR|WARN|FATAL)\] \[([^\]]*)\]: (.*)$")
MOD_CONFIG_ERRORS = (
    # InControl: every message of ErrorHandler.error() (bad mob, item, biome, JSON) is an ERROR of its logger.
    (re.compile(r"incontrol", re.IGNORECASE), {"ERROR", "FATAL"}, re.compile(r".")),
)


def snapshot(root):
    """The config files of an instance, relative to root; taken after the install and before the first boot."""
    root = pathlib.Path(root)
    files = set()
    for folder in CONFIG_DIRS:
        base = root / folder
        if base.exists():
            files |= {p.relative_to(root).as_posix() for p in base.rglob("*") if p.is_file()}
    return files


def backups(root, before, label):
    """Backup or archive files that appeared in the config folders since the snapshot, as (label, message)."""
    found = []
    for rel in sorted(snapshot(root) - set(before)):
        if BACKUP_NAME.search(pathlib.PurePosixPath(rel).name):
            found.append((label, f"config backed up or archived by a mod during the boot: {rel}"))
    return found


# Keys that a mod fills in on the first start; a difference there is not a correction.
RUNTIME_KEYS = {
    "config/CSC/config.toml": {"online.reportToken"},  # per-installation credential, must not ship
}


def _flat(table, prefix=""):
    out = {}
    for key, value in table.items():
        if isinstance(value, dict):
            out.update(_flat(value, f"{prefix}{key}."))
        else:
            out[f"{prefix}{key}"] = value
    return out


def rewritten_configs(root, repo=".", client=False):
    """Shipped TOML configs whose values differ in the instance after a boot, as (shipped path, instance path).

    config/** is compared with <root>/config/**, defaultconfigs/* with <root>/config/* (NeoForge copies it there).
    On a client, configureddefaults/config/** replaces config/** (Default Options copies it on the first start)."""
    root, repo = pathlib.Path(root), pathlib.Path(repo)
    pairs = []
    for p in sorted((repo / "config").rglob("*.toml")):
        rel = p.relative_to(repo / "config")
        client_default = repo / "configureddefaults" / "config" / rel
        pairs.append((client_default if client and client_default.exists() else p, root / "config" / rel))
    pairs += [(p, root / "config" / p.name) for p in sorted((repo / "defaultconfigs").glob("*.toml"))]
    found = []
    for shipped, live in pairs:
        if not live.exists():
            continue
        try:
            old, new = _flat(tomllib.loads(shipped.read_text())), _flat(tomllib.loads(live.read_text()))
        except (tomllib.TOMLDecodeError, UnicodeDecodeError):
            continue  # not a TOML config that NeoForge manages
        rel = shipped.relative_to(repo).as_posix()
        for key in RUNTIME_KEYS.get(rel, ()):
            old.pop(key, None)
            new.pop(key, None)
        if old != new:
            found.append((shipped.relative_to(repo), live))
    return found


def rewritten(root, label, repo=".", client=False):
    """rewritten_configs() as (label, message) pairs for the gate."""
    return [(label, f"{shipped.as_posix()} was corrected or rewritten during the boot (tools/port/"
                    f"sync_corrected_configs.py --instance <folder> ports it)")
            for shipped, _ in rewritten_configs(root, repo, client)]


def log_errors(log, label):
    """Errors of mods about broken pack configs in a vanilla-format log, as (label, message)."""
    log = pathlib.Path(log)
    if not log.exists():
        return []
    found = []
    for line in log.read_text(errors="replace").splitlines():
        m = LOG_LINE.match(line)
        if not m:
            continue
        level, logger, message = m.groups()
        for logger_re, levels, message_re in MOD_CONFIG_ERRORS:
            if level in levels and logger_re.search(logger) and message_re.search(message):
                found.append((label, f"[{logger}] {message.strip()}"))
                break
    return found


def repository_backups(repo="."):
    """Backup files committed to the repository (a stale backup in the overrides ships to players)."""
    repo = pathlib.Path(repo)
    found = []
    for folder in ("config", "defaultconfigs", "configureddefaults"):
        base = repo / folder
        if base.exists():
            for path in sorted(base.rglob("*")):
                if path.is_file() and BACKUP_NAME.search(path.name):
                    found.append(("repository", f"backup file in the overrides: {path.relative_to(repo).as_posix()}"))
    return found


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", help="instance folder (server or client game folder) after a boot")
    ap.add_argument("--snapshot", help="JSON list of the config files before the boot (default: none existed)")
    ap.add_argument("--repo", action="store_true", help="check the repository overrides for backup files")
    ap.add_argument("--client", action="store_true", help="--root is a client game folder")
    ap.add_argument("--allowlist", default=str(DEFAULT_ALLOWLIST))
    args = ap.parse_args()
    allowlist = kubejs_log_gate.load_allowlist(args.allowlist)
    errors = []
    if args.repo:
        errors += repository_backups()
    if args.root:
        before = json.loads(pathlib.Path(args.snapshot).read_text()) if args.snapshot else []
        errors += log_errors(pathlib.Path(args.root) / "logs" / "latest.log", "latest.log")
        errors += backups(args.root, before, "config files")
        errors += rewritten(args.root, "config files", client=args.client)
    failed = kubejs_log_gate.gate(errors, allowlist, "Mod config errors")
    kubejs_log_gate.report_stale(allowlist)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
