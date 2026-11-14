// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 builds an Auto-Grabber over a chest, a Feeding Trough and an Auto-Petter above spawn, with a cow between
// them, and runs each machine once. Boot 2 checks the milk and the leftover feed are still there.
// Prints "[PORT-TEST] PHASE1 husbandryautomation", "[PORT-TEST] PASS husbandryautomation" or "... FAIL ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let bx = spawn.x + 20;
  let bz = spawn.z + 20;
  let y = 300;
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let inv = (block) => block.getEntity().attachments.get("inventory");
  let grabber = level.getBlock(bx, y, bz);
  let trough = level.getBlock(bx + 2, y, bz);
  let petter = level.getBlock(bx, y, bz + 2);

  try {
    if (String(grabber.id) !== "society:auto_grabber") {
      grabber.set("society:auto_grabber", { facing: "north" });
      level.getBlock(bx, y - 1, bz).set("minecraft:chest");
      trough.set("society:feeding_trough", { facing: "north" });
      petter.set("society:auto_petter", { facing: "north" });
      grabber = level.getBlock(bx, y, bz);
      trough = level.getBlock(bx + 2, y, bz);
      petter = level.getBlock(bx, y, bz + 2);

      let cow = level.createEntity("minecraft:cow");
      cow.setPos(bx + 1.5, y, bz + 1.5);
      cow.setNoAi(true);
      cow.setNoGravity(true);
      cow.spawn();
      let day = global.getDay(level);
      global.initializeFarmAnimal(day, cow, level);
      let data = cow.persistentData;
      global.setAnimalInt(data, "affection", 600);

      // Feeding Trough: the cow was fed today; run the trough tomorrow and put the time back. (On day 1 the cow's
      // "yesterday" is day 0, which the trough reads as never fed, so the test does not use it.)
      let time = Number(level.getDayTime());
      global.setAnimalInt(data, "ageLastFed", day);
      global.insertIntoHandler(inv(trough), Item.of("society:animal_feed", 10), false);
      level.setDayTime(time + 24000);
      global.runFeedingTrough({ level: level, block: trough });
      level.setDayTime(time);
      check(global.animalInt(data, "ageLastFed") === day + 1, "the feeding trough did not feed the cow");
      // Back to fed today, so the cow is not "fed in the future" for the machines below.
      global.setAnimalInt(data, "ageLastFed", day);
      check(global.countInHandler(inv(trough), "society:animal_feed") === 9, "the feeding trough did not use one feed");
      check(global.getBlockProperty(level.getBlock(trough.getPos()), "fill") === "1", "the feeding trough does not look filled");

      // Auto-Petter: only in the morning, so run it at 7:00 of today and put the time back.
      level.setDayTime((day - 1) * 24000 + 1000);
      global.runAutoPetter({ level: level, block: petter });
      level.setDayTime(time);
      check(global.animalInt(data, "ageLastPet") === day, "the auto-petter did not pet the cow");
      check(global.animalInt(data, "affection") === 605, `the cow has ${global.animalInt(data, "affection")} affection after petting`);

      // Auto-Grabber: milks the cow into the chest below for one sparkstone.
      global.insertIntoHandler(inv(grabber), Item.of("society:sparkstone", 5), false);
      global.runAutoGrabber({ level: level, block: grabber });
      let chest = global.getInventoryBelow(level, grabber);
      let milk = global.countInHandler(chest, "society:milk") + global.countInHandler(chest, "society:large_milk");
      check(milk > 0, "the auto-grabber did not milk the cow into the chest");
      check(global.countInHandler(inv(grabber), "society:sparkstone") < 5, "the auto-grabber used no sparkstone");
      cow.discard();
      console.info("[PORT-TEST] PHASE1 husbandryautomation");
    } else {
      let chest = global.getInventoryBelow(level, grabber);
      let milk = global.countInHandler(chest, "society:milk") + global.countInHandler(chest, "society:large_milk");
      check(milk > 0, "the milk is gone after the restart");
      check(global.countInHandler(inv(trough), "society:animal_feed") === 9, "the feed is gone after the restart");
      [[0, 0, 0], [0, -1, 0], [2, 0, 0], [0, 0, 2]].forEach((o) => level.getBlock(bx + o[0], y + o[1], bz + o[2]).set("minecraft:air"));
      console.info("[PORT-TEST] PASS husbandryautomation");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL husbandryautomation: ${e}`);
  }
});
