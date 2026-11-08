console.info("[SOCIETY] plushieHusbandry.js loaded");

// Plushie husbandry (#14). A Sunlit Crystal houses a 10-heart farm animal in a 4-heart plushie held in the off hand.
// An animal in a plushie is never hungry, always in the best mood and keeps its affection. Right-clicking the
// placed plushie collects its daily drops (with a Milk Pail also its milk, with Magic Shears also its loot) and
// Auto-Grabbers collect them too. The plushie's trait changes the products (getPlushieModifiers). The Plushie
// Wand lets the animal out again. Events: server_scripts/blockEvents/plushieEvents.js and
// server_scripts/entities/animalSunlitCrystal.js.
//
// The animal is kept as a JSON string under "animal" in the plushie's block entity data and item custom data:
// { type, name, ageLastMilked, ageLastDroppedSpecial, ageLastMagicHarvested, clockwork, bribed, bff, animalCracker }.
// To reuse the husbandry code (globalAnimalHandlers.js) the products are rolled on an animal entity that is
// created for it and never added to the world.
// Not ported from 1.20.1: animal upgrades (clockwork, ...) on a housed animal, the Sommelier trait processing
// daily drops (it still turns milk into cheese) and the animal's variant.

const PLUSHIE_ANIMAL_DAYS = ["ageLastMilked", "ageLastDroppedSpecial", "ageLastMagicHarvested"];
const PLUSHIE_ANIMAL_FLAGS = ["clockwork", "bribed", "bff", "animalCracker"];

/** The animal in a plushie (parsed "animal" data), or null. */
global.parsePlushieAnimal = (raw) => {
  if (!raw) return null;
  // Rhino rejects a const declared inside this try ("redeclaration of var").
  let parsed = null;
  try {
    parsed = JSON.parse(String(raw));
  } catch (e) {
    console.warn(`[SOCIETY] bad plushie animal data ${raw}: ${e}`);
  }
  return parsed && parsed.type ? parsed : null;
};

global.getPlushieBlockAnimal = (block) => global.parsePlushieAnimal(global.getMachineString(block, "animal"));

/** The plushie data of a farm animal entity, as a Sunlit Crystal stores it. */
global.plushieAnimalFromEntity = (entity) => {
  const data = entity.persistentData;
  const animal = { type: global.entityTypeId(entity) };
  if (entity.hasCustomName()) animal.name = String(entity.getCustomName().getString());
  PLUSHIE_ANIMAL_DAYS.forEach((key) => {
    if (data.contains(key)) animal[key] = global.animalInt(data, key);
  });
  PLUSHIE_ANIMAL_FLAGS.forEach((key) => {
    if (global.animalFlag(data, key)) animal[key] = true;
  });
  return animal;
};

/** Writes the plushie data of an animal into a (new or released) animal entity. */
const writePlushieAnimal = (entity, animal, day) => {
  const data = entity.persistentData;
  global.setAnimalInt(data, "affection", 1000);
  global.setAnimalInt(data, "ageLastFed", day);
  global.setAnimalInt(data, "ageLastPet", day);
  PLUSHIE_ANIMAL_DAYS.forEach((key) => {
    if (animal[key] !== undefined) global.setAnimalInt(data, key, animal[key]);
  });
  PLUSHIE_ANIMAL_FLAGS.forEach((key) => {
    if (animal[key]) global.setAnimalFlag(data, key, true);
  });
};

/** How the plushie's trait changes the products of the animal inside. */
global.getPlushieModifiers = (level, plushie, block) => {
  const mods = { newDrops: [], doubleDrops: false, resetDay: false, probabilityIncrease: 0, processItems: false };
  const qualityMult = plushie.quality + 1;
  const roll = Math.random();
  const drop = (count, id) => {
    if (global.itemExists(id)) mods.newDrops.push(Item.of(id, count));
  };
  switch (plushie.type) {
    case 0: // Aquatic
      if (roll < 0.05 * qualityMult) drop(1, Math.random() < 0.5 ? "society:river_jelly" : "society:ocean_jelly");
      break;
    case 1: {
      // Woodsy
      const logs = global.getTaggedBlocksInRadius(level, "society:raw_logs", block, 3, true);
      if (logs.length > 0) drop(qualityMult * 8, logs[Math.floor(Math.random() * logs.length)]);
      break;
    }
    case 2: // Eldritch
      drop(qualityMult, "oreganized:raw_silver");
      break;
    case 3: // Wrathful
      drop(qualityMult * 3, "oreganized:raw_lead");
      break;
    case 4: // Sommelier
      if (roll < 0.25 * qualityMult) mods.processItems = true;
      break;
    case 5: // Sunlit
      if (roll < 0.05 * qualityMult) drop(1, "society:sunlit_crystal");
      break;
    case 6: // Hungry
      if (roll < 0.1 * qualityMult) mods.resetDay = true;
      break;
    case 7: // Anxious
      mods.probabilityIncrease = 0.25 * qualityMult;
      break;
    case 8: // Shy
      if (global.getTaggedBlocksInRadius(level, "society:plushies", block, 3 - (qualityMult - 1)) === 1) {
        mods.doubleDrops = true;
      }
      break;
    case 9: // Cheerful
      if (global.getTaggedBlocksInRadius(level, "society:plushies", block, 2) > 28 - 4 * qualityMult) {
        mods.doubleDrops = true;
      }
      break;
    case 10: // Chill
      drop(qualityMult, "society:pristine_diamond");
      break;
    case 11: // Machiavellian
      drop(qualityMult, "minecraft:netherite_scrap");
      break;
    case 12: // Cutesy
      drop(qualityMult, "society:furniture_box");
      break;
    case 13: // Fashionista
      if (global.getTaggedBlocksInRadius(level, "society:loot_furniture", block, 2) >= 28 - 4 * qualityMult) {
        mods.doubleDrops = true;
      }
      break;
    default: // Neutral
      if (roll < 0.1 * qualityMult) mods.doubleDrops = true;
      break;
  }
  return mods;
};

const doublePlushieStacks = (stacks) => {
  const doubled = [];
  stacks.forEach((stack) => {
    if (stack.count * 2 <= stack.maxStackSize) doubled.push(stack.copyWithCount(stack.count * 2));
    else {
      doubled.push(stack);
      doubled.push(stack.copy());
    }
  });
  return doubled;
};

/** Sommelier: milk becomes the cheese the Cheese Press makes of it. */
const processPlushieMilk = (milk) => {
  const recipe = global.cheesePressRecipes && global.cheesePressRecipes.get(String(milk.id));
  if (!recipe) return milk;
  const cheese = Item.of(recipe.output[0]);
  return global.withItemQuality(cheese.copyWithCount(cheese.count * milk.count), global.getItemQuality(milk));
};

/**
 * Collects the products of the animal in a placed plushie and saves the days it gave them.
 * @param options {player, stages, milk, shear}: milk/shear also milk it or use Magic Shears on it
 * @returns {{stacks: Internal.ItemStack[], milked: boolean, sheared: boolean, reset: boolean}|null} null without an animal
 */
global.harvestPlushieAnimal = (level, block, options) => {
  const animal = global.getPlushieBlockAnimal(block);
  if (!animal || !global.entityExists(animal.type)) return null;
  const day = global.getDay(level);
  const player = options.player || null;
  const stages = options.stages || global.NO_STAGES;
  const mods = global.getPlushieModifiers(level, global.getPlushieBlockData(block), block);
  const entity = level.createEntity(animal.type);
  entity.setPos(block.x + 0.5, block.y, block.z + 0.5);
  writePlushieAnimal(entity, animal, day);
  global.setAnimalFlag(entity.persistentData, "plushie", true);

  let stacks = [];
  let milked = false;
  let sheared = false;
  if (options.milk && global.checkEntityTag(entity, "society:milkable_animal")) {
    let milk = global.getMilk(level, entity, player, day, false, stages);
    if (milk) {
      stacks.push(mods.processItems ? processPlushieMilk(milk) : milk);
      milked = true;
    }
  }
  global.rollSpecialDrops(level, entity, player, stages, mods.probabilityIncrease).forEach((s) => stacks.push(s));
  if (options.shear) {
    let loot = global.getMagicShearsOutput(level, entity, player, stages);
    if (loot) {
      loot.forEach((s) => stacks.push(s));
      sheared = true;
    }
  }
  if (mods.doubleDrops) stacks = doublePlushieStacks(stacks);
  const gotSomething = stacks.length > 0 || milked || sheared;
  // The extra drops of a trait come with the daily drops.
  const droppedToday = global.animalInt(entity.persistentData, "ageLastDroppedSpecial") === day;
  if (droppedToday && Number(animal.ageLastDroppedSpecial) !== day) mods.newDrops.forEach((s) => stacks.push(s));

  // Hungry: sometimes the animal is ready again at once.
  if (!mods.resetDay) {
    PLUSHIE_ANIMAL_DAYS.forEach((key) => (animal[key] = global.animalInt(entity.persistentData, key)));
    global.setMachineData(block, { animal: JSON.stringify(animal) });
  }
  return { stacks: stacks, milked: milked, sheared: sheared, reset: mods.resetDay && gotSomething };
};

/** Lets the animal out of a placed plushie next to it. Returns the new animal entity, or null. */
global.releasePlushieAnimal = (level, block) => {
  const animal = global.getPlushieBlockAnimal(block);
  if (!animal || !global.entityExists(animal.type)) return null;
  const entity = level.createEntity(animal.type);
  entity.setPos(block.x + 0.5, block.y + 1, block.z + 0.5);
  if (animal.name) entity.setCustomName(Text.of(animal.name));
  writePlushieAnimal(entity, animal, global.getDay(level));
  entity.spawn();
  global.setMachineData(block, { animal: "" });
  return entity;
};

/** Why a Sunlit Crystal cannot house this animal in this plushie (a lang key), or "" when it can. */
global.getSunlitCrystalError = (animal, plushie) => {
  if (!plushie.hasTag("society:plushies")) return "society.husbandry.sunlit_crystal.not_plushie";
  const data = global.getPlushieItemData(plushie);
  if (!data || data.affection < 4) return "society.husbandry.sunlit_crystal.not_enough_plushie_affection";
  if (data.animal) return "society.husbandry.sunlit_crystal.has_animal";
  if (global.animalInt(animal.persistentData, "affection") < 1000) {
    return "society.husbandry.sunlit_crystal.not_enough_animal_affection";
  }
  return "";
};

const PLUSHIE_ANIMAL_PARTICLES = (level, x, y, z, particle) => {
  level.spawnParticles(particle, true, x, y, z, 0.3, 0.3, 0.3, 10, 0.02);
};

/**
 * A player right-clicks a placed plushie that houses an animal: the wand lets it out, an empty hand shows it and
 * any click collects its products (with a Milk Pail its milk, with Magic Shears its loot). Returns true when the
 * click was used.
 */
global.handlePlushieAnimalClick = (player, block, item) => {
  const level = block.level;
  const server = level.server;
  const animal = global.getPlushieBlockAnimal(block);
  if (!animal) return false;
  const itemId = String(item.id);
  if (itemId === "society:plushie_wand") {
    if (global.releasePlushieAnimal(level, block)) {
      server.runCommandSilent(`playsound minecraft:block.amethyst_block.chime block @a ${block.x} ${block.y} ${block.z}`);
      PLUSHIE_ANIMAL_PARTICLES(level, block.x + 0.5, block.y + 1, block.z + 0.5, "minecraft:end_rod");
    }
    global.addItemCooldown(player, item, 5);
    return true;
  }
  if (item.isEmpty()) {
    const name = animal.name ? Text.of(animal.name) : Text.translatable(`entity.${animal.type.replace(":", ".")}`);
    global.sendAnimalMessage(player, Text.translatable("tooltip.society.plushies.animal_type").append(Text.gold(name)));
  }
  const result = global.harvestPlushieAnimal(level, block, {
    player: player,
    stages: player.stages,
    milk: itemId === "society:milk_pail",
    shear: itemId === "society:magic_shears",
  });
  if (!result) return false;
  result.stacks.forEach((stack) => player.give(stack));
  if (result.milked) server.runCommandSilent(`playsound minecraft:entity.cow.milk block @a ${player.x} ${player.y} ${player.z}`);
  if (result.sheared) {
    server.runCommandSilent(`playsound minecraft:entity.sheep.shear block @a ${player.x} ${player.y} ${player.z}`);
    global.addItemCooldown(player, item, 1);
  }
  if (result.stacks.length > 0) PLUSHIE_ANIMAL_PARTICLES(level, block.x + 0.5, block.y + 1, block.z + 0.5, "minecraft:note");
  if (result.reset) PLUSHIE_ANIMAL_PARTICLES(level, block.x + 0.5, block.y + 0.5, block.z + 0.5, "minecraft:smoke");
  return result.milked || result.sheared || itemId === "society:milk_pail" || itemId === "society:magic_shears";
};

/** Sunlit Crystal: houses the clicked animal in the plushie in the player's off hand. Returns true when it did. */
global.useSunlitCrystal = (player, crystal, target) => {
  if (!global.checkEntityTag(target, "society:husbandry_animal")) return false;
  const plushie = player.getOffHandItem();
  const error = global.getSunlitCrystalError(target, plushie);
  if (error) {
    global.sendAnimalMessage(player, Text.translatable(error).red());
    return false;
  }
  const data = global.getPlushieItemData(plushie);
  data.animal = JSON.stringify(global.plushieAnimalFromEntity(target));
  if (!player.isCreative()) crystal.shrink(1);
  player.give(global.plushieItem(String(plushie.id), data));
  plushie.shrink(1);
  const level = target.level;
  level.server.runCommandSilent(`playsound minecraft:block.amethyst_block.resonate block @a ${player.x} ${player.y} ${player.z}`);
  PLUSHIE_ANIMAL_PARTICLES(level, target.x, target.y + 1, target.z, "minecraft:end_rod");
  target.discard();
  return true;
};

/** The placed plushies with an animal inside within `radius` of a block. */
global.getPlushieAnimalsAround = (level, block, radius) => {
  const found = [];
  const { x, y, z } = block;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        let scanned = level.getBlock(x + dx, y + dy, z + dz);
        if (scanned.hasTag("society:plushies") && global.getPlushieBlockAnimal(scanned)) found.push(scanned);
      }
    }
  }
  return found;
};
