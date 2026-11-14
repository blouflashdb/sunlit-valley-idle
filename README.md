# Sunlit Valley Idle

A custom fork of the [Society: Sunlit Valley](https://modrinth.com/modpack/society-sunlit-valley) modpack ([source](https://github.com/Chakyl/society-sunlit-valley)) with many more idle and autobattler mechanics.

## Goal

All progression should be possible while AFK. Farming, animal husbandry, processing, trading and combat should become automatable step by step, so the game keeps moving forward without constant input.

## Focus

- **Idle mechanics:** Automated production that keeps running without the player.
- **Autobattler:** In the Adventuring tab of the idle skills window, a companion fights through dungeon tiers on its own. The player supplies gear and food; the companion consumes them and produces loot.
- **Idle skills:** A window that opens with **I** from the first second. Thirteen skills (Woodcutting, Mining, Digging, Foraging, Farming, Fishing, Hunting, Husbandry, Archaeology, Adventuring, Smelting, Cooking, Slime Ranching) run idle actions that roll the pack's real loot, level the same skill trees as manual play, and keep going while offline (up to 24 hours). The Adventuring tab holds a companion that clears dungeon tiers T1 to T5, Smelting and Cooking process the pack's furnace recipes, and storage sells at shipping bin prices. See [docs/idle-skills.md](docs/idle-skills.md).
- **AFK progression:** Every progression step should be reachable without constant clicking. Crafting stays hands-on.

## Repository layout

- Everything at the top level (`config/`, `kubejs/`, `pakku.json`, ...) is the upstream pack, managed with [Pakku](https://github.com/juraj-hrivnak/Pakku).
- `mod/` is our own NeoForge mod (`sunlitidle`) for mechanics that no existing mod provides.

## Base pack

- Version 5.0.0: Minecraft 1.21.1, NeoForge 21.1.265
- Rendering: Iris + Sodium (replace Oculus + Embeddium of the 1.20.1 pack). Shaders are off by default.
- Forked from Society: Sunlit Valley 4.1.5A (upstream commit `f00b847`). The full upstream history is kept, so upstream updates can be merged with `git merge upstream/master`.

> **World compatibility:** Worlds from the 1.20.1 version (4.x) are **not** compatible with 5.0.0. Start a new world. Do not open an old world with 5.0.0.

See [CHANGELOG.md](CHANGELOG.md) for the changes of the 1.21.1 port.

## Building the mod

The mod needs Java 21.

```sh
cd mod
./gradlew build
```

The jar ends up in `mod/build/libs/`. CI builds it on every push, runs the game tests, exports the CurseForge pack and boots a dedicated server and a client with the whole pack.

## Credits and license

Society: Sunlit Valley is made by Chakyl and contributors and is licensed under GPL-3.0. This fork keeps that license (see `LICENSE`). It is an independent fork and not affiliated with or endorsed by the upstream project.

## Status

The 1.21.1 port (5.0.0) is released. It is tested by automated server and client tests in CI, not by a manual playthrough. Expect bugs; please report them as issues.
