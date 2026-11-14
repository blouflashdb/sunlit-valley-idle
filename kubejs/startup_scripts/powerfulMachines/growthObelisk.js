console.info("[SOCIETY] growthObelisk.js loaded");

const $ObeliskRandomSource = Java.loadClass("net.minecraft.util.RandomSource");
const growthObeliskProgTime = 1000;

/** Each morning one Spark-Gro from its inventory grows the crops within 3 blocks (7x1x7) by one stage. */
global.runGrowthObelisk = (entity, forced) => {
  const { level, block } = entity;
  const { x, y, z } = block;
  level.spawnParticles("minecraft:glow", true, x + 0.5, y + 2.2, z + 0.5, 0, 0, 0, 2, 0.02);
  const morningModulo = Number(level.dayTime()) % 24000;
  if (!forced && (morningModulo < growthObeliskProgTime || morningModulo >= growthObeliskProgTime + artMachineTickRate)) return false;
  const inventory = block.getEntity().attachments.get("inventory");
  for (let i = 0; i < inventory.getSlots(); i++) {
    if (String(inventory.getStackInSlot(i).id) !== "society:spark_gro") continue;
    inventory.extractItem(i, 1, false);
    level.spawnParticles("minecraft:happy_villager", true, x + 0.5, y + 0.5, z + 0.5, 1.5, 0.1, 1.5, 20, 0.02);
    level.server.runCommandSilent(`playsound minecraft:block.amethyst_block.chime block @a ${x} ${y} ${z} 1`);
    // The 1.20.1 obelisk passed a radius of 4 to Dew Drop Farmland; FarmApi uses the same radius.
    $FarmApi.growCropsInRadius(level, block.getPos(), $ObeliskRandomSource.create(), 4);
    return true;
  }
  return false;
};

StartupEvents.registry("block", (e) => {
  e.create("society:growth_obelisk", "cardinal")
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .defaultCutout()
    .soundType("stone")
    // Placeholder models: tools/port/assets/make_machine_placeholder.py --single.
    .parentModel("society:block/kubejs/growth_obelisk/growth_obelisk")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.growth_obelisk.description").gray());
      item.tooltip(Text.translatable("tooltip.society.area", "7x1x7").green());
      item.tooltip(Text.translatable("block.society.growth_obelisk.description.fuel").lightPurple());
      item.parentModel("society:block/kubejs/growth_obelisk/growth_obelisk");
    })
    .blockEntity((blockInfo) => {
      blockInfo.inventory("inventory", [], 9, 2);
      blockInfo.rightClickOpensInventory("inventory");
      blockInfo.initialData({ owner: "-1" });
      blockInfo.serverTicking();
      blockInfo.tickFrequency(artMachineTickRate);
    });
  // The top half, placed and broken together with the obelisk (server_scripts/blockEvents/multiBlockHandlers.js).
  e.create("society:growth_obelisk_upper", "cardinal")
    .box(4, 0, 4, 12, 9, 12)
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .defaultCutout()
    .soundType("stone")
    .noDrops()
    .modelGenerator((m) => m.parent("society:block/kubejs/growth_obelisk_upper/growth_obelisk_upper"))
    .item((item) => item.parentModel("society:block/kubejs/growth_obelisk_upper/growth_obelisk_upper"));
});
// Tick: server_scripts/blockEvents/machineTicks.js
