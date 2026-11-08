#!/usr/bin/env python3
"""Boot a NeoForge dedicated server with every non-client mod from pakku-lock.json.

Installs the NeoForge server from the lock's loader version, downloads the mods (checked against
their sha1), copies the pack overrides, starts the server until it creates the world and stops it.
Fails if the server never reaches "Done", crashes, or NeoForge reports missing dependencies.
Runs in GitHub Actions (needs Java 21); the cloud dev container cannot reach the mod CDN.

Usage (from the repository root):
    python3 tools/port/server_boot_test.py --dir build/server
"""
import argparse
import concurrent.futures
import hashlib
import json
import os
import pathlib
import shutil
import subprocess
import sys
import threading
import time
import urllib.request

MAVEN = "https://maven.neoforged.net/releases/net/neoforged/neoforge"
UA = {"User-Agent": "sunlit-valley-idle/server-boot-test (github.com/blouflashdb/sunlit-valley-idle)"}
FAIL_MARKERS = (
    "Missing or unsupported mandatory dependencies",
    "Mod loading has failed",
    "This crash report has been saved to",
    "Failed to start the minecraft server",
)
SKIP_OVERRIDES = ("kubejs/_unported", "config/_unported")


def download(url, dest, sha1=None):
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                data = r.read()
            if sha1 and hashlib.sha1(data).hexdigest() != sha1:
                raise ValueError("sha1 mismatch")
            dest.write_bytes(data)
            return
        except Exception as e:
            print(f"  {dest.name}: {e}, retry {attempt + 1}", flush=True)
            time.sleep(2 ** attempt)
    raise SystemExit(f"Could not download {url}")


def copy_overrides(pakku, server):
    for entry in pakku.get("overrides", []):
        src = pathlib.Path(entry)
        if not src.exists():
            continue
        for path in [src] if src.is_file() else sorted(src.rglob("*")):
            rel = path.as_posix()
            if path.is_file() and not any(rel == s or rel.startswith(s + "/") for s in SKIP_OVERRIDES):
                target = server / rel
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, target)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="build/server")
    ap.add_argument("--timeout", type=int, default=900, help="seconds to wait for the world")
    args = ap.parse_args()

    lock = json.loads(pathlib.Path("pakku-lock.json").read_text())
    pakku = json.loads(pathlib.Path("pakku.json").read_text())
    neoforge = lock["loaders"]["neoforge"]
    server = pathlib.Path(args.dir).resolve()
    (server / "mods").mkdir(parents=True, exist_ok=True)

    installer = server / "installer.jar"
    download(f"{MAVEN}/{neoforge}/neoforge-{neoforge}-installer.jar", installer)
    subprocess.run(["java", "-jar", str(installer), "--installServer", str(server)], cwd=server, check=True,
                   stdout=subprocess.DEVNULL)

    mods = [p for p in lock["projects"] if p["type"] == "MOD" and p.get("side") != "CLIENT"]
    print(f"Downloading {len(mods)} mods", flush=True)
    with concurrent.futures.ThreadPoolExecutor(8) as pool:
        list(pool.map(lambda p: download(p["files"][0]["url"], server / "mods" / p["files"][0]["file_name"],
                                         p["files"][0]["hashes"].get("sha1")), mods))

    copy_overrides(pakku, server)
    (server / "eula.txt").write_text("eula=true\n")
    (server / "server.properties").write_text("online-mode=false\nlevel-seed=sunlit\n")
    (server / "user_jvm_args.txt").write_text("-Xmx6G\n")
    os.chmod(server / "run.sh", 0o755)

    proc = subprocess.Popen(["./run.sh", "nogui"], cwd=server, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, text=True, bufsize=1)
    state = {"done": False, "fail": None}
    timer = threading.Timer(args.timeout, proc.kill)
    timer.start()
    for line in proc.stdout:
        sys.stdout.write(line)
        if any(m in line for m in FAIL_MARKERS) and not state["fail"]:
            state["fail"] = line.strip()
        if "Done (" in line and 'For help, type "help"' in line and not state["done"]:
            state["done"] = True
            proc.stdin.write("stop\n")
            proc.stdin.flush()
    proc.wait()
    timer.cancel()

    log = server / "logs" / "latest.log"
    if log.exists():
        text = log.read_text(errors="replace")
        for m in FAIL_MARKERS:
            if m in text and not state["fail"]:
                state["fail"] = m
    if state["fail"] or not state["done"]:
        raise SystemExit(f"Server boot failed: {state['fail'] or 'never reached Done'}")
    print("Server booted into a world and stopped cleanly.")


if __name__ == "__main__":
    main()
