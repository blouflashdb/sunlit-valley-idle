# Client and performance on 1.21.1 (Slice 14, #19)

This page lists what changed on the client side of the 1.21.1 port and what still needs a test in a real
client. CI cannot start a client (Sodium and Iris need OpenGL), so everything here that is about rendering is
checked only by `tools/port/check_resourcepacks.py`.

## Rendering mods

| 1.20.1 | 1.21.1 | Config |
| --- | --- | --- |
| Embeddium | Sodium 0.8 + Reese's Sodium Options | `config/sodium-options.json` (same values as the old `embeddium-options.json`) |
| Oculus | Iris 1.8 | `config/iris.properties` (shaders off by default, as before) |
| Colorwheel + Colorwheel Patcher | same, 1.21.1 builds | `config/colorwheel-client.toml` unchanged |

The Embeddium and Oculus config files are removed; the check fails if they come back.

### Shader pack: Complementary Reimagined r5.6.1

The lock resolver picked Complementary Reimagined r5.9.3. Colorwheel Patcher 1.0.5 (the newest build for
1.21.1) only has patches for Complementary 5.6 and 5.6.1. Without a patch, Create contraptions and other
Flywheel visuals render wrong when shaders are on. So the lock keeps r5.6.1, the same file as on 1.20.1.

On the first start, Colorwheel Patcher writes a patched copy named
`ComplementaryReimagined_r5.6.1 + Clrwl_<Colorwheel Patcher version>.zip` into `shaderpacks/`. A local client
run confirmed `ComplementaryReimagined_r5.6.1 + Clrwl_1.0.5.zip` for Colorwheel Patcher 1.0.5, and
`config/iris.properties` selects that name. The check derives the expected name from the patcher file in the
lock, so a patcher update without a matching `shaderPack` fails CI.

`tools/port/port_lock.py` would pick the newest shader again. The check reads the patch list from the
Colorwheel Patcher jar in the lock and fails if it cannot patch the locked shader, so a re-resolved lock
cannot slip through.

## Resource packs

- `resourcepacks/sunlit_overrides.zip`: pack format 15 -> 34 (1.21.1). The files did not change; the texture
  paths it overrides are the same on 1.21.1.
- `config/resourcepackoverrides.json` (Resource Pack Overrides enables and orders the packs) and
  `configureddefaults/options.txt` now use the 1.21.1 file names from the lock:
  - `glow_up-1.5-1.20.1.zip` -> `glow_up-1.0-1.21.zip`
  - `MobCrates_1.20.1_v1.zip` -> `MobCrates_1.21_v1.zip`
  - `Stardew_plaques v1.0.zip` -> `stardew_plaques-2.0.zip`
  - `CreateSophisticatedBackpacks.zip` -> `CreateSophBackpacks.zip`
  - `Create Style for Refined Storage.zip` -> `Create_Style_for_Refined_Storage.zip`
  - removed: `Create Simple Storage 2.1.zip` and `Better tom's create storage 1.1.zip` (not in the lock on
    `main` either, so they never shipped).
- `options.txt` has the 1.21.1 data version (3955).

The check also reports how much of each pack overrides a file that exists in the vanilla 1.21.1 client, a
pack mod or `kubejs/assets` (table in the CI job summary). Low numbers are expected for packs that add new
files: CEM models (`longwing_nuker`, the villager models in `sunlit_overrides`), JourneyMap icons, emissive
textures (`glow_up`), Jade themes and Every Compat textures (`DerpWood`). Packs whose files mostly target a
mod (Lopy's Create Pipez, Mob Crates, Better Cats) match 100%. Create Style for Refined Storage matches about
two thirds of the Refined Storage 2 textures; the rest are for RS 1.x and addons that are not in the pack.

## Client mod versions (dependency fixes)

The first headless client boot (#67) crashed in mod loading. `tools/port/check_mod_deps.py` now reads the
`neoforge.mods.toml` of every mod in the lock (with jar-in-jar mods) and fails CI on what NeoForge would
reject. It found these problems, which the lock now avoids:

- WaterMedia: the resolver picked WaterMedia 3.0.0. FancyMenu 3.9.14 needs WaterMedia 3.0.0.22 or newer, but
  WaterFrames 2.1.23 and WATERVision need WaterMedia 2.1.x. WaterFrames is in the shop catalog (TVs,
  projectors), and WaterFrames 3 is only an alpha. So the pack uses the same line as on 1.20.1:
  - WaterMedia 2.1.37 (it bundles its binaries, so `watermedia-binaries` is removed),
  - FancyMenu 3.9.1 (the newest build without a WaterMedia 3 dependency; 1.20.1 had 3.7.0),
  - Drippy Loading Screen 3.1.2 (3.1.5 needs FancyMenu 3.9.9 or newer).
  The layouts only use elements that FancyMenu 3.9.1 and Drippy 3.1.2 have.
- Sodium Options API 1.0.10 requires Reese's Sodium Options, and Reese's 2.2.4 (for Sodium 0.8) declares
  itself incompatible with Sodium Options API. Sodium Options API was made for Sodium 0.6, and no mod requires it
  in its `neoforge.mods.toml` (Sodium Dynamic Lights lists it on CurseForge only and has no code that uses
  it), so it is removed. Reese's stays.

`port_lock.py` would pick the newest files again; `check_mod_deps.py` then fails, so a re-resolved lock
needs the same pins.

## Loading screen and title screen (FancyMenu, Drippy)

The layouts in `config/fancymenu` and `config/drippyloadingscreen` load on FancyMenu 3.9.1 and Drippy 3.1.2
for 1.21.1. The mods button identifier `forge_titlescreen_mods_button` is still the same on NeoForge.

**Language and accessibility buttons.** FancyMenu finds these two title screen buttons by the message keys
they had on 1.20.1 (`narrator.button.language`, `narrator.button.accessibility`). On 1.21.1 they carry
`options.language` and `options.accessibility`, so FancyMenu (3.9.1, and also 3.9.14) never matches
`mc_titlescreen_language_button` and `mc_titlescreen_accessibility_button`. The layouts could not move them, and
both icons stayed at their vanilla place on top of the moved Singleplayer and Options buttons.
`TitleScreenButtonIds` in the sunlitidle mod gives the two buttons the old keys right after the title screen
creates them, before FancyMenu reads the widgets. The keys translate to the same text, so only FancyMenu sees
a difference, and the layouts place the buttons next to Quit and Mods again, as on 1.20.1.

**Other title screen icons.** Two more 20x20 icon buttons sat on the menu buttons: the Supplementaries config
button (a gear, over Singleplayer/Multiplayer) and the Create config button (goggles). Supplementaries renamed
its option to `configs_button` on 1.21.1, so the old `config_button = false` no longer switched it off; the
file now uses the new key. The 1.20.1 layout hid the Create button through a position-based identifier, which
matches nothing on 1.21.1; `mainMenuConfigButtonRow = 0` in `config/create-client.toml` turns it off instead.
With `-Dsunlitidle.ci=true` (client-boot job) the sunlitidle mod logs every title screen widget with its class,
message key and bounds, which shows the mod behind such a button.

**Removed layout entries.** The Forge-only deep elements `title_screen_forge_copyright` and
`title_screen_forge_top` and the numeric (position-based) widget identifiers from 1.20.1 (`376322` on the
title screens, `374300`, `398348` and `40` on the pause screen) matched nothing on 1.21.1 and are removed.

`tools/port/check_fancymenu_layouts.py` (build job) fails when a layout targets a widget identifier or deep
element that FancyMenu/Drippy do not have, a numeric identifier, or an identifier whose message key no 1.21.1
widget carries. The client-boot job saves the title screen at two more window sizes (GUI scale 3 and 2) as
`title-screen-1280x720.png` and `title-screen-854x480.png`.

## configureddefaults

- JourneyMap 6 reads its config from `journeymap/config/6.0`; the folder was `5.10`.
- `options.txt`: see resource packs above.
- `config/crash_assistant/modlist.json` (the 1.20.1 mod list) is removed. Crash Assistant writes it again on
  the next start by a player in `modpack_creators` (`config/crash_assistant/config.toml`).

## Performance mods

ModernFix 5.27, FerriteCore 7.0, Lithium 0.15 (server and client) and ImmediatelyFast (client) are in the
lock. Config changes:

- `config/modernfix-mixins.properties`: `mixin.perf.remove_spawn_chunks` is removed; ModernFix for 1.21
  does not have it (1.21 has the `spawnChunkRadius` game rule instead). `dynamic_resources` and
  `faster_item_rendering` stay on; both exist in the 1.21.1 build.
- `config/ferritecore-mixin.toml` and `config/lithium.properties` keep their values; all keys still exist.

The server-boot job measures the last boot (`tools/port/server_boot_test.py`): time to "Done", the
server's own load time, idle TPS after a one-minute warm-up and the memory of the server process. The
numbers are in the job summary and in `build/server/perf.json` in the `server-logs` artifact.

## Test in a real client

1. Import the CurseForge export and start the game. The Drippy loading screen and the FancyMenu title
   screen show; no missing textures in the title screen panoramas.
2. Options -> Resource Packs: `sunlit_overrides.zip` is on top and required; no pack is red.
3. Press `O`: the patched Complementary pack is selected. Turn shaders on and look at a moving Create
   contraption.
4. Open Video Settings: the Sodium pages open (Reese's Sodium Options screen).
5. JourneyMap minimap shows with the pack's settings (position, size).
6. Note the client start time (ModernFix prints "Game took X seconds to start") and FPS at the farm.
