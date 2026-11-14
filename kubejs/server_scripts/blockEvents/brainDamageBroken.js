console.info("[SOCIETY] brainDamageBroken.js loaded");

// Intro to Algorithms: lead ore does not leave Oreganized's brain damage cloud behind.
BlockEvents.broken(["oreganized:lead_ore", "oreganized:deepslate_lead_ore", "oreganized:raw_lead_block"], (e) => {
  const { level, server, block, player } = e;
  if (!player || !player.stages.has("intro_to_algorithms")) return;
  server.scheduleInTicks(2, () => {
    level
      .getEntitiesWithin(AABB.ofBlock(block.pos).inflate(2))
      .filter((entity) => global.entityTypeId(entity) === "minecraft:area_effect_cloud")
      .forEach((entity) => entity.discard());
  });
});
