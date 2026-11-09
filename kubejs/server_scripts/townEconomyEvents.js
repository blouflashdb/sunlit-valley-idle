console.info("[SOCIETY] townEconomyEvents.js loaded");

// Town economy (#15): events for startup_scripts/townEconomy.js. Ported from the 1.20.1 handleDebt.js,
// bankerBroken.js, registerCoinLeaderboardPlayers.js, updateCoinLeaderboard.js and overflowToken.js.

// After a death the hospital charges a fee (the first one is free).
PlayerEvents.respawned((e) => {
  const { player, server } = e;
  if (!global.enableDeathDebt || e.endConquered) return;
  if (!player.stages.has("first_death")) {
    player.stages.add("first_death");
    player.give(global.firstDeathNote());
  } else {
    global.handleFee(server, player, "death");
    if (!player.stages.has("first_aid_guide") && Math.random() <= 0.01) player.give("society:first_aid_guide");
  }
  player.potionEffects.add("minecraft:slowness", 1200, 0, false, true);
});

// Blaze Bankers can only be picked up with a pickaxe when nobody is on their trust list.
BlockEvents.broken("numismatics:blaze_banker", (e) => {
  e.player.tell(Text.translatable("society.blaze_banker.break").red());
});

BlockEvents.rightClicked("numismatics:blaze_banker", (e) => {
  const { item, block, level, player } = e;
  if (!item.hasTag("minecraft:pickaxes")) return;
  const data = block.getEntityData();
  const trusted = data && data.contains("TrustListInv") ? data.getCompound("TrustListInv").getList("Items", 10).size() : 0;
  if (trusted > 0) player.tell(Text.translatable("society.blaze_banker.break.not_empty").red());
  else level.destroyBlock(block.pos, true);
});

BlockEvents.rightClicked("create_central_kitchen:blaze_stove", (e) => {
  if (String(e.item.id) === "create_central_kitchen:cooking_guide") e.cancel();
});

PlayerEvents.loggedIn((e) => {
  global.recordLeaderboardPlayer(e.server, e.player);
});

ServerEvents.tick((e) => {
  if (e.server.getTickCount() % 600 !== 0) return;
  global.coinLeaderboard.ranking = global.getLeaderboardRanking(e.server);
});

BlockEvents.blockEntityTick("society:coin_leaderboard", (e) => {
  global.updateLeaderboard(e.block, e.level);
});

BlockEvents.placed("society:coin_leaderboard", (e) => {
  global.coinLeaderboard.ranking = global.getLeaderboardRanking(e.server);
  global.updateLeaderboard(e.block, e.level);
});

BlockEvents.broken("society:coin_leaderboard", (e) => {
  global.clearLeaderboard(e.block, e.level);
});

// An Overflow Token stores a full bank account's worth (1,006,632,960) for the leaderboard.
ItemEvents.rightClicked("society:overflow_token", (e) => {
  const { item, server, hand, player } = e;
  if (String(hand) !== "MAIN_HAND") return;
  global.addOverflowToken(server, player.getStringUuid());
  if (!player.isCreative()) item.shrink(1);
  server.runCommandSilent(`playsound tanukidecor:block.cash_register.ring block @a ${player.x} ${player.y} ${player.z}`);
});
