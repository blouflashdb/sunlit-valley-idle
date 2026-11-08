// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 builds a Quality Washer over a chest, an Auto Worm Farm and a Growth Obelisk above spawn and runs each once.
// Boot 2 checks the washed item, the worm and the
// used Spark-Gro are still there.
// Prints "[PORT-TEST] PHASE1 automationblocks", "[PORT-TEST] PASS automationblocks" or "[PORT-TEST] FAIL automationblocks: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let bx = spawn.x - 24;
  let bz = spawn.z - 24;
  let y = 300;
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let count = (handler, id) => {
    let total = 0;
    for (let i = 0; i < handler.getSlots(); i++) {
      let stack = handler.getStackInSlot(i);
      if (id === null ? !stack.isEmpty() : String(stack.id) === id) total += stack.count;
    }
    return total;
  };
  let inv = (block) => block.getEntity().attachments.get("inventory");
  let washer = level.getBlock(bx, y, bz);
  let wormFarm = level.getBlock(bx + 2, y, bz);
  let obelisk = level.getBlock(bx + 4, y, bz);
  let washedQuality = () => {
    let chest = global.getInventoryBelow(level, washer);
    for (let i = 0; i < chest.getSlots(); i++) {
      let stack = chest.getStackInSlot(i);
      if (String(stack.id) === "minecraft:apple") return global.getItemQuality(stack);
    }
    return -1;
  };

  try {
    if (String(washer.id) !== "society:quality_washer") {
      washer.set("society:quality_washer", { facing: "north" });
      level.getBlock(bx, y - 1, bz).set("minecraft:chest");
      global.insertIntoHandler(inv(washer), global.withItemQuality(Item.of("minecraft:apple", 2), 3), false);
      global.handleQualityWasher({ level: level, block: washer });
      check(count(inv(washer), "minecraft:apple") === 1, "the quality washer did not move one apple");
      check(washedQuality() === 0, `the washed apple has quality ${washedQuality()}`);

      wormFarm.set("society:auto_worm_farm");
      global.runAutoWormFarm({ level: level, block: wormFarm });
      check(count(inv(wormFarm), "aquaculture:worm") === 1, "the auto worm farm made no worm");

      obelisk.set("society:growth_obelisk", { facing: "north" });
      global.insertIntoHandler(inv(obelisk), Item.of("society:spark_gro", 2), false);
      check(global.runGrowthObelisk({ level: level, block: obelisk }, true), "the growth obelisk did not run");
      check(count(inv(obelisk), "society:spark_gro") === 1, "the growth obelisk did not use one Spark-Gro");

      console.info("[PORT-TEST] PHASE1 automationblocks");
    } else {
      check(washedQuality() === 0, "the washed apple is gone after the restart");
      check(count(inv(wormFarm), "aquaculture:worm") === 1, "the worm is gone after the restart");
      check(count(inv(obelisk), "society:spark_gro") === 1, "the obelisk holds the wrong Spark-Gro count after the restart");
      for (let x = 0; x <= 4; x++) {
        level.getBlock(bx + x, y, bz).set("minecraft:air");
        level.getBlock(bx + x, y - 1, bz).set("minecraft:air");
      }
      console.info("[PORT-TEST] PASS automationblocks");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL automationblocks: ${e}`);
  }
});
