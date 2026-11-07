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
| Woodcutting | `sunlitidle:woodcutting` (new) | Axe, optional (half speed without) | Logs of every tree in the pack, plus leaf drops (saplings, sticks, apples) |
| Mining | `society:mining` | Pickaxe, required | Stone, earth, all ores, geode nodes, nether ores, Skull Cavern ores, iridium, ancient debris |
| Foraging | `sunlitidle:foraging` (new) | none | Seeds, flowers, berries, mushrooms, cane, bamboo, nether fungi and wart |
| Farming | `society:farming` | Hoe, optional | Crops at full growth; uses one seed per harvest from storage, seeds come back from the loot |
| Fishing | `society:fishing` | Fishing rod, required | The real fishing loot table at the player's position, with more luck at higher actions |
| Husbandry | `society:husbandry` | Shears, optional | Eggs, feathers, wool, milk, leather, rabbit drops, honey; uses feed from storage |
| Adventuring | `society:adventuring` | Weapon and armor | *Next step:* the Adventurer Camp companion moves into this window |

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
to take as much as fits. Shift-clicking a stack in the inventory moves tools into the matching tool slot
and everything else into storage, which is how seeds, feed and bottles get to Farming and Husbandry.

## Offline and AFK

- Online: actions tick every second, also while the window is closed.
- Offline: on login the time since the last save is caught up, up to 24 hours (config
  `idle.maxOfflineHours`). The player gets a short summary in chat.
- Fishing rolls the loot at the player's position, so idling next to an ocean gives ocean fish.

## Adventurer Camp

The camp block stays for now. The next step moves the companion into the Adventuring tab of this window
(gear and food slots, dungeon tiers T1 to T5, same combat math), and the camp block becomes an optional
extra companion or is retired.

## Open points for later

- Adventuring tab (companion, dungeon tiers T4 and T5).
- Serene Seasons: farming currently ignores the season.
- Selling from storage to the shipping bin price list.
- More crops and animal products from the pack's food mods (data driven, `data/sunlitidle/idle/skills.json`).
