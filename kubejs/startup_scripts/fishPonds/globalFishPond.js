// priority: 90
console.info("[SOCIETY] globalFishPond.js loaded");

// Fish ponds (#12): a pond holds one kind of fish. Every morning the population grows by one fish up to the cap
// (3, then 5, 7 and 10 after a quest each) and a pond with two or more fish can be harvested for roe and the
// rewards in fishPondDefinitions.js. Quest and reward items from mods that are not in the 1.21.1 pack are skipped;
// when a population step has no quest item left, the cap goes up without a quest.
// The pond's block entity data: type (fish id), population, max_population, non_native_fish, quest_id.

const $PondBlockPos = Java.loadClass("net.minecraft.core.BlockPos");
const $PondDirection = Java.loadClass("net.minecraft.core.Direction");
const $PondDataComponents = Java.loadClass("net.minecraft.core.component.DataComponents");
const $PondCustomData = Java.loadClass("net.minecraft.world.item.component.CustomData");
const $PondCompoundTag = Java.loadClass("net.minecraft.nbt.CompoundTag");

const fishPondTickRate = 200;
const fishPondProgTime = 40;
const pondValidProperty = booleanProperty.create("valid");
const pondQuestProperty = booleanProperty.create("quest");

/** "aquaculture:atlantic_herring" → "atlantic_herring", "unusualfishmod:raw_snowflake" → "frosty_fin". */
const pondFishName = (fishId) => {
  let name = String(fishId).split(":")[1] || "";
  if (name.startsWith("raw_")) name = name === "raw_snowflake" ? "frosty_fin" : name.substring(4);
  return name;
};

global.getRoe = (fishId) => `society:${pondFishName(fishId)}_roe`;

/** The pond fish a roe item comes from, or undefined. */
global.getFishFromRoe = (roeId) => {
  const name = String(roeId).split(":")[1].slice(0, -4);
  return Array.from(global.fishPondDefinitions.keys()).find((fish) => pondFishName(fish) === name);
};

/** True when this fish can live in a pond in this pack. */
global.isPondFish = (id) => global.fishPondDefinitions.has(String(id)) && global.itemExists(String(id));

/** The quest choices at this population cap whose items are in the pack. */
global.getPondQuestItems = (type, maxPopulation) => {
  const fish = global.fishPondDefinitions.get(String(type));
  if (!fish) return [];
  let items = [];
  fish.quests.forEach((quest) => {
    if (quest.population === Number(maxPopulation)) items = quest.requestedItems.filter((r) => global.itemExists(r.item));
  });
  return items;
};

/** The pond's open quest ({ item, count }), or null. */
global.getPondQuest = (block) => {
  if (!global.isBlockPropertyTrue(block, "quest")) return null;
  const items = global.getPondQuestItems(global.getMachineString(block, "type"), global.getMachineInt(block, "max_population"));
  return items[global.getMachineInt(block, "quest_id")] || null;
};

/** How many quest items are asked for; "Pond House Five" halves it. */
global.getPondQuestCount = (quest, stages) => (stages.has("pond_house_five") ? Math.round(quest.count / 2) : quest.count);

const nextPondCap = (cap) => (cap === 7 ? 10 : cap + 2);

/** Completes the open quest: the population cap goes up 3 → 5 → 7 → 10. */
global.completePondQuest = (level, block) => {
  global.setMachineData(block, { quest_id: 0, max_population: nextPondCap(global.getMachineInt(block, "max_population")) });
  global.setBlockProperties(block, { quest: false });
  successParticles(level, block);
};

/** Puts the first fish into an empty pond. */
global.startFishPond = (block, fishId) => {
  global.setMachineData(block, { type: String(fishId), quest_id: 0, population: 1, max_population: 3, non_native_fish: 1 });
  global.setBlockProperties(block, { valid: true, mature: false, quest: false });
};

/**
 * Takes the pond's harvest: roe (more with Caper Catcher and Caviar Catcher) and the rewards its population has
 * reached (twice as likely when upgraded or with Scum Collector). Returns the stacks.
 * @param {Internal.Player|null} player gets the fishing experience (null for a Fish Pond Basket)
 */
global.handleFishHarvest = (level, block, player, stages) => {
  const type = global.getMachineString(block, "type");
  const fish = global.fishPondDefinitions.get(type);
  const population = global.getMachineInt(block, "population");
  const upgraded = global.isBlockPropertyTrue(block, "upgraded");
  const outputs = [];
  if (Math.random() < 0.01 && !stages.has("bullfish_jobs") && global.itemExists("society:bullfish_jobs")) {
    outputs.push(Item.of("society:bullfish_jobs"));
  }
  let extraRoe = 0;
  if (stages.has("caper_catcher")) extraRoe += 3;
  if (stages.has("caviar_catcher")) extraRoe += 2;
  const roeCount = Math.max(1, rnd(Math.floor(population / 4), Math.floor(population / 2) + extraRoe));
  if (global.itemExists(global.getRoe(type))) outputs.push(Item.of(global.getRoe(type), roeCount));
  if (fish && fish.additionalRewards) {
    fish.additionalRewards.forEach((reward) => {
      if (!global.itemExists(reward.item)) return;
      let chance = reward.chance;
      if (upgraded) chance *= 2;
      if (stages.has("scum_collector")) chance *= 2;
      if (population < reward.minPopulation || Math.random() > chance) return;
      // Rewards scale with the population above the one they start at.
      let count =
        population >= 10 ? reward.count : Math.floor(reward.count * ((population - reward.minPopulation) / (10 - reward.minPopulation)));
      outputs.push(Item.of(reward.item, Math.max(1, count)));
    });
  }
  level.server.runCommandSilent(`playsound stardew_fishing:dwop block @a ${block.x} ${block.y} ${block.z}`);
  if (player) global.giveExperience(level.server, player, "fishing", roeCount * 4);
  let properties = { mature: false };
  if (global.getMachineInt(block, "max_population") === 10) properties.quest = false;
  global.setBlockProperties(block, properties);
  return outputs;
};

/**
 * Takes one fish out of the pond (smoked with Hot Hands, two with Mitosis, with quality from Bullfish Jobs).
 * Returns the stack, or null when the pond is empty.
 */
global.handleFishExtraction = (level, block, stages) => {
  const type = global.getMachineString(block, "type");
  const population = global.getMachineInt(block, "population");
  const nonNative = global.getMachineInt(block, "non_native_fish");
  if (type === "" || population <= 0) return null;
  const natural = population - nonNative;
  const count = stages.has("mitosis") && natural > 0 ? 2 : 1;
  let quality = 0;
  if (stages.has("bullfish_jobs") && natural > 3) quality = Math.min(3, Math.floor((population - 3) / 2));
  let id = type;
  if (stages.has("hot_hands") && natural > 0) {
    level.server.runCommandSilent(`playsound minecraft:block.lava.extinguish block @a ${block.x} ${block.y} ${block.z}`);
    const smoked = `society:smoked_${pondFishName(type)}`;
    id = rnd25() ? "minecraft:coal" : global.itemExists(smoked) ? smoked : type;
  }
  let result = Item.of(id, count);
  if (quality > 0) result = global.withItemQuality(result, quality);
  global.setMachineData(block, {
    population: population - 1,
    non_native_fish: natural > 0 ? nonNative : Math.max(0, nonNative - 1),
  });
  return result;
};

// The 12 water blocks behind the pond (3 wide, 4 deep): [startX, startZ, endX, endZ] by facing.
const pondWaterArea = {
  north: [-1, 1, 1, 4],
  south: [-1, -4, 1, -1],
  east: [-4, -1, -1, 1],
  west: [1, -1, 4, 1],
};

/** A pond needs 12 water (lava for lava fish) blocks behind it and no pond right next to it. */
global.validatePond = (level, block, lavaFish) => {
  const facing = global.getBlockProperty(block, "facing");
  const area = pondWaterArea[facing];
  if (!area) return false;
  const { x, y, z } = block;
  const side = facing === "north" || facing === "south" ? [1, 0] : [0, 1];
  let valid = true;
  [1, -1].forEach((sign) => {
    const pos = new $PondBlockPos(x + sign * side[0], y, z + sign * side[1]);
    if (!level.isLoaded(pos) || String(level.getBlock(pos).id) === "society:fish_pond") valid = false;
  });
  if (!valid) return false;
  let water = 0;
  $PondBlockPos.betweenClosed(x + area[0], y, z + area[1], x + area[2], y, z + area[3]).forEach((pos) => {
    if (!level.isLoaded(pos)) {
      valid = false;
      return;
    }
    const scanned = level.getBlock(pos);
    const id = String(scanned.id);
    if (lavaFish ? id === "minecraft:lava" : id === "minecraft:water" || id === "minecraft:ice") water++;
    else if (!lavaFish && String(scanned.getProperties().get("waterlogged")) === "true") water++;
    else if (scanned.hasTag("society:fish_pond_water")) water++;
  });
  return valid && water === 12;
};

/**
 * The pond's morning: it becomes harvestable with two or more fish, grows by one fish, or opens a quest when it is
 * full (75% a day).
 */
global.growFishPond = (level, block) => {
  const type = global.getMachineString(block, "type");
  const population = global.getMachineInt(block, "population");
  const cap = global.getMachineInt(block, "max_population");
  const nonNative = global.getMachineInt(block, "non_native_fish");
  const questOpen = global.isBlockPropertyTrue(block, "quest");
  let mature = population > 1;
  let quest = questOpen && cap !== 10;
  if (cap !== 10 && !questOpen && population === cap && rnd75()) {
    const quests = global.getPondQuestItems(type, cap);
    if (quests.length === 0) {
      global.setMachineData(block, { max_population: nextPondCap(cap) });
    } else {
      quest = true;
      mature = false;
      global.setMachineData(block, { quest_id: Math.floor(Math.random() * quests.length) });
    }
  } else if (population < cap) {
    successParticles(level, block);
    level.server.runCommandSilent(`playsound minecraft:block.bubble_column.bubble_pop block @a ${block.x} ${block.y} ${block.z}`);
    global.setMachineData(block, { population: population + 1 });
  } else if (population > cap) {
    global.setMachineData(block, { population: cap });
  }
  if (population === cap && nonNative > 0) global.setMachineData(block, { non_native_fish: nonNative - 1 });
  global.setBlockProperties(block, { mature: mature, quest: quest });
  if (mature) {
    level.spawnParticles("minecraft:bubble_pop", true, block.x + 0.5, block.y + 1, block.z + 0.5, 0.2, 0.2, 0.2, rnd(2, 6), 0.001);
  }
};

/** Block entity tick (every fishPondTickRate ticks): checks the water and runs the morning. */
global.handleFishPondTick = (entity) => {
  const { level } = entity;
  const block = level.getBlock(entity.block.getPos());
  const type = global.getMachineString(block, "type");
  if (type === "") return;
  const fish = global.fishPondDefinitions.get(type);
  const valid = global.validatePond(level, block, fish && fish.lava);
  if (valid !== global.isBlockPropertyTrue(block, "valid")) global.setBlockProperties(block, { valid: valid });
  if (!valid || global.isBlockPropertyTrue(block, "mature")) return;
  const morning = Number(level.dayTime()) % 24000;
  if (morning >= fishPondProgTime && morning < fishPondProgTime + fishPondTickRate) global.growFishPond(level, block);
};

/** Drops items in front of the pond. */
global.popFromPond = (block, stacks) => {
  const face = $PondDirection.byName(global.getBlockProperty(block, "facing"));
  stacks.forEach((stack) => block.popItemFromFace(stack, face));
};

global.handleFishPondRightClick = (click) => {
  const { item, block, hand, player, level } = click;
  if (player.isFake() || String(hand) !== "MAIN_HAND") return;
  const itemId = String(item.id);
  const type = global.getMachineString(block, "type");
  const population = global.getMachineInt(block, "population");

  if (!global.isBlockPropertyTrue(block, "upgraded") && itemId === "society:sea_biscut") {
    if (!player.isCreative()) item.shrink(1);
    level.spawnParticles("minecraft:happy_villager", true, block.x + 0.5, block.y + 1, block.z + 0.5, 0.3, 0.3, 0.3, 5, 0.01);
    global.setBlockProperties(block, { upgraded: true });
    return;
  }
  if (player.isCrouching()) {
    const fishItem = global.handleFishExtraction(level, block, player.stages);
    if (fishItem) player.give(fishItem);
    return;
  }
  const quest = global.getPondQuest(block);
  // A Ripper Tooth switches the quest to the next item the pond would take.
  if (quest && itemId === "unusualfishmod:ripper_tooth") {
    const choices = global.getPondQuestItems(type, global.getMachineInt(block, "max_population"));
    if (choices.length < 2) {
      player.tell(Text.translatable("block.society.fish_pond.no_alt").red());
      return;
    }
    const next = (global.getMachineInt(block, "quest_id") + 1) % choices.length;
    global.setMachineData(block, { quest_id: next });
    player.tell(
      Text.translatable("block.society.fish_pond.fish_quest_changed", Text.darkAqua(`${global.getPondQuestCount(choices[next], player.stages)}`))
        .green()
        .append(" ")
        .append(Item.of(choices[next].item).getHoverName())
    );
    level.server.runCommandSilent(`playsound minecraft:entity.player.splash block @a ${block.x} ${block.y} ${block.z}`);
    if (!player.isCreative()) item.shrink(1);
    return;
  }
  if (quest && itemId === quest.item) {
    const needed = global.getPondQuestCount(quest, player.stages);
    if (item.count >= needed) {
      global.completePondQuest(level, block);
      if (player.stages.has("fishing_mastery") && !player.stages.has("pond_house_five") && Math.random() <= 0.01) {
        global.popFromPond(block, [Item.of("society:pond_house_five")]);
      }
      player.tell(Text.translatable("block.society.fish_pond.fish_quest.complete").green());
      if (!player.isCreative()) item.shrink(needed);
    } else {
      player.tell(Text.translatable("block.society.fish_pond.fish_quest.partial", `${needed - item.count}`).red());
    }
    return;
  }
  if (type === "" && global.isPondFish(itemId)) {
    successParticles(level, block);
    global.startFishPond(block, itemId);
    if (!player.isCreative()) item.shrink(1);
    return;
  }
  if (type !== "" && itemId === type && population < global.getMachineInt(block, "max_population")) {
    level.server.runCommandSilent(`playsound minecraft:entity.player.splash block @a ${block.x} ${block.y} ${block.z}`);
    level.spawnParticles("minecraft:splash", true, block.x + 0.5, block.y + 0.9, block.z + 0.5, 0.2, 0.2, 0.2, 10, 0.1);
    global.setMachineData(block, { population: population + 1, non_native_fish: global.getMachineInt(block, "non_native_fish") + 1 });
    if (!player.isCreative()) item.shrink(1);
    return;
  }
  if (global.isBlockPropertyTrue(block, "mature")) {
    global.popFromPond(block, global.handleFishHarvest(level, block, player, player.stages));
    return;
  }
  // An empty pond keeps its fish type until it is cleared with a fishing rod.
  if (type !== "" && population === 0) {
    if (item.hasTag("c:tools/fishing_rod")) {
      global.setMachineData(block, { type: "", quest_id: 0, population: 0, max_population: 3, non_native_fish: 0 });
      global.setBlockProperties(block, { mature: false, quest: false, valid: true });
    } else {
      player.tell(Text.translatable("block.society.fish_pond.fishing_rod").red());
    }
  }
};

/** The pond's status for the action bar: "Fish Pond 3/5 Cod ⏳⏳⏳⏳⏳". */
global.getFishPondStatusText = (block) => {
  const type = global.getMachineString(block, "type");
  if (type === "") return Text.translatable("block.society.fish_pond.pond_is_empty").gray();
  const population = global.getMachineInt(block, "population");
  const cap = global.getMachineInt(block, "max_population");
  const upgraded = global.isBlockPropertyTrue(block, "upgraded") ? "🡅 " : "";
  return Text.empty()
    .append(Text.of(upgraded).green())
    .append(Text.translatable("block.society.fish_pond").darkAqua())
    .append(Text.of(` ${population}/${cap} `).gray())
    .append(Item.of(type).getHoverName())
    .append(Text.of(" " + "⏳".repeat(population)).darkAqua())
    .append(Text.of("⏳".repeat(Math.max(0, cap - population))).gray());
};

/*
 * Fish pond item: a broken pond keeps its fish (1.20.1: item NBT, now custom data).
 */
global.fishPondItem = (block) => {
  let stack = Item.of("society:fish_pond");
  const type = global.getMachineString(block, "type");
  if (type === "") return stack;
  let tag = new $PondCompoundTag();
  tag.putString("type", type);
  ["population", "max_population", "non_native_fish", "quest_id"].forEach((key) => tag.putInt(key, global.getMachineInt(block, key)));
  tag.putBoolean("quest", global.isBlockPropertyTrue(block, "quest"));
  stack.set($PondDataComponents.CUSTOM_DATA, $PondCustomData.of(tag));
  return stack;
};

/** Restores a pond placed from an item made by global.fishPondItem. */
global.restoreFishPond = (block, stack) => {
  const data = stack.get($PondDataComponents.CUSTOM_DATA);
  if (!data) return;
  const tag = data.copyTag();
  if (!tag.contains("type")) return;
  let values = { type: String(tag.getString("type")) };
  ["population", "max_population", "non_native_fish", "quest_id"].forEach((key) => (values[key] = Number(tag.getInt(key))));
  global.setMachineData(block, values);
  global.setBlockProperties(block, { valid: true, mature: false, upgraded: false, quest: Boolean(tag.getBoolean("quest")) });
};
