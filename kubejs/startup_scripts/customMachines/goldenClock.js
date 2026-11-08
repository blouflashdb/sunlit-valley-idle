console.info("[SOCIETY] goldenClock.js loaded");

// [recipe map name on global, stage count, halve time when upgraded] of the machines a Golden Clock speeds up.
// The recipe maps are looked up when the clock chimes, so this table does not depend on script order.
global.goldenClockMachines = {
  "society:loom": ["loomRecipes", 1, false],
  "society:mayonnaise_machine": ["mayonnaiseMachineRecipes", 1, false],
  "society:cheese_press": ["cheesePressRecipes", 2, false],
  "society:preserves_jar": ["preservesJarRecipes", 3, false],
  "society:wine_keg": ["wineKegRecipes", 6, false],
  "society:crystalarium": ["crystalariumCrystals", 5, false],
  "society:aging_cask": ["agingCaskRecipes", 10, true],
  "society:ancient_cask": ["ancientCaskRecipes", 20, false],
  "society:dehydrator": ["dehydratorRecipes", 1, false],
  "society:deluxe_worm_farm": [null, 1, false],
  "society:seed_maker": ["seedMakerRecipes", 1, false],
  "society:fish_smoker": ["fishSmokerRecipes", 2, false],
  "society:bait_maker": ["baitMakerRecipes", 1, false],
  "society:recycling_machine": ["recyclingMachineRecipes", 1, false],
  "society:oil_maker": ["oilMakerRecipes", 1, false],
  "society:tapper": ["tapperRecipes", 7, false],
  "society:mushroom_log": ["mushroomLogRecipes", 4, false],
  "society:charging_rod": [null, 5, false],
  "society:espresso_machine": [null, 1, false],
};

/** Advances one machine by a stage, as if a morning had passed. */
global.handleProgress = (level, block) => {
  const id = String(block.id);
  const machine = global.goldenClockMachines[id];
  if (!machine) return;
  if (id === "society:tapper" && global.isBlockPropertyTrue(block, "error")) return;
  const recipes = machine[0] ? global[machine[0]] : null;
  global.handleBETick({ level: level, block: block }, recipes, machine[1], machine[2], true);
};

/** Each morning (an hour after the machines' own tick) advances every machine within 2 blocks once more. */
global.runGoldenClock = (entity, forced) => {
  const { level, block } = entity;
  const radius = 2;
  const goldenClockProgTime = 1000;
  const morningModulo = Number(level.dayTime()) % 24000;
  if (!forced && (morningModulo < goldenClockProgTime || morningModulo >= goldenClockProgTime + artMachineTickRate)) return;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        global.handleProgress(level, level.getBlock(block.x + dx, block.y + dy, block.z + dz));
      }
    }
  }
  level.server.runCommandSilent(`playsound tanukidecor:block.grandfather_clock.chime block @a ${block.x} ${block.y} ${block.z}`);
};

StartupEvents.registry("block", (event) => {
  event
    .create("society:golden_clock", "cardinal")
    .soundType("copper")
    .box(1, 0, 1, 15, 16, 15)
    .defaultCutout()
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    // Placeholder model: tools/port/assets/make_machine_placeholder.py --single.
    .modelGenerator((m) => m.parent("society:block/kubejs/golden_clock/golden_clock"))
    .item((item) => {
      item.tooltip(Text.translatable("block.society.golden_clock.description").gray());
      item.tooltip(Text.translatable("tooltip.society.area", "5x5x5").green());
      item.parentModel("society:block/kubejs/golden_clock/golden_clock");
    })
    .blockEntity((blockInfo) => {
      blockInfo.serverTicking();
      blockInfo.tickFrequency(artMachineTickRate);
    });
});
// Tick: server_scripts/blockEvents/machineTicks.js
