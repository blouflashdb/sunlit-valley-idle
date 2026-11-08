console.info("[SOCIETY] addBonemeal.js loaded");

BlockEvents.rightClicked(["meadow:eriophorum_tall", "meadow:small_fir"], (e) => {
  const { player, item, server, block } = e;
  if (
    String(player.getHeldItem("main_hand").id) === "minecraft:bone_meal" &&
    !player.cooldowns.isOnCooldown(item.item)
  ) {
    player.getHeldItem("main_hand").count--;
    let crop = block.level.createEntity("minecraft:item");
    crop.x = block.x + Math.floor(Math.random() * 1.5) + 0.5;
    crop.y = block.y + 0.5;
    crop.z = block.z + Math.floor(Math.random() * 1.5) + 0.5;
    crop.item = Item.of(block.id);
    crop.spawn();
    block.level.spawnParticles(
      "minecraft:happy_villager",
      true,
      block.x + 0.5,
      block.y + 0.1,
      block.z + 0.5,
      0.1 * (1 + Math.floor(Math.random() * 4)),
      0.1 * (1 + Math.floor(Math.random() * 4)),
      0.1 * (1 + Math.floor(Math.random() * 4)),
      10,
      0.1
    );
    server.runCommandSilent(
      `playsound minecraft:item.bone_meal.use block @a ${player.x} ${player.y} ${player.z}`
    );
    if (!player.isFake()) player.addItemCooldown(item.item, 1);
  }
});
