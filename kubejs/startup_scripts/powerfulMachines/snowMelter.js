console.info("[SOCIETY] snowMelter.js loaded");

// Snow Melter (#18): every 600 ticks, unless powered by redstone, it removes snow layers and melts ice into water
// in a 21x5x21 area around itself. server_scripts/blockEvents/machineTicks.js calls global.runSnowMelter.
// Snow Real Magic (snow on plants) is not in the 1.21.1 pack, so only vanilla snow and ice are handled.
const $SnowMelterBlockPos = Java.loadClass("net.minecraft.core.BlockPos");
const snowMelterRadius = 10;
const snowMelterHeight = 2;

global.runSnowMelter = (entity) => {
  const { block, level } = entity;
  if (level.hasNeighborSignal(block.pos)) return;
  const { x, y, z } = block;
  const from = new $SnowMelterBlockPos(x - snowMelterRadius, y - snowMelterHeight, z - snowMelterRadius);
  const to = new $SnowMelterBlockPos(x + snowMelterRadius, y + snowMelterHeight, z + snowMelterRadius);
  for (let pos of $SnowMelterBlockPos.betweenClosed(from, to)) {
    if (!level.isLoaded(pos)) continue;
    let scanBlock = level.getBlock(pos);
    if (scanBlock.id === "minecraft:snow") scanBlock.set("minecraft:air");
    else if (scanBlock.id === "minecraft:ice") scanBlock.set("minecraft:water");
  }
};

StartupEvents.registry("block", (event) => {
  event
    .create("society:snow_melter", "cardinal")
    .displayName("Snow Melter")
    .soundType("stone")
    .hardness(2.0)
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .requiresTool(true)
    .box(0, 0, 0, 16, 16, 16)
    .parentModel("society:block/kubejs/snow_melter/snow_melter")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.snow_melter.description").gray());
      item.tooltip(Text.translatable("tooltip.society.area", "21x5x21").green());
      item.parentModel("society:block/kubejs/snow_melter/snow_melter");
    })
    .blockEntity((blockInfo) => {
      blockInfo.serverTicking();
      blockInfo.tickFrequency(600);
    });
});
