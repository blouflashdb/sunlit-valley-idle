console.info("[SOCIETY] lootOpening.js loaded");

// Loot bags: each opening drops one random item of an item tag (two with The Red and the Black).
// Fantasy's Furniture is not in the 1.21.1 pack, so the fantasy boxes fall back to the Furniture Box loot
// while their society:<theme>_fantasy_furniture tags are empty.
const lootBagItems = (tag) => {
  const ids = [];
  Ingredient.of(`#${tag}`).itemIds.forEach((id) => ids.push(String(id)));
  return ids;
};

const lootBagDrop = (player, stack) => {
  const drop = player.level.createEntity("minecraft:item");
  drop.x = player.x;
  drop.y = player.y;
  drop.z = player.z;
  drop.item = stack;
  drop.spawn();
};

const openLootBag = (e, candidates, baseCount, adjustCount) => {
  const { server, player, item } = e;
  if (candidates.length === 0) return;
  societyPlaySound(server, "minecraft:ui.stonecutter.take_result", player);
  const id = candidates[Math.floor(Math.random() * candidates.length)];
  let count = baseCount + (player.stages.has("the_red_and_the_black") ? 1 : 0);
  if (adjustCount) count = adjustCount(id, count);
  global.addItemCooldown(player, item, 2);
  if (!player.isCreative()) item.shrink(1);
  lootBagDrop(player, Item.of(id, count));
  societyPlaySound(server, "stardew_fishing:complete", player);
};

ItemEvents.rightClicked("society:furniture_box", (e) => openLootBag(e, lootBagItems("society:loot_furniture"), 1));
ItemEvents.rightClicked("society:bouquet_bag", (e) => openLootBag(e, lootBagItems("society:bouquet_bag_flowers"), 4));
ItemEvents.rightClicked("society:scavenged_food_bag", (e) => openLootBag(e, lootBagItems("society:dish"), 1));

["nordic", "dunmer", "venthyr", "bone", "royal", "necrolord"].forEach((theme) => {
  ItemEvents.rightClicked(`society:fantasy_box_${theme}`, (e) => {
    let candidates = lootBagItems(`society:${theme}_fantasy_furniture`);
    if (candidates.length > 0) candidates = candidates.concat(lootBagItems("society:decorations_fantasy_furniture"));
    else candidates = lootBagItems("society:loot_furniture");
    openLootBag(e, candidates, 1, (id, count) => {
      if (id.includes("wool") || id.includes("carpet")) return 16;
      if (id.includes("double")) return 2;
      return count;
    });
  });
});
