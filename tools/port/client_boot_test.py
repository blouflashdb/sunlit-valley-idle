#!/usr/bin/env python3
"""Client smoke test (#19): boots the 1.21.1 client with the whole pack headless and joins a pack server.

Starts a dedicated server with the pack (as server_boot_test.py), installs NeoForge for the client with
portablemc, downloads every client and common mod, resource pack and shader pack of pakku-lock.json, copies
the overrides and client overrides, and runs the client on a virtual X display (Xvfb) with Mesa's software
OpenGL (llvmpipe). The client joins the server with quick play; once the server reports the join, the script
waits for the world to render, takes a screenshot of the display and checks the client logs.

The client starts twice: first without quick play, to take screenshots of the Drippy loading screen and the
FancyMenu title screen; then with quick play into the server, for an in-game screenshot (JourneyMap minimap,
HUD), and then of the idle skills window, which the sunlitidle mod opens by itself (env
SUNLITIDLE_CI_IDLE_SCREEN; not gated). Checks:
- the client must not crash, must reach the title screen and must join the server,
- the shader pack that config/iris.properties selects must exist in shaderpacks/ after the first start
  (Colorwheel Patcher writes the patched Complementary copy there),
- every resource pack that configureddefaults/options.txt enables must still be enabled after the first start
  (the game drops missing and incompatible packs from options.txt and logs it),
- the server log must have no InControl rule errors (InControl repeats them in chat on the join), and no mod may
  archive or back up a config of the client or the server during the run (config_gate.py, config_gate_allowlist.txt),
- logs/kubejs/client.log must have no errors (error gate with kubejs_error_allowlist.txt),
- logs/latest.log must have no errors from the renderer (Iris, Sodium), FancyMenu / Drippy Loading Screen or
  resource pack loading (same allowlist). Other client errors are listed but do not fail the test.

After the title screen screenshot, the game window is resized with xdotool and the title screen is captured
again at each size in TITLE_SIZES (each size gives another automatic GUI scale), so layout problems that only
show at one scale are visible in the artifact.

Needs Java 21, Xvfb, ImageMagick (import), xdotool, Mesa and portablemc (pip install portablemc==4.4.1).

Usage (from the repository root):
    python3 tools/port/client_boot_test.py --dir build/client --extra-mod mod/build/libs/sunlitidle-1.0.0.jar
"""
import argparse
import concurrent.futures
import difflib
import json
import os
import pathlib
import re
import shutil
import signal
import subprocess
import sys
import time
import urllib.parse

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import config_gate  # noqa: E402
import kubejs_log_gate  # noqa: E402
import server_boot_test as boot  # noqa: E402

USERNAME = "CiClient"
DISPLAY = ":99"
FOCUS = re.compile(r"iris|sodium|fancymenu|drippy|konkrete|melody|journeymap|resource ?pack|PackRepository|"
                   r"ResourceManager|shader|texture|colorwheel", re.IGNORECASE)
# ModernFix logs the start time when the title screen is up; runners have no sound device.
LOADED = re.compile(r"Game took [0-9.]+ seconds to start|Sound engine started")
# NeoForge shows an error screen and keeps running when mods fail to load; a crash report is written.
LOAD_FAILED = re.compile(r"Error during pre-loading phase|Mod loading has failed|Failed to load mod|"
                         r"This crash report has been saved to")
DISCONNECTED = re.compile(r"Client disconnected with reason: .*")
PACK_DROPPED = re.compile(r"Removed resource pack .* from options because")
LOG_ERROR = re.compile(r"^\[[^\]]+\] \[[^\]]+/(ERROR|FATAL)\] \[([^\]]+)\]: (.*)$")


def install_client(game, extra_mods, exclude=()):
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
    # Resource pack file names can contain spaces, which urllib does not encode.
    with concurrent.futures.ThreadPoolExecutor(8) as pool:
        list(pool.map(lambda f: boot.download(urllib.parse.quote(f[0]["url"], safe=":/%+"), f[1],
                                              f[0]["hashes"].get("sha1")), files))
    for pattern in exclude:
        for jar in (game / "mods").glob(pattern):
            print(f"Excluding {jar.name}", flush=True)
            jar.unlink()
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


def start_client(main_dir, game, neoforge, log_file, join=True, idle_screen_after=None):
    env = dict(os.environ, DISPLAY=DISPLAY, LIBGL_ALWAYS_SOFTWARE="1", GALLIUM_DRIVER="llvmpipe",
               MESA_GL_VERSION_OVERRIDE="4.5", MESA_GLSL_VERSION_OVERRIDE="450")
    if idle_screen_after is not None:
        # The sunlitidle mod opens its idle skills window this many seconds after joining (ClientSetup).
        env["SUNLITIDLE_CI_IDLE_SCREEN"] = str(idle_screen_after)
    cmd = ["portablemc", "--main-dir", str(main_dir), "--work-dir", str(game), "--output", "human",
           "start", "--jvm", shutil.which("java"), "--jvm-args", "-Xmx5G -XX:+UseG1GC -Dsunlitidle.ci=true",
           f"neoforge:{neoforge}", "-u", USERNAME]
    if join:
        cmd += ["-s", "localhost", "-p", "25565"]
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


# Window sizes for the extra title screen screenshots; the automatic GUI scale is 3 and 2.
TITLE_SIZES = ((1280, 720), (854, 480))


def game_window():
    """The X window id of the game (the only visible top-level window without a window manager)."""
    out = subprocess.run(["xdotool", "search", "--onlyvisible", "--name", "."], env=dict(os.environ, DISPLAY=DISPLAY),
                         capture_output=True, text=True, check=False).stdout.split()
    return out[-1] if out else None


def title_screen_sizes(root):
    """Resizes the game window to each of TITLE_SIZES and captures the window."""
    window = game_window()
    if not window:
        print("No game window found for the resized title screen screenshots", flush=True)
        return
    for width, height in TITLE_SIZES:
        subprocess.run(["xdotool", "windowmove", window, "0", "0", "windowsize", window, str(width), str(height)],
                       env=dict(os.environ, DISPLAY=DISPLAY), check=False)
        time.sleep(15)
        path = root / f"title-screen-{width}x{height}.png"
        subprocess.run(["import", "-display", DISPLAY, "-window", window, str(path)], check=False)
        if path.exists() and path.stat().st_size > 0:
            print(f"Screenshot: {path}", flush=True)


def screenshot(path):
    subprocess.run(["import", "-display", DISPLAY, "-window", "root", str(path)], check=False)
    return path.exists() and path.stat().st_size > 0


def idle_screenshot(root, client, wait=60):
    """Screenshot of the idle skills window, which the mod opens on its own in CI. Not gated: only a note."""
    deadline = time.monotonic() + wait
    while time.monotonic() < deadline and client.poll() is None:
        time.sleep(5)
    shot = root / "idle-window.png"
    if client.poll() is None and screenshot(shot):
        print(f"Screenshot: {shot}", flush=True)
    else:
        print("No idle window screenshot (not gated)", flush=True)


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


def title_screen(root, main_dir, game, neoforge, timeout, problems):
    """First start without quick play: loading screen frames, then the title screen. Returns the log copy."""
    log = game / "logs" / "latest.log"
    with open(root / "client-console-title.log", "w") as console:
        client = start_client(main_dir, game, neoforge, console, join=False)
        try:
            started = time.monotonic()
            frame = 0
            loaded = None
            while time.monotonic() - started < timeout and client.poll() is None:
                time.sleep(20)
                if frame < 6 and screenshot(root / f"loading-{frame}.png"):
                    frame += 1
                text = log.read_text(errors="replace") if log.exists() else ""
                if LOADED.search(text):
                    loaded = time.monotonic() - started
                    break
                if LOAD_FAILED.search(text) or list((game / "crash-reports").glob("*.txt")):
                    time.sleep(20)  # let the error screen draw, for the screenshot below
                    break
            if loaded is None:
                problems.append("the client did not finish loading" if client.poll() is None
                                else f"the client exited (code {client.returncode}) while loading")
                screenshot(root / "not-loaded.png")
                return copy_log(game), False
            print(f"Client loaded in {loaded:.0f} s", flush=True)
            time.sleep(45)
            if client.poll() is not None:
                problems.append(f"the client exited (code {client.returncode}) on the title screen")
                return copy_log(game), False
            if screenshot(root / "title-screen.png"):
                print(f"Screenshot: {root / 'title-screen.png'}", flush=True)
            title_screen_sizes(root)
        finally:
            stop_process_group(client)
    return copy_log(game), True


def copy_log(game):
    log = game / "logs" / "latest.log"
    copy = game / "logs" / "latest-title.log"
    if log.exists():
        shutil.copy2(log, copy)
    return copy


def wait_for_join(server, client, game, timeout):
    """The server's join line for the client, the client's disconnect reason, or None if the client exits or
    time runs out."""
    end = time.monotonic() + timeout
    log = game / "logs" / "latest.log"
    while time.monotonic() < end:
        line = server.wait_for(rf"{USERNAME} (joined the game|lost connection)", min(10, end - time.monotonic()))
        if line or client.poll() is not None:
            return line
        if log.exists():
            m = DISCONNECTED.search(log.read_text(errors="replace"))
            if m:
                return m.group(0)
    return None


def check_shader_pack(game, problems):
    props = game / "config" / "iris.properties"
    if not props.exists():
        problems.append("config/iris.properties is missing in the client")
        return
    selected = next((line.split("=", 1)[1].strip() for line in props.read_text().splitlines()
                     if line.startswith("shaderPack=")), "")
    present = sorted(p.name for p in (game / "shaderpacks").glob("*"))
    print(f"Iris shaderPack: {selected!r}; shaderpacks/: {present}", flush=True)
    if selected and selected not in present:
        problems.append(f"iris.properties selects {selected!r}, which is not in shaderpacks/ {present}")


def check_resource_packs(game, title_log, problems):
    wanted = []
    defaults = pathlib.Path("configureddefaults/options.txt")
    for line in defaults.read_text().splitlines():
        if line.startswith("resourcePacks:"):
            wanted = json.loads(line.split(":", 1)[1])
    enabled = []
    options = game / "options.txt"
    if options.exists():
        for line in options.read_text().splitlines():
            if line.startswith("resourcePacks:"):
                enabled = json.loads(line.split(":", 1)[1])
    dropped = [p for p in wanted if p not in enabled]
    print(f"Resource packs enabled after the first start: {enabled}", flush=True)
    if dropped:
        problems.append(f"resource packs dropped by the game: {dropped}")
    if title_log and title_log.exists():
        for line in title_log.read_text(errors="replace").splitlines():
            if PACK_DROPPED.search(line):
                problems.append(line.split("]: ", 1)[-1])


class ClientFailed(Exception):
    pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="build/client")
    ap.add_argument("--extra-mod", action="append", default=[], help="local mod jar to add, such as sunlitidle")
    ap.add_argument("--exclude-mod", action="append", default=[],
                    help="glob of client mod files to leave out (to try a lock change locally)")
    ap.add_argument("--client-mod", action="append", default=[], help="extra jar for the client only")
    ap.add_argument("--join-timeout", type=int, default=1800, help="seconds for the client to join the server")
    ap.add_argument("--render-wait", type=int, default=120, help="seconds between the join and the screenshot")
    ap.add_argument("--allowlist", default=str(kubejs_log_gate.DEFAULT_ALLOWLIST))
    ap.add_argument("--config-allowlist", default=str(config_gate.DEFAULT_ALLOWLIST))
    args = ap.parse_args()

    root = pathlib.Path(args.dir).resolve()
    game = root / "game"
    main_dir = root / "minecraft"
    root.mkdir(parents=True, exist_ok=True)
    neoforge = json.loads(pathlib.Path("pakku-lock.json").read_text())["loaders"]["neoforge"]
    allowlist = kubejs_log_gate.load_allowlist(args.allowlist)

    server_dir = boot.install(root / "server", args.extra_mod)
    (server_dir / "user_jvm_args.txt").write_text("-Xmx4G\n")
    install_client(game, args.extra_mod + args.client_mod, args.exclude_mod)
    print("Installing NeoForge for the client", flush=True)
    subprocess.run(["portablemc", "--main-dir", str(main_dir), "--work-dir", str(game), "--output", "human",
                    "start", "--dry", "--jvm", shutil.which("java"), f"neoforge:{neoforge}"],
                   check=True, stdout=subprocess.DEVNULL)
    configs_before = {"client": config_gate.snapshot(game), "server": config_gate.snapshot(server_dir)}

    server = boot.Server(server_dir, args.join_timeout + 1800)
    xvfb = None
    client = None
    problems = []
    title_log = None
    shot = root / "in-game.png"
    try:
        if not server.wait_for(r'Done \(.*For help, type "help"', 900):
            raise SystemExit(f"Server boot failed: {server.fail or 'never reached Done'}")
        xvfb = start_display()
        title_log, loaded = title_screen(root, main_dir, game, neoforge, args.join_timeout, problems)
        check_shader_pack(game, problems)
        check_resource_packs(game, title_log, problems)
        if not loaded:
            raise ClientFailed()
        with open(root / "client-console.log", "w") as console:
            client = start_client(main_dir, game, neoforge, console, idle_screen_after=args.render_wait + 20)
            started = time.monotonic()
            joined = wait_for_join(server, client, game, args.join_timeout)
            print(f"Server saw: {joined.strip() if joined else 'nothing'} after {time.monotonic() - started:.0f} s",
                  flush=True)
            if not joined or "joined the game" not in joined:
                problems.append("the client did not join the server" + (f" ({joined.strip()})" if joined else ""))
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
                    idle_screenshot(root, client)
    except ClientFailed:
        print("The client did not load; the join is skipped", flush=True)
    finally:
        if client:
            stop_process_group(client)
        if xvfb:
            xvfb.terminate()
        server.stop()

    crash_reports = sorted((game / "crash-reports").glob("*.txt")) if (game / "crash-reports").exists() else []
    if crash_reports:
        problems.append(f"client crash report: {crash_reports[-1].name}")
        report = crash_reports[-1].read_text(errors="replace")
        failures = sorted({line.strip() for line in report.splitlines() if "Failure message:" in line})
        print("=== Client crash report " + crash_reports[-1].name)
        for line in failures or report.splitlines()[:60]:
            print("  " + line)

    config_allowlist = kubejs_log_gate.load_allowlist(args.config_allowlist)
    config_errors = config_gate.log_errors(server_dir / "logs" / "latest.log", "server latest.log")
    config_errors += config_gate.log_errors(game / "logs" / "latest.log", "client latest.log")
    if title_log:
        config_errors += config_gate.log_errors(title_log, "client title-screen log")
    config_errors += config_gate.backups(game, configs_before["client"], "client config")
    config_errors += config_gate.backups(server_dir, configs_before["server"], "server config")
    config_errors += config_gate.rewritten(game, "client config", client=True)
    config_errors += config_gate.rewritten(server_dir, "server config")
    if kubejs_log_gate.gate(config_errors, config_allowlist, "Mod config errors (InControl, archived configs)") > 0:
        problems.append("mod config errors")
        # The corrected files exist only on the runner; print them as diffs so they can be ported from the log.
        for instance, client in ((game, True), (server_dir, False)):
            for shipped, live in config_gate.rewritten_configs(instance, client=client):
                print(f"=== Corrected config {shipped.as_posix()} (diff shipped -> corrected)")
                diff = difflib.unified_diff(shipped.read_text().splitlines(), live.read_text().splitlines(),
                                            str(shipped), "corrected", lineterm="")
                for line in diff:
                    print("    " + line)
    kubejs_log_gate.report_stale(config_allowlist)

    kubejs = kubejs_log_gate.error_lines(game / "logs" / "kubejs" / "client.log", "client.log")
    kubejs += kubejs_log_gate.error_lines(game / "logs" / "kubejs" / "startup.log", "client startup.log")
    if kubejs_log_gate.gate(kubejs, allowlist, "KubeJS errors on the client") > 0:
        problems.append("KubeJS client errors")

    errors = log_errors(game / "logs" / "latest.log")
    if title_log:
        errors += log_errors(title_log)
    focus = [(f"latest.log {logger}", message) for logger, message in errors if FOCUS.search(logger + " " + message)]
    if kubejs_log_gate.gate(focus, allowlist, "Renderer, menu and resource pack errors on the client") > 0:
        problems.append("renderer, menu or resource pack errors on the client")
    other = sorted({f"[{logger}] {message}" for logger, message in errors if not message.lstrip().startswith("at ")} -
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
