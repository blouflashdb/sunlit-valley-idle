#!/usr/bin/env python3
"""Boot a NeoForge dedicated server with every non-client mod from pakku-lock.json.

Installs the NeoForge server from the lock's loader version, downloads the mods (checked against
their sha1), copies the pack overrides, starts the server until it creates the world and stops it.
Fails if the server never reaches "Done", crashes, NeoForge reports missing dependencies, or KubeJS
logs an error. With --kubejs-tests the scripts in that folder are added as server scripts and the server
is booted twice; each test prints "[PORT-TEST] PHASE1 <name>" on the first boot and "[PORT-TEST] PASS <name>"
on the second (or "[PORT-TEST] FAIL <name>: ..."), so tests can check that state survives a restart.
The last boot also measures performance (#19): time to "Done", the server's own load time, the TPS of the
idle world after a warm-up and the memory of the server process. The numbers go to <dir>/perf.json and, in
GitHub Actions, to the job summary.
Runs in GitHub Actions (needs Java 21); the cloud dev container cannot reach the mod CDN.

Usage (from the repository root):
    python3 tools/port/server_boot_test.py --dir build/server [--extra-mod mod/build/libs/sunlitidle-0.2.0.jar]
        [--kubejs-tests tools/port/kubejs_tests]
"""
import argparse
import re
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
DONE_TIME = re.compile(r"Done \(([0-9.]+)s\)!")
TPS_LINE = re.compile(r"(Overall|minecraft:overworld)\b.*?([0-9.]+) TPS.*?([0-9.]+) ?ms", re.I)
TEST_MARKER = re.compile(r"\[PORT-TEST\] (PHASE1|PASS|FAIL) ([\w-]+)")
KUBEJS_ERROR = "] [ERROR] "


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
    ap.add_argument("--extra-mod", action="append", default=[], help="local mod jar to add, such as sunlitidle")
    ap.add_argument("--kubejs-tests", help="folder of KubeJS server scripts that print [PORT-TEST] markers")
    ap.add_argument("--warmup", type=int, default=60, help="seconds the idle world runs before TPS is measured")
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

    for jar in args.extra_mod:
        shutil.copy2(jar, server / "mods" / pathlib.Path(jar).name)

    copy_overrides(pakku, server)
    (server / "eula.txt").write_text("eula=true\n")
    (server / "server.properties").write_text("online-mode=false\nlevel-seed=sunlit\n")
    (server / "user_jvm_args.txt").write_text("-Xmx6G\n")
    os.chmod(server / "run.sh", 0o755)

    tests = []
    if args.kubejs_tests:
        target = server / "kubejs" / "server_scripts" / "_ci"
        target.mkdir(parents=True, exist_ok=True)
        for script in sorted(pathlib.Path(args.kubejs_tests).glob("*.js")):
            shutil.copy2(script, target / script.name)
            # Other scripts (such as generated data) are copied but print no markers.
            if script.stem.endswith("Test"):
                tests.append(script.stem.removesuffix("Test").lower())

    boots = 2 if tests else 1
    results = []
    errors = []
    for boot in range(1, boots + 1):
        print(f"=== Boot {boot} of {boots}", flush=True)
        perf = {} if boot == boots else None
        markers = run_server(server, args.timeout, wait_for=set(tests), perf=perf, warmup=args.warmup)
        results.append(markers)
        if perf is not None:
            report_perf(server, perf)
        errors += kubejs_errors(server, boot)

    if errors:
        print("KubeJS errors:")
        for line in errors:
            print("  " + line)
    failed = bool(errors)
    for name in tests:
        first = results[0].get(name, [])
        second = results[1].get(name, [])
        if first != ["PHASE1"] or second != ["PASS"]:
            print(f"KubeJS test {name} failed: boot 1 {first}, boot 2 {second}")
            failed = True
        else:
            print(f"KubeJS test {name} passed")
    if failed:
        raise SystemExit("KubeJS errors or failed KubeJS tests")
    print("Server booted into a world and stopped cleanly.")


def run_server(server, timeout, wait_for, perf=None, warmup=60):
    """Runs the server until it is up (and the KubeJS tests reported), stops it, returns test markers.

    With a perf dict, it waits `warmup` seconds after "Done", asks for the TPS and fills in the numbers."""
    start = time.monotonic()
    proc = subprocess.Popen(["./run.sh", "nogui"], cwd=server, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, text=True, bufsize=1)
    state = {"done": False, "fail": None, "stopped": False}
    markers = {}
    timer = threading.Timer(timeout, proc.kill)
    timer.start()

    def send(command):
        try:
            proc.stdin.write(command + "\n")
            proc.stdin.flush()
        except (OSError, ValueError):
            pass

    def stop():
        if state["stopped"]:
            return
        if perf is not None:
            # Let the idle world settle, then ask NeoForge for the tick times; stop once they are printed.
            if "tps_requested" in state:
                return
            state["tps_requested"] = True

            def measure():
                perf["rss_mb"] = server_rss_mb(proc.pid)
                send("neoforge tps")
                later(10, really_stop)
            later(warmup, measure)
            return
        really_stop()

    def later(seconds, action):
        t = threading.Timer(seconds, action)
        t.daemon = True
        t.start()

    def really_stop():
        if not state["stopped"]:
            state["stopped"] = True
            send("stop")

    grace = None
    for line in proc.stdout:
        sys.stdout.write(line)
        if any(m in line for m in FAIL_MARKERS) and not state["fail"]:
            state["fail"] = line.strip()
        if perf is not None:
            done = DONE_TIME.search(line)
            if done and "done_s" not in perf:
                perf["done_s"] = float(done.group(1))
                perf["wall_to_done_s"] = round(time.monotonic() - start, 1)
            tps = TPS_LINE.search(line)
            if tps:
                perf.setdefault("tps", {})[tps.group(1)] = {"tps": float(tps.group(2)), "mspt": float(tps.group(3))}
                if "Overall" in perf["tps"]:
                    really_stop()
        m = TEST_MARKER.search(line)
        if m:
            markers.setdefault(m.group(2), []).append(m.group(1))
        if "Done (" in line and 'For help, type "help"' in line and not state["done"]:
            state["done"] = True
            if wait_for:
                # Tests run on ServerEvents.loaded, right after "Done"; give them a moment.
                grace = threading.Timer(60, stop)
                grace.start()
            else:
                stop()
        if state["done"] and wait_for and wait_for <= markers.keys() and not state["stopped"]:
            stop()
    proc.wait()
    timer.cancel()
    if grace:
        grace.cancel()

    log = server / "logs" / "latest.log"
    if log.exists():
        text = log.read_text(errors="replace")
        for m in FAIL_MARKERS:
            if m in text and not state["fail"]:
                state["fail"] = m
    if state["fail"] or not state["done"]:
        # The crash report only says "See logs/kubejs/startup.log"; print the script errors here.
        for line in kubejs_errors(server, "failed"):
            print(line)
        raise SystemExit(f"Server boot failed: {state['fail'] or 'never reached Done'}")
    return markers


def server_rss_mb(pid):
    """Resident memory of the java process under run.sh (the shell's child), in MB."""
    pids = [pid]
    try:
        pids += [int(c) for c in pathlib.Path(f"/proc/{pid}/task/{pid}/children").read_text().split()]
    except OSError:
        pass
    best = 0
    for p in pids:
        try:
            for line in pathlib.Path(f"/proc/{p}/status").read_text().splitlines():
                if line.startswith("VmRSS:"):
                    best = max(best, int(line.split()[1]) // 1024)
        except OSError:
            continue
    return best or None


def report_perf(server, perf):
    mods = len(list((server / "mods").glob("*.jar")))
    perf["server_mods"] = mods
    log = server / "logs" / "latest.log"
    if log.exists():
        m = re.search(r"(?:Dedicated server|Game) took ([0-9.]+) seconds", log.read_text(errors="replace"))
        if m:
            perf["modernfix_load_s"] = float(m.group(1))
    (server / "perf.json").write_text(json.dumps(perf, indent=2) + "\n")
    overall = perf.get("tps", {}).get("Overall", {})
    rows = [("Server mods", mods),
            ("Wall time from start to \"Done\"", f"{perf.get('wall_to_done_s', '?')} s"),
            ("Server \"Done (...)\" time", f"{perf.get('done_s', '?')} s"),
            ("ModernFix load time", f"{perf.get('modernfix_load_s', '?')} s"),
            ("Idle TPS / mean tick (overall)", f"{overall.get('tps', '?')} / {overall.get('mspt', '?')} ms"),
            ("Server process RSS", f"{perf.get('rss_mb', '?')} MB (-Xmx6G)")]
    text = "## Server performance (last boot)\n\n| Metric | Value |\n| --- | --- |\n"
    text += "".join(f"| {k} | {v} |\n" for k, v in rows)
    print(text, flush=True)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a") as f:
            f.write(text + "\n")


def kubejs_errors(server, boot):
    lines = []
    for name in ("startup", "server"):
        log = server / "logs" / "kubejs" / f"{name}.log"
        if log.exists():
            text = log.read_text(errors="replace")
            shutil.copy2(log, log.with_name(f"{name}-boot{boot}.log"))
            lines += [f"[{name}.log, boot {boot}] {l}" for l in text.splitlines() if KUBEJS_ERROR in l]
    return lines


if __name__ == "__main__":
    main()
