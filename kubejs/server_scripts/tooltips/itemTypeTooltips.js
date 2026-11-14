console.info("[SOCIETY] itemTypeTooltips.js loaded");

// Mineral and gem lines (ported from the 1.20.1 client script tooltips/addPriceTooltips.js, #18; see tooltipShim.js).
// The prices themselves read the stack and the player, so they are a client script (client_scripts/tooltips).
ItemEvents.modifyTooltips((e) => {
  const tooltip = createTooltipShim(e);
  const mineral = Text.translatable("tooltip.society.item_type.mineral").gray();
  const gem = Text.translatable("tooltip.society.item_type.gem").gray();
  global.geodeList
    .concat(global.frozenGeodeList)
    .concat(global.magmaGeodeList)
    .forEach((geodeItem) => tooltip.add(geodeItem.item, mineral));
  global.gems.forEach((gemItem) => tooltip.add(gemItem.item, gem));
  tooltip.add(
    [
      "society:sparkstone",
      "minecraft:emerald",
      "minecraft:diamond",
      "minecraft:amethyst_shard",
      "minecraft:quartz",
      "society:prismatic_shard",
      "minecraft:prismarine_crystals",
    ],
    gem
  );
});
