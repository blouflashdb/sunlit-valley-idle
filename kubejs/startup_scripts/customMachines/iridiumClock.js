console.info("[SOCIETY] iridiumClock.js loaded");

/**
 * Each morning the Iridium Clock adds one to its counter (at most 1728) and puts that many spinel into its
 * own inventory. Each Golden Clock around it gives a 1% chance that the spinel is pristine.
 */
global.runIridiumClock = (entity, forced) => {
  const { level, block } = entity;
  const iridiumClockProgTime = 20;
  const morningModulo = Number(level.dayTime()) % 24000;
  if (!forced && (morningModulo < iridiumClockProgTime || morningModulo >= iridiumClockProgTime + artMachineTickRate)) return;
  let surroundingClocks = 0;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (String(level.getBlock(block.x + dx, block.y + dy, block.z + dz).id) === "society:golden_clock") surroundingClocks++;
      }
    }
  }
  let triggerTimes = Math.min(1728, global.getMachineInt(block, "triggerTimes") + 1);
  global.setMachineData(block, { triggerTimes: triggerTimes });
  const spinelType = Math.random() < 0.01 * surroundingClocks ? "society:pristine_spinel" : "society:spinel";
  const inventory = block.getEntity().attachments.get("inventory");
  for (let left = triggerTimes; left > 0; left -= 64) {
    global.insertIntoHandler(inventory, Item.of(spinelType, Math.min(64, left)), false);
  }
  level.server.runCommandSilent(`playsound tanukidecor:block.clock_tower.chime block @a ${block.x} ${block.y} ${block.z}`);
};

StartupEvents.registry("block", (event) => {
  event
    .create("society:iridium_clock", "cardinal")
    .soundType("copper")
    .box(1, 0, 1, 15, 16, 15)
    .defaultCutout()
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    // Placeholder model: tools/port/assets/make_machine_placeholder.py --single.
    .modelGenerator((m) => m.parent("society:block/kubejs/iridium_clock/iridium_clock"))
    .item((item) => {
      item.tooltip(Text.translatable("block.society.iridium_clock.description").gray());
      item.tooltip(Text.translatable("block.society.iridium_clock.area").green());
      item.parentModel("society:block/kubejs/iridium_clock/iridium_clock");
    })
    .blockEntity((blockInfo) => {
      blockInfo.inventory("inventory", [], 9, 3);
      blockInfo.rightClickOpensInventory("inventory");
      blockInfo.initialData({ triggerTimes: 0 });
      blockInfo.serverTicking();
      blockInfo.tickFrequency(artMachineTickRate);
    });
});
// Tick: server_scripts/blockEvents/machineTicks.js
