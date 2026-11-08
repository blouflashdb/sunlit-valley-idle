// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 houses a 10-heart cow in an Eldritch plushie and collects its milk, daily drops and trait drop once a day.
// Boot 2 checks the plushie kept the cow and the day it was milked, then lets the cow out again.
// Prints "[PORT-TEST] PHASE1 plushiehusbandry", "[PORT-TEST] PASS plushiehusbandry" or
// "[PORT-TEST] FAIL plushiehusbandry: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let plushie = () => level.getBlock(spawn.x - 12, 300, spawn.z - 4);
  let plushieId = "perfectplushies:adv_cat_plushie";
  let ids = (stacks) => stacks.map((s) => String(s.id));

  try {
    if (String(plushie().id) !== plushieId) {
      let cow = level.createEntity("minecraft:cow");
      cow.setPos(spawn.x - 11.5, 302, spawn.z - 1.5);
      cow.setNoAi(true);
      cow.setNoGravity(true);
      cow.spawn();
      global.initializeFarmAnimal(global.getDay(level), cow, level);
      global.setAnimalInt(cow.persistentData, "affection", 1000);
      global.setAnimalFlag(cow.persistentData, "bff", true);

      // A Sunlit Crystal needs a 4-heart plushie without an animal and a 10-heart animal.
      let home = global.plushieItem(plushieId, { type: 2, quest_id: 0, affection: 4, quality: 0 });
      check(global.getSunlitCrystalError(cow, home) === "", `the crystal refuses: ${global.getSunlitCrystalError(cow, home)}`);
      let young = global.plushieItem(plushieId, { type: 2, quest_id: 1, affection: 3, quality: 0 });
      check(global.getSunlitCrystalError(cow, young) !== "", "a 3-heart plushie took an animal");
      check(global.getSunlitCrystalError(cow, Item.of("minecraft:stick")) !== "", "a stick took an animal");
      let animal = global.plushieAnimalFromEntity(cow);
      check(animal.type === "minecraft:cow" && animal.bff === true, `stored animal ${JSON.stringify(animal)}`);
      let housed = global.plushieItem(plushieId, { type: 2, quest_id: 0, affection: 4, quality: 0, animal: JSON.stringify(animal) });
      check(global.getSunlitCrystalError(cow, housed) !== "", "a plushie took a second animal");
      cow.discard();

      // Placed, it gives milk, the daily drops and the Eldritch raw silver once a day.
      plushie().set(plushieId, { facing: "north" });
      global.setMachineData(plushie(), global.getPlushieItemData(housed));
      let placedAnimal = global.getPlushieBlockAnimal(plushie());
      let raw = global.getMachineString(plushie(), "animal");
      check(placedAnimal && placedAnimal.type === "minecraft:cow", `the placed plushie has no cow: "${raw}"`);
      let first = global.harvestPlushieAnimal(level, plushie(), { milk: true });
      check(first.milked, `the cow gave no milk: ${ids(first.stacks)}`);
      check(ids(first.stacks).indexOf("oreganized:raw_silver") !== -1, `no Eldritch drop: ${ids(first.stacks)}`);
      let second = global.harvestPlushieAnimal(level, plushie(), { milk: true });
      check(!second.milked && second.stacks.length === 0, `the cow gave twice a day: ${ids(second.stacks)}`);
      console.info(`[PORT-TEST] plushiehusbandry products: ${ids(first.stacks).join(",")}`);
      console.info("[PORT-TEST] PHASE1 plushiehusbandry");
    } else {
      let animal = global.getPlushieBlockAnimal(plushie());
      check(animal && animal.type === "minecraft:cow", "the plushie lost its cow");
      check(Number(animal.ageLastMilked) > 0, `the plushie forgot when the cow was milked: ${JSON.stringify(animal)}`);
      let cow = global.releasePlushieAnimal(level, plushie());
      check(cow !== null, "the cow did not come out");
      check(global.animalInt(cow.persistentData, "affection") === 1000, "the released cow lost affection");
      check(global.animalFlag(cow.persistentData, "bff"), "the released cow lost its BFF flag");
      check(global.getPlushieBlockAnimal(plushie()) === null, "the cow is still in the plushie");
      cow.discard();
      plushie().set("minecraft:air");
      console.info("[PORT-TEST] PASS plushiehusbandry");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL plushiehusbandry: ${e}`);
  }
});
