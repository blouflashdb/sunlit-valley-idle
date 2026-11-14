console.info("[SOCIETY] disableSpawner.js loaded");

// Spawn eggs cannot change spawners, and minecart contraptions cannot be placed on Skull Cavern rails.
BlockEvents.rightClicked("minecraft:spawner", (e) => {
  if (!e.player.isCreative() && String(e.item.id).includes("spawn_egg")) e.cancel();
});

BlockEvents.rightClicked((e) => {
  if (e.player.isCreative()) return;
  if (
    String(e.item.id) === "create:minecart_contraption" &&
    String(e.level.dimension) === "society:skull_cavern" &&
    e.block.hasTag("minecraft:rails")
  ) {
    e.cancel();
  }
});
