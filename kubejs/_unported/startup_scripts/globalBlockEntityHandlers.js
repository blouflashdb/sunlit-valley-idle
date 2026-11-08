// NOT LOADED. Remaining 1.20.1 helpers of globalBlockEntityHandlers.js. The machine core (data access,
// artisan insert/harvest, ticks, multipart blockstates, rnd helpers) is ported in
// kubejs/startup_scripts/globalBlockEntityHandlers.js; move the rest there with the slice that needs it.
/* eslint-disable no-unused-vars */
// priority: 1000
const CropGrowthUtils = Java.loadClass(
  "cool.bot.dewdropfarmland.utils.CropHandlerUtils"
);

global.surviveCheck = (level, pos) => {
  const FARMLAND = Java.loadClass("net.minecraft.world.level.block.FarmBlock");
  let blockState = level.getBlockState(pos.below());
  let mcBlock = blockState.block;
  if (mcBlock instanceof FARMLAND) {
    return true;
  } else return false;
};

global.setDebt = (server, UUID, amount) => {
  for (let index = 0; index < server.persistentData.debts.length; index++) {
    if (String(UUID) === String(server.persistentData.debts[index].uuid)) {
      server.persistentData.debts[index].amount = amount;
      break;
    }
  }
};

global.getOpposite = (facing, pos) => {
  switch (facing) {
    case "north":
      return pos.offset(0, 0, 1);
    case "south":
      return pos.offset(0, 0, -1);
    case "west":
      return pos.offset(1, 0, 0);
    case "east":
      return pos.offset(-1, 0, 0);
  }
};

global.getFacing = (facing, pos) => {
  switch (facing) {
    case "north":
      return pos.offset(0, 0, -1);
    case "south":
      return pos.offset(0, 0, 1);
    case "west":
      return pos.offset(-1, 0, 0);
    case "east":
      return pos.offset(1, 0, 0);
  }
};

global.getTapperLog = (level, block) =>
  level.getBlock(
    global.getOpposite(block.properties.get("facing"), block.getPos())
  );

global.getFermentingBarrel = (level, block) =>
  level.getBlock(
    global.getFacing(block.getProperties().get("facing"), block.getPos())
  );

global.handleTapperRandomTick = (tickEvent, returnFluidData) => {
  const { block, level, server } = tickEvent;
  let newProperties = block.getProperties();
  let nbt = block.getEntityData();
  const attachedBlock = global.getTapperLog(level, block);
  let foundFluidData = undefined;
  let hasError = false;
  if (attachedBlock.hasTag("society:tappable_blocks")) {
    if (
      !nbt.data.recipe ||
      !nbt.data.recipe.equals(attachedBlock.id) ||
      global.hasMultipleTappers(level, block)
    ) {
      hasError = true;
    }
    if (
      returnFluidData ||
      (block.properties.get("working").toLowerCase() === "false" &&
        block.properties.get("mature").toLowerCase() === "false")
    ) {
      if (global.tapperRecipes) {
        const recipe = global.tapperRecipes.get(`${attachedBlock.getId()}`);
        let nbt = block.getEntityData();
        if (returnFluidData && !foundFluidData && recipe) {
          foundFluidData = { fluid: recipe.fluidOutput, time: recipe.time };
          nbt.merge({ data: { recipe: `${attachedBlock.getId()}` } });
          hasError = false;
        }
        if (
          !returnFluidData &&
          getCanTakeItems(
            attachedBlock.getId(),
            recipe,
            block.properties,
            false
          )
        ) {
          newProperties = block.getProperties();
          successParticles(level, block);
          server.runCommandSilent(
            `playsound vinery:cabinet_close block @a ${block.x} ${block.y} ${block.z}`
          );
          newProperties.mature = false;
          newProperties.working = true;
          nbt.merge({ data: { recipe: `${attachedBlock.getId()}`, stage: 0 } });
          hasError = false;
        }
        global.setBlockEntityData(block, nbt)
      }
    }
    if (returnFluidData) {
      if (hasError) newProperties.error = true;
      else newProperties.error = false;
      block.set(block.id, newProperties);
      return foundFluidData;
    }
    if (hasError) newProperties.error = true;
    else newProperties.error = false;
    block.set(block.id, newProperties);
  } else {
    newProperties.error = true;
    block.set(block.id, newProperties);
    if (returnFluidData) return undefined;
  }
};

const getMushroomLogData = (level, centerPos, radius) => {
  const { x, y, z } = centerPos;
  let scanBlock;
  let scannedBlocks = 0;
  let regularOutputs = [];
  let dominantOutputs = [];
  let airBlocks = 0;
  for (let pos of BlockPos.betweenClosed(
    new BlockPos(x - radius, y - radius, z - radius),
    [x + radius, y + radius, z + radius]
  )) {
    if (!level.isLoaded(pos)) continue;
    scanBlock = level.getBlock(pos);
    if (scanBlock.hasTag("society:mushroom_log_detects")) {
      scannedBlocks++;
      if (scanBlock.hasTag("society:mushroom_log_dominant")) {
        if (!dominantOutputs.includes(scanBlock.id))
          dominantOutputs.push(scanBlock.id);
      } else {
        if (!regularOutputs.includes(scanBlock.id))
          regularOutputs.push(scanBlock.id);
      }
    } else if (scanBlock.id === "minecraft:air") airBlocks++;
  }
  return {
    count: airBlocks < 100 ? 4 : scannedBlocks,
    possibleOutputs:
      dominantOutputs.length > 0 ? dominantOutputs : regularOutputs,
  };
};

global.handleMushroomLogRandomTick = (tickEvent) => {
  const { block, level, server } = tickEvent;
  let newProperties = block.getProperties();
  if (
    block.properties.get("working").toLowerCase() === "false" &&
    block.properties.get("mature").toLowerCase() === "false"
  ) {
    const leafCount = global.getTaggedBlocksInRadius(
      level,
      "society:mushroom_log_leaves",
      new BlockPos(block.x, block.y + 4, block.z),
      8
    );
    const logData = getMushroomLogData(level, block.pos, 8);
    if (!logData || logData.count == 0 || logData.possibleOutputs.length == 0)
      return;
    let baseCount = Math.max(
      1,
      Math.floor(Math.min(8, logData.count / 4) + Math.min(8, leafCount / 4))
    );
    if (global.mushroomLogRecipes) {
      let rolledRecipe =
        logData.possibleOutputs[
        Math.floor(Math.random() * logData.possibleOutputs.length)
        ];

      const recipe = global.mushroomLogRecipes.get(`${rolledRecipe}`);
      let nbt = block.getEntityData();
      if (getCanTakeItems(rolledRecipe, recipe, block.properties, false)) {
        newProperties = block.getProperties();
        successParticles(level, block);
        server.runCommandSilent(
          `playsound species:block.alphacene_foliage.place block @a ${block.x} ${block.y} ${block.z}`
        );
        newProperties.mature = false;
        newProperties.working = true;
        let quality = 0;
        if (logData.count > 20 && logData.count / 40 > Math.random()) quality = 1;
        if (logData.count > 40 && logData.count / 60 > Math.random()) quality = 2;
        if (logData.count > 60 && logData.count / 80 > Math.random()) quality = 3;
        nbt.merge({
          data: { recipe: `${rolledRecipe}`, stage: 0, baseCount: baseCount, quality: quality },
        });
      }
      global.setBlockEntityData(block, nbt)
      block.set(block.id, newProperties);
    }
  }
};

global.hasMultipleTappers = (level, block) => {
  const attachedBlock = global.getTapperLog(level, block);
  const offsetsToCheck = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  let tapperCount = 0;
  offsetsToCheck.forEach((offset) => {
    if (
      ["society:tapper", "society:auto_tapper"].includes(
        level.getBlock(
          new BlockPos(
            attachedBlock.x + offset[0],
            attachedBlock.y,
            attachedBlock.z + offset[1]
          )
        ).id
      )
    )
      tapperCount++;
  });
  return tapperCount > 1;
};

global.isSameQuality = (itemA, itemB) => {
  if (!itemA.nbt && !itemB.nbt) return true;
  if ((itemA.nbt && !itemB.nbt) || (!itemA.nbt && itemB.nbt)) return false;
  if (!itemA.nbt.quality_food && !itemB.nbt.quality_food) return false;
  return itemA.nbt.quality_food.quality === itemB.nbt.quality_food.quality;
};

global.inventoryHasRoom = (block, item) => {
  let belowItem;
  if (block.inventory && item && item !== Item.of("minecraft:air")) {
    for (let j = 0; j < block.inventory.slots; j++) {
      belowItem = block.inventory.getStackInSlot(j);
      if (
        belowItem.id === Item.of(item).id &&
        global.isSameQuality(belowItem, Item.of(item)) &&
        belowItem.count + Item.of(item).count <
        block.inventory.getSlotLimit(j) /
        (64 / block.inventory.getStackInSlot(j).maxStackSize)
      ) {
        return true;
      }
    }
    for (let j = 0; j < block.inventory.slots; j++) {
      belowItem = block.inventory.getStackInSlot(j);
      if (belowItem === Item.of("minecraft:air")) {
        return true;
      }
    }
  }
  return false;
};

global.inventoryBelowHasRoom = (level, block, item) => {
  const belowPos = block.getPos().below();
  const belowBlock = level.getBlock(belowPos.x, belowPos.y, belowPos.z);
  return global.inventoryHasRoom(belowBlock, item);
};

global.inventoryBelowHasRoomForAll = (level, block, items) => {
  const belowPos = block.getPos().below();
  const belowBlock = level.getBlock(belowPos.x, belowPos.y, belowPos.z);
  let hasRoom = true;
  items.forEach((item) => {
    if (!global.inventoryHasRoom(belowBlock, item)) hasRoom = false;
  });
  return hasRoom;
};
/**
 * @returns result code:
 * -1 - Failure - Operation attempted but couldn't be inserted
 * 0 - Neutral - Operation not attempted due to no below inventory or item
 * 1 - Success - Item successfully inserted
 */
global.insertInto = (block, item) => {
  let belowItem;
  if (block.inventory && item && item !== Item.of("minecraft:air")) {
    for (let j = 0; j < block.inventory.slots; j++) {
      belowItem = block.inventory.getStackInSlot(j);
      if (
        belowItem.id === Item.of(item).id &&
        global.isSameQuality(belowItem, Item.of(item)) &&
        belowItem.count + Item.of(item).count <
        block.inventory.getSlotLimit(j) /
        (64 / block.inventory.getStackInSlot(j).maxStackSize)
      ) {
        block.inventory.insertItem(j, item, false);
        return 1;
      }
    }
    for (let j = 0; j < block.inventory.slots; j++) {
      belowItem = block.inventory.getStackInSlot(j);
      if (belowItem === Item.of("minecraft:air")) {
        block.inventory.insertItem(j, item, false);
        return 1;
      }
    }
    return -1;
  }
  return 0;
};

global.insertBelow = (level, block, item) => {
  const belowPos = block.getPos().below();
  const belowBlock = level.getBlock(belowPos.x, belowPos.y, belowPos.z);
  return global.insertInto(belowBlock, item);
};

/**
 * @returns result code:
 * -1 - Failure - Operation attempted but not enough items
 * 0 - Neutral - Operation not attempted due to no inventory
 * 1 - Success - inventory has items of id, and of at least count
 */
global.inventoryHasItems = (inventory, id, count) => {
  if (inventory) {
    const slots = inventory.getSlots();
    let slotStack;
    for (let i = 0; i < slots; i++) {
      slotStack = inventory.getStackInSlot(i);
      if (slotStack.item.id === id && slotStack.count >= count) {
        return 1;
      }
    }
    return -1;
  }
  return 0;
};

global.hasInventoryItems = (inventory, id, count) => {
  if (inventory) {
    const slots = inventory.getSlots();
    let slotStack;
    let foundCount = 0;
    for (let i = 0; i < slots; i++) {
      slotStack = inventory.getStackInSlot(i);
      if (slotStack.item.id === id) {
        foundCount += slotStack.count;
      }
      if (foundCount >= count) return true;
    }
  }
  return false;
};

/**
 * @returns result code:
 * -1 - Failure - Operation attempted but nothing to use
 * 0 - Neutral - Operation not attempted due to no inventory
 * 1 - Success - Item successfully consumed
 */
global.useInventoryItems = (inventory, id, count) => {
  if (inventory) {
    const slots = inventory.getSlots();
    let slotStack;
    for (let i = 0; i < slots; i++) {
      slotStack = inventory.getStackInSlot(i);
      if (slotStack.item.id === id && slotStack.count >= count) {
        inventory.extractItem(i, count, false);
        return 1;
      }
    }
    return -1;
  }
  return 0;
};

global.inventoryUseItems = (inventory, id, count) => {
  if (!inventory) return 0;

  const slots = inventory.getSlots();
  let remaining = count;

  let total = 0;
  for (let i = 0; i < slots; i++) {
    let stack = inventory.getStackInSlot(i);
    if (stack.item.id === id) total += stack.count;
  }
  if (total < count) return -1;

  for (let i = 0; i < slots; i++) {
    if (remaining <= 0) break;
    let stack = inventory.getStackInSlot(i);
    if (stack.item.id === id) {
      let toExtract = Math.min(stack.count, remaining);
      inventory.extractItem(i, toExtract, false);
      remaining -= toExtract;
    }
  }

  return 1;
};

/** All fluid handlers expect the following initialData with a capacity of 10000
 *
 *  blockInfo.initialData({ Fluid: 0, FluidType: "" });
 */

global.getFluid = (blockInfo) => {
  if (!blockInfo || !blockInfo.persistentData) {
    return Fluid.of("minecraft:water", 0);
  }
  const foundFluid = blockInfo.persistentData.getString("FluidType");
  if (!foundFluid) return Fluid.of("minecraft:water", 0);
  if (foundFluid === "minecraft:empty") {
    return Fluid.of("minecraft:water", 0);
  }
  let foundFluidLevel = blockInfo.persistentData.getInt("Fluid");
  if (!foundFluidLevel) foundFluidLevel = 0;
  return Fluid.of(foundFluid, foundFluidLevel);
};

global.onFill = (blockInfo, fluid, sim) => {
  const fluidData = blockInfo.persistentData.getInt("Fluid");
  const filled = Math.min(10000 - fluidData, fluid.getAmount());
  if (!sim) {
    const storedFluidId = blockInfo.persistentData.getString("FluidType");
    const incomingFluidId = fluid.getId();
    if (storedFluidId === "" || fluidData === 0) {
      blockInfo.persistentData.putString("FluidType", incomingFluidId);
      blockInfo.persistentData.putInt("Fluid", fluidData + filled);
    } else if (storedFluidId === incomingFluidId) {
      blockInfo.persistentData.putInt("Fluid", fluidData + filled);
    } else {
      return (filled = 0);
    }
  }
  return filled;
};

global.onDrain = (blockInfo, fluid, sim) => {
  const fluidData = blockInfo.persistentData.getInt("Fluid");
  const drained = Math.min(fluidData, fluid.getAmount());
  if (!sim) blockInfo.persistentData.putInt("Fluid", fluidData - drained);
  return drained;
};

// Text display utils
global.clearOldTextDisplay = (block, level, id) => {
  const { x, y, z } = block;
  level.getEntitiesWithin(AABB.ofBlock(block).inflate(3))
    .filter((entityType) => entityType.type === "minecraft:text_display")
    .forEach((entity) => {
      entity.getTags().forEach((tag) => {
        if (tag === `${id}-${x}-${y}-${z}`) {
          entity.kill();
        }
      });
    });
};

global.rotationFromFacing = (facing) => {
  switch (facing) {
    case "north":
      return 180;
    case "east":
      return 270;
    case "south":
      return 360;
    default:
    case "west":
      return 90;
  }
};

global.spawnTextDisplay = (block, y, id, text, rotation) => {
  rotation = rotation ?? 0
  let entity;
  const { x, z } = block;
  entity = block.createEntity("minecraft:text_display");
  let newNbt = entity.getNbt();
  newNbt.text = `${text.toJson()}`;
  newNbt.background = 0;
  newNbt.Rotation = [
    NBT.f(global.rotationFromFacing(block.properties.get("facing")) + rotation),
    NBT.f(0),
  ];
  entity.setNbt(newNbt);
  entity.setX(x + 0.5);
  entity.setY(y);
  entity.setZ(z + 0.5);
  entity.addTag(`${id}-${x}-${block.y}-${z}`);
  entity.spawn();
};

/**
 * If you can figure out a way to simplify this in a way that doesn't 
 * make it more difficult to read you get an artifact in-game.
 */
global.getProcessedItem = (item, dropAmount) => {
  let processOutput = global.mayonnaiseMachineRecipes.get(item);
  if (processOutput)
    return { divisor: 1, item: Item.of(processOutput.output[0]), preserveQuality: true };
  // Wine Keg 
  processOutput = global.wineKegRecipes.get(item);
  if (processOutput)
    return { divisor: 3, item: Item.of(processOutput.output[0]), preserveQuality: false };
  // Oil Maker
  processOutput = global.oilMakerRecipes.get(item);
  if (processOutput)
    return { divisor: 1, item: Item.of(processOutput.output[0]), preserveQuality: false };
  // Loom
  processOutput = global.loomRecipes.get(item);
  if (processOutput && dropAmount >= 5)
    return { divisor: 5, item: Item.of(processOutput.output[0]), preserveQuality: false };
  // Recycling Machine
  processOutput = global.recyclingMachineRecipes.get(item);
  if (processOutput)
    return { divisor: 1, item: Item.of(processOutput.output[0]), preserveQuality: false };
  return { divisor: 1, item: item, preserveQuality: true };
};

const stoneRockTable = [
  { block: "society:stone_boulder", weight: 163 },
  { block: "minecraft:coal_ore", weight: 25 },
  { block: "minecraft:copper_ore", weight: 20 },
  { block: "minecraft:iron_ore", weight: 15 },
  { block: "create:zinc_ore", weight: 13 },
  { block: "minecraft:lapis_ore", weight: 2 },
  { block: "society:geode_node", weight: 2, sturdy: true },
  { block: "society:earth_crystal", weight: 2, sturdy: true },
  { block: "society:oak_supply_crate", weight: 2 },
];

const iceRockTable = [
  { block: "society:ice_boulder", weight: 164 },
  { block: "minecraft:iron_ore", weight: 25 },
  { block: "create:zinc_ore", weight: 15 },
  { block: "oreganized:lead_ore", weight: 10 },
  { block: "minecraft:diamond_ore", weight: 4 },
  { block: "society:earth_crystal", weight: 2, sturdy: true },
  { block: "society:omni_geode_node", weight: 1, sturdy: true },
  { block: "society:sparkstone_ore", weight: 2 },
  { block: "society:spruce_supply_crate", weight: 2 },
];

const sandstoneRockTable = [
  { block: "society:sandstone_boulder", weight: 163 },
  { block: "minecraft:gold_ore", weight: 20 },
  { block: "oreganized:lead_ore", weight: 10 },
  { block: "minecraft:redstone_ore", weight: 6 },
  { block: "minecraft:diamond_ore", weight: 4 },
  { block: "society:sparkstone_ore", weight: 4 },
  { block: "society:fire_quartz", weight: 2, sturdy: true },
  { block: "society:magma_geode_node", weight: 2, sturdy: true },
  { block: "society:omni_geode_node", weight: 2, sturdy: true },
  { block: "society:palm_supply_crate", weight: 2 },
  { block: "oreganized:silver_ore", weight: 2 },
  { block: "society:iridium_ore", weight: 1 },
];

const blackstoneRockTable = [
  { block: "society:blackstone_boulder", weight: 148 },
  { block: "minecraft:deepslate_gold_ore", weight: 20 },
  { block: "oreganized:deepslate_lead_ore", weight: 10 },
  { block: "minecraft:deepslate_redstone_ore", weight: 15 },
  { block: "minecraft:deepslate_diamond_ore", weight: 4 },
  { block: "society:deepslate_sparkstone_ore", weight: 10 },
  { block: "society:fire_quartz", weight: 2, sturdy: true },
  { block: "society:magma_geode_node", weight: 2, sturdy: true },
  { block: "society:omni_geode_node", weight: 4, sturdy: true },
  { block: "oreganized:deepslate_silver_ore", weight: 4 },
  { block: "society:grimwood_supply_crate", weight: 2 },
  { block: "society:deepslate_iridium_ore", weight: 2 },
];

const endstoneRockTable = [
  { block: "society:end_stone_boulder", weight: 194 },
  { block: "society:deepslate_sparkstone_ore", weight: 14 },
  { block: "society:omni_geode_node", weight: 4, sturdy: true },
  { block: "society:deepslate_iridium_ore", weight: 3 },
];

const rollReplaceTable = (table, hasRope) => {
  let roll = 0;
  const totalWeight = table.reduce(
    (acc, current) => (hasRope && current.sturdy ? acc : acc + current.weight),
    0
  );
  let currentWeight = 0;
  if (totalWeight > 1) {
    roll = rnd(0, totalWeight);
    for (let index = 0; index < table.length; index++) {
      currentWeight += table[index].weight;
      if (currentWeight >= roll) {
        return table[index].block;
      }
    }
  }
  return "minecraft:obsidian";
};

global.handleSkullCavernRegen = (level, block) => {
  if (
    !level.persistentData ||
    !level.persistentData.chunkParityMap ||
    !block.id.equals("society:cavern_air")
  )
    return;
  let belowPos;
  let belowBlock;
  let belowBelowPos;
  let hasRope;

  let toggleBit =
    level.persistentData.chunkParityMap[
      level.getChunkAt(block.getPos()).pos.toString()
    ].toggleBit;
  if (block && block.getProperties() && block.getProperties().get("chunkbit")) {
    if (String(toggleBit) != block.getProperties().get("chunkbit")) {
      belowPos = block.getPos().below();
      belowBlock = level.getBlock(belowPos.x, belowPos.y, belowPos.z);
      belowBelowPos = belowBlock.getPos().below();
      hasRope =
        level.getBlock(belowBelowPos.x, belowBelowPos.y, belowBelowPos.z).id ===
        "farmersdelight:rope";
      let newBlock;
      switch (Number(block.properties.get("type"))) {
        case 4:
          newBlock = rollReplaceTable(endstoneRockTable, hasRope);
          break;
        case 3:
          newBlock = rollReplaceTable(blackstoneRockTable, hasRope);
          break;
        case 2:
          newBlock = rollReplaceTable(sandstoneRockTable, hasRope);
          break;
        case 1:
          newBlock = rollReplaceTable(iceRockTable, hasRope);
          break;
        default:
        case 0:
          newBlock = rollReplaceTable(stoneRockTable, hasRope);
          break;
      }
      block.set(newBlock);
    }
  }
};

global.cropList = [
  "minecraft:wheat",
  "minecraft:pumpkin_stem",
  "minecraft:melon_stem",
  "minecraft:beetroots",
  "snowyspirit:ginger",
  "supplementaries:flax",
  "herbalbrews:coffee_plant",
  "herbalbrews:rooibos_plant",
  "herbalbrews:tea_plant",
  "herbalbrews:yerba_mate_plant",
  "minecraft:sweet_berry_bush",
  "farm_and_charm:tomato_crop",
  "farm_and_charm:strawberry",
  "farm_and_charm:lettuce_crop",
  "farm_and_charm:barley_crop",
  "farm_and_charm:onion_crop",
  "farm_and_charm:tomato_crop_body",
  "farm_and_charm:corn_crop",
  "farm_and_charm:oat_crop",
  "brewery:hops_crop",
  "brewery:hops_crop_body",
  "nethervinery:crimson_grape_bush",
  "nethervinery:warped_grape_bush",
  "vinery:savanna_grape_bush_white",
  "vinery:jungle_grape_bush_red",
  "vinery:savanna_grape_bush_red",
  "vinery:white_grape_bush",
  "vinery:red_grape_bush",
  "vinery:taiga_grape_bush_red",
  "vinery:taiga_grape_bush_white",
  "vinery:jungle_grape_bush_white",
  "vinery:jungle_grape_bush_red",
  "vintagedelight:ghost_pepper_crop",
  "vintagedelight:cucumber_crop",
  "farmersdelight:cabbages",
  "farmersdelight:budding_tomatoes",
  "farmersdelight:tomatoes",
  "farmersdelight:rice",
  "farmersdelight:rice_panicles",
  "society:ancient_fruit",
  "society:cranberry",
  "society:sparkpod",
  "windswept:wild_berry_bush",
  "society:mana_fruit",
  "etcetera:cotton",
  "society:tubabacco_leaf",
  "brewery:hop_trellis",
  "society:blueberry",
  "veggiesdelight:cauliflower_crop",
  "veggiesdelight:garlic_crop",
  "veggiesdelight:bellpepper_crop",
  "society:eggplant",
  "society:potato",
  "society:carrot",
  "society:peanut",
  "society:sweet_potato",
  "society:onion",
  "veggiesdelight:turnip_crop",
  "veggiesdelight:zucchini_crop",
  "veggiesdelight:broccoli_crop",
];

const qualityToInt = (quality) => {
  switch (quality) {
    case "DIAMOND":
      return 3;
    case "GOLD":
      return 2;
    case "IRON":
      return 1;
    case "NONE":
    default:
      return 0;
  }
};
const getFertilizer = (crop) => {
  let block = crop
    .getLevel()
    .getBlock(crop.getPos().below());
  if (block.hasTag("dew_drop_farmland_growth:bountiful_fertilized_farmland"))
    return -1;
  if (block.hasTag("dew_drop_farmland_growth:low_quality_fertilized_farmland"))
    return 1;
  if (block.hasTag("dew_drop_farmland_growth:high_quality_fertilized_farmland"))
    return 2;
  if (
    block.hasTag(
      "dew_drop_farmland_growth:pristine_quality_fertilized_farmland"
    )
  )
    return 3;
  return 0;
};

const LevelData = Java.loadClass(
  "de.cadentem.quality_food.capability.LevelData"
);

global.getCropQuality = (crop) => {
  let resolvedCrop = crop
  if (crop.id === "farmersdelight:rice_panicles") resolvedCrop = crop.getLevel().getBlock(crop.getPos().below());
  const fertilizer = getFertilizer(resolvedCrop);
  if (fertilizer == -1) return 0;
  const qualityName = LevelData.get(
    resolvedCrop.getLevel(),
    resolvedCrop.getPos(),
    false
  );
  let seedQuality = qualityToInt(qualityName);
  if (fertilizer > 1 && seedQuality < 1) seedQuality = 1;
  const goldChance =
    0.2 * ((seedQuality * 4.6) / 10) +
    0.2 * fertilizer * ((seedQuality * 4.6 + 2) / 12) +
    0.01;
  // // Debug Quality
  // console.log(crop)
  // console.log("Seed quality " + seedQuality);
  // console.log("Fertilizer quality " + fertilizer);
  // console.log("Chance for gold: " + goldChance);
  if (fertilizer >= 2 && Math.random() < goldChance / 2) return 3;
  if (Math.random() < goldChance) return 2;
  if (Math.random() < goldChance * 2) return 1;
  return 0;
};

global.getTaggedBlocksInRadius = (
  level,
  scanTag,
  centerPos,
  radius,
  returnTagged
) => {
  const { x, y, z } = centerPos;
  let scanBlock;
  let scannedBlocks = 0;
  let taggedBlocks = [];
  for (let pos of BlockPos.betweenClosed(
    new BlockPos(x - radius, y - radius, z - radius),
    [x + radius, y + radius, z + radius]
  )) {
    if (!level.isLoaded(pos)) continue;
    scanBlock = level.getBlock(pos);
    if (scanBlock.hasTag(scanTag)) {
      scannedBlocks++;
      if (returnTagged) taggedBlocks.push(scanBlock.id);
    }
  }
  if (returnTagged) return taggedBlocks;
  return scannedBlocks;
};

global.setBlockEntityData = (block, nbt) => {
  block.setEntityData(nbt);
  block.getEntity().setChanged();
};
