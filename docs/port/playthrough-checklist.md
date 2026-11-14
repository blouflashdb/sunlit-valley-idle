# 1.21.1 playthrough checklist (#19)

Nobody plays the pack by hand before the release, so CI replaces the manual playthrough of #19. This page maps
every item of the #19 checklist to the automated check that covers it, and lists what CI cannot check.
All checks run in `.github/workflows/build-mod.yml` on every push and pull request.

## Where the checks run

| Job / step | What it runs |
| --- | --- |
| `build` / *Run in-game tests* | GameTests of the `sunlitidle` mod (`mod/src/main/java/dev/sunlitidle/gametest/`), dev run without the pack |
| `build` / *Check resource packs and shader pack* | `tools/port/check_resourcepacks.py` (from #66) |
| `build` / *Check that every script is ported* | fails while `kubejs/_unported` or `config/_unported` exists |
| `build` / *Check client defaults* | `tools/port/check_client_defaults.py` (not gating yet, see below) |
| `server-boot` | `tools/port/server_boot_test.py --kubejs-tests tools/port/kubejs_tests --simulate-year`: boots a dedicated server with the whole pack twice (KubeJS tests), then a third time for one simulated in-game year with the pack checks of `dev.sunlitidle.ci` |
| `client-boot` | `tools/port/client_boot_test.py`: boots the client with the whole pack on Xvfb with Mesa llvmpipe twice: first to the title screen (screenshots `loading-*.png` of the Drippy loading screen, `title-screen.png`), then with quick play into a pack server (`in-game.png`); all in the artifact `client-logs` |

### The KubeJS error gate

`tools/port/kubejs_log_gate.py` reads the `[ERROR]` lines of `logs/kubejs/startup.log`, `server.log` (every
server boot, including the year) and `client.log` (client job). Any error fails the job and is printed in a list
(also in the job summary). Known errors of slices that are still in progress go into
`tools/port/kubejs_error_allowlist.txt` as `<owner> | <regex>`; CI prints them as "allowed (owner)" and prints
entries that no longer match anything as "stale". The list must be empty for the release.

### The simulated year

The third server boot runs with `-Dsunlitidle.ci=true`, which registers the `/sunlitidle_ci` console command
(`mod/src/main/java/dev/sunlitidle/ci/`; the pack never sets the property). The script then:

1. logs in `CiPlayer`, a real `ServerPlayer` on an in-memory connection (like the GameTest mock player), so player
   ticks, login events, Serene Seasons and the idle service see a player online. Before the first login the
   player gets a Woodcutting slot and 2 hours of offline time;
2. runs `/sunlitidle_ci check idle` (offline catch-up, every idle skill, Adventuring T1-T5, see below);
3. runs 120 days (4 seasons of 3 sub-seasons of 10 days, `config/sereneseasons/seasons.toml`): each day
   `/sunlitidle_ci nextday` sets the time to 23800 and `/tick sprint 1500` ticks across the morning, so every
   daily handler of the pack (shipping bins, artisan machines, fish ponds, the farm day, clocks ...) runs once
   per day for real. The machines that the KubeJS tests placed in boots 1 and 2 stay in the world and keep running;
4. in the middle of each season runs `/sunlitidle_ci season`: plants every crop block of the pack (up to 256, seasonal ones first) on the surface near spawn (crops need light; Serene Seasons treats high, cold places as winter) on
   wet farmland and runs one farm day, and notes which idle Farming actions are in season;
5. runs `/sunlitidle_ci check year` and the KubeJS error gate on the logs of the year.

Results are log lines `[CI-CHECK] PASS|FAIL <name>: <details>`, printed together at the end of the job.
The job summary also shows the server start time and the average TPS of the sprints (not gated).

## #19 checklist

| #19 item | Covered by | Notes |
| --- | --- | --- |
| KubeJS log: 0 errors at startup | `server-boot`: error gate on `startup.log` and `server.log` of boots 1 and 2; `client-boot`: error gate on `client.log` and the client `startup.log` | Allowlist must be empty for the release |
| KubeJS log: 0 errors after 1 in-game year | `server-boot`: error gate on the logs of the simulated year (boot 3) | 120 days with a player online, every morning ticked |
| Idle skills tick and produce loot | GameTests `IdleGameTests.*` (every skill, dev run); pack checks `idle_<skill>` (every skill's first action with a tool and inputs, full pack) | Seasonal skills that are out of season in early spring are covered by the year checks |
| Adventuring companion clears T1-T5 with gear and food | GameTests `PlaythroughGameTests.companionClearsAllTiers` (netherite gear, cooked beef: never loses, gets loot, eats) and `lockedTierWaitsForTheLevel`; pack checks `adventuring_level`, `adventuring_t1` ... `adventuring_t5` (Pufferfish's Skills level) | |
| Offline progress | GameTest `PlaythroughGameTests.offlineTimeIsCaughtUp`; pack check `offline_progress` (real login with 2 h of offline time) | |
| Shipping bin sale | KubeJS test `shippingBinTest.js` (sale and coins survive a restart); the bin then sells every simulated morning of the year under the error gate | |
| Key machines | KubeJS tests `artisanMachinesTest.js`, `moreArtisanMachinesTest.js`, `crystalariumTest.js`, `fishPondTest.js`, `manaMachinesTest.js`, `vintageMachinesTest.js`, `autoTapperTest.js`, `husbandryAutomationTest.js`, `clocksAndPrizesTest.js`, ...; all keep running through the year under the error gate | |
| Crops grow across seasons | GameTests `FarmGameTests.*` (watering, fertilizer, sprinklers); pack checks `season_<season>`, `year_all_seasons`, `crops_grow_in_<season>`, `seasonal_crops_grow` (every crop tagged for a season grows in one), `winter_is_harsher`, `idle_farming_seasons`, `year_wraps_to_spring` | |
| Quest book loads with 0 unresolved item ids | KubeJS test `questsTest.js` | |
| Client: Iris + Sodium, resource packs, FancyMenu / Drippy, JourneyMap, `configureddefaults` | `client-boot`: the client must reach the title screen, join the server and render (screenshots); errors of Iris, Sodium, FancyMenu, Drippy, JourneyMap, Colorwheel, resource and shader packs in `latest.log` fail the job; the shader pack that `config/iris.properties` selects must exist in `shaderpacks/` after the first start (Colorwheel Patcher output); every resource pack of `configureddefaults/options.txt` must still be enabled after the first start; `check_resourcepacks.py` and `check_client_defaults.py` check the files statically | Software rendering only, see below |
| Remaining scripts ported, `kubejs/_unported/` removed | `build` / *Check that every script is ported* fails if `kubejs/_unported` or `config/_unported` exists; the ported scripts load under the error gate | |
| Performance (ModernFix, FerriteCore, startup time, TPS on a farm) | `server-boot` job summary: server start time, average TPS of the year sprints (with the test machines loaded) | Reported, not gated; GitHub runners are not player hardware |
| Full playthrough: spring year 1 to endgame | The rows above together; the year simulation is the playthrough | See "Not automated" |
| `main` builds the 1.21.1 export | `build` job (runs on every push, including `main`) | |
| Merge into `main`, version bump, README note | Not automated | Release steps of the orchestrator |

## Not automated, and why

- **Visual quality.** The client runs with Mesa llvmpipe (software OpenGL 4.5) on a virtual display: CI proves
  that Iris, Sodium, FancyMenu and the resource packs load and that the world renders, and keeps a screenshot,
  but nobody compares it with the 1.20.1 look. Shaders (Complementary) are only as good as llvmpipe renders them.
- **Real input and GUIs.** No check clicks through screens (idle window, quest book GUI, shops, dialogs). The
  server-side logic behind them is covered by the GameTests, KubeJS tests and pack checks.
- **Manual progression.** The checks give gear, levels and inputs directly; they do not prove that a player can
  earn them in a reasonable time (balance).
- **Version bump, README note.** Release steps, not behaviour.
- **Client defaults.** `check_client_defaults.py` finds a problem in `configureddefaults/options.txt` today
  (line 86 merges `onboardAccessibility` with the next option, so the game drops both), so the step has
  `continue-on-error: true` until #19 fixes the file.
