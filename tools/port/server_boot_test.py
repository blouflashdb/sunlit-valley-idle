#!/usr/bin/env python3
"""Boot a NeoForge dedicated server with every non-client mod from pakku-lock.json.

Installs the NeoForge server from the lock's loader version, downloads the mods (checked against
their sha1), copies the pack overrides, starts the server until it creates the world and stops it.
Fails if the server never reaches "Done", crashes, NeoForge reports missing dependencies, or KubeJS
logs an error. With --kubejs-tests the scripts in that folder are added as server scripts and the server
is booted twice; each test prints "[PORT-TEST] PHASE1 <name>" on the first boot and "[PORT-TEST] PASS <name>"
on the second (or "[PORT-TEST] FAIL <name>: ..."), so tests can check that state survives a restart.
The last test boot also measures performance (#19): time to "Done", the server's own load time, the TPS of the
idle world after a warm-up and the memory of the server process. The numbers go to <dir>/perf.json and, in
GitHub Actions, to the job summary.

With --simulate-year (needs the sunlitidle jar as --extra-mod) a last boot runs one in-game year: the sunlitidle
CI harness (-Dsunlitidle.ci=true, dev.sunlitidle.ci) logs in a player without a client, checks the idle skills,
offline catch-up and the Adventuring companion in the full pack, then every day jumps to just before the
morning and runs "tick sprint" across it, so all daily handlers run 120 times (4 seasons of 30 days). In the
middle of each season it plants every crop and runs a farm day; at the end it checks the seasons.
The KubeJS logs of every boot go through the error gate (kubejs_log_gate.py, allowlist
kubejs_error_allowlist.txt). The mod config gate (config_gate.py, allowlist config_gate_allowlist.txt) fails on
InControl rule errors in logs/latest.log and on configs that a mod archived or backed up during a boot (such as CSC's
config_old_<date>.toml). Runs in GitHub Actions (needs Java 21).

Usage (from the repository root):
    python3 tools/port/server_boot_test.py --dir build/server [--extra-mod mod/build/libs/sunlitidle-1.0.0.jar]
        [--kubejs-tests tools/port/kubejs_tests] [--simulate-year]
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
import queue

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import config_gate  # noqa: E402
import kubejs_log_gate  # noqa: E402

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
CI_CHECK = re.compile(r"\[CI-CHECK\] (PASS|FAIL) ([\w-]+)(?:: (.*))?")
DAYS_PER_SEASON = 30  # 3 sub-seasons of sub_season_duration = 10 days (config/sereneseasons/seasons.toml)
MORNING_SPRINT = 1500  # ticks from 23800 to 1300: covers every morning window of the pack scripts


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
    ap.add_argument("--simulate-year", action="store_true", help="boot once more and simulate one in-game year")
    ap.add_argument("--allowlist", default=str(kubejs_log_gate.DEFAULT_ALLOWLIST), help="known KubeJS errors")
    ap.add_argument("--config-allowlist", default=str(config_gate.DEFAULT_ALLOWLIST), help="known mod config errors")
    args = ap.parse_args()

    server = install(args.dir, args.extra_mod)
    allowlist = kubejs_log_gate.load_allowlist(args.allowlist)
    config_allowlist = kubejs_log_gate.load_allowlist(args.config_allowlist)
    configs_before = config_gate.snapshot(server)
    config_errors = []

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
        config_errors += config_gate.log_errors(server / "logs" / "latest.log", f"latest.log, boot {boot}")

    failed = kubejs_log_gate.gate(errors, allowlist, "KubeJS errors at startup (test boots)") > 0
    for name in tests:
        first = results[0].get(name, [])
        second = results[1].get(name, [])
        if first != ["PHASE1"] or second != ["PASS"]:
            print(f"KubeJS test {name} failed: boot 1 {first}, boot 2 {second}")
            failed = True
        else:
            print(f"KubeJS test {name} passed")

    if args.simulate_year:
        print("=== Boot 3: one in-game year", flush=True)
        checks = simulate_year(server, args.timeout)
        year_errors = kubejs_errors(server, "year")
        config_errors += config_gate.log_errors(server / "logs" / "latest.log", "latest.log, year")
        failed |= kubejs_log_gate.gate(year_errors, allowlist, "KubeJS errors during the simulated year") > 0
        print("=== Pack checks (dev.sunlitidle.ci)")
        for name, (status, message) in checks.items():
            print(f"  {status} {name}{': ' + message if message else ''}")
        failed |= not checks or any(status != "PASS" for status, _ in checks.values())

    config_errors += config_gate.backups(server, configs_before, "server config")
    config_errors += config_gate.rewritten(server, "server config")
    failed |= kubejs_log_gate.gate(config_errors, config_allowlist, "Mod config errors (InControl, archived configs)") > 0

    kubejs_log_gate.report_stale(allowlist)
    kubejs_log_gate.report_stale(config_allowlist)
    if failed:
        raise SystemExit("KubeJS errors, mod config errors, failed KubeJS tests or failed pack checks "
                         "(see the lists above)")
    print("Server booted into a world and stopped cleanly.")


def install(directory, extra_mods):
    """Installs NeoForge, the server mods of the lock, the extra mods and the overrides. Returns the folder."""
    lock = json.loads(pathlib.Path("pakku-lock.json").read_text())
    pakku = json.loads(pathlib.Path("pakku.json").read_text())
    neoforge = lock["loaders"]["neoforge"]
    server = pathlib.Path(directory).resolve()
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

    for jar in extra_mods:
        shutil.copy2(jar, server / "mods" / pathlib.Path(jar).name)

    copy_overrides(pakku, server)
    (server / "eula.txt").write_text("eula=true\n")
    (server / "server.properties").write_text("online-mode=false\nlevel-seed=sunlit\n")
    (server / "user_jvm_args.txt").write_text("-Xmx6G\n")
    os.chmod(server / "run.sh", 0o755)
    return server


class Server:
    """A running server: console lines go to stdout and to a queue that wait_for reads."""

    def __init__(self, server, timeout):
        self.proc = subprocess.Popen(["./run.sh", "nogui"], cwd=server, stdin=subprocess.PIPE,
                                     stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
        self.lines = queue.Queue()
        self.fail = None
        self.done = False
        self.timer = threading.Timer(timeout, self.proc.kill)
        self.timer.start()
        threading.Thread(target=self._read, daemon=True).start()

    def _read(self):
        for line in self.proc.stdout:
            sys.stdout.write(line)
            if any(m in line for m in FAIL_MARKERS) and not self.fail:
                self.fail = line.strip()
            if "Done (" in line and 'For help, type "help"' in line:
                self.done = True
            self.lines.put(line)
        self.lines.put(None)

    def send(self, command):
        print(f">>> {command}", flush=True)
        self.proc.stdin.write(command + "\n")
        self.proc.stdin.flush()

    def wait_for(self, pattern, seconds):
        """Returns the first console line that matches pattern, or None after seconds or when the server exits."""
        regex = pattern if isinstance(pattern, re.Pattern) else re.compile(pattern)
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            try:
                line = self.lines.get(timeout=max(0.1, end - time.monotonic()))
            except queue.Empty:
                return None
            if line is None:
                self.lines.put(None)
                return None
            if regex.search(line):
                return line
        return None

    def stop(self):
        if self.proc.poll() is None:
            try:
                self.send("stop")
            except (BrokenPipeError, ValueError):
                pass
        try:
            self.proc.wait(timeout=300)
        except subprocess.TimeoutExpired:
            self.proc.kill()
            self.proc.wait()
        self.timer.cancel()


def run_server(server, timeout, wait_for, perf=None, warmup=60):
    """Runs the server until it is up (and the KubeJS tests reported), stops it, returns test markers.

    With a perf dict, it waits `warmup` seconds after "Done", asks for the TPS and fills in the numbers."""
    start = time.monotonic()
    srv = Server(server, timeout)
    markers = {}
    up = False
    grace_end = None
    while True:
        line = srv.wait_for(r".", 5)
        if line is None and srv.proc.poll() is not None:
            break
        if line:
            m = TEST_MARKER.search(line)
            if m:
                markers.setdefault(m.group(2), []).append(m.group(1))
            done = DONE_TIME.search(line)
            if perf is not None and done and "done_s" not in perf:
                perf["done_s"] = float(done.group(1))
                perf["wall_to_done_s"] = round(time.monotonic() - start, 1)
        if srv.done and not up:
            up = True
            # Tests run on ServerEvents.loaded, right after "Done"; give them a moment.
            grace_end = time.monotonic() + (60 if wait_for else 0)
        if up and (wait_for <= markers.keys() or time.monotonic() >= grace_end):
            break
    if perf is not None and srv.proc.poll() is None:
        measure_tps(srv, perf, warmup)
    srv.stop()
    check_boot(server, srv)
    return markers


def measure_tps(srv, perf, warmup):
    """Lets the idle world settle, then asks NeoForge for the tick times and the process memory."""
    srv.wait_for(r"(?!)", max(0, warmup))
    perf["rss_mb"] = server_rss_mb(srv.proc.pid)
    srv.send("neoforge tps")
    end = time.monotonic() + 15
    while time.monotonic() < end:
        line = srv.wait_for(TPS_LINE, end - time.monotonic())
        if not line:
            break
        tps = TPS_LINE.search(line)
        perf.setdefault("tps", {})[tps.group(1)] = {"tps": float(tps.group(2)), "mspt": float(tps.group(3))}
        if "Overall" in perf["tps"]:
            break


def check_boot(server, srv):
    log = server / "logs" / "latest.log"
    if log.exists():
        text = log.read_text(errors="replace")
        for m in FAIL_MARKERS:
            if m in text and not srv.fail:
                srv.fail = m
    if srv.fail or not srv.done:
        # The crash report only says "See logs/kubejs/startup.log"; print the script errors here.
        for label, line in kubejs_errors(server, "failed"):
            print(f"[{label}] {line}")
        raise SystemExit(f"Server boot failed: {srv.fail or 'never reached Done'}")


def simulate_year(server, timeout):
    """Boot 3: the CI harness checks, then one in-game year. Returns {check name: (PASS|FAIL, message)}."""
    ci_scripts = server / "kubejs" / "server_scripts" / "_ci"
    if ci_scripts.exists():
        # The KubeJS tests expect two boots; their blocks stay in the world and keep ticking.
        shutil.rmtree(ci_scripts)
    jvm_args = server / "user_jvm_args.txt"
    jvm_args.write_text(jvm_args.read_text() + "-Dsunlitidle.ci=true\n")
    year_timeout = timeout + 7200
    srv = Server(server, year_timeout)
    checks = {}

    def command(cmd, seconds=300):
        srv.send(cmd)
        if cmd.startswith("sunlitidle_ci "):
            name = cmd.removeprefix("sunlitidle_ci ")
            if not srv.wait_for(r"\[CI-CHECK\] END " + re.escape(name), seconds):
                raise SystemExit(f"No answer to /{cmd}")

    def collect():
        log = server / "logs" / "latest.log"
        for line in log.read_text(errors="replace").splitlines():
            m = CI_CHECK.search(line)
            if m:
                checks[m.group(2)] = (m.group(1), m.group(3) or "")

    try:
        if not srv.wait_for(r'Done \(.*For help, type "help"', timeout):
            raise SystemExit(f"Server boot failed: {srv.fail or 'never reached Done'}")
        command("sunlitidle_ci join")
        # Ten seconds online catch up the two hours of seeded offline time (900 s per second).
        sprint(srv, 400)
        command("sunlitidle_ci check idle", 600)
        started = time.monotonic()
        # One day more than a year: the first jump only reaches the morning of the current day.
        for day in range(1, 4 * DAYS_PER_SEASON + 2):
            command("sunlitidle_ci nextday")
            sprint(srv, MORNING_SPRINT)
            if day % DAYS_PER_SEASON == DAYS_PER_SEASON // 2:
                command("sunlitidle_ci season", 600)
            if day % 10 == 0:
                print(f"=== Day {day} of {4 * DAYS_PER_SEASON + 1} after {time.monotonic() - started:.0f} s", flush=True)
        command("sunlitidle_ci check year")
        command("save-all flush", 0)
        srv.wait_for(r"Saved the game", 300)
    finally:
        srv.stop()
    check_boot(server, srv)
    collect()
    return checks


def sprint(srv, ticks):
    srv.send(f"tick sprint {ticks}")
    if not srv.wait_for(r"Sprint completed", 1800):
        raise SystemExit(f"tick sprint {ticks} did not finish: {srv.fail or 'no report'}")


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
    """The KubeJS error lines of the last boot, as (log label, line); keeps a copy of each log per boot."""
    lines = []
    for name in ("startup", "server"):
        log = server / "logs" / "kubejs" / f"{name}.log"
        if log.exists():
            shutil.copy2(log, log.with_name(f"{name}-boot{boot}.log"))
            lines += kubejs_log_gate.error_lines(log, f"{name}.log, boot {boot}")
    return lines


if __name__ == "__main__":
    main()
