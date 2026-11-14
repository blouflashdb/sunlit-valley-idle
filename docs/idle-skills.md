# Idle skills

An always-available window (default key **I**) where the player assigns idle actions to skills. Each action
runs on its own, gives skill XP and puts its output into a personal idle storage. The whole pack can be
progressed this way; the only hands-on part left is crafting. Doing things by hand still works and levels
the same skills.

## Principles

- **One level per skill, shared by idle and manual play.** Skill levels and skill trees are the pack's
  Pufferfish's Skills categories. Idle actions add XP to the same category that manual play feeds, so
  chopping a tree by hand and idle woodcutting both level Woodcutting, and both unlock tree points.
- **Real loot, not invented loot.** Most actions roll the actual block or fishing loot table with the
  player's tool, so Fortune, Silk Touch, pack loot changes (geodes from ores, seasonal fish, quality food)
  and progression stages all apply.
- **Crafting is the only non-idle part.** Better tools are crafted by hand and placed into the skill's tool
  slot. Tools gate tiers (an iron pickaxe for diamonds), make actions faster and wear out.
- **Available from second one.** No block to craft, no unlock. A new world can start foraging right away.

## Skills

| Skill | Skill tree | Tool slot | What it produces |
|---|---|---|---|
| Woodcutting | `sunlitidle:woodcutting` | Axe, optional (half speed without) | Logs of every tree in the pack, plus leaf drops (saplings, sticks, apples) |
| Mining | `society:mining` | Pickaxe, required | Stone types, sandstone, terracotta, all ores, geode nodes, nether and end stone, amethyst, obsidian, prismarine, iridium, ancient debris |
| Digging | `sunlitidle:digging` | Shovel, optional | Dirt, sand, red sand, gravel, clay, mud, snow, podzol, mycelium, soul sand and soil, beach and badlands finds |
| Foraging | `sunlitidle:foraging` | none | Seeds, flowers, ferns, saplings, berries, wild vegetables and herbs, mushrooms, cane, bamboo, nether fungi and wart |
| Farming | `society:farming` | Hoe, optional | Every crop of the pack at full growth (vanilla, society, Farmer's Delight and other food mods); uses one seed per harvest; follows Serene Seasons |
| Fishing | `society:fishing` | Fishing rod, required | The real fishing loot table at the player's position |
| Hunting | `sunlitidle:hunting` | Weapon, optional | Real mob loot tables (zombies to shulkers), Looting applies; piglin bartering uses gold from storage |
| Husbandry | `society:husbandry` | Shears, optional | Eggs, feathers, wool, milk (society milk types), leather, truffles, honey; uses feed from storage |
| Archaeology | `sunlitidle:archaeology` | Brush, required | The archaeology loot tables of desert wells, pyramids, trail ruins and ocean ruins |
| Adventuring | `society:adventuring` | Weapon, required; armor and food slots | Companion fights through dungeon tiers T1 to T5 and rolls the dungeon loot tables |
| Smelting | `sunlitidle:smelting` | none | Every furnace and blast furnace recipe of the pack, using inputs from storage |
| Cooking | `sunlitidle:cooking` | none | Every smoker and campfire recipe of the pack, using inputs from storage |
| Slime Ranching | `sunlitidle:slime_ranching` | none | Plorts of the 24 slime breeds that replace Splendid Slimes; each breed eats one food from storage, its favorite food gives two plorts |

Smelting and Cooking actions are built from the loaded recipes, so modded recipes work without data
changes. Level: `floor(recipe xp * 8)`, for cooked food `nutrition / 2`, capped at 12. Time: 40% of the furnace
time. Manual smelting gives XP to the same skills.

Slime Ranching (added on 1.21.1, #13) unlocks two breeds per level in order of plort price, from Slimy and Dusty
at level 0 to Gold at level 12 (`mod/tools/slime_breeds.py`). Each breed has two actions: its food (one plort)
and its favorite food (two plorts, 1.5x XP). Time is `12 + 2 * level` seconds. The plorts and Slime Hearts are
items of the mod (`splendid_slimes:plort_<breed>`, `splendid_slimes:slime_heart_<breed>`); the Plort Ripper and
Plort Press are KubeJS machines (`kubejs/startup_scripts/slimes/plortMachines.js`). There are no slime
entities, corrals, vacs or heart fusions.

## Adventuring

The Adventuring tab shows four armor slots and four food slots; the weapon is the tab's tool slot. The fight
math lives in `dev.sunlitidle.combat`: the companion's damage, speed, armor and health come from the gear plus the
Adventuring level (+0.5 damage, +3% speed, +0.5 armor and +2 health per level). Each kill eats food (food
slots refill from storage with the same item), wears the weapon and armor and rolls the tier's loot table.
A lost fight sends the companion to rest. The tooltip of a tier shows power, kill time, food per kill and
whether the companion wins.

| Tier | Level | Enemy HP / damage | Reference gear |
|---|---|---|---|
| T1 Overgrown Burrow | 0 | 10 / 2 | Wood and leather |
| T2 Frozen Hollow | 3 | 25 / 4 | Iron |
| T3 Magma Depths | 6 | 60 / 7 | Diamond |
| T4 Skull Cavern Ruins | 9 | 140 / 11 | Enchanted diamond |
| T5 Ember Forge | 12 | 300 / 16 | Enchanted netherite |

## Levels and XP

Levels are the category levels (0 to 12 for the society categories, same curve for the new ones:
250, 500, 1000, 2000, 5000, 6000, 8000, 10000, 13000, 16000, 20000, 25000). XP per action rises from 1 to
about 20 with the action's level, so idle XP is in the same range as manual play: a manual ore gives 5 to 16
mining XP, the matching idle action gives 4 to 20 every few seconds. Reaching level 12 in one skill takes
roughly 10 to 15 hours of idle time, faster with tree perks and when also playing by hand.

When the player has the `mastery_unlocked` stage, idle XP also goes to `society:mastery`, like manual XP.

## Action timing and yield

```
seconds = base / (toolSpeed * (1 + 0.03 * level) * (1 + skillSpeedAttribute))
toolSpeed = 1 + 0.25 * toolTier + 0.05 * efficiency     (0.5 without a tool, for optional tools)
extraRollChance = 0.03 * level + skillYieldAttribute     (above 100% means one guaranteed extra roll)
```

Each completion uses 1 tool durability (Unbreaking applies). A broken tool stops the action.

`skillSpeedAttribute` and `skillYieldAttribute` are player attributes (`sunlitidle:<skill>_speed`,
`sunlitidle:<skill>_yield`) that skill tree perks raise. The two new trees use them; the society trees can
get idle perks later without code changes.

## Action slots

Several actions run at the same time, one per slot. Slots unlock with the total level of all idle skills:

| Total level | 0 | 5 | 15 | 30 | 50 |
|---|---|---|---|---|---|
| Slots | 1 | 2 | 3 | 4 | 5 |

## Storage

Output goes into a personal idle storage with no size limit. Click an entry to take a stack, shift-click
to take as much as fits, ctrl-click to sell it. "Sell all" sells everything except inputs of running actions,
smelting and cooking ingredients and companion food. Prices come from the shipping bin (a KubeJS script
answers the mod's `IdleSellEvent`), so pack skills and quality bonuses apply. Shift-clicking a stack in the inventory moves tools into the matching tool slot
and everything else into storage, which is how seeds, feed and bottles get to Farming and Husbandry.

## Offline and AFK

- Online: actions tick every second, also while the window is closed.
- Offline: on login the time since the last save is caught up, up to 24 hours (config
  `idle.maxOfflineHours`). The player gets a short summary in chat.
- Fishing rolls the loot at the player's position, so idling next to an ocean gives ocean fish.

## Seasons

With Serene Seasons, a seasonal crop only grows in its seasons (block tags `sereneseasons:<season>_crops`).
Out of season the slot waits. Crops without a season tag grow all year.

## Open points for later

- Idle perks for the society skill trees.
