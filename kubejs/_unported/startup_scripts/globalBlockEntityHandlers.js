// NOT LOADED. Remaining 1.20.1 helpers of globalBlockEntityHandlers.js. The machine core (data access,
// artisan insert/harvest, ticks, multipart blockstates, rnd helpers) is ported in
// kubejs/startup_scripts/globalBlockEntityHandlers.js; move the rest there with the slice that needs it.
/* eslint-disable no-unused-vars */
// priority: 1000
global.setDebt = (server, UUID, amount) => {
  for (let index = 0; index < server.persistentData.debts.length; index++) {
    if (String(UUID) === String(server.persistentData.debts[index].uuid)) {
      server.persistentData.debts[index].amount = amount;
      break;
    }
  }
};

// getOpposite, getFacing, getTapperLog, handleTapperRandomTick, the Mushroom Log, hasMultipleTappers and
// getTaggedBlocksInRadius are ported (kubejs/startup_scripts/globalBlockEntityHandlers.js).
global.getFermentingBarrel = (level, block) =>
  level.getBlock(
    global.getFacing(block.getProperties().get("facing"), block.getPos())
  );

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

// The Skull Cavern rock tables and global.handleSkullCavernRegen are ported: kubejs/startup_scripts/skullCavern/skullCavern.js

global.setBlockEntityData = (block, nbt) => {
  block.setEntityData(nbt);
  block.getEntity().setChanged();
};
