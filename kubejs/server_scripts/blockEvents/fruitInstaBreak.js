console.info("[SOCIETY] fruitInstaBreak.js loaded");

// Shears pick a Pam's fruit block off its tree in one hit (pamFruitBlocks: serverEventUtils.js).
BlockEvents.leftClicked(pamFruitBlocks, (e) => {
  const { player, block, level, server } = e;
  if (player.isFake() || !player.getMainHandItem().hasTag("c:tools/shear")) return;
  societyPlaySound(server, "minecraft:entity.sheep.shear", block);
  block.popItem(Item.of(block.id));
  level.destroyBlock(block.pos, true, player);
});
