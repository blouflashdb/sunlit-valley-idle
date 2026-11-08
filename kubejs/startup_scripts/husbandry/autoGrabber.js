console.info("[SOCIETY] autoGrabber.js loaded");

// The Auto-Grabber milks the farm animals within 5 blocks (11x11x11), also those in plushies, and collects their
// daily drops into the inventory below. Upgraded with Magic Shears it also shears them. Every product costs one
// sparkstone from its own inventory. It applies the skills of the player who placed it
// (server_scripts/blockEvents/machineOwner.js).

const autoGrabberOwnerStages = [
  "animal_fancy",
  "animal_whisperer",
  "bff",
  "triple_truffle",
  "coopmaster",
  "heretic",
  "mana_hand",
  "reaping_scythe",
  "shepherd",
];

/** Puts the products below and pays one sparkstone for them; false when they do not fit or there is no fuel. */
const grabberDeliver = (level, block, fuel, stacks) => {
  if (stacks.length === 0 || global.countInHandler(fuel, "society:sparkstone") < 1) return false;
  if (!global.insertAllBelow(level, block, stacks)) return false;
  if (!global.sparkstoneRecycled(level, block)) global.useFromHandler(fuel, "society:sparkstone", 1);
  return true;
};

/**
 * @param entity the Auto-Grabber's block entity tick event
 * @param {Internal.Player|null} owner the owner when online
 */
global.autoGrabAnimal = (entity, owner, animal) => {
  const { block, level } = entity;
  const fuel = block.getEntity().attachments.get("inventory");
  if (global.countInHandler(fuel, "society:sparkstone") < 1) return;
  const stages = global.getBlockEntityStages(entity);
  const data = animal.persistentData;
  const day = global.getDay(level);
  if (global.compareDay(day, global.animalInt(data, "ageLastFed"), 1)) return; // hungry
  // Unpet animals wait until the evening, so the player can pet them first.
  if (global.compareDay(day, global.animalInt(data, "ageLastPet"), 1) && Number(level.dayTime()) % 24000 <= 12000) return;
  const mood = global.getOrFetchMood(level, animal, day, owner);
  if (mood < 64 && Math.random() < mood / 64) return;
  let grabbedMilk;
  let grabbedLoot;
  const crowdedPenalty = () => {
    if (!global.getAnimalIsNotCramped(animal, 1.1)) global.addAffection(data, -50);
  };
  if (global.checkEntityTag(animal, "society:milkable_animal")) {
    grabbedMilk = global.getMilk(level, animal, owner, day, false, stages);
    if (grabbedMilk && grabberDeliver(level, block, fuel, [grabbedMilk])) {
      crowdedPenalty();
      level.server.runCommandSilent(`playsound minecraft:entity.cow.milk block @a ${animal.x} ${animal.y} ${animal.z}`);
      level.spawnParticles("minecraft:note", true, animal.x, animal.y + 1.5, animal.z, 0.3, 0.3, 0.3, 5, 0.01);
    }
  }
  global.rollSpecialDrops(level, animal, owner, stages).forEach((stack) => {
    if (grabberDeliver(level, block, fuel, [stack])) {
      level.spawnParticles("minecraft:happy_villager", true, animal.x, animal.y + 1, animal.z, 0.4, 0.4, 0.4, 3, 0.01);
    }
  });
  if (global.isBlockPropertyTrue(level.getBlock(block.getPos()), "upgraded")) {
    grabbedLoot = global.getMagicShearsOutput(level, animal, owner, stages);
    if (grabbedLoot && grabberDeliver(level, block, fuel, grabbedLoot)) {
      crowdedPenalty();
      level.server.runCommandSilent(`playsound minecraft:entity.sheep.shear block @a ${block.x} ${block.y} ${block.z}`);
    }
  }
};

/** Collects the products of the animal in a plushie (startup_scripts/plushies/plushieHusbandry.js). */
global.autoGrabPlushie = (entity, owner, plushie) => {
  const { block, level } = entity;
  const fuel = block.getEntity().attachments.get("inventory");
  if (global.countInHandler(fuel, "society:sparkstone") < 1) return;
  const result = global.harvestPlushieAnimal(level, plushie, {
    player: owner,
    stages: global.getBlockEntityStages(entity),
    milk: true,
    shear: global.isBlockPropertyTrue(level.getBlock(block.getPos()), "upgraded"),
  });
  if (!result) return;
  result.stacks.forEach((stack) => {
    if (grabberDeliver(level, block, fuel, [stack])) {
      let { x, y, z } = plushie;
      level.spawnParticles("minecraft:happy_villager", true, x + 0.5, y + 1, z + 0.5, 0.3, 0.3, 0.3, 3, 0.01);
    }
  });
};

global.runAutoGrabber = (entity) => {
  const { block, level } = entity;
  const owner = global.cacheOwner(entity, autoGrabberOwnerStages);
  global.getAnimalsAround(level, block, 5).forEach((animal) => global.autoGrabAnimal(entity, owner, animal));
  global.getPlushieAnimalsAround(level, block, 5).forEach((plushie) => global.autoGrabPlushie(entity, owner, plushie));
};

StartupEvents.registry("block", (event) => {
  event
    .create("society:auto_grabber", "cardinal")
    .displayName("Auto-Grabber")
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .box(0, 0, 0, 16, 30, 16)
    .defaultCutout()
    // Placeholder model: tools/port/assets/make_machine_placeholder.py --single.
    .modelGenerator((m) => m.parent("society:block/kubejs/auto_grabber/auto_grabber"))
    .property(upgradedProperty)
    .defaultState((state) => {
      state.set(upgradedProperty, false);
    })
    .placementState((state) => {
      state.set(upgradedProperty, false);
    })
    .item((item) => {
      item.tooltip(Text.translatable("block.society.auto_grabber.description").gray());
      item.tooltip(Text.translatable("society.working_block_entity.apply_player_skill").gray());
      item.tooltip(Text.translatable("block.society.auto_grabber.description.upgrade").gold());
      item.tooltip(Text.translatable("tooltip.society.area", "11x11x11").green());
      item.tooltip(Text.translatable("block.society.auto_grabber.description.fuel").lightPurple());
      item.parentModel("society:block/kubejs/auto_grabber/auto_grabber");
    })
    .blockEntity((blockInfo) => {
      blockInfo.inventory("inventory", [], 9, 2);
      blockInfo.rightClickOpensInventory("inventory");
      blockInfo.initialData({ owner: "-1" });
      blockInfo.serverTicking();
      blockInfo.tickFrequency(600);
    });
});
// Tick: server_scripts/blockEvents/machineTicks.js
