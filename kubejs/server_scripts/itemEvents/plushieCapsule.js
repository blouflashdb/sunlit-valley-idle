console.info("[SOCIETY] plushieCapsule.js loaded");

// A Plushie Capsule gives a random plushie (startup_scripts/plushies/plushies.js). "The Red and the Black" gives
// two, "Women Who Run with the Plushies" gives one with two hearts and a better rarity.
ItemEvents.rightClicked("society:plushie_capsule", (e) => {
  const { server, player, item, hand } = e;
  if (String(hand) !== "MAIN_HAND" || global.isItemOnCooldown(player, item)) return;
  if (!player.isCreative()) item.count--;
  const reward = global.rollPlushie(
    player.stages.has("the_red_and_the_black"),
    player.stages.has("women_who_run_with_the_plushies")
  );
  player.give(reward);
  server.runCommandSilent(`playsound minecraft:ui.stonecutter.take_result block @a ${player.x} ${player.y} ${player.z}`);
  global.addItemCooldown(player, "society:plushie_capsule", 2);
  e.cancel();
});
