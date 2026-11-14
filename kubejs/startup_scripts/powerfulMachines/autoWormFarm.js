console.info("[SOCIETY] autoWormFarm.js loaded");

/** Adds one worm to its inventory every minute. */
global.runAutoWormFarm = (entity) => {
  const { level, block } = entity;
  const inventory = block.getEntity().attachments.get("inventory");
  if (!global.insertIntoHandler(inventory, Item.of("aquaculture:worm"), false).isEmpty()) return;
  level.server.runCommandSilent(`playsound minecraft:block.composter.fill block @a ${block.x} ${block.y} ${block.z}`);
  level.spawnParticles("minecraft:composter", true, block.x + 0.5, block.y + 1, block.z + 0.5, 0.3, 0.2, 0.3, 5, 0.01);
};

StartupEvents.registry("block", (event) => {
  event
    .create("society:auto_worm_farm")
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .defaultCutout()
    // Placeholder model: tools/port/assets/make_machine_placeholder.py --single.
    .parentModel("society:block/kubejs/auto_worm_farm/auto_worm_farm")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.auto_worm_farm.description").gray());
      item.tooltip(Text.translatable("society.working_block_entity.can_use_hopper").green());
      item.parentModel("society:block/kubejs/auto_worm_farm/auto_worm_farm");
    })
    .blockEntity((blockInfo) => {
      blockInfo.inventory("inventory", [], 9, 1);
      blockInfo.rightClickOpensInventory("inventory");
      blockInfo.serverTicking();
      blockInfo.tickFrequency(1200);
    });
});
// Tick: server_scripts/blockEvents/machineTicks.js
