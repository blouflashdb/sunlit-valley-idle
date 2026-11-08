console.info("[SOCIETY] handleSacrifice.js loaded");

// Sacrificial Lamb: startup_scripts/husbandry/sacrificialLamb.js.
EntityEvents.death((e) => {
  const { source, entity, server } = e;
  const player = source.player;
  if (!player || player.isFake() || !global.sacrificeSheep.includes(global.entityTypeId(entity))) return;
  if (!player.stages.has("sacrificial_lamb")) return;
  if (global.animalInt(entity.persistentData, "affection") < 200) return;
  global.handleSacrifice(player, entity);
  server.runCommandSilent(`playsound minecraft:entity.warden.death block @a ${player.x} ${player.y} ${player.z} 0.5`);
});
