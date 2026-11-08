console.info("[SOCIETY] autoGrabberUpgrade.js loaded");

// Magic Shears upgrade the Auto-Grabber (it then also shears the animals). Breaking it gives the shears back.
BlockEvents.rightClicked("society:auto_grabber", (e) => {
  const { player, item, block, hand, level } = e;
  if (String(hand) !== "MAIN_HAND" || String(item.id) !== "society:magic_shears") return;
  if (global.isBlockPropertyTrue(block, "upgraded")) return;
  if (!player.isCreative()) item.shrink(1);
  level.spawnParticles("minecraft:happy_villager", true, block.x + 0.5, block.y + 1, block.z + 0.5, 0.4, 0.4, 0.4, 3, 0.01);
  global.setBlockProperties(block, { upgraded: true });
  e.cancel();
});

BlockEvents.broken("society:auto_grabber", (e) => {
  if (global.isBlockPropertyTrue(e.block, "upgraded")) e.block.popItem(Item.of("society:magic_shears"));
});
