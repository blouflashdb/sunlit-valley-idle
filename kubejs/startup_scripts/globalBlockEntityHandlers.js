/* eslint-disable no-unused-vars */
// priority: 1000
// Shared machine core, ported to KubeJS 7 (1.21.1). The rest of the 1.20.1 file (tapper, mushroom log,
// inventories, fluids, crops, Skull Cavern) is still in kubejs/_unported/startup_scripts/globalBlockEntityHandlers.js
// and moves here with the slice that needs it. See docs/porting-1.21.1.md.
console.info("[SOCIETY] globalBlockEntityHandlers.js loaded");

const artMachineTickRate = 200;

const artMachineProgTime = 20;

const booleanProperty = Java.loadClass("net.minecraft.world.level.block.state.properties.BooleanProperty");

const integerProperty = Java.loadClass("net.minecraft.world.level.block.state.properties.IntegerProperty");

const directionProperty = Java.loadClass("net.minecraft.world.level.block.state.properties.DirectionProperty");

// KubeJS 7 matches block state properties by instance, so every machine must use these shared ones
// (a second booleanProperty.create("working") is a different property and fails in defaultState).
const workingProperty = booleanProperty.create("working");
const matureProperty = booleanProperty.create("mature");
const upgradedProperty = booleanProperty.create("upgraded");

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rnd50() {
  return Math.random() < 0.5;
}

function rnd75() {
  return Math.random() < 0.75;
}

function rnd25() {
  return Math.random() < 0.25;
}

function rnd10() {
  return Math.random() < 0.1;
}

function rnd5() {
  return Math.random() < 0.05;
}

/*
 * Machine data
 *
 * KubeJS 7 keeps a KubeJS block entity's data in the live CompoundTag `entity.data` and saves it with the
 * chunk. In JavaScript a CompoundTag behaves like a map of Tag objects, so `data.stage` is an IntTag, not a
 * number, and `===` or Map lookups with it fail silently. Always go through these helpers: they return plain
 * JavaScript strings and numbers and mark the block entity as changed after a write.
 */
global.getMachineData = (block) => {
  const entity = block.getEntity();
  return entity && entity.data ? entity.data : null;
};

global.hasMachineValue = (block, key) => {
  const data = global.getMachineData(block);
  return data !== null && data.contains(key);
};

global.getMachineString = (block, key) => {
  const data = global.getMachineData(block);
  return data !== null && data.contains(key) ? String(data.getString(key)) : "";
};

global.getMachineInt = (block, key) => {
  const data = global.getMachineData(block);
  return data !== null && data.contains(key) ? Number(data.getInt(key)) : 0;
};

/**
 * Writes plain values into the machine data. Numbers are stored as ints (stages, qualities, counts),
 * strings as strings and booleans as booleans. Arrays of item strings are stored as a string list.
 */
global.setMachineData = (block, values) => {
  const entity = block.getEntity();
  if (!entity || !entity.data) return;
  const data = entity.data;
  Object.keys(values).forEach((key) => {
    let value = values[key];
    if (typeof value === "number") data.putInt(key, Math.floor(value));
    else if (typeof value === "boolean") data.putBoolean(key, value);
    else if (Array.isArray(value)) data.putString(key, JSON.stringify(value));
    else data.putString(key, String(value));
  });
  entity.setChanged();
};

// Item strings like "2x minecraft:diamond" that went into a tag-based recipe, so they can be returned.
global.getMachineInputs = (block) => {
  const raw = global.getMachineString(block, "originalInputs");
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

global.getBlockProperty = (block, name) => String(block.getProperties().get(name));

global.isBlockPropertyTrue = (block, name) => global.getBlockProperty(block, name).toLowerCase() === "true";

/*
 * Item quality (Quality Food)
 *
 * On 1.20.1 the quality lived in the item NBT `{quality_food:{quality:N}}`. Quality Food for 1.21.1 stores it
 * in a data component instead. Until a slice that needs qualities (cheese press, mayonnaise machine, fish
 * smoker, seed maker) ports this, items count as base quality.
 */
global.getItemQuality = (item) => 0;

global.withItemQuality = (item, quality) => item;

let increaseDataStage = (block, count) => {
  global.setMachineData(block, { stage: global.getMachineInt(block, "stage") + (count || 1) });
};

let increaseStage = (input, count) => {
  let num = Number(input);
  num += count || 1;
  return num;
};

let decreaseStage = (input) => {
  let num = Number(input);
  num -= 1;
  return num;
};

const successParticles = (level, block) => {
  const { x, y, z } = block;
  level.spawnParticles(
    "minecraft:happy_villager",
    true,
    x + 0.5,
    y + 0.5,
    z + 0.5,
    0.1 * rnd(1, 4),
    0.1 * rnd(1, 4),
    0.1 * rnd(1, 4),
    10,
    0.1
  );
};

const itemHasTag = (item, tag) => {
  const tagString = tag.startsWith("#") ? tag.substring(1) : tag;
  return item.hasTag(tagString);
};

const setQuality = (block, stage, itemQuality) => {
  const current = global.getMachineInt(block, "quality");
  if ((current === 0 && Number(stage) === 0) || Number(itemQuality) < current)
    global.setMachineData(block, { quality: Number(itemQuality) });
};

const getCanTakeItems = (item, recipe, block, hasTag, inputCount, recipes) => {
  if (global.isBlockPropertyTrue(block, "working") || global.isBlockPropertyTrue(block, "mature")) return false;
  let itemCheck = recipe !== undefined;
  if (hasTag) {
    Array.from(recipes.keys()).forEach((key) => {
      if (key.startsWith("#") && itemHasTag(item, key)) {
        let currentRecipe = global.getMachineString(block, "recipe");
        if (currentRecipe === "") {
          global.setMachineData(block, { recipe: key, originalInputs: [] });
          itemCheck = true;
        }
        if (inputCount != -1 && global.getMachineString(block, "recipe") === key) {
          let inputs = global.getMachineInputs(block);
          inputs.push(`${inputCount}x ${item.id}`);
          global.setMachineData(block, { originalInputs: inputs });
          itemCheck = true;
        }
      }
    });
  }
  return itemCheck;
};

/**
 * Converts machines saved by Sunlit Valley before it stored recipe ids (they stored a 1-based `type`).
 * Worlds from 1.20.1 cannot be loaded on 1.21.1 anyway, so this only keeps the tapper fix-up and returns.
 */
global.convertFromLegacy = (recipes, level, block) => {
  if (String(block.id) === "society:tapper" && !global.hasMachineValue(block, "recipe")) {
    let newProperties = block.getProperties();
    newProperties.working = false;
    newProperties.mature = false;
    global.setMachineData(block, { stage: 0, recipe: "" });
    block.set(block.id, newProperties);
  }
};

global.giveExperience = (server, player, category, xp, excludeMastery) => {
  if (!player.isFake()) {
    server.runCommandSilent(`puffish_skills experience add ${player.username} society:${category} ${xp}`);
    if (!excludeMastery && player.stages.has("mastery_unlocked")) {
      server.runCommandSilent(`puffish_skills experience add ${player.username} society:mastery ${xp}`);
    }
  }
};

global.artisanHarvest = (block, recipes, stageCount, outputMult, isCheesePress, artisanHopper, server, player) => {
  let newProperties = block.getProperties();
  if (!global.isBlockPropertyTrue(block, "mature")) return;
  const recipeId = global.getMachineString(block, "recipe");
  const recipe = recipes.get(recipeId);
  if (!recipe) return;
  let hopperOutputs = [];
  if (!artisanHopper) {
    global.giveExperience(server, player, "farming", stageCount * 20);
    server.runCommandSilent(`playsound stardew_fishing:dwop block @a ${player.x} ${player.y} ${player.z}`);
  }
  const quality = global.getMachineInt(block, "quality");
  recipe.output.forEach((id) => {
    let harvestOutput = Item.of(id);
    if (quality > 0) harvestOutput = global.withItemQuality(harvestOutput, quality);
    // Artisan Cheese Press upgrade: auto age cheese wheels only
    if (
      isCheesePress &&
      (id.includes("wheel") || id.includes("block")) &&
      global.isBlockPropertyTrue(block, "upgraded")
    ) {
      harvestOutput = Item.of(`society:aged_${harvestOutput.id.split(":")[1]}`);
    }
    if (outputMult > 1 && !recipe.multExempt) {
      harvestOutput.count = harvestOutput.count * outputMult;
    }
    if (!artisanHopper) {
      block.popItemFromFace(harvestOutput, global.getBlockProperty(block, "facing"));
    } else {
      hopperOutputs.push(harvestOutput);
    }
  });
  global.setMachineData(block, { stage: 0, recipe: "", originalInputs: [], quality: 0 });
  newProperties.working = false;
  newProperties.mature = false;
  if (newProperties.duration) newProperties.duration = "0";
  block.set(block.id, newProperties);
  if (artisanHopper) return hopperOutputs;
};

global.artisanInsert = (
  block,
  item,
  level,
  recipes,
  stageCount,
  stockSound,
  multipleInputs,
  hasTag,
  artisanHopper,
  server,
  player
) => {
  let newProperties = block.getProperties();
  let stage = global.getMachineInt(block, "stage");
  let itemQuality;
  let hasQuality =
    global.hasMachineValue(block, "quality") ||
    ["society:cheese_press", "society:mayonnaise_machine", "society:fish_smoker", "society:seed_maker"].includes(
      String(block.id)
    );
  let useCount = multipleInputs && item.count >= stageCount - stage ? stageCount - stage : 1;
  const itemId = String(item.id);
  const recipe = recipes.get(itemId);
  const currentRecipe = global.getMachineString(block, "recipe");
  if (multipleInputs && recipe && currentRecipe !== "" && currentRecipe !== itemId) return;
  if (getCanTakeItems(item, recipe, block, hasTag, multipleInputs ? useCount : -1, recipes)) {
    newProperties = block.getProperties();
    successParticles(level, block);
    server.runCommandSilent(`playsound ${stockSound} block @a ${block.x} ${block.y} ${block.z}`);
    if (!(hasTag && recipe === undefined)) global.setMachineData(block, { recipe: itemId });
    newProperties.working = false;
    newProperties.mature = false;
    if (hasQuality) itemQuality = global.getItemQuality(item);
    if (multipleInputs) {
      if (item.count >= stageCount - stage) {
        global.setMachineData(block, { stage: stageCount });
      } else {
        increaseDataStage(block);
      }
      if (itemQuality !== undefined) setQuality(block, stage, itemQuality);
    } else if (itemQuality !== undefined) {
      global.setMachineData(block, { quality: Number(itemQuality) });
    }
    if (!multipleInputs || global.getMachineInt(block, "stage") === stageCount) {
      newProperties.working = true;
      global.setMachineData(block, { stage: 0 });
    }
    block.set(block.id, newProperties);
    if (player && !player.isCreative()) item.count -= useCount;
    if (artisanHopper) return useCount;
  }
};

global.handleBERightClick = (
  stockSound,
  clickEvent,
  recipes,
  stageCount,
  multipleInputs,
  hasTag,
  outputMult,
  disableInput,
  isCheesePress
) => {
  const { item, block, hand, player, level, server } = clickEvent;
  // Prevent Deployers from using artisan machines
  if (player.isFake()) return;
  if (String(hand) !== "MAIN_HAND") return;
  global.convertFromLegacy(recipes, level, block);
  global.artisanHarvest(block, recipes, stageCount, outputMult, isCheesePress, false, server, player);

  if (!disableInput) {
    global.artisanInsert(
      block,
      item,
      level,
      recipes,
      stageCount,
      stockSound,
      multipleInputs,
      hasTag,
      false,
      server,
      player
    );
  }
};

global.handleBERandomTick = (tickEvent, rndFunction, stageCount) => {
  const { block } = tickEvent;
  const { x, y, z } = block;
  const stage = global.getMachineInt(block, "stage");
  const mature = stage >= stageCount - 1;
  let newProperties = block.getProperties();
  if (global.isBlockPropertyTrue(block, "working") && rndFunction) {
    tickEvent.level.spawnParticles(
      "minecraft:campfire_cosy_smoke",
      true,
      x + 0.5,
      y + 1,
      z + 0.5,
      0.1 * rnd(1, 2),
      0.1 * rnd(1, 2),
      0.1 * rnd(1, 2),
      rnd(1, 4),
      0.1
    );
    newProperties.working = !mature;
    newProperties.mature = mature;
    increaseDataStage(block);
    block.set(block.id, newProperties);
  }
};

/**
 * Advances a machine by one stage each in-game morning. `entity` is anything with `level` and `block`,
 * such as the BlockEvents.blockEntityTick event; `forced` skips the morning check.
 */
global.handleBETick = (entity, recipes, stageCount, halveTime, forced) => {
  const { level, block } = entity;
  let morningModulo = level.dayTime() % 24000;

  if (forced || (morningModulo >= artMachineProgTime && morningModulo < artMachineProgTime + artMachineTickRate)) {
    if (!global.isBlockPropertyTrue(block, "working")) return;
    global.convertFromLegacy(recipes, level, block);
    let recipe = recipes && recipes.get(global.getMachineString(block, "recipe"));
    let resolvedStage = (recipe && recipe.time) || stageCount;
    let stage = global.getMachineInt(block, "stage");
    let mature;
    if (halveTime && global.isBlockPropertyTrue(block, "upgraded")) {
      mature = stage >= resolvedStage / 2 - 1;
    } else {
      mature = stage >= resolvedStage - 1;
    }

    let newProperties = block.getProperties();
    newProperties.mature = mature;
    if (mature) newProperties.working = false;
    increaseDataStage(block);
    block.set(block.id, newProperties);
  }
};

const getCardinalMultipartJsonBasic = (name) => {
  const path = `society:block/kubejs/${name}`;
  return [
    { when: { facing: "north" }, apply: { model: path, y: 0, uvlock: false } },
    { when: { facing: "east" }, apply: { model: path, y: 90, uvlock: false } },
    { when: { facing: "south" }, apply: { model: path, y: 180, uvlock: false } },
    { when: { facing: "west" }, apply: { model: path, y: -90, uvlock: false } },
  ];
};

const getCardinalMultipartJsonBasicUpgradable = (name, upgraded) => {
  const path = `society:block/kubejs/${name}`;
  return [
    { when: { facing: "north", upgraded: upgraded }, apply: { model: path, y: 0, uvlock: false } },
    { when: { facing: "east", upgraded: upgraded }, apply: { model: path, y: 90, uvlock: false } },
    { when: { facing: "south", upgraded: upgraded }, apply: { model: path, y: 180, uvlock: false } },
    { when: { facing: "west", upgraded: upgraded }, apply: { model: path, y: -90, uvlock: false } },
  ];
};

/**
 * Blockstate JSON of a machine with working/mature/upgraded states. KubeJS 7 has no `blockstateJson`
 * setter, so client_scripts/machineBlockstates.js writes it through ClientEvents.generateAssets.
 */
global.getCardinalMultipartJson = (name, disableExclamation) => {
  const path = `society:block/kubejs/${name}/${name}`;
  const facings = { north: 0, east: 90, south: 180, west: -90 };
  const variant = (working, upgraded, model) =>
    Object.keys(facings).map((facing) => {
      let when = { upgraded: upgraded, facing: facing };
      if (working === "mature") when.mature = true;
      else when.working = working;
      return { when: when, apply: { model: model, y: facings[facing], uvlock: false } };
    });
  const exclamation = disableExclamation
    ? []
    : [{ when: { mature: true }, apply: { model: "society:block/kubejs/machine_done" } }];
  // Same order as on 1.20.1, which always had one machine_done part even with disableExclamation.
  return [
    { apply: { model: `society:block/kubejs/${name}/${name}_particle` } },
    { when: { mature: true }, apply: { model: "society:block/kubejs/machine_done" } },
  ]
    .concat(variant(true, false, path))
    .concat(variant(true, true, `${path}_upgraded`))
    .concat(exclamation)
    .concat(variant(false, false, `${path}_off`))
    .concat(variant(false, true, `${path}_off_upgraded`))
    .concat(variant("mature", false, `${path}_done`))
    .concat(variant("mature", true, `${path}_done_upgraded`));
};

// The 1.20.1 machine scripts call this without `global.`.
const getCardinalMultipartJson = global.getCardinalMultipartJson;
