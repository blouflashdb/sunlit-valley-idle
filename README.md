# Sunlit Valley Idle

A custom fork of the [Society: Sunlit Valley](https://modrinth.com/modpack/society-sunlit-valley) modpack ([source](https://github.com/Chakyl/society-sunlit-valley)) with many more idle and autobattler mechanics.

## Goal

All progression should be possible while AFK. Farming, animal husbandry, processing, trading and combat should become automatable step by step, so the game keeps moving forward without constant input.

## Focus

- **Idle mechanics:** Automated production that keeps running without the player.
- **Autobattler:** Virtual dungeon blocks where an upgradable companion fights on its own. The player supplies gear and food; the companion consumes them and produces loot. Several blocks can run in parallel, each on its own dungeon tier.
- **Idle skills:** A window that opens with **I** from the first second. Woodcutting, Mining, Foraging, Farming, Fishing and Husbandry run idle actions that roll the pack's real loot, level the same skill trees as manual play, and keep going while offline (up to 24 hours). See [docs/idle-skills.md](docs/idle-skills.md).
- **AFK progression:** Every progression step should be reachable without constant clicking. Crafting stays hands-on.

## Repository layout

- Everything at the top level (`config/`, `kubejs/`, `pakku.json`, ...) is the upstream pack, managed with [Pakku](https://github.com/juraj-hrivnak/Pakku).
- `mod/` is our own Forge mod (`sunlitidle`) for mechanics that no existing mod provides.

## Base pack

- Minecraft 1.20.1, Forge 47.4.0
- Forked from Society: Sunlit Valley 4.1.5A (upstream commit `f00b847`). The full upstream history is kept, so upstream updates can be merged with `git merge upstream/master`.

## Building the mod

```sh
cd mod
./gradlew build
```

The jar ends up in `mod/build/libs/`. CI builds it on every push.

## Credits and license

Society: Sunlit Valley is made by Chakyl and contributors and is licensed under GPL-3.0. This fork keeps that license (see `LICENSE`). It is an independent fork and not affiliated with or endorsed by the upstream project.

## Status

Early development.
