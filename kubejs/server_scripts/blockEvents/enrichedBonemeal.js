console.info("[SOCIETY] enrichedBonemeal.js loaded");

// Enriched Bone Meal: copies wild herbs, fills cave vines with berries and makes Vinery apple and dark cherry
// leaves bear fruit. Picking that fruit is only possible in its season or under greenhouse glass.
const enrichedBoneMealUsable = (player, item) =>
  String(player.getMainHandItem().id) === "society:enriched_bone_meal" && !global.isItemOnCooldown(player, item);

const enrichedBoneMealUse = (block, player, item, server) => {
  player.getMainHandItem().shrink(1);
  block.level.spawnParticles(
    "minecraft:happy_villager",
    true,
    block.x + 0.5,
    block.y + 0.1,
    block.z + 0.5,
    0.1 * societyRnd(1, 4),
    0.1 * societyRnd(1, 4),
    0.1 * societyRnd(1, 4),
    10,
    0.1
  );
  societyPlaySound(server, "minecraft:item.bone_meal.use", player);
  global.addItemCooldown(player, item, 1);
};

const underGreenhouseGlass = (level, pos) => {
  for (let i = 1; i <= 16; i++) {
    if (level.getBlock(pos.offset(0, i, 0)).hasTag("sereneseasons:greenhouse_glass")) return true;
  }
  return false;
};

BlockEvents.rightClicked(
  ["herbalbrews:lavender", "herbalbrews:hibiscus", "farm_and_charm:wild_ribwort", "farm_and_charm:wild_nettle"],
  (e) => {
    const { player, item, block, server } = e;
    if (!enrichedBoneMealUsable(player, item)) return;
    block.popItem(Item.of(block.id));
    enrichedBoneMealUse(block, player, item, server);
  }
);

BlockEvents.rightClicked(["minecraft:cave_vines", "minecraft:cave_vines_plant"], (e) => {
  const { player, item, block, hand, server } = e;
  if (String(hand) !== "MAIN_HAND" || !enrichedBoneMealUsable(player, item)) return;
  server.scheduleInTicks(1, () => {
    let properties = block.getProperties();
    properties.put("berries", "true");
    block.set(block.id, properties);
  });
  enrichedBoneMealUse(block, player, item, server);
});

// [leaves, can grow property, has fruit property, season, season name key, season color]
[
  ["vinery:apple_leaves", "can_grow_apples", "has_apples", "autumn", "desc.sereneseasons.autumn", "gold"],
  ["vinery:dark_cherry_leaves", "can_grow_cherries", "has_cherries", "spring", "desc.sereneseasons.spring", "green"],
].forEach((entry) => {
  const leaves = entry[0];
  const canGrow = entry[1];
  const hasFruit = entry[2];
  const season = entry[3];
  const seasonKey = entry[4];
  const seasonColor = entry[5];
  BlockEvents.rightClicked(leaves, (e) => {
    const { block, player, item, server } = e;
    if (global.isItemOnCooldown(player, item)) return;
    let properties = block.getProperties();
    if (global.isBlockPropertyTrue(block, canGrow) && global.isBlockPropertyTrue(block, hasFruit)) {
      // Picking the fruit (Vinery drops it) is only allowed in season.
      if (global.getSeasonFromLevel(block.level) === season || underGreenhouseGlass(block.level, block.pos)) {
        properties.put(canGrow, "false");
        properties.put(hasFruit, "false");
        properties.put("age", "0");
        server.scheduleInTicks(5, () => block.set(block.id, properties));
      } else {
        player.tell(
          Text.translatable("item.society.enriched_bone_meal.tree_fruit_season", Text.translatable(seasonKey)[seasonColor]())
        );
        e.cancel();
      }
    } else if (enrichedBoneMealUsable(player, item)) {
      properties.put(canGrow, "true");
      properties.put(hasFruit, "true");
      properties.put("age", "3");
      block.set(block.id, properties);
      enrichedBoneMealUse(block, player, item, server);
    }
  });
});
