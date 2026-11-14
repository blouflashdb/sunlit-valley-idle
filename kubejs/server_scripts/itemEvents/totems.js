console.info("[SOCIETY] totems.js loaded");

// Treasure and bubble totems make Little Joys dig spots or fishing spots on the edge of a 5x5 square around
// the player; the weather totems set the weather.
const totemSounds = (server, player) => {
  societyPlaySound(server, "botania:terrasteel_craft", player);
  societyPlaySound(server, "stardew_fishing:complete", player);
};

const runSpotTotem = (e, type) => {
  const { server, player, level, item } = e;
  const center = player.getOnPos();
  const radius = 2;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      if (Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue;
      for (let dy = -1; dy <= 1; dy++) {
        let pos = center.offset(dx, dy, dz);
        if (!level.isLoaded(pos)) continue;
        let block = level.getBlock(pos);
        let above = level.getBlock(pos.above());
        if (String(above.id) !== "minecraft:air") continue;
        if (
          (type === "digspot" && block.hasTag("society:treasure_spot_spawns")) ||
          (type === "fishingspot" && String(block.id) === "minecraft:water")
        ) {
          server.runCommandSilent(
            `execute as ${player.username} at @s run littlejoys ${type} ${above.x} ${above.y} ${above.z}`
          );
        }
      }
    }
  }
  totemSounds(server, player);
  global.addItemCooldown(player, item, 20);
  if (!player.isCreative()) item.shrink(1);
};

ItemEvents.rightClicked("society:treasure_totem", (e) => runSpotTotem(e, "digspot"));
ItemEvents.rightClicked("society:bubble_totem", (e) => runSpotTotem(e, "fishingspot"));

[
  ["society:dry_totem", "clear"],
  ["society:rain_totem", "rain"],
  ["society:thunder_totem", "thunder"],
].forEach(([totem, weather]) => {
  ItemEvents.rightClicked(totem, (e) => {
    const { server, player, item } = e;
    server.runCommandSilent(`weather ${weather}`);
    totemSounds(server, player);
    global.addItemCooldown(player, item, 2000);
    if (!player.isCreative()) item.shrink(1);
  });
});
