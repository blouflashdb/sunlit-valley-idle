// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 spawns a cow next to spawn, gives it 10 hearts and checks milking, the daily drops, Magic Shears and the
// mood. Boot 2 finds the cow again and checks its husbandry data was saved.
// Prints "[PORT-TEST] PHASE1 husbandry", "[PORT-TEST] PASS husbandry" or "[PORT-TEST] FAIL husbandry: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let saved = server.persistentData;

  if (!saved.contains("husbandryTestCow")) {
    try {
      let spawn = level.getSharedSpawnPos();
      let cow = level.createEntity("minecraft:cow");
      cow.setPos(spawn.x + 4.5, spawn.y + 2, spawn.z + 4.5);
      cow.setNoAi(true);
      cow.setNoGravity(true);
      cow.spawn();
      check(global.checkEntityTag(cow, "society:husbandry_animal"), "a cow is not a husbandry animal");
      check(global.checkEntityTag(cow, "society:milkable_animal"), "a cow is not milkable");
      check(!global.checkEntityTag(cow, "society:pet_animal"), "a cow is a pet");

      let day = global.getDay(level);
      global.initializeFarmAnimal(day, cow, level);
      let data = cow.persistentData;
      global.setAnimalInt(data, "affection", 1000);
      global.setAnimalInt(data, "ageLastFed", day);
      global.setAnimalInt(data, "ageLastPet", day);
      check(global.getHearts(data) === 10, `the cow has ${global.getHearts(data)} hearts`);

      let mood = global.getOrFetchMood(level, cow, day, null);
      check(mood >= 0 && mood <= 256, `the cow's mood is ${mood}`);
      let milk = global.getMilk(level, cow, null, day, true, global.NO_STAGES);
      check(milk !== null && String(milk.id).includes("milk"), `the cow gave ${milk} instead of milk`);
      check(global.getMilk(level, cow, null, day, true, global.NO_STAGES) === null, "the cow gave milk twice in a day");

      let drops = global.rollSpecialDrops(level, cow, null, global.NO_STAGES);
      check(Array.isArray(drops), "the daily drops are not a list");
      check(global.animalInt(data, "ageLastDroppedSpecial") === day, "the daily drops did not mark the day");

      let loot = global.getMagicShearsOutput(level, cow, null, global.NO_STAGES);
      check(loot !== null && loot.length > 0, "Magic Shears gave nothing from a 10-heart cow");
      check(global.getMagicShearsOutput(level, cow, null, global.NO_STAGES) === null, "Magic Shears worked twice in a day");
      console.info(`[PORT-TEST] husbandry milk=${milk} mood=${mood} loot=${loot.map((s) => String(s)).join(",")}`);

      saved.putString("husbandryTestCow", String(cow.getUuid()));
      console.info("[PORT-TEST] PHASE1 husbandry");
    } catch (e) {
      console.error(`[PORT-TEST] FAIL husbandry: ${e}`);
    }
    return;
  }

  // Entities load a little after the world, so look for the cow a few seconds later.
  server.scheduleInTicks(100, () => {
    try {
      // level.getEntity(UUID) resolves to getEntity(int) in Rhino, so look through the loaded entities.
      let cowId = saved.getString("husbandryTestCow");
      let cow = null;
      level.getAllEntities().forEach((entity) => {
        if (String(entity.getUuid()) === cowId) cow = entity;
      });
      check(cow !== null, "the test cow is gone after the restart");
      let data = cow.persistentData;
      check(global.animalInt(data, "affection") >= 900, `the cow has ${global.animalInt(data, "affection")} affection after the restart`);
      check(global.animalInt(data, "ageLastMilked") === global.getDay(level), "the cow forgot it was milked");
      cow.discard();
      console.info("[PORT-TEST] PASS husbandry");
    } catch (e) {
      console.error(`[PORT-TEST] FAIL husbandry: ${e}`);
    }
  });
});
