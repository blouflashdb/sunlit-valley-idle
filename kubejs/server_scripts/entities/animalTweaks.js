console.info("[SOCIETY] animalTweaks.js loaded");

ItemEvents.entityInteracted((e) => {
  const { item, target, player } = e;
  const type = global.entityTypeId(target);
  // Mooshroom stew hurts the mooshroom.
  if (type === "minecraft:mooshroom" && String(item.id) === "minecraft:bowl") target.attack(2);
  // A fishing rod with a bobber attached cannot go into an item frame (it would lose the bobber).
  if (type.includes("item_frame") && item.hasTag("c:tools/fishing_rod") && String(item.getComponentsPatch()).includes("bobber")) {
    player.tell(Text.translatable("society.item_frame.rod").red());
    e.cancel();
  }
});

EntityEvents.spawned((e) => {
  const type = global.entityTypeId(e.entity);
  // No skeleton horse traps.
  if (type === "minecraft:skeleton_horse" && e.entity.isTrap()) e.cancel();
  // Immortals only spawn in the Skull Cavern.
  if (type === "rottencreatures:immortal" && String(e.level.dimension) !== "society:skull_cavern") e.cancel();
});
