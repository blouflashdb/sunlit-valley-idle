console.info("[SOCIETY] handleSacrifice.js loaded");

// Sacrificial Lamb (husbandry skill): a player who kills a sheep with at least 200 affection passes half of it
// to the farm animals within 8 blocks (each has a 50% chance); other sheep that see it lose 100 affection.
const SACRIFICE_SHEEP = ["minecraft:sheep", "wildernature:minisheep"];

global.handleSacrifice = (player, sheep) => {
  const level = sheep.level;
  const affection = global.animalInt(sheep.persistentData, "affection");
  if (affection < 200) return 0;
  let blessed = 0;
  level.getEntitiesWithin(player.boundingBox.inflate(8)).forEach((animal) => {
    if (String(animal.getUuid()) === String(sheep.getUuid()) || !global.checkEntityTag(animal, "society:husbandry_animal")) return;
    if (SACRIFICE_SHEEP.includes(global.entityTypeId(animal))) {
      global.addAffection(animal.persistentData, -100);
      level.spawnParticles("minecraft:angry_villager", true, animal.x, animal.y + 1.5, animal.z, 0.2, 0.2, 0.2, 5, 0.01);
    } else if (Math.random() < 0.5) {
      global.addAffection(animal.persistentData, Math.round(affection / 2));
      level.spawnParticles("minecraft:sculk_soul", true, animal.x, animal.y + 1.5, animal.z, 0.2, 0.2, 0.2, 5, 0.01);
      blessed++;
    }
  });
  return blessed;
};

EntityEvents.death((e) => {
  const { source, entity, server } = e;
  const player = source.player;
  if (!player || player.isFake() || !SACRIFICE_SHEEP.includes(global.entityTypeId(entity))) return;
  if (!player.stages.has("sacrificial_lamb")) return;
  if (global.animalInt(entity.persistentData, "affection") < 200) return;
  global.handleSacrifice(player, entity);
  server.runCommandSilent(`playsound minecraft:entity.warden.death block @a ${player.x} ${player.y} ${player.z} 0.5`);
});
