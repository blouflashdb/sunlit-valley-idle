// priority: 1
// Evaporator (vintagedelight:evaporator): the pack's source of salt, since salt does not generate in the world.
// Each morning it makes two salt in its slots for every side that touches water (at most four sides).
// Hoppers can take the salt out. The tick is in server_scripts/blockEvents/machineTicks.js.
console.info("[SOCIETY] evaporator.js loaded");

const evaporatorSides = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** One evaporation. Returns the number of salt made. */
global.handleEvaporator = (level, block) => {
  const entity = block.getEntity();
  const inventory = entity && entity.attachments ? entity.attachments.get("inventory") : null;
  if (!inventory) return 0;
  let sides = evaporatorSides.filter(
    (side) => String(level.getBlock(block.x + side[0], block.y, block.z + side[1]).id) === "minecraft:water"
  ).length;
  if (sides === 0) return 0;
  let rest = global.insertIntoHandler(inventory, Item.of("vintagedelight:salt", sides * 2), false);
  return sides * 2 - rest.count;
};

StartupEvents.registry("block", (event) => {
  event
    .create("vintagedelight:evaporator")
    .soundType("stone")
    .hardness(2)
    .box(0, 0, 0, 16, 10, 16)
    .tagBlock("minecraft:mineable/pickaxe")
    .item((item) => {
      item.tooltip(Text.translatable("tooltip.society.evaporator").gray());
      item.tooltip(Text.translatable("society.working_block_entity.can_use_hopper").green());
    })
    .blockEntity((blockInfo) => {
      blockInfo.inventory("inventory", [], 9, 1);
      blockInfo.rightClickOpensInventory("inventory");
      blockInfo.serverTicking();
      blockInfo.tickFrequency(artMachineTickRate);
    });
});
