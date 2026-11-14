# Changelog

## 5.0.0

Port of the pack from Minecraft 1.20.1 Forge to **Minecraft 1.21.1 NeoForge** (NeoForge 21.1.265, epic #5).

**Worlds from 4.x (1.20.1) are not compatible with 5.0.0. Start a new world.**

### Mods
- Replaced: Oculus -> Iris, Embeddium -> Sodium, Botania -> Botania Revived, Steam 'n' Rails -> unofficial 1.21.1 port, Item Filters -> FTB Filter System, Construction Wand -> Building Gadgets, Fantasy's Furniture / Decorative Blocks -> other furniture and deco mods.
- Rebuilt in KubeJS or in the `sunlitidle` mod: Splendid Slimes (Slime Ranching idle skill), Vintage Delight (keeps the `vintagedelight:*` ids), Dew Drop / Sturdy Farmland, Botania Seeds, Croptania and the Society Tweaks content.
- Dropped: NetherVinery, Dracovita Farm Life, More Minecarts, Species, Legendary Creatures, Domestication Innovation, Create Utilities, Extractinator, Verdant Vibes, Little Tractor, Splendid Cogs, Hamsters, Balloon Box, Creeper Confetti, Rainbow Oaks, Radiant Gear, Max Enchant X, Quests Additions, RS Addons, Automobility (car key removed), Mighty Mail (the mailboxes stay as Refurbished Furniture mailboxes), Sodium Options API.
- Removed because 1.21.1 does not need them: Trials Chambers Reuploaded, Better Advanced Tooltips Backport, XXL Packets and other 1.20.1 fix mods.
- Pinned versions: WaterMedia 2.1.x with FancyMenu 3.9.1 and Drippy 3.1.2 (WaterFrames needs WaterMedia 2), Complementary Reimagined r5.6.1 (Colorwheel Patcher for Create).

### Gameplay changes
- Pig racing shows the race as boss bars and titles, and has a `/pigrace` command.
- The Statue of Endless Fortune pays out once per day on right-click.
- The Pickling Can makes the pickles (no Vintage Delight fermenting recipes).
- Kept from 1.20.1: the Skull Cavern mineshaft layout and the 1 in 500 Brine and Punishment drop from cucumbers.
- Key binding defaults use the 1.21.1 names; bindings of removed mods are gone.

### Placeholder art
Society Tweaks art is not licensed for reuse, so these are simple placeholders until real art exists:
- NPC portraits in dialogs and shops,
- quest book chapter shapes (picture images in the quest book are removed),
- wallpapers, gnomes, the Statue of Endless Fortune and some new blocks.

### Testing
CI builds the mod, runs game tests, checks mod dependencies, resource packs, quest references and portraits, boots a dedicated server (including a simulated in-game year) and a client with the whole pack, and fails on any KubeJS error. There was no manual playthrough.
