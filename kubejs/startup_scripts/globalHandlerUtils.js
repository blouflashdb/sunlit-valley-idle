// priority: 900
console.info("[SOCIETY] globalHandlerUtils.js loaded");

// Small helpers for item handlers (block entity inventories, chests below) and machines that work on animals.

const $HandlerUtilsAABB = Java.loadClass("net.minecraft.world.phys.AABB");

/** How many items with this id the handler holds. */
global.countInHandler = (handler, id) => {
  let total = 0;
  for (let i = 0; i < handler.getSlots(); i++) {
    let stack = handler.getStackInSlot(i);
    if (String(stack.id) === id) total += stack.count;
  }
  return total;
};

/** Takes up to `count` items with this id out of the handler; returns how many it took. */
global.useFromHandler = (handler, id, count) => {
  let left = count || 1;
  for (let i = 0; i < handler.getSlots() && left > 0; i++) {
    if (String(handler.getStackInSlot(i).id) === id) left -= handler.extractItem(i, left, false).count;
  }
  return (count || 1) - left;
};

/** True when a Sparkstone Recycler nearby pays for the action (ported with the mana machines, #14). */
global.sparkstoneRecycled = (level, block) => (global.checkSparkstoneRecyclers ? global.checkSparkstoneRecyclers(level, block) : false);

/** Puts stacks into the inventory below the block. True when everything fit (nothing is inserted otherwise). */
global.insertAllBelow = (level, block, stacks) => {
  const below = global.getInventoryBelow(level, block);
  if (!below) return false;
  if (!stacks.every((stack) => global.insertIntoHandler(below, stack.copy(), true).isEmpty())) return false;
  stacks.forEach((stack) => global.insertIntoHandler(below, stack, false));
  return true;
};

/** The farm animals in a box around a block. */
global.getAnimalsAround = (level, block, radius) => {
  const animals = [];
  const box = new $HandlerUtilsAABB(block.getPos()).inflate(radius);
  level.getEntitiesWithin(box).forEach((entity) => {
    if (global.checkEntityTag(entity, "society:husbandry_animal")) animals.push(entity);
  });
  return animals;
};

/** True during the first tick window after 7:00 (dayTime 1000), when the daily machines run. */
global.isMorningTick = (level, rate) => {
  const morningModulo = Number(level.dayTime()) % 24000;
  return morningModulo >= 1000 && morningModulo < 1000 + rate;
};
