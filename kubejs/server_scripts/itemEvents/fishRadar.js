console.info("[SOCIETY] fishRadar.js loaded");

// The Fish Radar lists the season and the fish that bite here, in this weather and at this time of day.
// The 1.20.1 radar also painted this list on the screen while worn as a curio; KubeJS 7 has no paint.
ItemEvents.rightClicked("society:fish_radar", (e) => {
  const { level, player, item } = e;
  const print = (text) => player.tell(text);
  print(Text.translatable(`desc.sereneseasons.${global.getSeasonFromBiome(level, player.blockPosition())}`).gold());
  print(Text.of("=====[ ").gray().append(Text.translatable("item.society.fish_radar").green()).append(" ]====="));
  const fish =
    String(level.dimension) === "minecraft:the_nether"
      ? societyNetherRadar(level, player, print)
      : societyOverworldRadar(level, player, print);
  if (player.stages.has("mystical_ocean")) fish.push("society:neptuna");
  print(Text.gray("======================"));
  fish.filter((id) => Item.exists(id)).forEach((id) => print(Item.of(id).getHoverName()));
  global.addItemCooldown(player, item, 20);
});
