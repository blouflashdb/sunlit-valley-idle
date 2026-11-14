console.info("[SOCIETY] longwings.js loaded");

// Longwings butterflies and moths (#12): every 5 minutes each one may leave Butterfly Amber or Moth Pollen, more
// likely with many different flowers and few other longwings within reach, and two longwings may leave Caterpillar
// Eggs of a child variant. The Caterpillar Box hatches the eggs. On 1.20.1 this ran from an EntityJS tick; here
// server_scripts/entities/longwings.js calls global.runLongwings every 6000 ticks.
// global.longwings (variants, rarity, size): startup_scripts/globalRegistry.js.

const $LongwingBlockPos = Java.loadClass("net.minecraft.core.BlockPos");
const $LongwingDataComponents = Java.loadClass("net.minecraft.core.component.DataComponents");
const $LongwingCustomData = Java.loadClass("net.minecraft.world.item.component.CustomData");
const $LongwingCompoundTag = Java.loadClass("net.minecraft.nbt.CompoundTag");

global.isLongwing = (entity) => {
  const id = global.entityTypeId(entity);
  return id === "longwings:butterfly" || id === "longwings:moth";
};

/** The longwing's variant and size from its saved data ("Variant", "size"). */
global.getLongwingData = (entity) => {
  const tag = entity.getNbt();
  return {
    variant: tag && tag.contains("Variant") ? String(tag.getString("Variant")) : "",
    size: tag && tag.contains("size") ? Number(tag.getFloat("size")) : 1,
  };
};

global.getLongwingSize = (size) => {
  if (size === "normal") return Math.min(1.15, Math.max(0.85, 0.85 + Math.random() / 5.0));
  if (size === "larger") return Math.min(1.15, Math.max(0.85, 0.85 + Math.random() / 3.0));
  return Math.min(1.0, Math.max(0.5, 0.5 + Math.random() / 2.0));
};

/** The child of two variants: the variant at the sum of their indexes, no rarer than one below the rarer parent. */
global.getLongwingFromEgg = (parent, coparent) => {
  if (parent === coparent) return parent;
  let parent1 = -1;
  let parent2 = -1;
  global.longwings.forEach((wing, index) => {
    if (wing.variant === parent) parent1 = index;
    if (wing.variant === coparent) parent2 = index;
  });
  if (parent1 < 0 || parent2 < 0) return parent1 < 0 ? coparent : parent;
  let child = parent1 + parent2;
  if (child > global.longwings.length - 1) child -= global.longwings.length;
  const maxAllowedRarity = Math.min(global.longwings[parent1].rarity, global.longwings[parent2].rarity) - 1;
  const initialChild = child;
  while (global.longwings[child].rarity < maxAllowedRarity) {
    child++;
    if (child >= global.longwings.length) child = 0;
    if (child === initialChild) break;
  }
  return global.longwings[child].variant;
};

/** The other longwings within 8 blocks, nearest first. */
const nearbyLongwings = (entity) => {
  const found = [];
  entity.level.getEntitiesWithin(entity.boundingBox.inflate(8)).forEach((other) => {
    if (other !== entity && global.isLongwing(other)) found.push(other);
  });
  found.sort((a, b) => a.distanceToSqr(entity) - b.distanceToSqr(entity));
  return found;
};

/** { flowers: unique flower kinds within 4 blocks, firstFlower, others, chance } for a longwing. */
global.getLongwingOdds = (entity) => {
  const level = entity.level;
  const x = Math.floor(entity.x);
  const y = Math.floor(entity.y);
  const z = Math.floor(entity.z);
  const kinds = [];
  let firstFlower = null;
  $LongwingBlockPos.betweenClosed(x - 4, y - 4, z - 4, x + 4, y + 4, z + 4).forEach((pos) => {
    if (!level.isLoaded(pos)) return;
    const scanned = level.getBlock(pos);
    const id = String(scanned.id);
    if (scanned.hasTag("minecraft:flowers") && kinds.indexOf(id) === -1) {
      kinds.push(id);
      if (!firstFlower) firstFlower = scanned;
    }
  });
  const others = nearbyLongwings(entity);
  return { flowers: kinds.length, firstFlower: firstFlower, others: others, chance: Math.min(1, kinds.length * 0.15 - others.length * 0.1) };
};

/** Caterpillar Eggs that hatch into `child` (custom data: parent, coparent, child, size). */
global.caterpillarEggs = (parent, coparent, child, size) => {
  let stack = Item.of("society:caterpillar_eggs");
  let tag = new $LongwingCompoundTag();
  tag.putString("parent", parent);
  tag.putString("coparent", coparent);
  tag.putString("child", child);
  tag.putFloat("size", size);
  stack.set($LongwingDataComponents.CUSTOM_DATA, $LongwingCustomData.of(tag));
  return stack;
};

const dropAt = (entity, stack) => {
  let drop = entity.level.createEntity("minecraft:item");
  drop.setItem(stack);
  drop.setPos(entity.x, entity.y, entity.z);
  drop.spawn();
};

/** One longwing's 5-minute roll: amber or pollen, and sometimes eggs with the nearest longwing. */
global.handleLongwing = (entity) => {
  const odds = global.getLongwingOdds(entity);
  if (odds.chance <= 0) return;
  const product = global.entityTypeId(entity) === "longwings:butterfly" ? "society:butterfly_amber" : "society:moth_pollen";
  if (Math.random() <= odds.chance) {
    dropAt(entity, Item.of(product));
    // Sometimes the longwing takes the flower with it.
    if (odds.firstFlower && Math.random() <= 0.08) odds.firstFlower.set("minecraft:air");
  }
  if (odds.others.length > 0 && Math.random() <= odds.chance / 4) {
    const parent = global.getLongwingData(entity);
    const coparent = global.getLongwingData(odds.others[0]);
    if (Math.random() <= 0.001 && global.itemExists("society:the_metamorphosize")) {
      dropAt(entity, Item.of("society:the_metamorphosize"));
      return;
    }
    const size = Math.max(0.25, Math.round(((parent.size + coparent.size + Math.random()) / 2) * 100) / 100);
    dropAt(entity, global.caterpillarEggs(parent.variant, coparent.variant, global.getLongwingFromEgg(parent.variant, coparent.variant), size));
  }
};

global.runLongwings = (server) => {
  server.getAllLevels().forEach((level) => {
    level.getAllEntities().forEach((entity) => {
      if (global.isLongwing(entity)) global.handleLongwing(entity);
    });
  });
};

/** Caterpillar Box: hatches one egg from its inventory into a longwing above it. Returns the longwing or null. */
global.runCaterpillarBox = (entity) => {
  const { level, block } = entity;
  const inventory = block.getEntity().attachments.get("inventory");
  for (let i = 0; i < inventory.getSlots(); i++) {
    let eggs = inventory.getStackInSlot(i);
    if (String(eggs.id) !== "society:caterpillar_eggs") continue;
    let data = eggs.get($LongwingDataComponents.CUSTOM_DATA);
    let tag = data ? data.copyTag() : null;
    let definition = null;
    if (tag && tag.contains("child")) {
      let child = String(tag.getString("child"));
      global.longwings.forEach((wing) => {
        if (wing.variant === child) definition = wing;
      });
    }
    let longwing = level.createEntity(`longwings:${definition ? definition.type : "butterfly"}`);
    longwing.setPos(block.x + 0.5, block.y + 1, block.z + 0.5);
    if (definition) {
      let wingTag = longwing.getNbt();
      wingTag.putString("Variant", definition.variant);
      let size = Math.min(global.getLongwingSize(definition.size) * 2, Number(tag.getFloat("size")));
      wingTag.putFloat("size", Math.round(size * 100) / 100);
      longwing.setNbt(wingTag);
    }
    longwing.spawn();
    inventory.extractItem(i, 1, false);
    return longwing;
  }
  return null;
};

StartupEvents.registry("block", (event) => {
  event
    .create("society:caterpillar_box")
    .tagBlock("minecraft:mineable/axe")
    .soundType("wood")
    .defaultCutout()
    // Placeholder model: tools/port/assets/make_machine_placeholder.py --single.
    .parentModel("society:block/kubejs/caterpillar_box/caterpillar_box")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.caterpillar_box.description").gray());
      item.tooltip(Text.translatable("society.working_block_entity.can_use_hopper").green());
      item.parentModel("society:block/kubejs/caterpillar_box/caterpillar_box");
    })
    .blockEntity((blockInfo) => {
      blockInfo.inventory("inventory", [], 9, 1);
      blockInfo.rightClickOpensInventory("inventory");
      blockInfo.serverTicking();
      blockInfo.tickFrequency(6000);
    });
});
