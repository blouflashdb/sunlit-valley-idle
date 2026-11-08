console.info("[SOCIETY] drumCornucopia.js loaded");

// The Drum of the Cornucopia (every morning) and the Cornucopia item (right-click) harvest the ripe fruit trees in
// a 21x13x21 area around them: Pam's HarvestCraft 2 trees and the Vinery apple / dark cherry leaves.

const $CornucopiaBlockPos = Java.loadClass("net.minecraft.core.BlockPos");

const cornucopiaPamFruit = {
  "pamhc2trees:pampassionfruit": { item: "atmospheric:passion_fruit", count: 1 },
  "pamhc2trees:pamorange": { item: "atmospheric:orange", count: 1 },
  "pamhc2trees:pamcherry": { item: "vinery:cherry", count: 4 },
  "pamhc2trees:pamapple": { item: "minecraft:apple", count: 4 },
  "pamhc2trees:pamhazelnut": { count: 3 },
  "pamhc2trees:pamlychee": { count: 3 },
  "pamhc2trees:pambanana": { count: 3 },
  "pamhc2trees:pamdragonfruit": { count: 1 },
  "pamhc2trees:pampeach": { count: 1 },
  "pamhc2trees:pamplum": { count: 1 },
  "pamhc2trees:pamstarfruit": { count: 1 },
  "pamhc2trees:pammango": { count: 1 },
  "pamhc2trees:pampawpaw": { count: 1 },
  "pamhc2trees:pamcinnamon": { count: 1 },
  "pamhc2trees:pamlemon": { count: 1 },
};

/** The fruit a ripe block gives, or null. Resets the block to unripe. */
const harvestCornucopiaBlock = (level, scannedBlock, season, player) => {
  const id = String(scannedBlock.id);
  const properties = scannedBlock.getProperties();
  const has = (name) => properties.containsKey(name) && String(properties.get(name)) === "true";
  if (id === "vinery:dark_cherry_leaves" || id === "vinery:apple_leaves") {
    if (season === "spring" && has("has_cherries")) {
      global.setBlockProperties(scannedBlock, { can_grow_cherries: false, has_cherries: false });
      return Item.of("vinery:cherry", rnd(1, 4));
    }
    if (season === "autumn" && has("has_apples")) {
      global.setBlockProperties(scannedBlock, { can_grow_apples: false, has_apples: false });
      return Item.of("minecraft:apple", rnd(1, 4));
    }
    return null;
  }
  const fruit = cornucopiaPamFruit[id];
  if (!fruit || !properties.containsKey("age") || Number(properties.get("age")) !== 7) return null;
  const itemId = fruit.item || `pamhc2trees:${id.split(":")[1].substring(3)}item`;
  if (!global.itemExists(itemId)) return null;
  let count = fruit.count;
  if (id === "pamhc2trees:pambanana") {
    if (player && player.stages.has("banana_karenina")) count *= 2;
    else if (Math.random() <= 0.001) scannedBlock.popItem("society:banana_karenina");
  }
  if (player && player.stages.has("tree_whisperer")) count += 2;
  global.setBlockProperties(scannedBlock, { age: 0 });
  return Item.of(itemId, count);
};

/** Harvests around centerPos; returns how many blocks were harvested. */
global.handleCornucopia = (server, level, centerPos, player) => {
  const x = centerPos.x;
  const y = centerPos.y;
  const z = centerPos.z;
  server.runCommandSilent(`playsound ${player ? "minecraft:item.goat_horn.sound.0" : "minecraft:block.note_block.basedrum"} block @a ${x} ${y} ${z}`);
  const season = global.getSeasonFromLevel(level);
  let harvested = 0;
  let scannedBlock;
  let fruit;
  let drop;
  $CornucopiaBlockPos.betweenClosed(x - 10, y - 2, z - 10, x + 10, y + 10, z + 10).forEach((pos) => {
    if (!level.isLoaded(pos) || level.getBlockState(pos).isAir()) return;
    scannedBlock = level.getBlock(pos);
    fruit = harvestCornucopiaBlock(level, scannedBlock, season, player);
    if (!fruit) return;
    drop = level.createEntity("minecraft:item");
    drop.x = scannedBlock.x + 0.5;
    drop.y = scannedBlock.y;
    drop.z = scannedBlock.z + 0.5;
    drop.item = fruit;
    drop.spawn();
    harvested++;
    level.spawnParticles("minecraft:cherry_leaves", true, scannedBlock.x + 0.5, scannedBlock.y + 0.5, scannedBlock.z + 0.5, 0.3, 0.3, 0.3, 7, 0.05);
    server.runCommandSilent(`playsound minecraft:block.grass.break block @a ${scannedBlock.x} ${scannedBlock.y} ${scannedBlock.z} 0.5`);
  });
  return harvested;
};

global.runDrumCornucopia = (entity) => {
  const { level, block } = entity;
  if (global.isMorningTick(level, artMachineTickRate)) global.handleCornucopia(level.server, level, block.getPos(), null);
};

StartupEvents.registry("block", (event) => {
  event
    .create("society:drum_cornucopia")
    .displayName("Drum of the Cornucopia")
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .soundType("wood")
    .box(3, 0, 3, 13, 14, 13)
    .defaultCutout()
    // Placeholder model: tools/port/assets/make_machine_placeholder.py --single.
    .modelGenerator((m) => m.parent("society:block/kubejs/drum_cornucopia/drum_cornucopia"))
    .item((item) => {
      item.tooltip(Text.translatable("block.society.drum_cornucopia.description").gray());
      item.tooltip(Text.translatable("tooltip.society.area", "20x10x20").green());
      item.parentModel("society:block/kubejs/drum_cornucopia/drum_cornucopia");
    })
    .blockEntity((blockInfo) => {
      blockInfo.serverTicking();
      blockInfo.tickFrequency(artMachineTickRate);
    });
});
// Tick: server_scripts/blockEvents/machineTicks.js
