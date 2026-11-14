console.info("[SOCIETY] checkTapper.js loaded");

// Tells the player why a tapper does not work. The 1.20.1 version drew this with the Embers Text API.
BlockEvents.rightClicked(["society:tapper", "society:auto_tapper"], (e) => {
  let { level, block, player, hand } = e;
  if (String(hand) !== "MAIN_HAND") return;
  let errorKey;
  if (global.hasMultipleTappers(level, block)) errorKey = "block.society.tapper.too_many_tapper";
  if (!global.getTapperLog(level, block).hasTag("society:tappable_blocks")) errorKey = "block.society.tapper.invalid_block";
  if (errorKey) player.setStatusMessage(Text.translatable(errorKey).red());
});
