console.info("[SOCIETY] cornucopia.js loaded");

// The Cornucopia harvests the ripe fruit trees around the player (startup_scripts/husbandry/drumCornucopia.js).
ItemEvents.rightClicked("society:cornucopia", (e) => {
  const { server, player, level, item, hand } = e;
  if (player.isFake() || String(hand) !== "MAIN_HAND") return;
  global.addItemCooldown(player, item, 40);
  const harvested = global.handleCornucopia(server, level, player.getOnPos().above(), player);
  global.giveExperience(server, player, "farming", harvested * 30);
});
