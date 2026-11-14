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
`ComplementaryReimagined_r5.6.1 + Clrwl_<Colorwheel version>.zip` into `shaderpacks/`.
`config/iris.properties` selects `ComplementaryReimagined_r5.6.1 + Clrwl_1.3.2.zip`. If the name in a real
client is different, change `shaderPack` to the name the patcher wrote.

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
for 1.21.1 without changes. Two deep elements in the title screen layouts, `title_screen_forge_copyright` and
`title_screen_forge_top`, exist only on Forge; FancyMenu skips them on NeoForge. The mods button identifier
`forge_titlescreen_mods_button` is still the same on NeoForge.

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
3. Press `O`, pick the patched Complementary pack. Check `shaderpacks/` for the file name the patcher wrote;
   fix `config/iris.properties` if it differs. Look at a moving Create contraption with shaders on.
4. Open Video Settings: the Sodium pages open (Reese's Sodium Options screen).
5. JourneyMap minimap shows with the pack's settings (position, size).
6. Note the client start time (ModernFix prints "Game took X seconds to start") and FPS at the farm.
