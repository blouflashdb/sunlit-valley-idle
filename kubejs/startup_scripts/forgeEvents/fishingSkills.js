console.info("[SOCIETY] fishingSkills.js loaded");

// Extra fish from the fishing skills and the Net and Needle Bobbers, given when a player reels in a catch.

global.handleExtraFishing = (event) => {
  const player = event.getEntity();
  const rod = player.getMainHandItem();
  let increase = 0;
  if (player.isFake()) rod.shrink(1);
  const hasNet = global.hasBobber(rod, "society:net_bobber");
  const drops = event.getDrops();
  if (String(player.level.dimension) === "minecraft:the_nether") {
    if (Math.random() < 0.1) player.give(Item.of("society:nether_jelly", hasNet ? 3 : 1));
    if (player.stages.has("wooden_pollution") && Math.random() < 0.1)
      player.give(Item.of("society:nether_jelly", hasNet ? 3 : 1));
    if (player.stages.has("fly_fisher")) increase += 1;
    if (player.stages.has("school_fisher")) increase += 3;
    if (global.hasBobber(rod, "society:needle_bobber")) increase += 5;
    if (increase > 0) {
      drops.forEach((drop) => {
        if (drop.hasTag("minecraft:fishes")) player.give(drop.copyWithCount(increase));
      });
    }
  }
  drops.forEach((drop) => {
    if (!drop.hasTag("minecraft:fishes") && hasNet && drop.maxStackSize > drop.count * 2) {
      player.give(drop.copyWithCount(drop.count * 2));
    }
  });
};

NativeEvents.onEvent(Java.loadClass("net.neoforged.neoforge.event.entity.player.ItemFishedEvent"), (event) => {
  global.handleExtraFishing(event);
});
