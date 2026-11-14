#!/usr/bin/env python3
"""Client smoke test (#19): boots the 1.21.1 client with the whole pack headless and joins a pack server.

Starts a dedicated server with the pack (as server_boot_test.py), installs NeoForge for the client with
portablemc, downloads every client and common mod, resource pack and shader pack of pakku-lock.json, copies
the overrides and client overrides, and runs the client on a virtual X display (Xvfb) with Mesa's software
OpenGL (llvmpipe). The client joins the server with quick play; once the server reports the join, the script
waits for the world to render, takes a screenshot of the display and checks the client logs:
- the client must not crash and must join the server,
- logs/kubejs/client.log must have no errors (error gate with kubejs_error_allowlist.txt),
- logs/latest.log must have no errors from the renderer (Iris, Sodium), FancyMenu / Drippy Loading Screen or
  resource pack loading (same allowlist). Other client errors are listed but do not fail the test.

Needs Java 21, Xvfb, ImageMagick (import), Mesa and portablemc (pip install portablemc==4.4.1).

Usage (from the repository root):
    python3 tools/port/client_boot_test.py --dir build/client --extra-mod mod/build/libs/sunlitidle-0.2.0.jar
"""
import argparse
import concurrent.futures
import json
import os
import pathlib
import re
import shutil
import signal
import subprocess
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import kubejs_log_gate  # noqa: E402
import server_boot_test as boot  # noqa: E402

USERNAME = "CiClient"
DISPLAY = ":99"
FOCUS = re.compile(r"iris|sodium|fancymenu|drippy|konkrete|melody|resource ?pack|PackRepository|ResourceManager|"
                   r"shader|texture", re.IGNORECASE)
LOG_ERROR = re.compile(r"^\[[^\]]+\] \[[^\]]+/(ERROR|FATAL)\] \[([^\]]+)\]: (.*)$")


def install_client(game, extra_mods):
    """Downloads the client mods, resource and shader packs and copies the overrides into the game folder."""
    lock = json.loads(pathlib.Path("pakku-lock.json").read_text())
    pakku = json.loads(pathlib.Path("pakku.json").read_text())
    folders = {"MOD": "mods", "RESOURCE_PACK": "resourcepacks", "SHADER": "shaderpacks"}
    files = []
    for project in lock["projects"]:
        if project.get("side") == "SERVER" or project["type"] not in folders:
            continue
        file = project["files"][0]
        files.append((file, game / folders[project["type"]] / file["file_name"]))
    for folder in folders.values():
        (game / folder).mkdir(parents=True, exist_ok=True)
    print(f"Downloading {len(files)} client files", flush=True)
    with concurrent.futures.ThreadPoolExecutor(8) as pool:
        list(pool.map(lambda f: boot.download(f[0]["url"], f[1], f[0]["hashes"].get("sha1")), files))
    for jar in extra_mods:
        shutil.copy2(jar, game / "mods" / pathlib.Path(jar).name)
    boot.copy_overrides(pakku, game)
    for entry in pakku.get("client_overrides", []):
        src = pathlib.Path(entry)
        if not src.exists():
            continue
        for path in [src] if src.is_file() else sorted(src.rglob("*")):
            if path.is_file():
                target = game / path
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(path, target)


def start_display():
    xvfb = subprocess.Popen(["Xvfb", DISPLAY, "-screen", "0", "1280x720x24", "-nolisten", "tcp"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(3)
    if xvfb.poll() is not None:
        raise SystemExit("Xvfb did not start")
    return xvfb


def start_client(main_dir, game, neoforge, log_file):
    env = dict(os.environ, DISPLAY=DISPLAY, LIBGL_ALWAYS_SOFTWARE="1", GALLIUM_DRIVER="llvmpipe",
               MESA_GL_VERSION_OVERRIDE="4.5", MESA_GLSL_VERSION_OVERRIDE="450")
    cmd = ["portablemc", "--main-dir", str(main_dir), "--work-dir", str(game), "--output", "human",
           "start", "--jvm", shutil.which("java"), "--jvm-args", "-Xmx5G -XX:+UseG1GC",
           f"neoforge:{neoforge}", "-u", USERNAME, "-s", "localhost", "-p", "25565"]
    print("Starting the client: " + " ".join(cmd), flush=True)
    return subprocess.Popen(cmd, env=env, stdout=log_file, stderr=subprocess.STDOUT, start_new_session=True)


def stop_process_group(proc):
    if proc.poll() is None:
        os.killpg(proc.pid, signal.SIGTERM)
        try:
            proc.wait(timeout=60)
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.wait()


def screenshot(path):
    subprocess.run(["import", "-display", DISPLAY, "-window", "root", str(path)], check=False)
    return path.exists() and path.stat().st_size > 0


def log_errors(log):
    """ERROR and FATAL lines of a vanilla-format log, as (logger, message)."""
    if not log.exists():
        return []
    found = []
    for line in log.read_text(errors="replace").splitlines():
        m = LOG_ERROR.match(line)
        if m:
            found.append((m.group(2), m.group(3)))
    return found


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="build/client")
    ap.add_argument("--extra-mod", action="append", default=[], help="local mod jar to add, such as sunlitidle")
    ap.add_argument("--join-timeout", type=int, default=1800, help="seconds for the client to join the server")
    ap.add_argument("--render-wait", type=int, default=120, help="seconds between the join and the screenshot")
    ap.add_argument("--allowlist", default=str(kubejs_log_gate.DEFAULT_ALLOWLIST))
    args = ap.parse_args()

    root = pathlib.Path(args.dir).resolve()
    game = root / "game"
    main_dir = root / "minecraft"
    root.mkdir(parents=True, exist_ok=True)
    neoforge = json.loads(pathlib.Path("pakku-lock.json").read_text())["loaders"]["neoforge"]
    allowlist = kubejs_log_gate.load_allowlist(args.allowlist)

    server_dir = boot.install(root / "server", args.extra_mod)
    (server_dir / "user_jvm_args.txt").write_text("-Xmx4G\n")
    install_client(game, args.extra_mod)
    print("Installing NeoForge for the client", flush=True)
    subprocess.run(["portablemc", "--main-dir", str(main_dir), "--work-dir", str(game), "--output", "human",
                    "start", "--dry", "--jvm", shutil.which("java"), f"neoforge:{neoforge}"],
                   check=True, stdout=subprocess.DEVNULL)

    server = boot.Server(server_dir, args.join_timeout + 1800)
    xvfb = None
    client = None
    problems = []
    shot = root / "screenshot.png"
    try:
        if not server.wait_for(r'Done \(.*For help, type "help"', 900):
            raise SystemExit(f"Server boot failed: {server.fail or 'never reached Done'}")
        xvfb = start_display()
        with open(root / "client-console.log", "w") as console:
            client = start_client(main_dir, game, neoforge, console)
            started = time.monotonic()
            joined = server.wait_for(rf"{USERNAME} (joined the game|lost connection)", args.join_timeout)
            print(f"Server saw: {joined.strip() if joined else 'nothing'} after {time.monotonic() - started:.0f} s",
                  flush=True)
            if not joined or "joined the game" not in joined:
                problems.append("the client did not join the server")
                screenshot(root / "screenshot-no-join.png")
            else:
                deadline = time.monotonic() + args.render_wait
                while time.monotonic() < deadline and client.poll() is None:
                    time.sleep(5)
                if client.poll() is not None:
                    problems.append(f"the client exited (code {client.returncode}) after joining")
                elif not screenshot(shot):
                    problems.append("no screenshot")
                else:
                    print(f"Screenshot: {shot}", flush=True)
    finally:
        if client:
            stop_process_group(client)
        if xvfb:
            xvfb.terminate()
        server.stop()

    crash_reports = sorted((game / "crash-reports").glob("*.txt")) if (game / "crash-reports").exists() else []
    if crash_reports:
        problems.append(f"client crash report: {crash_reports[-1].name}")
        print(crash_reports[-1].read_text(errors="replace")[:4000])

    kubejs = kubejs_log_gate.error_lines(game / "logs" / "kubejs" / "client.log", "client.log")
    kubejs += kubejs_log_gate.error_lines(game / "logs" / "kubejs" / "startup.log", "client startup.log")
    if kubejs_log_gate.gate(kubejs, allowlist, "KubeJS errors on the client") > 0:
        problems.append("KubeJS client errors")

    errors = log_errors(game / "logs" / "latest.log")
    focus = [(f"latest.log {logger}", message) for logger, message in errors if FOCUS.search(logger + " " + message)]
    if kubejs_log_gate.gate(focus, allowlist, "Renderer, menu and resource pack errors on the client") > 0:
        problems.append("renderer, menu or resource pack errors on the client")
    other = sorted({f"[{logger}] {message}" for logger, message in errors} -
                   {f"[{label.removeprefix('latest.log ')}] {message}" for label, message in focus})
    print(f"=== Other client errors (not gated): {len(other)}")
    for line in other[:200]:
        print("  " + line)
    kubejs_log_gate.report_stale(allowlist)

    if problems:
        raise SystemExit("Client smoke test failed: " + "; ".join(problems))
    print("Client booted, joined the server and rendered the world.")


if __name__ == "__main__":
    main()
