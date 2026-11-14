console.info("[SOCIETY] ribbitHutEvents.js loaded");

// Ribbit Hut (#12): startup_scripts/husbandry/ribbitHut.js. Placing it builds the 3x3x3 hut around it;
// breaking the door removes the hut and gives it back.
BlockEvents.placed("society:ribbit_hut", (e) => {
  const { player, level, block } = e;
  if (!player) return;
  if (!global.ribbitHutHasRoom(level, block.getPos())) {
    player.tell(Text.translatable("block.society.ribbit_hut.not_enough_room").red());
    e.cancel();
    return;
  }
  const center = block.getPos();
  const facing = global.getBlockProperty(block, "facing");
  const owner = String(player.getUuid());
  // After the placement has finished, so the hut blocks are not overwritten.
  e.server.scheduleInTicks(1, () => global.buildRibbitHut(level, center, facing, owner));
});

BlockEvents.leftClicked("society:ribbit_hut_block", (e) => {
  e.player.setStatusMessage(Text.translatable("block.society.ribbit_hut.break").red());
});

BlockEvents.broken("society:ribbit_hut", (e) => {
  const { level, player, block } = e;
  // The door's inventory drops by itself (KubeJS inventory attachment).
  global.removeRibbitHut(level, block);
  if (player && !player.isCreative()) player.give("society:ribbit_hut");
});
