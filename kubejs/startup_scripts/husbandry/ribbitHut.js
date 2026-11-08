console.info("[SOCIETY] ribbitHut.js loaded");

// Ribbit Hut (#12): placing it builds a 3x3x3 hut centered on it, with the door (society:ribbit_hut, the block
// entity) in the front. Every morning at 7:00 the ribbits harvest the ripe crops in 15x3x15 around the hut's center
// into the door's inventory, with crop quality, and replant them (age reset). Breaking the door removes the hut.
// It applies the Paradise Crop and Crop Collector skills of the player who placed it.
// Placing and breaking: server_scripts/blockEvents/ribbitHutEvents.js. Tick: machineTicks.js.

const $RibbitBlock = Java.loadClass("net.minecraft.world.level.block.Block");
const $RibbitCropBlock = Java.loadClass("net.minecraft.world.level.block.CropBlock");
const $RibbitBlockPos = Java.loadClass("net.minecraft.core.BlockPos");
const ribbitLayerProperty = integerProperty.create("layer", 0, 2);
const ribbitDepthProperty = integerProperty.create("depth", 0, 2);
const ribbitSideProperty = integerProperty.create("side", 0, 2);

/** What a ripe plant drops: grapes and berry bushes give their fruit, everything else its loot with a hoe. */
const getRibbitDrops = (level, scanned, state) => {
  const id = String(scanned.id);
  const grape = id.includes("vinery") ? String(scanned.getProperties().get("grape")) : "null";
  if (grape !== "null") {
    const parts = grape.split("_");
    const grapeId = parts.length === 1 ? `vinery:${parts[0]}_grape` : `vinery:${parts[0]}_grapes_${parts[1]}`;
    if (global.itemExists(grapeId)) return [Item.of(grapeId, 4)];
  }
  if (id === "windswept:wild_berry_bush" && global.itemExists("windswept:wild_berries")) return [Item.of("windswept:wild_berries", 2)];
  if (id === "autumnity:tall_foul_berry_bush" && global.itemExists("autumnity:foul_berries")) return [Item.of("autumnity:foul_berries", 2)];
  const drops = [];
  $RibbitBlock.getDrops(state, level, scanned.getPos(), null, null, Item.of("minecraft:iron_hoe")).forEach((drop) => drops.push(drop));
  return drops;
};

/** { ripe, newAge }: newAge is the age the plant goes back to, null to remove it (melons, pumpkins, flowers). */
const getRibbitPlantData = (scanned, state) => {
  const id = String(scanned.id);
  const age = String(scanned.getProperties().get("age"));
  if (age === "null" || id === "minecraft:torchflower" || id === "minecraft:pitcher_crop") return { ripe: true, newAge: null };
  const ages = {
    "windswept:wild_berry_bush": ["3", "2"],
    "minecraft:sweet_berry_bush": ["3", "1"],
    "autumnity:tall_foul_berry_bush": ["3", "1"],
    "society:mana_fruit_crop": ["7", "0"],
    "vintagedelight:gearo_berry_bush": ["4", "2"],
    "minecraft:cocoa": ["2", "0"],
    "minecraft:nether_wart": ["3", "0"],
  };
  if (ages[id]) return { ripe: age === ages[id][0], newAge: ages[id][1] };
  if (id.includes("vinery")) return { ripe: age === "4", newAge: id.includes("lattice") ? "1" : "2" };
  if (id === "minecraft:melon_stem" || id === "minecraft:pumpkin_stem") return { ripe: false, newAge: "0" };
  const plantBlock = state.getBlock();
  if (plantBlock instanceof $RibbitCropBlock) return { ripe: plantBlock.isMaxAge(state), newAge: "0" };
  return { ripe: false, newAge: "0" };
};

/** Harvests one plant into the hut's inventory; true when it did. */
global.ribbitHarvestAt = (level, hut, pos, stages) => {
  if (!level.isLoaded(pos)) return false;
  const scanned = level.getBlock(pos);
  if (!scanned.hasTag("society:ribbit_hut_harvests")) return false;
  const id = String(scanned.id);
  if (id === "supplementaries:flax" && String(scanned.getProperties().get("half")) === "lower") return false;
  const state = level.getBlockState(pos);
  const plant = getRibbitPlantData(scanned, state);
  if (!plant.ripe) return false;
  const inventory = hut.getEntity().attachments.get("inventory");
  let inserted = false;
  getRibbitDrops(level, scanned, state).forEach((drop) => {
    if (drop.isEmpty()) return;
    const quality = global.getCropQuality(scanned);
    if (quality > 0) drop = global.withItemQuality(drop, quality);
    if (id === "society:mana_fruit_crop") {
      if (stages.has("paradise_crop")) drop.grow(1);
      if (stages.has("crop_collector")) drop.setCount(drop.count * 2);
    }
    if (global.insertIntoHandler(inventory, drop, true).isEmpty()) {
      global.insertIntoHandler(inventory, drop, false);
      inserted = true;
    }
  });
  if (!inserted) return false;
  if (id === "supplementaries:flax") {
    scanned.set("minecraft:air");
    level.getBlock(pos.below()).set("supplementaries:flax", { age: "0", half: "lower" });
  } else if (plant.newAge === null) {
    scanned.set("minecraft:air");
  } else {
    global.setBlockProperties(scanned, { age: plant.newAge });
  }
  level.spawnParticles("minecraft:happy_villager", true, pos.x + 0.5, pos.y + 0.5, pos.z + 0.5, 0.2, 0.2, 0.2, 2, 0.01);
  return true;
};

/** The hut's center: the block behind the door. */
global.getRibbitHutCenter = (hut) => global.getOpposite(global.getBlockProperty(hut, "facing"), hut.getPos());

/** Morning run (forced skips the 7:00 check); returns how many plants it harvested. */
global.runRibbitHut = (entity, forced) => {
  const { level, block } = entity;
  if (!forced && !global.isMorningTick(level, artMachineTickRate)) return 0;
  global.cacheOwner(entity, ["paradise_crop", "crop_collector"]);
  const stages = global.getBlockEntityStages(entity);
  const center = global.getRibbitHutCenter(block);
  const x = center.getX();
  const y = center.getY();
  const z = center.getZ();
  let harvested = 0;
  $RibbitBlockPos.betweenClosed(x - 7, y - 1, z - 7, x + 7, y + 1, z + 7).forEach((pos) => {
    if (global.ribbitHarvestAt(level, block, pos.immutable(), stages)) harvested++;
  });
  if (harvested > 0) level.server.runCommandSilent(`playsound ribbits:entity.ribbit.ambient block @a ${x} ${y} ${z}`);
  return harvested;
};

/** The positions of the 3x3x3 hut around its center (a BlockPos). */
const ribbitHutArea = (center) => {
  const positions = [];
  const x = center.getX();
  const y = center.getY();
  const z = center.getZ();
  $RibbitBlockPos.betweenClosed(x - 1, y, z - 1, x + 1, y + 2, z + 1).forEach((pos) => positions.push(pos.immutable()));
  return positions;
};

/** True when the 3x3x3 around the placed hut (center: BlockPos) is empty. */
global.ribbitHutHasRoom = (level, center) => {
  return ribbitHutArea(center).every((pos) => {
    if (!level.isLoaded(pos)) return false;
    const id = String(level.getBlock(pos).id);
    return id === "minecraft:air" || id === "society:ribbit_hut";
  });
};

// Position of a hut block inside the 3x3x3, seen from the front (for the 1.20.1 models: layer, depth, side).
const ribbitSide = (facing, center, pos) => {
  const dx = pos.getX() - center.getX();
  const dz = pos.getZ() - center.getZ();
  return { north: -dx, south: dx, east: -dz, west: dz }[facing] + 1;
};
const ribbitDepth = (facing, center, pos) => {
  const dx = pos.getX() - center.getX();
  const dz = pos.getZ() - center.getZ();
  return { north: dz, south: -dz, east: -dx, west: dx }[facing] + 1;
};

/** Builds the hut around `center` (BlockPos) and puts the door in front of it. Returns the door block. */
global.buildRibbitHut = (level, center, facing, ownerUuid) => {
  ribbitHutArea(center).forEach((pos) => {
    level.getBlock(pos).set("society:ribbit_hut_block", {
      facing: facing,
      layer: String(pos.getY() - center.getY()),
      side: String(ribbitSide(facing, center, pos)),
      depth: String(ribbitDepth(facing, center, pos)),
    });
  });
  const doorPos = global.getFacing(facing, center);
  level.getBlock(doorPos).set("society:ribbit_hut", { facing: facing });
  const door = level.getBlock(doorPos);
  if (ownerUuid) global.setMachineData(door, { owner: String(ownerUuid) });
  return door;
};

/** Removes the hut blocks around the door's center (the door itself is left to the caller). */
global.removeRibbitHut = (level, door) => {
  ribbitHutArea(global.getRibbitHutCenter(door)).forEach((pos) => {
    const id = String(level.getBlock(pos).id);
    if (id === "society:ribbit_hut_block") level.getBlock(pos).set("minecraft:air");
  });
};

StartupEvents.registry("block", (e) => {
  e.create("society:ribbit_hut", "cardinal")
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .soundType("stone")
    .defaultCutout()
    .noDrops()
    .lightLevel(1)
    // Placeholder model: tools/port/assets/make_machine_placeholder.py --single.
    .parentModel("society:block/kubejs/ribbit_hut/ribbit_hut")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.ribbit_hut.description").gray());
      item.tooltip(Text.translatable("society.working_block_entity.apply_player_skill").gray());
      item.tooltip(Text.translatable("tooltip.society.area", "15x3x15").green());
      item.parentModel("society:block/kubejs/ribbit_hut/ribbit_hut");
    })
    .blockEntity((blockInfo) => {
      blockInfo.inventory("inventory", [], 9, 3);
      blockInfo.rightClickOpensInventory("inventory");
      blockInfo.initialData({ owner: "-1" });
      blockInfo.serverTicking();
      blockInfo.tickFrequency(artMachineTickRate);
    });

  e.create("society:ribbit_hut_block", "cardinal")
    .property(ribbitLayerProperty)
    .property(ribbitDepthProperty)
    .property(ribbitSideProperty)
    .defaultState((state) => {
      state.set(ribbitLayerProperty, 0).set(ribbitDepthProperty, 0).set(ribbitSideProperty, 1);
    })
    .placementState((state) => {
      state.set(ribbitLayerProperty, 0).set(ribbitDepthProperty, 0).set(ribbitSideProperty, 1);
    })
    .resistance(3600000)
    .unbreakable()
    .noDrops()
    .defaultCutout()
    .soundType("stone")
    .parentModel("society:block/kubejs/ribbit_hut_block/ribbit_hut_block")
    .item((item) => {
      item.parentModel("society:block/kubejs/ribbit_hut_block/ribbit_hut_block");
    });
});
