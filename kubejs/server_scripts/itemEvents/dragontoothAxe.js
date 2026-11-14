console.info("[SOCIETY] dragontoothAxe.js loaded");

// The Dragontooth Axe breaks on use without the Dragonslayer skill. With Galaxy Smash a crouching left click
// hits all monsters around the player; with Handle Shot a crouching right click fires an arrow.
// Species is not in the 1.21.1 pack, so its ichor particle is replaced by the vanilla damage indicator.
const $DragontoothVec3 = Java.loadClass("net.minecraft.world.phys.Vec3");
const dragontoothAxe = "society:dragontooth_axe";
const galaxySmashRadius = 3;

/** Without Dragonslayer the axe breaks; returns true when it broke. */
const breakDragontoothAxe = (item, server, player) => {
  if (player.stages.has("dragonslayer")) return false;
  item.shrink(1);
  societyPlaySound(server, "minecraft:entity.warden.sonic_boom", player);
  server.runCommandSilent(
    global.getEmbersTextAPICommand(
      player.username,
      '{anchor:"BOTTOM_CENTER",background:1,wrap:220,align:"BOTTOM_CENTER",color:"#FF5555",offsetY:-60}',
      240,
      Text.translatable("item.society.dragontooth_axe.no_skill_broken").toJson()
    )
  );
  return true;
};

const dragontoothSmoke = (level, x, y, z, spread, count) =>
  level.spawnParticles(
    "supplementaries:bomb_smoke",
    true,
    x,
    y + 0.5,
    z,
    spread * societyRnd(0, 2),
    0.1 * societyRnd(-1, 1),
    spread * societyRnd(0, 2),
    count,
    0.01
  );

ItemEvents.firstLeftClicked(dragontoothAxe, (e) => {
  const { hand, item, player, level, server } = e;
  if (String(hand) !== "MAIN_HAND" || breakDragontoothAxe(item, server, player)) return;
  if (global.isItemOnCooldown(player, item) || !player.stages.has("galaxy_smash") || !player.isCrouching()) return;
  for (let dx = -galaxySmashRadius; dx <= galaxySmashRadius; dx++) {
    for (let dz = -galaxySmashRadius; dz <= galaxySmashRadius; dz++) {
      dragontoothSmoke(level, Math.floor(player.x) + dx, Math.round(player.y), Math.floor(player.z) + dz, 0.5, 4);
    }
  }
  const damage = player.potionEffects.isActive("minecraft:strength") ? 20 : 15;
  level
    .getEntitiesWithin(player.boundingBox.inflate(galaxySmashRadius + 0.5))
    .filter((entity) => entity.isMonster() && entity.isAttackable())
    .forEach((target) => {
      target.attack(damage);
      level.spawnParticles(
        "minecraft:damage_indicator",
        true,
        target.x,
        target.y + 1.5,
        target.z,
        0.2 * societyRnd(1, 4),
        0.1 * societyRnd(1, 4),
        0.2 * societyRnd(1, 4),
        5,
        0.3
      );
    });
  societyPlaySound(server, "quark:entity.toretoise.angry", player);
  societyPlaySound(server, "minecraft:entity.ender_dragon.hurt", player);
  global.addItemCooldown(player, item, 200);
});

ItemEvents.rightClicked(dragontoothAxe, (e) => {
  const { hand, item, player, level, server } = e;
  if (String(hand) !== "MAIN_HAND" || breakDragontoothAxe(item, server, player)) return;
  if (global.isItemOnCooldown(player, item) || !player.stages.has("handleshot") || !player.isCrouching()) return;
  const arrow = level.createEntity("minecraft:arrow");
  arrow.setPos(player.x, player.y + 2, player.z);
  const speed = 5.0;
  const look = player.getLookAngle();
  arrow.setDeltaMovement(new $DragontoothVec3(look.x() * speed, look.y() * speed, look.z() * speed));
  arrow.spawn();
  dragontoothSmoke(level, player.x, player.y, player.z, 0.9, 20);
  societyPlaySound(server, "minecraft:entity.ghast.shoot", player);
  societyPlaySound(server, "minecraft:entity.ender_dragon.hurt", player);
  global.addItemCooldown(player, item, 80);
});

// Mining with the axe in the main hand.
BlockEvents.leftClicked((e) => {
  const { item, player, server } = e;
  if (String(item.id) === dragontoothAxe) breakDragontoothAxe(item, server, player);
});
