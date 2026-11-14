console.info("[SOCIETY] milkBan.js loaded");

// Milk comes from the Milk Pail only: milk buckets turn back into empty buckets.
const bannedMilkBuckets = [
  "minecraft:milk_bucket",
  "meadow:wooden_milk_bucket",
  "meadow:wooden_sheep_milk_bucket",
  "meadow:wooden_warped_milk_bucket",
  "meadow:wooden_buffalo_milk_bucket",
  "meadow:wooden_goat_milk_bucket",
];

PlayerEvents.inventoryChanged((e) => {
  const { player } = e;
  const id = String(e.item.id);
  if (!bannedMilkBuckets.includes(id)) return;
  player.tell(Text.translatable("society.husbandry.action.need_milk_pail").gray());
  let removed = 0;
  player.inventory.items.forEach((stack) => {
    if (String(stack.id) === id) {
      removed += stack.count;
      stack.count = 0;
    }
  });
  if (removed > 0) player.give(Item.of(id.includes("wooden") ? "meadow:wooden_bucket" : "minecraft:bucket", removed));
});
