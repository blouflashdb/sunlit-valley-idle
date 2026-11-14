console.info("[SOCIETY] manaMachines.js loaded");

// Mana machines (#14): Mana Sprinkler, Mana Fruit, Mana Milker, Mana Clock and Sparkstone Recycler.
// On 1.20.1 they took mana straight from spreader bursts through KubeJS Botania, which has no 1.21.1 build.
// Here they draw it from a Botania mana pool next to them (the 3x3x3 around the machine): a spreader fills the
// pool, the machine empties it. The Mana Sprinkler hands its mana on to the Mana Fruit around it, which keeps
// up to FRUIT_MAX_MANA in its block entity data. Ticks: server_scripts/blockEvents/machineTicks.js.

const $ManaFarmApi = Java.loadClass("dev.sunlitidle.farm.FarmApi");
// botania:mana_pool, diluted_mana_pool, fabulous_mana_pool, creative_mana_pool and their dyed versions.
const isManaPool = (id) => /^botania:[a-z_]*pool$/.test(String(id));

const MANA_PER_SPRINKLE = 50;
const MANA_PER_FRUIT_AGE = 2500;
const FRUIT_MAX_MANA = MANA_PER_FRUIT_AGE * 4;
const MANA_PER_MILK = 400;
const MANA_PER_CLOCK_AGE = 10000;
const MANA_PER_RECYCLE = 5000;

/** The mana stored in a Botania mana pool block entity, or -1 when it is not one. */
global.getPoolMana = (poolEntity) => {
  if (!poolEntity || typeof poolEntity.getCurrentMana !== "function") return -1;
  return Number(poolEntity.getCurrentMana());
};

/** The mana pool next to a block (3x3x3) holding at least `amount`, or null. */
global.findManaPool = (level, block, amount) => {
  const { x, y, z } = block;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        let scanned = level.getBlock(x + dx, y + dy, z + dz);
        if (!isManaPool(scanned.id)) continue;
        let pool = scanned.getEntity();
        if (global.getPoolMana(pool) >= amount) return pool;
      }
    }
  }
  return null;
};

/** Takes `amount` mana from a pool next to the block; false when no pool has enough. */
global.drawPoolMana = (level, block, amount) => {
  const pool = global.findManaPool(level, block, amount);
  if (!pool) return false;
  // A negative amount drains the pool (Botania's ManaReceiver.receiveMana); the creative pool stays full.
  pool.receiveMana(-amount);
  return true;
};

/** Mana Fruit: every morning it grows a stage for 2500 mana, or withers a stage without it. */
global.runManaFruit = (entity, forced) => {
  const { level, block } = entity;
  if (!global.surviveCheck(level, block.getPos())) {
    level.destroyBlock(block.getPos(), true);
    return;
  }
  const morning = Number(level.dayTime()) % 24000;
  if (!forced && (morning < 20 || morning >= 40)) return;
  const age = Number(global.getBlockProperty(block, "age"));
  if (age >= 7) return;
  let mana = global.getMachineInt(block, "mana");
  if (mana < MANA_PER_FRUIT_AGE && global.drawPoolMana(level, block, MANA_PER_FRUIT_AGE)) mana += MANA_PER_FRUIT_AGE;
  const { x, y, z } = block;
  if (mana >= MANA_PER_FRUIT_AGE) {
    const grow = Math.max(1, $ManaFarmApi.getFertilizerIncrease(age, 7, level.getBlockState(block.getPos().below())));
    global.setBlockProperties(block, { age: String(Math.min(7, age + grow)) });
    global.setMachineData(level.getBlock(block.getPos()), { mana: mana - MANA_PER_FRUIT_AGE });
    level.server.runCommandSilent(`playsound botania:mana_pool_craft block @a ${x} ${y} ${z}`);
    level.spawnParticles("minecraft:glow", true, x + 0.5, y + 0.25, z + 0.5, 0.3, 0.3, 0.3, 5, 0.01);
  } else if (age > 0) {
    global.setBlockProperties(block, { age: String(age - 1) });
    level.server.runCommandSilent(`playsound botania:virus_infect block @a ${x} ${y} ${z}`);
    level.spawnParticles("minecraft:smoke", true, x + 0.5, y + 0.25, z + 0.5, 0.3, 0.3, 0.3, 5, 0.01);
  }
};

/** Mana Sprinkler: once a second, tops up each Mana Fruit in 5x5x5 by 50 mana from its pool. */
global.runManaSprinkler = (entity) => {
  const { level, block } = entity;
  const { x, y, z } = block;
  let fed = 0;
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dz = -2; dz <= 2; dz++) {
        let fruit = level.getBlock(x + dx, y + dy, z + dz);
        if (String(fruit.id) !== "society:mana_fruit_crop") continue;
        let mana = global.getMachineInt(fruit, "mana");
        if (mana >= FRUIT_MAX_MANA || !global.drawPoolMana(level, block, MANA_PER_SPRINKLE)) continue;
        global.setMachineData(fruit, { mana: mana + MANA_PER_SPRINKLE });
        fed++;
        level.spawnParticles("minecraft:glow", true, fruit.x + 0.5, fruit.y + 1.25, fruit.z + 0.5, 0, 0, 0, 1, 0.01);
      }
    }
  }
  if (fed > 0) level.server.runCommandSilent(`playsound botania:spreader_fire block @a ${x} ${y} ${z} 0.5 1`);
  return fed;
};

/** Mana Milker: every minute, milks the animals in 21x21x21 for 400 mana each, into its inventory. */
global.runManaMilker = (entity) => {
  const { level, block } = entity;
  const inventory = block.getEntity().attachments.get("inventory");
  const day = global.getDay(level);
  let milked = 0;
  global.getAnimalsAround(level, block, 10).forEach((animal) => {
    if (!global.checkEntityTag(animal, "society:milkable_animal")) return;
    if (!global.findManaPool(level, block, MANA_PER_MILK)) return;
    let milk = global.getMilk(level, animal, null, day, false, global.NO_STAGES);
    if (!milk) return;
    if (!global.insertIntoHandler(inventory, milk, true).isEmpty()) return;
    global.insertIntoHandler(inventory, milk, false);
    global.drawPoolMana(level, block, MANA_PER_MILK);
    milked++;
    level.server.runCommandSilent(`playsound minecraft:entity.cow.milk block @a ${animal.x} ${animal.y} ${animal.z}`);
    level.spawnParticles("minecraft:glow", true, animal.x, animal.y + 1.5, animal.z, 0.3, 0.3, 0.3, 5, 0.01);
  });
  return milked;
};

/** Mana Clock: every 10 seconds, advances one machine next to it by a stage for 10000 mana. */
global.runManaClock = (entity) => {
  const { level, block } = entity;
  const { x, y, z } = block;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        let machine = level.getBlock(x + dx, y + dy, z + dz);
        if (!global.goldenClockMachines[String(machine.id)]) continue;
        if (!global.drawPoolMana(level, block, MANA_PER_CLOCK_AGE)) return null;
        global.handleProgress(level, machine);
        level.server.runCommandSilent(`playsound botania:gaia_trap block @a ${x} ${y} ${z}`);
        level.spawnParticles("minecraft:glow", true, machine.x + 0.5, machine.y + 1.5, machine.z + 0.5, 0.3, 0.3, 0.3, 5, 0.01);
        return machine;
      }
    }
  }
  return null;
};

/**
 * Sparkstone Recycler: a machine next to one (Artisan Hopper, Fish Pond Basket, ...) gets its sparkstone for
 * free 10% of the time, for 5000 mana from the recycler's pool. Called through global.sparkstoneRecycled.
 */
global.checkSparkstoneRecyclers = (level, block, forced) => {
  const offsets = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (let i = 0; i < offsets.length; i++) {
    let recycler = level.getBlock(block.x + offsets[i][0], block.y + offsets[i][1], block.z + offsets[i][2]);
    if (String(recycler.id) !== "society:sparkstone_recycler") continue;
    if (!forced && Math.random() >= 0.1) continue;
    if (!global.drawPoolMana(level, recycler, MANA_PER_RECYCLE)) continue;
    level.server.runCommandSilent(`playsound botania:starcaller block @a ${block.x} ${block.y} ${block.z}`);
    level.spawnParticles("minecraft:glow", true, recycler.x + 0.5, recycler.y + 0.5, recycler.z + 0.5, 0.2, 0.2, 0.2, 10, 0.01);
    return true;
  }
  return false;
};

/** Lights the recycler while its pool has mana for a recycle. */
global.runSparkstoneRecycler = (entity) => {
  const { level, block } = entity;
  const powered = global.findManaPool(level, block, MANA_PER_RECYCLE) !== null;
  if (global.isBlockPropertyTrue(block, "powered") !== powered) global.setBlockProperties(block, { powered: powered });
};

/** The Mana Fruit's stored mana as 10 pips, for the Wand of the Forest. */
global.getManaFruitPips = (block) => {
  const filled = Math.min(10, Math.floor((global.getMachineInt(block, "mana") / FRUIT_MAX_MANA) * 10));
  return "⬛".repeat(filled) + "⬜".repeat(10 - filled);
};

// Shared instances: block states only accept the property object they were built with.
const manaFruitAgeProperty = integerProperty.create("age", 0, 7);
const recyclerPoweredProperty = booleanProperty.create("powered");

StartupEvents.registry("block", (event) => {
  const manaMachine = (id, tooltips, sound, mineable) => {
    const name = id.split(":")[1];
    return event
      .create(id)
      .tagBlock(mineable)
      .tagBlock("minecraft:needs_stone_tool")
      .soundType(sound)
      .defaultCutout()
      // Placeholder model: tools/port/assets/make_machine_placeholder.py --single.
      .parentModel(`society:block/kubejs/${name}/${name}`)
      .item((item) => {
        tooltips.forEach((tooltip) => item.tooltip(tooltip));
        item.tooltip(Text.translatable("society.working_block_entity.need_mana_pool").aqua());
        item.parentModel(`society:block/kubejs/${name}/${name}`);
      });
  };

  manaMachine(
    "society:mana_sprinkler",
    [Text.translatable("block.society.mana_sprinkler.description").aqua(), Text.translatable("tooltip.society.area", "5x5").green()],
    "wood",
    "minecraft:mineable/axe"
  )
    // The farm of sunlitidle waters around blocks with this tag every morning, like a Gold Sprinkler.
    .tagBlock("dew_drop_farmland_growth:sprinkler_tier_2")
    .blockEntity((blockInfo) => {
      blockInfo.serverTicking();
      blockInfo.tickFrequency(20);
    });

  manaMachine(
    "society:mana_milker",
    [
      Text.translatable("block.society.mana_milker.description").gray(),
      Text.translatable("society.working_block_entity.can_use_hopper").green(),
      Text.translatable("tooltip.society.area", "21x21x21").green(),
    ],
    "copper",
    "minecraft:mineable/pickaxe"
  ).blockEntity((blockInfo) => {
    blockInfo.inventory("inventory", [], 9, 1);
    blockInfo.rightClickOpensInventory("inventory");
    blockInfo.serverTicking();
    blockInfo.tickFrequency(1200);
  });

  manaMachine(
    "society:mana_clock",
    [Text.translatable("block.society.mana_clock.description").gray(), Text.translatable("tooltip.society.area", "3x3").green()],
    "copper",
    "minecraft:mineable/pickaxe"
  ).blockEntity((blockInfo) => {
    blockInfo.serverTicking();
    blockInfo.tickFrequency(200);
  });

  manaMachine(
    "society:sparkstone_recycler",
    [
      Text.translatable("block.society.sparkstone_recycler.description").gray(),
      Text.translatable("block.society.sparkstone_recycler.description.compatible").green(),
    ],
    "copper",
    "minecraft:mineable/pickaxe"
  )
    .property(recyclerPoweredProperty)
    .defaultState((state) => {
      state.set(recyclerPoweredProperty, false);
    })
    .placementState((state) => {
      state.set(recyclerPoweredProperty, false);
    })
    .blockEntity((blockInfo) => {
      blockInfo.serverTicking();
      blockInfo.tickFrequency(200);
    });

  event
    .create("society:mana_fruit_crop")
    .defaultCutout()
    .hardness(0)
    .resistance(0)
    .displayName("Mana Fruit Seed")
    .mapColor("grass")
    .soundType("azalea_leaves")
    .box(1, 0, 1, 15, 4, 15)
    .property(manaFruitAgeProperty)
    .defaultState((state) => {
      state.set(manaFruitAgeProperty, 0);
    })
    .placementState((state) => {
      state.set(manaFruitAgeProperty, 0);
    })
    .tagBlock("minecraft:mineable/hoe")
    .tagBlock("minecraft:crops")
    .blockEntity((blockInfo) => {
      blockInfo.initialData({ mana: 0 });
      blockInfo.serverTicking();
      blockInfo.tickFrequency(20);
    })
    .item((item) => {
      item.tooltip(Text.translatable("society.working_block_entity.need_mana_pool").aqua());
      item.texture("society:item/mana_fruit_seed");
    });
  // Crop stage models: tools/port/assets/make_crop_placeholders.py.
  const fruitStages = [0, 1, 1, 2, 2, 3, 4, 5];
  const fruitVariants = {};
  fruitStages.forEach((stage, age) => {
    fruitVariants[`age=${age}`] = { model: `society:block/kubejs/crops/mana_fruit_crop_stage${stage}` };
  });
  global.cropBlockstates["society:mana_fruit_crop"] = { variants: fruitVariants };
});
