console.info("[SOCIETY] animalInteractions.js loaded");

// Right-clicking a farm animal or pet: pet, check, feed, milk, collect drops, Magic Shears and the animal upgrades.
// Called from server_scripts/entities/animalBase.js. The player can be a fake player (Auto-Petter).

const $AnimalDataComponents = Java.loadClass("net.minecraft.core.component.DataComponents");

const husbandryKnives = [
  "bakery:bread_knife",
  "farmersdelight:iron_knife",
  "farmersdelight:diamond_knife",
  "farmersdelight:netherite_knife",
  "farmersdelight:golden_knife",
  "farmersdelight:flint_knife",
  "aquaculture:wooden_fillet_knife",
  "aquaculture:stone_fillet_knife",
  "aquaculture:iron_fillet_knife",
  "aquaculture:gold_fillet_knife",
  "aquaculture:neptunium_fillet_knife",
  "aquaculture:diamond_fillet_knife",
  "refurbished_furniture:knife",
];

const feedAffection = {
  "society:animal_feed": 10,
  "society:candied_animal_feed": 100,
  "society:mana_feed": 30,
};

const dropAtPlayer = (level, player, stack) => {
  const entity = level.createEntity("minecraft:item");
  entity.x = player.x;
  entity.y = player.y;
  entity.z = player.z;
  entity.item = stack;
  entity.spawn();
};

const playAnimalSound = (server, sound, entity, volume) => {
  server.runCommandSilent(`playsound ${sound} block @a ${entity.x} ${entity.y} ${entity.z}${volume ? ` ${volume}` : ""}`);
};

/** New animals start with 1 affection and "yesterday" for every daily action. */
global.initializeFarmAnimal = (day, target, level) => {
  const data = target.persistentData;
  if (!global.animalInt(data, "affection")) {
    global.setAnimalInt(data, "affection", 1);
    level.spawnParticles("minecraft:heart", true, target.x, target.y + 1.5, target.z, 0, 0.1, 0, 1, 0.01);
  }
  const newBaseDay = day - 1;
  ["ageLastPet", "ageLastFed", "ageLastDroppedSpecial", "ageLastMagicHarvested", "ageLastMoodSet", "ageLastBred"].forEach((key) => {
    if (!global.animalInt(data, key)) global.setAnimalInt(data, key, newBaseDay);
  });
  if (!global.animalInt(data, "ageLastMilked") && global.checkEntityTag(target, "society:milkable_animal")) {
    global.setAnimalInt(data, "ageLastMilked", newBaseDay);
  }
};

// Anti-frustration: when the day went backwards (time commands), reset the daily actions to yesterday.
const handleFarmAnimalBackwardsCompat = (target, day) => {
  const data = target.persistentData;
  const ageLastPet = global.animalInt(data, "ageLastPet");
  if (day < ageLastPet || ageLastPet - day > 5000) {
    ["ageLastPet", "ageLastMagicHarvested", "ageLastMilked", "ageLastDroppedSpecial", "ageLastBred", "ageLastFed", "ageLastMoodSet"].forEach(
      (key) => global.setAnimalInt(data, key, day - 1)
    );
  }
};

/** "Name ☺ ❤❤❤❤♡♡♡♡♡♡" in the action bar. */
global.getAnimalStatusText = (name, data, mood, hearts, color) => {
  const icons = [];
  if (mood < 64) icons.push("☹");
  if (mood > 160) icons.push("☺");
  if (global.animalFlag(data, "animalCracker")) icons.push("🡅");
  if (global.animalFlag(data, "clockwork")) icons.push("⚙");
  if (global.animalFlag(data, "bff")) icons.push("❤");
  if (global.animalFlag(data, "bribed")) icons.push("💰");
  return Text.empty()
    .append(name.copy().withColor(color || 0x55ff55))
    .append(Text.of(icons.length > 0 ? ` ${icons.join(" ")} ` : " "))
    .append(Text.of(`§c${"❤".repeat(hearts)}§8${"❤".repeat(10 - hearts)}`));
};

const handlePet = (name, data, mood, day, peckish, hungry, e) => {
  const { player, item, target, level, server } = e;
  const ageLastPet = global.animalInt(data, "ageLastPet");
  const hearts = global.getHearts(data);
  let affectionIncreaseMult = player.stages.has("animal_whisperer") || global.animalFlag(data, "bribed") ? 2 : 1;
  if (player.stages.has("animal_fancy")) affectionIncreaseMult += 1;
  let affectionIncrease = 10 * affectionIncreaseMult;
  if (target.isBaby()) affectionIncrease = affectionIncrease * (player.stages.has("fostering") ? 10 : 2);
  const clockwork = global.animalFlag(data, "clockwork");

  if (day > ageLastPet) {
    const livableArea = global.getAnimalIsNotCramped(target, 1.1);
    if (!player.isFake()) global.addAffection(data, affectionIncrease);
    if (hungry || (!clockwork && player.isFake()) || !livableArea) global.addAffection(data, hungry ? -15 : -25);
    global.setAnimalInt(data, "ageLastPet", day);
    level.spawnParticles(
      (!clockwork && player.isFake()) || hungry ? "minecraft:angry_villager" : "minecraft:heart",
      true, target.x, target.y + 1.5, target.z, 0, 0.1, 0, 1, 0.01
    );
    global.giveExperience(server, player, "husbandry", Math.max(10, 20 * hearts));
    let errorText = null;
    if (!livableArea && !clockwork) errorText = Text.translatable("society.husbandry.crowded", name).red();
    if (!hungry && peckish && !item.hasTag("society:animal_feed")) {
      errorText = Text.translatable("society.husbandry.peckish", name).gold();
    }
    if (hungry) errorText = Text.translatable("society.husbandry.starved", name).red();
    if (errorText) global.sendAnimalMessage(player, errorText);
  } else if (item.isEmpty() || String(item.id) === "society:mood_scanner") {
    let color;
    if (peckish) color = 0xffaa00;
    if (hungry) color = 0xff5555;
    global.sendAnimalMessage(player, global.getAnimalStatusText(name, data, mood, hearts, color));
  }
  // More hearts, more health.
  const affectionHealth = hearts * 4;
  if (target.maxHealth < affectionHealth) {
    target.setMaxHealth(affectionHealth);
    target.setHealth(affectionHealth);
  }
};

const handleMilk = (name, data, day, hungry, e) => {
  const { player, item, target, level, server } = e;
  if (global.isItemOnCooldown(player, item)) return;
  if (player.isFake() && global.animalInt(data, "affection") < 100) return;
  const milk = global.getMilk(level, target, player, day, true, player.stages);
  if (milk) {
    dropAtPlayer(level, player, milk);
    playAnimalSound(server, "minecraft:entity.cow.milk", player);
    global.giveExperience(server, player, "husbandry", 30);
    level.spawnParticles("minecraft:note", true, target.x, target.y + 1.5, target.z, 0.3, 0.3, 0.3, 3, 0.01);
    return;
  }
  let key = "society.husbandry.action.cooldown_1";
  if (target.isBaby()) key = "society.husbandry.action.young";
  else if (hungry) key = "society.husbandry.action.hungry";
  global.sendAnimalMessage(player, Text.translatable(key, name).red());
};

const handleFeed = (data, day, e) => {
  const { player, item, target, level, server } = e;
  if (global.isItemOnCooldown(player, item)) return;
  if (day <= global.animalInt(data, "ageLastFed")) return;
  let affectionIncreaseMult = player.stages.has("animal_whisperer") || global.animalFlag(data, "bribed") ? 2 : 1;
  if (player.stages.has("animal_fancy")) affectionIncreaseMult += 0.5;
  playAnimalSound(server, "minecraft:entity.generic.eat", player);
  target.heal(4);
  global.giveExperience(server, player, "husbandry", 20);
  global.addAffection(data, Math.min((feedAffection[String(item.id)] || 10) * affectionIncreaseMult, 100));
  global.setAnimalInt(data, "ageLastFed", day);
  level.spawnParticles("minecraft:happy_villager", true, target.x, target.y + 1.5, target.z, 0.3, 0.3, 0.3, 5, 0.01);
  item.shrink(1);
  global.addItemCooldown(player, item, 10);
};

const handleSheepMagicShears = (e) => {
  const { target, level, server } = e;
  if (!target.readyForShearing()) return;
  target.setSheared(true);
  const wool = `minecraft:${target.getColor().getName()}_wool`;
  const count = Math.ceil(Math.random() * 4);
  let woolEntity;
  for (let i = 0; i < count; i++) {
    woolEntity = level.createEntity("minecraft:item");
    woolEntity.x = target.x + Math.random() * 0.5;
    woolEntity.y = target.y + 0.5;
    woolEntity.z = target.z + Math.random() * 0.5;
    woolEntity.item = Item.of(wool);
    woolEntity.spawn();
  }
  playAnimalSound(server, "minecraft:entity.sheep.shear", target);
};

const handleMagicHarvest = (name, data, e) => {
  const { player, level, target, item, server } = e;
  if (global.isItemOnCooldown(player, item)) return;
  if (["minecraft:sheep", "wildernature:minisheep"].includes(global.entityTypeId(target))) handleSheepMagicShears(e);
  const loot = global.getMagicShearsOutput(level, target, player, player.stages);
  if (loot) {
    playAnimalSound(server, "minecraft:entity.sheep.shear", player);
    global.giveExperience(server, player, "husbandry", 15);
    loot.forEach((stack) => dropAtPlayer(level, player, stack));
    global.addItemCooldown(player, item, 1);
    return;
  }
  const key = global.getHearts(data) < 5 ? "society.husbandry.action.need_hearts" : "society.husbandry.action.cooldown_2";
  global.sendAnimalMessage(player, Text.translatable(key, name).red());
  global.addItemCooldown(player, item, 10);
};

const upgradeAnimal = (level, server, item, target, sound, particle) => {
  item.shrink(1);
  playAnimalSound(server, sound, target);
  level.spawnParticles(particle, true, target.x, target.y + 1.5, target.z, 0.3, 0.3, 0.3, 3, 0.01);
};

/** The husbandry part of a right-click on an animal; e = {hand, player, item, target, level, server}. */
global.handleHusbandryBase = (e) => {
  const { hand, player, item, target, level, server } = e;
  if (String(hand) !== "MAIN_HAND") return;
  const pet = global.checkEntityTag(target, "society:pet_animal");
  if (!pet && !global.checkEntityTag(target, "society:husbandry_animal")) return;
  if (String(item.id) === "society:sunlit_crystal") return;
  // One tick later, so vanilla interactions (name tags, breeding) have run first.
  const event = { hand: hand, player: player, item: item, target: target, level: level, server: server };
  server.scheduleInTicks(1, () => global.runHusbandryInteraction(event, pet));
};

global.runHusbandryInteraction = (e, pet) => {
  const { player, item, target, level, server } = e;
  const itemId = String(item.id);
  const stages = player.stages;
  const day = global.getDay(level);
  handleFarmAnimalBackwardsCompat(target, day);
  global.initializeFarmAnimal(day, target, level);
  const data = target.persistentData;
  const name = target.getName();
  const ageLastFed = global.animalInt(data, "ageLastFed");
  const peckish = !pet && day - ageLastFed == 1;
  const hungry = !pet && day - ageLastFed > 1;
  const hearts = global.getHearts(data);
  player.swing();
  const mood = global.getOrFetchMood(level, target, day, player, false, true);
  // A sad animal sometimes withholds its produce.
  const lostProduce = mood < 64 && Math.random() < mood / 64;
  handlePet(name, data, mood, day, peckish, hungry, e);
  if (pet) return;
  if (item.hasTag("society:animal_feed")) handleFeed(data, day, e);
  if (!lostProduce) {
    if (itemId === "society:milk_pail" && global.checkEntityTag(target, "society:milkable_animal")) {
      handleMilk(name, data, day, hungry, e);
    }
    global.rollSpecialDrops(level, target, player, stages).forEach((stack) => {
      dropAtPlayer(level, player, stack);
      playAnimalSound(server, "minecraft:entity.item.pickup", player);
      global.giveExperience(server, player, "husbandry", 60);
      level.spawnParticles("minecraft:happy_villager", true, target.x, target.y + 1, target.z, 0.4, 0.4, 0.4, 3, 0.01);
    });
  }
  if (stages.has("biomancer") && husbandryKnives.includes(itemId) && !global.isItemOnCooldown(player, item)) {
    if (hearts < 5) {
      global.sendAnimalMessage(player, Text.translatable("society.husbandry.action.need_hearts", name).red());
    } else if (global.itemExists("quark:diamond_heart")) {
      dropAtPlayer(level, player, Item.of("quark:diamond_heart"));
      playAnimalSound(server, "minecraft:entity.sheep.shear", player);
      level.spawnParticles("minecraft:angry_villager", true, target.x, target.y + 1.5, target.z, 0.4, 0.4, 0.4, 5, 0.01);
      global.addAffection(data, -100);
      global.addItemCooldown(player, item, 5);
    }
  }
  if (stages.has("bribery") && itemId === "numismatics:crown" && !global.animalFlag(data, "bribed") && !global.isItemOnCooldown(player, item)) {
    global.setAnimalFlag(data, "bribed", true);
    global.addAffection(data, 100);
    item.shrink(1);
    playAnimalSound(server, "minecraft:entity.player.levelup", player);
    level.spawnParticles("minecraft:wax_on", true, target.x, target.y + 1.5, target.z, 0.2, 0.2, 0.2, 5, 0.01);
    global.addItemCooldown(player, item, 1);
  }
  if (stages.has("clockwork") && itemId === "create:precision_mechanism" && !global.animalFlag(data, "clockwork")) {
    global.setAnimalFlag(data, "clockwork", true);
    upgradeAnimal(level, server, item, target, "minecraft:block.vault.activate", "minecraft:explosion");
    if (global.animalFlag(data, "bff")) {
      global.setAnimalFlag(data, "bff", false);
      global.sendAnimalMessage(player, Text.translatable("society.husbandry.mechanization").red());
    }
  }
  if (stages.has("husbandry_mastery") && itemId === "society:animal_cracker" && !global.animalFlag(data, "animalCracker")) {
    global.setAnimalFlag(data, "animalCracker", true);
    playAnimalSound(server, "minecraft:entity.generic.eat", player);
    upgradeAnimal(level, server, item, target, "minecraft:entity.player.levelup", "minecraft:happy_villager");
  }
  if (stages.has("bff") && itemId === "society:friendship_necklace" && !global.animalFlag(data, "bff")) {
    global.setAnimalFlag(data, "bff", true);
    upgradeAnimal(level, server, item, target, "minecraft:entity.allay.item_given", "minecraft:heart");
    if (global.animalFlag(data, "clockwork")) {
      global.setAnimalFlag(data, "clockwork", false);
      global.sendAnimalMessage(player, Text.translatable("society.husbandry.emancipation").green());
    }
  }
  if (stages.has("transplanting") && itemId === "quark:diamond_heart" && hearts < 10 && !global.isItemOnCooldown(player, item)) {
    global.addAffection(data, 100);
    if (!player.isCreative()) item.shrink(1);
    playAnimalSound(server, "aquaculture:fish_flop", player);
    level.spawnParticles("minecraft:heart", true, target.x, target.y + 1.5, target.z, 0.4, 0.4, 0.4, 5, 0.01);
    global.addItemCooldown(player, item, 1);
  }
  if (!lostProduce && itemId === "society:magic_shears") handleMagicHarvest(name, data, e);
};

const breedingItems = [
  "minecraft:carrot",
  "minecraft:wheat",
  "minecraft:beetroot",
  "minecraft:potato",
  "farmersdelight:cabbage_seeds",
  "vintagedelight:ghost_pepper_seeds",
  "vintagedelight:cucumber_seeds",
  "supplementaries:flax_seeds",
  "minecraft:beetroot_seeds",
  "minecraft:wheat_seeds",
  "minecraft:pumpkin_seeds",
  "minecraft:torchflower_seeds",
  "farmersdelight:tomato_seeds",
  "society:tubabacco_seed",
  "society:ancient_fruit_seeds",
  "society:blueberry_seeds",
  "minecraft:dandelion",
  "minecraft:golden_carrot",
];

/** Farm animals only breed with a Miracle Potion. Returns true when the vanilla interaction must be cancelled. */
global.handleAnimalBreeding = (e) => {
  const { hand, player, item, target, level, server } = e;
  if (global.isItemOnCooldown(player, item)) return false;
  if (!global.checkEntityTag(target, "society:husbandry_animal") || target.isBaby()) return false;
  const itemId = String(item.id);
  if (breedingItems.includes(itemId)) {
    global.sendAnimalMessage(player, Text.translatable("society.husbandry.breeding.need_potion").red());
    return true;
  }
  if (String(hand) !== "MAIN_HAND" || itemId !== "society:miracle_potion") return false;
  if (global.checkEntityTag(target, "society:infertile")) {
    global.sendAnimalMessage(player, Text.translatable("society.husbandry.breeding.infertile").red());
    return true;
  }
  const data = target.persistentData;
  const day = global.getDay(level);
  let ageLastBred = global.animalInt(data, "ageLastBred");
  if (global.isFresh(day, ageLastBred)) ageLastBred = 0;
  if (day <= ageLastBred) return false;
  if (target.isInLove()) {
    global.addItemCooldown(player, "society:miracle_potion", 40);
    global.sendAnimalMessage(player, Text.translatable("society.husbandry.breeding.cooldown").red());
    return false;
  }
  item.shrink(1);
  global.setAnimalInt(data, "ageLastBred", day);
  if (["crittersandcompanions:red_panda", "minecraft:panda"].includes(global.entityTypeId(target)) && Math.random() > 0.2) {
    global.sendAnimalMessage(player, Text.translatable("society.husbandry.breeding.fail").red());
    return false;
  }
  target.setInLoveTime(2000);
  level.spawnParticles("minecraft:heart", true, target.x, target.y + 1.5, target.z, 0.4, 0.4, 0.4, 12, 0.01);
  global.giveExperience(server, player, "husbandry", 80);
  player.swing();
  global.addItemCooldown(player, item, 10);
  return false;
};

/** Pets give a gift once, at max affection. */
global.handlePetGift = (e) => {
  const { hand, player, level, target } = e;
  if (String(hand) !== "MAIN_HAND" || !global.checkEntityTag(target, "society:pet_animal")) return;
  const data = target.persistentData;
  if (global.animalFlag(data, "gifted") || global.animalInt(data, "affection") < 1000) return;
  const type = global.entityTypeId(target);
  const entry = global.petGifts.filter((gift) => gift.animal === type)[0];
  const gifts = entry ? entry.gifts.filter((id) => global.itemExists(id)) : [];
  global.setAnimalFlag(data, "gifted", true);
  global.sendAnimalMessage(player, Text.translatable("society.husbandry.pet.max_affection").gold());
  if (gifts.length > 0) dropAtPlayer(level, player, Item.of(gifts[Math.floor(Math.random() * gifts.length)]));
  level.spawnParticles("minecraft:heart", true, target.x, target.y + 1.5, target.z, 0.6, 0.6, 0.6, 20, 0.01);
};

/** Naming an animal with a name tag for the first time adds affection. */
global.handleAnimalNaming = (e) => {
  const { hand, player, item, target, level, server } = e;
  if (String(hand) !== "MAIN_HAND" || String(item.id) !== "minecraft:name_tag") return;
  if (!global.checkEntityTag(target, "society:husbandry_animal") && !global.checkEntityTag(target, "society:pet_animal")) return;
  if (target.hasCustomName() || !item.has($AnimalDataComponents.CUSTOM_NAME)) return;
  global.addAffection(target.persistentData, player.stages.has("no_name_for_the_sheep") ? 200 : 100);
  playAnimalSound(server, "minecraft:entity.allay.item_given", player);
  level.spawnParticles("minecraft:heart", true, target.x, target.y + 1.5, target.z, 0.6, 0.6, 0.6, 10, 0.01);
};

/** Mood Scanner: tells the player every mood reason. */
global.handleMoodScanner = (e) => {
  const { hand, level, target, item, player, server } = e;
  if (String(hand) !== "MAIN_HAND" || String(item.id) !== "society:mood_scanner") return;
  if (!global.checkEntityTag(target, "society:husbandry_animal") || global.isItemOnCooldown(player, item)) return;
  player.tell(
    Text.empty()
      .gray()
      .append(Text.of("==[ "))
      .append(Text.translatable("society.husbandry.mood.meter_header", target.getName()).gold())
      .append(Text.of(" ]=="))
  );
  global.getOrFetchMood(level, target, global.getDay(level), player, true);
  playAnimalSound(server, "minecraft:block.note_block.chime", target);
  global.addItemCooldown(player, item, 10);
};
