console.info("[SOCIETY] longwings.js loaded");

// Longwings (#12): startup_scripts/husbandry/longwings.js. On 1.20.1 every longwing ticked through EntityJS; here
// all loaded longwings roll every 6000 ticks.
ServerEvents.tick((e) => {
  const server = e.server;
  if (server.getTickCount() % 6000 === 0) global.runLongwings(server);
});

// Right-clicking a longwing shows its odds in the action bar (1.20.1: a Paint UI overlay).
ItemEvents.entityInteracted((e) => {
  const { hand, player, target } = e;
  if (String(hand) !== "MAIN_HAND" || !global.isLongwing(target)) return;
  const odds = global.getLongwingOdds(target);
  const percent = (chance) => `${Math.max(0, Math.min(100, Math.floor(chance * 100)))}%`;
  const product = global.entityTypeId(target) === "longwings:butterfly" ? "item.society.butterfly_amber" : "item.society.moth_pollen";
  player.displayClientMessage(
    Text.translatable("society.longwings.produce_chance", percent(odds.chance), Text.translatable(product))
      .gold()
      .append(Text.of(" · ").gray())
      .append(Text.translatable("society.longwings.produce_chance", percent(Math.max(0, odds.chance) / 4), Text.translatable("item.society.caterpillar_eggs")).lightPurple())
      .append(Text.of(" · ").gray())
      .append(Text.translatable("society.longwings.flower_count", `${odds.flowers}`).green())
      .append(Text.of(" · ").gray())
      .append(Text.translatable("society.longwings.longwing_count", `${odds.others.length}`).red()),
    true
  );
});
