console.info("[SOCIETY] cropnolia.js loaded");

// Cropnolia (#14). Croptania has no 1.21.1 build, so its first mana flower is a KubeJS block with the same id.
// Every 10 seconds it eats the fully grown crops in the 7x7x3 around it (they go back to their first stage and
// drop nothing) and puts mana into a Botania mana pool next to it (3x3x3). On 1.20.1 it was a generating flower
// bound to a spreader; without KubeJS Botania on 1.21.1 it fills the pool directly.
// Slow crops are worth much more mana: CROPNOLIA_MANA_PER_STAGE * (stages)^2, so wheat (8 stages) gives 1600 and a
// mystical flower (4 stages) 400. Tick: server_scripts/blockEvents/machineTicks.js.

const $CropnoliaCropBlock = Java.loadClass("net.minecraft.world.level.block.CropBlock");
const CROPNOLIA_MANA_PER_STAGE = 25;
const CROPNOLIA_RADIUS = 3;

/** The mana pool next to a block (3x3x3) that has room for `amount`, or null. */
global.findManaPoolWithRoom = (level, block, amount) => {
  const { x, y, z } = block;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        let scanned = level.getBlock(x + dx, y + dy, z + dz);
        if (!/^botania:[a-z_]*pool$/.test(String(scanned.id))) continue;
        let pool = scanned.getEntity();
        if (global.getPoolMana(pool) < 0) continue;
        if (Number(pool.getMaxMana()) - global.getPoolMana(pool) >= amount) return pool;
      }
    }
  }
  return null;
};

/** Mana a fully grown crop block state is worth, or 0 when it is not a grown crop. */
global.getCropnoliaMana = (state) => {
  const crop = state.getBlock();
  if (!(crop instanceof $CropnoliaCropBlock) || !crop.isMaxAge(state)) return 0;
  const stages = Number(crop.getMaxAge()) + 1;
  return CROPNOLIA_MANA_PER_STAGE * stages * stages;
};

/** Eats the grown crops around a Cropnolia and fills a pool next to it. Returns the mana it made. */
global.runCropnolia = (level, block) => {
  let made = 0;
  for (let dx = -CROPNOLIA_RADIUS; dx <= CROPNOLIA_RADIUS; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -CROPNOLIA_RADIUS; dz <= CROPNOLIA_RADIUS; dz++) {
        let pos = block.getPos().offset(dx, dy, dz);
        let state = level.getBlockState(pos);
        let mana = global.getCropnoliaMana(state);
        if (mana <= 0) continue;
        let pool = global.findManaPoolWithRoom(level, block, mana);
        if (!pool) return made;
        pool.receiveMana(mana);
        level.setBlock(pos, state.getBlock().getStateForAge(0), 2);
        made += mana;
      }
    }
  }
  return made;
};

StartupEvents.registry("block", (event) => {
  event
    .create("croptania:cropnolia")
    .displayName("Cropnolia")
    .defaultCutout()
    .noCollision()
    .notSolid()
    .hardness(0)
    .resistance(0)
    .soundType("grass")
    .mapColor("plant")
    .box(5, 0, 5, 11, 12, 11)
    .tagBlock("minecraft:mineable/hoe")
    .tagBlock("minecraft:flowers")
    // Placeholder model: tools/port/assets/make_crop_placeholders.py (a vanilla flower texture).
    .parentModel("croptania:block/cropnolia")
    .blockEntity((blockInfo) => {
      blockInfo.serverTicking();
      blockInfo.tickFrequency(200);
    })
    .item((item) => {
      item.tooltip(Text.translatable("block.croptania.cropnolia.description").gray());
      item.tooltip(Text.translatable("society.working_block_entity.need_mana_pool").aqua());
      item.texture("minecraft:block/torchflower");
    });
});
