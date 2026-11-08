console.info("[SOCIETY] sacrificialLamb.js loaded");

// Sacrificial Lamb (husbandry skill): a player who kills a sheep with at least 200 affection passes half of it
// to the farm animals within 8 blocks (each has a 50% chance); other sheep that see it lose 100 affection.
global.sacrificeSheep = ["minecraft:sheep", "wildernature:minisheep"];

global.handleSacrifice = (player, sheep) => {
  const level = sheep.level;
  const affection = global.animalInt(sheep.persistentData, "affection");
  if (affection < 200) return 0;
  let blessed = 0;
  level.getEntitiesWithin(player.boundingBox.inflate(8)).forEach((animal) => {
    if (String(animal.getUuid()) === String(sheep.getUuid()) || !global.checkEntityTag(animal, "society:husbandry_animal")) return;
    if (global.sacrificeSheep.includes(global.entityTypeId(animal))) {
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
