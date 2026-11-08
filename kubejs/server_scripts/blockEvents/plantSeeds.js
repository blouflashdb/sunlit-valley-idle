console.info("[SOCIETY] plantSeeds.js loaded");

// Items that plant a crop although they are not block items: right-click the top of any farm soil.
const plantedBy = {
  "veggiesdelight:garlic_seed": "veggiesdelight:garlic_crop",
  "vintagedelight:gearo_berry": "vintagedelight:gearo_berry_bush",
};

BlockEvents.rightClicked((e) => {
  const { item, player, level, server, block } = e;
  const crop = plantedBy[String(item.id)];
  if (!crop || String(e.facing) !== "up" || !block.hasTag("dewdrop:waterable")) return;
  const aboveBlock = level.getBlock(block.getPos().above());
  if (String(aboveBlock.id) !== "minecraft:air") return;
  aboveBlock.set(crop);
  if (!player.isCreative()) item.shrink(1);
  player.swing();
  server.runCommandSilent(`playsound minecraft:block.crop.break block @a ${player.x} ${player.y} ${player.z}`);
  e.cancel();
});
