// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 checks the plushie items keep their data, places a plushie, gives it the gift it asks for and lets a
// sheep be sacrificed in front of other animals. Boot 2 checks the placed plushie kept its data and pops it.
// Prints "[PORT-TEST] PHASE1 plushies", "[PORT-TEST] PASS plushies" or "[PORT-TEST] FAIL plushies: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let bx = spawn.x - 12;
  let bz = spawn.z - 8;
  let y = 300;
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let stages = (list) => ({ has: (stage) => list.indexOf(String(stage)) !== -1 });
  let reg = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
  let rl = Java.loadClass("net.minecraft.resources.ResourceLocation");
  let at = (dx) => level.getBlock(bx + dx, y, bz);
  let plushieId = "perfectplushies:adv_red_fox_plushie";

  try {
    if (String(at(0).id) !== plushieId) {
      check(global.plushies.length === 47, `${global.plushies.length} plushies`);
      global.plushies.forEach((id) => check(reg.ITEM.containsKey(rl.parse(id)), `no ${id}`));
      let tagged = Ingredient.of("#society:plushies").itemIds.length;
      check(tagged === global.plushies.length, `${tagged} items in #society:plushies`);
      console.info(`[PORT-TEST] plushies gatcha machine: ${reg.BLOCK.containsKey(rl.parse("whimsy_deco:gatcha_machine"))}`);

      // Every trait has something to ask for.
      global.plushieTraits.forEach((trait, type) => {
        let item = global.getPlushieQuestItem(type, 0, 1);
        check(item !== "" && reg.ITEM.containsKey(rl.parse(item)), `trait ${trait.trait} asks for "${item}"`);
      });
      check(global.getPlushieQuestItem(0, 4, 1) === "", "a plushie at full affection still asks for a gift");

      let item = global.plushieItem(plushieId, { type: 3, quest_id: 2, affection: 1, quality: 2 });
      let data = global.getPlushieItemData(item);
      check(data !== null && data.type === 3 && data.quest_id === 2 && data.affection === 1, `item data ${JSON.stringify(data)}`);
      check(data.quality === 2, `item quality ${data.quality}`);
      check(global.getPlushieItemData(Item.of(plushieId)) === null, "a plain plushie has data");
      let rolled = global.rollPlushie(true, true);
      check(rolled.count === 2 && global.getPlushieItemData(rolled).affection === 2, "the lucky capsule roll is wrong");

      // A placed plushie takes the gift it asks for and only that.
      at(0).set(plushieId, { facing: "north" });
      global.setMachineData(at(0), { type: 0, quest_id: 1, affection: 0, quality: 1 });
      let wanted = global.getPlushieQuestItem(0, 0, 1);
      let wrong = Item.of("minecraft:stick");
      check(!global.giftPlushie(at(0), wrong, stages([])), "the plushie took a stick");
      let gift = Item.of(wanted, 2);
      check(global.giftPlushie(at(0), gift, stages([])), `the plushie did not take ${wanted}`);
      check(gift.count === 1, "the gift was not used up");
      let placed = global.getPlushieBlockData(at(0));
      check(placed.affection === 1 && placed.quest_id >= 1 && placed.quest_id <= 3, `after the gift ${JSON.stringify(placed)}`);
      // Women Who Run with the Plushies lifts a plushie to two hearts.
      global.giftPlushie(at(0), wrong, stages(["women_who_run_with_the_plushies"]));
      check(global.getPlushieBlockData(at(0)).affection === 2, "the skill book did not give two hearts");

      // Sacrificial Lamb.
      let spawnAnimal = (type, dx, dz) => {
        let animal = level.createEntity(type);
        animal.setPos(bx + dx + 0.5, y + 2, bz + dz + 0.5);
        animal.setNoAi(true);
        animal.setNoGravity(true);
        animal.spawn();
        return animal;
      };
      let lamb = spawnAnimal("minecraft:sheep", 0, 3);
      global.setAnimalInt(lamb.persistentData, "affection", 400);
      let sheep = spawnAnimal("minecraft:sheep", 1, 3);
      global.setAnimalInt(sheep.persistentData, "affection", 300);
      let cows = [];
      for (let i = 0; i < 10; i++) cows.push(spawnAnimal("minecraft:cow", i - 4, 5));
      let blessed = global.handleSacrifice(lamb, lamb);
      check(blessed > 0, "no animal got the lamb's affection");
      check(global.animalInt(sheep.persistentData, "affection") === 200, "the other sheep did not lose affection");
      let gained = cows.filter((cow) => global.animalInt(cow.persistentData, "affection") === 200).length;
      check(gained === blessed, `${gained} cows have 200 affection, ${blessed} were blessed`);
      check(global.animalInt(lamb.persistentData, "affection") === 400, "the lamb itself was counted");
      [lamb, sheep].concat(cows).forEach((animal) => animal.discard());
      console.info("[PORT-TEST] PHASE1 plushies");
    } else {
      let placed = global.getPlushieBlockData(at(0));
      check(placed.type === 0 && placed.affection === 2 && placed.quality === 1, `after the restart ${JSON.stringify(placed)}`);
      let popped = global.plushieItem(String(at(0).id), placed);
      let data = global.getPlushieItemData(popped);
      check(data.affection === 2 && data.quality === 1, `the popped plushie has ${JSON.stringify(data)}`);
      at(0).set("minecraft:air");
      console.info("[PORT-TEST] PASS plushies");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL plushies: ${e}`);
  }
});
