console.info("[SOCIETY] moonStatueDamage.js loaded");

// Moon Statue buff "moon_damage": in the Skull Cavern a hit has a five percent chance to deal 100 damage.
// Species is not in the 1.21.1 pack, so its particle is replaced by the vanilla soul particle.
EntityEvents.afterHurt((e) => {
  const { server, level, entity, source } = e;
  if (String(level.dimension) !== "society:skull_cavern") return;
  const attacker = source.getEntity();
  if (!attacker || !attacker.isPlayer() || attacker === entity) return;
  if (!attacker.stages.has("moon_damage") || Math.random() >= 0.05) return;
  entity.attack(100);
  level.spawnParticles(
    "minecraft:soul",
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
  societyPlaySound(server, "create:peculiar_bell_use", entity);
});
