# Idle mod roadmap: from add-on to main mod of the pack

Status: plan with the owner's decisions, nothing here is implemented. Based on the code of `mod/` and the pack at commit `2f48a0d5`.
Tracked in epic #87; every item below has its own issue.
[idle-skills.md](idle-skills.md) describes what exists today.

## Goal

The idle window is the hub of the pack, not a side window. Four tests decide whether that is true:

1. **Front door.** A new player opens the idle window in the first minute because the quest book sends them there.
2. **Closed loop.** A set-up loop runs for the full offline window (24 hours) without a click.
3. **Whole pack.** Every money loop of the pack has an idle form, and the idle storage connects to the pack's
   automation.
4. **Always a next goal.** There is something to unlock after level 12 and after the fifth action slot.

Today the mod passes none of the four completely. The findings below say why.

## Findings

Found by reading the code and the pack data. The durability numbers are calculated from the formulas, not measured
in game. The index race (F2) is not reproduced in game.

| # | Finding | Evidence | Effect |
|---|---|---|---|
| F1 | Tools break long before the offline window ends. Each completion uses 1 durability and nothing replaces a broken tool. | `IdleEngine.damageTool`, `toolProblem`. With the pack's 3x durability: fishing rod and brush 192 uses = about 32 min at level 0 (14 min for a rod at level 12); iron pickaxe 750 uses = 20 to 30 min; diamond pickaxe 80 min on stone, 8 h on ancient debris. | Mining, Fishing, Archaeology and Adventuring stop with `NO_TOOL`; the other tool skills drop to half speed. Only netherite with Unbreaking III reaches 24 h, and only on the slowest actions (about 6 h on stone). |
| F2 | Withdraw and sell address storage by list index. | `IdleActionPacket` (`WITHDRAW`, `SELL`), `IdleService.withdraw` / `sell`. Entries are removed at count 0, which shifts the indices; the client list is up to 1 s old. | A ctrl-click can sell a different entry than the one shown. |
| F3 | Selling is manual. | `IdleScreen` "Sell all" button; no rule runs on its own. | The README goal "trading becomes automatable" is not met; an AFK player earns nothing. |
| F4 | The pack's main money loop has no idle form. | 19 artisan machines in `kubejs/startup_scripts/globalArtisanMachineDefinitions.js` (kegs, casks, preserves jar, dehydrator, cheese press, ...); the mod only processes furnace recipes (`RecipeActions`). | Idle play sells raw goods. Manual play with machines stays the better way to earn, so the idle mod is not the main way to play. |
| F5 | The pack does not introduce the idle window. | The quest text mentions it only in the slime quests of chapter III (`kubejs/assets/ftbquestlocalizer/lang/en_us.json`); nothing in `welcome` or `getting_started`, no almanac category except slimes, no loading tip. | New players do not learn that key **I** exists. |
| F6 | Progress ends early. | 12 levels per skill (`SkillLevels.FALLBACK_CURVE`); the fifth slot unlocks at total level 50 of 156 (`IdleMath.SLOT_THRESHOLDS`). | No goal for the mid and late game. |
| F7 | Five of thirteen skills have no idle perks. | `kubejs/data/society/puffish_skills/categories/{mining,farming,fishing,husbandry,adventuring}` hold no `sunlitidle:` attribute; listed as open point in `idle-skills.md`. | Tree points of the pack's own skills do nothing for idle play. |
| F8 | Adventuring is detached from the pack. | `data/sunlitidle/loot_table/dungeon/tier_*.json` hold vanilla items only (bones, raw ores, diamonds, netherite scrap). | No Skull Cavern loot, geodes, relics or artifacts; five tiers and then nothing. |
| F9 | The window is hard to use at pack scale. | `IdleScreen`: flat grey fills, 5 visible action rows (Mining has 35 actions), no search or sort in storage, no rates, no status outside the window, one chat line as offline report. | The player cannot see what a slot earns or why it stopped. |
| F10 | Storage and sync do not scale. | `PlayerIdleState.store` / `countOf` / `takeMatching` scan a list; `IdleService.step` sends the whole storage every second while the window is open; catch-up runs up to 4000 completions per slot in one tick (`IdleEngine.MAX_COMPLETIONS_PER_CALL`, 900 offline seconds per second). | Tick spikes after login and large packets with big storages, mainly on servers. |
| F11 | Actions live in the jar. | `IdleCatalog` reads `/data/sunlitidle/idle/skills.json` from the classpath; `IdleAttributes.SKILLS` repeats the skill list by hand. | The pack (KubeJS, datapacks) cannot add or tune an action without a mod build. |
| F12 | Balance is unknown. | `docs/port/playthrough-checklist.md`, "Not automated": no check proves that progress takes a reasonable time. No tool computes coins or XP per hour. | Nobody knows whether idle income is trivial or dominant next to manual play. |
| F13 | Small leaks. | `IdleEngine.MOBS` keeps mob instances (and their level) in a static map; `RecipeActions` detects a reload only by instance and recipe count. | Old levels stay in memory after leaving a world; a `/reload` with the same recipe count keeps stale actions. |

## Plan

Sizes are rough: S up to a day, M a few days, L a week or more. Every item names its check, because the pack is
tested by CI and not by a playthrough.

### Phase A: Foundation (do first, small)

| Item | What | Check | Size |
|---|---|---|---|
| A1 (#88) | Address storage by item, not by index (F2): the packet carries the item with its components; the server looks the entry up. | GameTest: remove an entry, then sell with a stale request; the right entry is sold or nothing. | S |
| A2 (#93) | Storage as an insertion-ordered map keyed by item and components; `countOf` by item id from a second index (F10). | Unit test with 10 000 stores; save format test (`stateSurvivesSaving`) still passes with old saves. | S |
| A3 (#102) | Sync only what changed: slots every second, storage as deltas (F10). | GameTest counts the bytes of a sync with a 500-entry storage. | M |
| A4 (#94) | Catch-up with a time budget per tick instead of a fixed count, spread over all 20 ticks (F10). | Pack check `offline_progress` plus a new gate on the longest tick during catch-up. | S |
| A5 (#95) | Clear the static caches on server stop and on recipe reload (F13). | GameTest: reload, changed recipe is visible. | S |

### Phase B: Close the AFK loop

| Item | What | Check | Size |
|---|---|---|---|
| B1 (#89) | **Tool reserve** (F1): when a tool breaks, the slot takes the best matching tool from storage. Same for the companion's weapon and armor. New status "last tool". | GameTest: two pickaxes, the action continues after the first breaks. | S |
| B2 (#90) | **Wear targets** (F1): wear by seconds worked instead of per completion, with an interval per tool kind in the config, so the lifetime does not depend on the action speed. Targets for one tool: wood and stone at least 1 h, iron about 2 h, diamond about 8 h, netherite with Unbreaking III at least 24 h, a plain rod, brush or shears about 2 h. A tree perk "tool care" lowers wear further. | Pack check `idle_tool_wear` in the full pack (wear is only tested without the pack today); unit test on the lifetime of each reference tool; balance table (E1) lists durability per hour. | S |
| B3 (#91) | **Sell rules** (F3): per storage entry "keep N, sell the rest" and a lock (never sell). The rules run once per morning through the same `IdleSellEvent`, so the shipping bin rules stay the only price logic. | GameTest with a test price handler; pack check in the simulated year: coins arrive every morning. | M |
| B4 (#92) | **Fallback actions**: each slot holds up to three actions in order. A blocked action (no input, out of season, no tool) gives way to the next. | GameTest: Farming out of season falls back to Foraging and returns in season. | M |
| B5 (#97) | **Offline report**: a screen on login with one row per slot: completions, items, XP, coins from sell rules, and why the slot stopped. Replaces the chat line. | GameTest on the report data; client-boot screenshot. | M |
| B6 (#96) | **Alerts**: a toast when a slot stops, and an optional small HUD row with the slot states. | client-boot screenshot with a stopped slot. | S |

### Phase C: Cover the pack

| Item | What | Check | Size |
|---|---|---|---|
| C1 (#100) | **Artisan skill** (F4): idle processing with the pack's artisan recipes. KubeJS hands the recipes of `global.artisanMachineDefinitions` to the mod through a register event; the mod builds actions like `RecipeActions` does. The tab has station slots: placing a crafted machine (keg, cask, ...) into a slot unlocks its recipes, so crafting stays the hands-on part. Category `sunlitidle:artisan`. | GameTest per recipe shape; pack check `idle_artisan` for one recipe of every machine. | L |
| C2 (#101) | **Idle Depot block**: exposes the owner's idle storage as an item handler. Hoppers, Create and pipes can insert inputs and extract with a filter. This connects idle play to the pack's automation in both directions. | GameTest with a hopper in and a hopper out; KubeJS test with a Create funnel. | M |
| C3 (#103) | **Idle perks for the society trees** (F7): speed and yield nodes for Mining, Farming, Fishing, Husbandry and Adventuring. The attributes exist already. | Pack check: unlocking the node changes `IdleAttributes.speed`. | S |
| C4 (#104) | **Adventuring uses pack loot** (F8): the pack overrides the dungeon loot tables (KubeJS data) and rolls Skull Cavern loot, geodes, relics and artifacts. The mod keeps its vanilla tables as the default. | Pack checks `adventuring_t1` to `t5` assert at least one pack item per tier. | M |
| C5 (#98) | **Stats for quests**: vanilla custom stats (`sunlitidle:actions_completed`, per skill, kills per tier, coins sold). FTB Quests already has a stat task (45 quests of the pack use it), so no custom task type is needed. | KubeJS test: a quest with a stat task completes. | S |
| C6 (#109) | **Recipe viewer page**: "Idle source" for every action output: skill, level, tool tier, inputs. | client-boot: the category is registered without errors. | M |
| C7 (#115) | **Actions as data** (F11): actions load from datapacks (`data/<namespace>/sunlitidle/actions/`) and sync to the client; the skill list stays in the jar because attributes register at start. `mod/tools/gen_idle_skills.py` then writes datapack files. | GameTest loads an action from a test datapack; pack check `catalogLoadsAllSkills` on the full pack. | L |

### Phase D: Front door

| Item | What | Check | Size |
|---|---|---|---|
| D1 (#105) | **Quest chapter "Idle skills"** right after `welcome` (F5): open the window, run the first action, craft a tool, unlock slot 2, set a sell rule, send the companion to T1. Uses the stats of C5. Plus an almanac category and loading tips. | `check_quest_refs.py`, `check_tips.py`, `questsTest.js`. | M |
| D2 (#106) | **Window redesign** (F9): textures in the pack's style; an overview tab with all slots, rates per hour and alerts; a longer action list with locked actions as preview; storage search, sort and filter. | client-boot screenshots of each tab; a scripted click run (assign, withdraw, sell) closes the "no check clicks through screens" gap of the playthrough checklist. | L |
| D3 (#107) | **Entry points**: a button in the inventory screen next to the key, and controller support (the pack ships Controllable). | client-boot screenshot of the inventory. | S |
| D4 (#108) | A test that keeps `de_de.json` in step with `en_us.json`. The German file is complete today (370 keys in both); most items of this plan add keys. | The unit test itself: same keys and same placeholders in both files. | S |

### Phase E: Depth and balance

| Item | What | Check | Size |
|---|---|---|---|
| E1 (#99) | **Balance table** (F12): a command of the CI harness (`dev.sunlitidle.ci`) runs every action for one simulated hour in the full pack and prices the result through `IdleSellEvent`, so loot tables and prices are the real ones. It writes XP, items and coins per hour, durability and food per hour. CI prints the table in the job summary and gates on bounds (for example: no action earns far more than the best one of the level below). | The `server-boot` job itself. | M |
| E2 (#110) | **Action mastery** (F6): every action counts its completions; mastery levels give yield, less input use and less wear for that action. | Unit test on the curve; GameTest on save and load. | M |
| E3 (#111) | **Upgrades for coins** (F6): the pack's shops sell idle upgrades: a sixth slot, a longer offline window, more station slots, more food slots. This is the coin sink that closes the loop idle, coins, upgrade, idle. | KubeJS test: buying the item raises the cap. | M |
| E4 (#112) | **Endless depths** (F6, F8): after T5 a depth counter with scaling enemies and loot, so gear always has a next target. The companion moves down and up on its own. Tiers move from the enum to data as far as this needs it. | `CombatTest` on the scaling; GameTest on depth progress. | M |
| E5 (#113) | **Mastery link**: levels of `society:mastery` give a small global idle bonus. | Pack check. | S |
| E6 (#114) | **Collection log**: first-time items per skill, shown in the window and used by the `perfection` chapter. | GameTest. | M |

## Order

1. A1 now, as a bug fix on its own.
2. Phase B with A2, A4, A5 and D4. After this the mod keeps its own promise (goal 2).
3. C5 and D1. Cheap, and they make the mod visible (goal 1).
4. E1, before any tuning of numbers.
5. C1 and C2. The largest step towards goal 3.
6. A3, then D2, D3 and C6. The new window needs the delta sync.
7. C3, C4, then E2 to E6 for goal 4.
8. C7 last. Nothing above depends on it; C1 follows the `RecipeActions` pattern.

## Decisions

Decided by the owner on 2026-11-15.

| # | Question | Decision |
|---|---|---|
| Q1 | May artisan machines run idle? The README says "Crafting stays hands-on". | Yes. With station slots (C1), so the machine is still crafted by hand. |
| Q2 | Is tool wear a wanted crafting sink? | Yes, wear stays. But a running loop must not need a manual action every 20 to 30 minutes: the tool reserve (B1) plus longer, predictable lifetimes (B2). |
| Q3 | Should sell rules pay at once or in the morning? | In the morning, like the shipping bin (B3). The manual "Sell all" stays instant. |
| Q4 | Should the mod be split into an idle mod and a pack glue mod (farm, slimes, Jade, CI harness)? | Not now. One jar, with the packages kept apart. |

## Not in this plan

- Idle forms of Create, Botania and town life (NPC gifts, dialog). The Idle Depot (C2) connects to them instead.
- New art beyond the window (D2).
- A port to other Minecraft versions.
