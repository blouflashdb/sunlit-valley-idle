console.info("[SOCIETY] globalAnimalHandlers.js loaded");

/*
 * Husbandry: affection (hearts), mood, feeding, milking, special drops and Magic Shears for farm animals.
 *
 * Ported from 1.20.1. Differences:
 * - Animal data lives in the entity's persistent data (CompoundTag); it is read with getInt/getBoolean and written
 *   with putInt/putBoolean, so 1.20.1 worlds would keep their values (the keys are the same).
 * - Animals from mods that are not in the 1.21.1 pack are skipped (global.entityExists) and drops of items that do
 *   not exist are skipped (global.itemExists).
 * - Plushie husbandry (an animal stored in a plushie) is not ported yet; the plushie code paths are gone.
 * - Messages go to the action bar instead of the Ember's Text API / Paint overlays.
 */

const $AnimalRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $AnimalRegistryKeys = Java.loadClass("net.minecraft.core.registries.Registries");
const $AnimalTagKey = Java.loadClass("net.minecraft.tags.TagKey");
const $AnimalResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");
const $AnimalResourceKey = Java.loadClass("net.minecraft.resources.ResourceKey");
const $AnimalBlockPos = Java.loadClass("net.minecraft.core.BlockPos");
const $AnimalEffectInstance = Java.loadClass("net.minecraft.world.effect.MobEffectInstance");
const $AnimalEffects = Java.loadClass("net.minecraft.world.effect.MobEffects");
const $AnimalLootParamsBuilder = Java.loadClass("net.minecraft.world.level.storage.loot.LootParams$Builder");
const $AnimalLootContextParams = Java.loadClass("net.minecraft.world.level.storage.loot.parameters.LootContextParams");
const $AnimalLootContextParamSets = Java.loadClass("net.minecraft.world.level.storage.loot.parameters.LootContextParamSets");

const animalTagKeys = {};
const animalTagKey = (registry, tag) => {
  const cacheKey = `${registry}|${tag}`;
  if (!animalTagKeys[cacheKey]) animalTagKeys[cacheKey] = $AnimalTagKey.create(registry, $AnimalResourceLocation.parse(tag));
  return animalTagKeys[cacheKey];
};

global.entityExists = (id) => $AnimalRegistries.ENTITY_TYPE.containsKey($AnimalResourceLocation.parse(String(id)));

/** The entity type id ("minecraft:cow"), or "" for entities without one (players). */
global.entityTypeId = (entity) => {
  if (!entity) return "";
  const id = entity.getEncodeId();
  return id ? String(id) : "";
};

global.checkEntityTag = (entity, checkedTag) => {
  const id = global.entityTypeId(entity);
  if (id === "") return false;
  return $AnimalRegistries.ENTITY_TYPE.get($AnimalResourceLocation.parse(id)).is(animalTagKey($AnimalRegistryKeys.ENTITY_TYPE, checkedTag));
};

/** Sends a husbandry message to the action bar (not to fake players such as the Auto-Petter). */
global.sendAnimalMessage = (player, text) => {
  if (player && !player.isFake()) player.displayClientMessage(text, true);
};

/** Item cooldowns, by item stack or item id; fake players have none. */
global.addItemCooldown = (player, item, ticks) => {
  if (!player || player.isFake()) return;
  const stack = typeof item === "string" ? Item.of(item) : item;
  player.addItemCooldown(stack.getItem(), ticks);
};

global.isItemOnCooldown = (player, item) => player.getCooldowns().isOnCooldown(item.getItem());

global.isFresh = (day, actionAge) => day < actionAge;

// Animal data helpers (entity persistent data).
global.animalInt = (data, key) => Number(data.getInt(key));
global.setAnimalInt = (data, key, value) => data.putInt(key, Math.round(Number(value)));
global.animalFlag = (data, key) => Boolean(data.getBoolean(key));
global.setAnimalFlag = (data, key, value) => data.putBoolean(key, Boolean(value));

/** Affection is capped at 1075 (10 hearts plus a buffer) and never below 0. */
global.addAffection = (data, amount) => {
  global.setAnimalInt(data, "affection", Math.max(0, Math.min(1075, global.animalInt(data, "affection") + amount)));
};

global.getHearts = (data) => Math.max(0, Math.min(10, Math.floor(global.animalInt(data, "affection") / 100)));

global.getAnimalIsNotCramped = (target, scale, applyGlowing) => {
  const entities = [];
  target.level.getEntitiesWithin(target.boundingBox.inflate(scale)).forEach((e) => {
    if (global.checkEntityTag(e, "society:husbandry_animal")) entities.push(e);
  });
  const cramped = entities.length > 5;
  if (cramped && applyGlowing) {
    entities.forEach((entity) => entity.addEffect(new $AnimalEffectInstance($AnimalEffects.GLOWING, 200, 0, false, false)));
  }
  return !cramped;
};

global.isWarpedCow = (target) => {
  if (global.entityTypeId(target) !== "meadow:wooly_cow") return false;
  return Number(target.getNbt().getInt("Variant")) === 2;
};

const getMilkingDefinition = (target) => {
  const type = global.entityTypeId(target);
  const warped = global.isWarpedCow(target);
  return global.husbandryMilkingDefinitions.filter(
    (definition) => definition.animal === type && (definition.warped === undefined || definition.warped === warped)
  )[0];
};

global.getMilkingTimeMult = (target) => {
  const definition = getMilkingDefinition(target);
  return definition ? definition.cooldown : 1;
};

global.getHusbandryQuality = (hearts, mood, milk) => {
  let heartQuality = 0;
  let moodQuality = 0;
  if (hearts > 0) {
    if (hearts >= 10 || (milk && hearts % 5 === 0)) heartQuality = 3;
    else heartQuality = Math.floor((hearts % 11) / 2 - 2);
  }
  if (mood > 224) moodQuality = 3;
  else if (mood > 192) moodQuality = 2;
  else if (mood > 160) moodQuality = 1;
  return Math.min(moodQuality, heartQuality);
};

const animalStack = (count, id, quality) => {
  const stack = Item.of(String(id)).copyWithCount(count);
  return quality > 0 ? global.withItemQuality(stack, quality) : stack;
};

const canMilk = (data, target, day) => {
  const ageLastMilked = global.animalInt(data, "ageLastMilked");
  const dayHasPassed = day > ageLastMilked + global.getMilkingTimeMult(target) - 1;
  const hungry = global.compareDay(day, global.animalInt(data, "ageLastFed"), 1);
  return !target.isBaby() && !hungry && (global.isFresh(day, ageLastMilked) || dayHasPassed);
};

/**
 * The milk an animal gives today, or null.
 * @param {Internal.Player|null} player
 * @param stages player.stages, the Auto-Grabber's owner stages or global.NO_STAGES
 */
global.getMilk = (level, target, player, day, raiseAffection, stages) => {
  const data = target.persistentData;
  if (!canMilk(data, target, day)) return null;
  const definition = getMilkingDefinition(target);
  if (!definition) return null;
  const hearts = global.getHearts(data);
  const mood = global.getOrFetchMood(level, target, day, player);
  if (raiseAffection) global.addAffection(data, stages.has("animal_whisperer") || global.animalFlag(data, "bribed") ? 10 : 5);
  global.setAnimalInt(data, "ageLastMilked", day);
  const large = hearts > 5 && Math.random() < (mood + hearts * 10) / 256;
  const milkId = large ? definition.milk.lg : definition.milk.sm;
  if (!global.itemExists(milkId)) return null;
  const quality = mood >= 160 ? global.getHusbandryQuality(hearts, mood, true) : 0;
  const count = (stages.has("shepherd") ? 2 : 1) * (global.animalFlag(data, "animalCracker") ? 2 : 1);
  return animalStack(count, milkId, quality);
};

/**
 * Rolls the animal's daily special drops (truffles, fine wool, eggs, ...). Returns an array of item stacks and marks
 * the day, or returns an empty array when the animal already dropped today.
 * @param {Internal.Player|null} player a real or fake player (Auto-Petter), or null (Auto-Grabber)
 */
global.rollSpecialDrops = (level, target, player, stages) => {
  const day = global.getDay(level);
  const data = target.persistentData;
  const ageLastDroppedSpecial = global.animalInt(data, "ageLastDroppedSpecial");
  if (!(global.isFresh(day, ageLastDroppedSpecial) || day > ageLastDroppedSpecial)) return [];
  const type = global.entityTypeId(target);
  const hungry = global.compareDay(day, global.animalInt(data, "ageLastFed"), 1);
  const crackerBonus = global.animalFlag(data, "animalCracker") ? 2 : 1;
  const hearts = global.getHearts(data);
  const mood = global.getOrFetchMood(level, target, day, player);
  const drops = [];
  const roll = (chance, minHearts, count, itemId, hasQuality) => {
    if (hungry || hearts < minHearts || Math.random() > chance || !global.itemExists(itemId)) return;
    if (String(itemId).includes("large") && Math.random() > (mood + hearts * 10) / 256) return;
    const quality = hasQuality && mood >= 160 ? global.getHusbandryQuality(hearts, mood) : 0;
    drops.push(animalStack(count, itemId, quality));
  };
  global.husbandryForagingDefinitions.forEach((definition) => {
    if (definition.animal !== type) return;
    definition.forages.forEach((forage) => {
      let count = forage.countMult;
      if (forage.stage && stages.has(forage.stage.name)) count = forage.stage.newCountMult;
      const itemId = forage.itemPool ? forage.itemPool[Math.floor(Math.random() * forage.itemPool.length)] : forage.item;
      roll(forage.chance, forage.minHearts, count * crackerBonus, itemId, forage.hasQuality);
    });
  });
  if (stages.has("coopmaster") && global.checkEntityTag(target, "society:coopmaster_bird")) {
    roll(0.02, 1, crackerBonus, "vintagedelight:golden_egg", true);
  }
  if (global.animalFlag(data, "bff") && stages.has("bff")) roll(0.1, 10, crackerBonus, "society:prismatic_shard", false);
  if (player && !player.isFake() && !stages.has("animal_fancy")) roll(0.05, 4, 1, "society:animal_fancy", false);
  if (stages.has("reaping_scythe")) roll(0.1, 1, crackerBonus, "quark:diamond_heart", false);
  global.setAnimalInt(data, "ageLastDroppedSpecial", day);
  return drops;
};

/** Rolls the animal's own loot table, like killing it but without killing it. */
const rollAnimalLoot = (level, target) => {
  const type = global.entityTypeId(target);
  const lootId = type === "meadow:wooly_cow" ? "minecraft:entities/cow" : type.replace(":", ":entities/");
  const key = $AnimalResourceKey.create($AnimalRegistryKeys.LOOT_TABLE, $AnimalResourceLocation.parse(lootId));
  const table = level.getServer().reloadableRegistries().getLootTable(key);
  const params = new $AnimalLootParamsBuilder(level)
    .withParameter($AnimalLootContextParams.THIS_ENTITY, target)
    .withParameter($AnimalLootContextParams.ORIGIN, target.position())
    .withParameter($AnimalLootContextParams.DAMAGE_SOURCE, level.damageSources().generic())
    .create($AnimalLootContextParamSets.ENTITY);
  const loot = [];
  table.getRandomItems(params).forEach((stack) => loot.push(stack));
  return loot;
};

/**
 * Magic Shears: the animal's loot without killing it, once a day from 5 hearts. Returns an array of item stacks, or
 * null when the animal cannot be harvested today.
 */
global.getMagicShearsOutput = (level, target, player, stages) => {
  const day = global.getDay(level);
  const data = target.persistentData;
  const ageLastMagicHarvested = global.animalInt(data, "ageLastMagicHarvested");
  const hearts = global.getHearts(data);
  if (hearts < 5 || !(global.isFresh(day, ageLastMagicHarvested) || day > ageLastMagicHarvested)) return null;
  const mood = global.getOrFetchMood(level, target, day, player);
  global.setAnimalInt(data, "ageLastMagicHarvested", day);
  global.addAffection(data, -7);
  level.spawnParticles("minecraft:glow", true, target.x, target.y + 1.5, target.z, 0.4, 0.4, 0.4, 20, 0.1);
  const quality = mood >= 160 ? global.getHusbandryQuality(hearts, mood) : 0;
  let loot = rollAnimalLoot(level, target).map((stack) => (quality > 0 ? global.withItemQuality(stack, quality) : stack));
  const doubled = [];
  if (stages.has("mana_hand")) {
    loot.forEach((stack) => {
      if (stack.maxStackSize < stack.count * 2) {
        doubled.push(stack);
        doubled.push(stack.copy());
      } else {
        doubled.push(stack.copyWithCount(stack.count * 2));
      }
    });
    return doubled;
  }
  if (stages.has("heretic")) {
    loot.push(Item.of("society:sparkstone", 3));
    if (player) {
      target.attack(2);
      global.addAffection(data, -20);
    }
  }
  return loot;
};

const getMoodImpactModifier = (type) => {
  if (global.tierTwoHusbandryAnimals.includes(type)) return 1.25;
  if (global.tierThreeHusbandryAnimals.includes(type)) return 1.5;
  return 1;
};

const countNearbyTaggedBlocks = (level, target, radius, tag) => {
  const key = animalTagKey($AnimalRegistryKeys.BLOCK, tag);
  const x = Math.floor(target.x);
  const y = Math.floor(target.y);
  const z = Math.floor(target.z);
  let count = 0;
  $AnimalBlockPos.betweenClosed(x - radius, y - radius, z - radius, x + radius, y + radius, z + radius).forEach((pos) => {
    if (level.isLoaded(pos) && level.getBlockState(pos).is(key)) count++;
  });
  return count;
};

/**
 * The animal's mood (0-256), recalculated once a day.
 * @param {Internal.Player|null} player
 * @param debugMood tell the player each reason (Mood Scanner)
 * @param disregardPet ignore "not pet today" (used while petting)
 */
global.getOrFetchMood = (level, target, day, player, debugMood, disregardPet) => {
  if (global.checkEntityTag(target, "society:pet_animal")) return 256;
  const data = target.persistentData;
  const type = global.entityTypeId(target);
  const tell = (text) => {
    if (debugMood && player) player.tell(text);
  };
  let moodDebuffs = 0;
  const moodImpactModifier = getMoodImpactModifier(type);
  if (moodImpactModifier > 1) tell(Text.translatable("society.husbandry.mood.breed_impact", moodImpactModifier).gold());
  if (!disregardPet && global.compareDay(day, global.animalInt(data, "ageLastPet"), 1)) {
    moodDebuffs += 96;
    tell(Text.translatable("society.husbandry.mood.not_pet").red());
  }
  if (global.compareDay(day, global.animalInt(data, "ageLastFed"), 2)) {
    moodDebuffs += 128;
    tell(Text.translatable("society.husbandry.mood.not_fed").red());
  }
  const pos = target.blockPosition();
  let coldBlocks;
  let coldDebuff;
  if (global.coldMobs.includes(type)) {
    coldBlocks = countNearbyTaggedBlocks(level, target, 5, "society:cold_blocks");
    if (coldBlocks < 5) {
      coldDebuff = 32 - (32 * coldBlocks) / 5;
      moodDebuffs += coldDebuff;
      tell(Text.translatable("society.husbandry.mood.not_cold", coldDebuff).red());
    }
  } else if (global.getSeasonFromBiome(level, pos) === "winter" && level.canSeeSky(pos)) {
    moodDebuffs += 32;
    tell(Text.translatable("society.husbandry.mood.too_cold").red());
  }
  if (!global.getAnimalIsNotCramped(target, 1.1, debugMood)) {
    moodDebuffs += 96;
    tell(Text.translatable("society.husbandry.mood.cramped").red());
  }
  if (level.isRaining() && level.canSeeSky(pos)) {
    moodDebuffs += 32;
    tell(Text.translatable("society.husbandry.mood.wet").red());
  }
  const baseDebuffs = moodDebuffs;
  moodDebuffs *= moodImpactModifier;
  if (day - global.animalInt(data, "ageLastBoosted") == 1) {
    moodDebuffs -= 24;
    tell(Text.translatable("society.husbandry.mood.boosted_food").green());
  }
  if (global.animalFlag(data, "clockwork")) {
    moodDebuffs -= 64;
    tell(Text.translatable("society.husbandry.mood.clockwork").green());
  }
  if (baseDebuffs > 0) tell(Text.translatable("society.husbandry.mood.total_debuffs", Number(baseDebuffs)).darkRed());
  tell(Text.translatable("society.husbandry.mood.final_mood", Number(256 - moodDebuffs)).gray());
  if (global.compareDay(day, global.animalInt(data, "ageLastSetMood"), 1) || !data.contains("lastMood")) {
    global.setAnimalInt(data, "lastMood", Math.max(0, Math.min(256, 256 - moodDebuffs)));
    global.setAnimalInt(data, "ageLastSetMood", day);
  }
  return global.animalInt(data, "lastMood");
};
