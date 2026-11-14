console.info("[SOCIETY] steadfastSkill.js loaded");

// Steadfast: a hurt player has a 20 percent chance (at most once a second) to heal one heart.
// Also caps the freezing of players (Windswept's deep snow froze players to death).
const steadfastThrottle = societyThrottle();

EntityEvents.afterHurt("minecraft:player", (e) => {
  const { server, level, entity } = e;
  if (entity.getTicksFrozen() > 140) entity.setTicksFrozen(140);
  if (steadfastThrottle(entity, 20, "steadfast") || !entity.stages.has("steadfast") || Math.random() >= 0.2) return;
  entity.heal(2);
  level.spawnParticles(
    "minecraft:heart",
    true,
    entity.x,
    entity.y + 1.5,
    entity.z,
    0.1 * societyRnd(1, 4),
    0.1 * societyRnd(1, 4),
    0.1 * societyRnd(1, 4),
    5,
    0.01
  );
  societyPlaySound(server, "minecraft:entity.player.levelup", entity, "0.4 1.6");
});
