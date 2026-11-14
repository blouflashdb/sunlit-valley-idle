// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 starts the Tapper, Mushroom Log, Espresso Machine, Deluxe Worm Farm and Charging Rod of #11 above
// spawn the way a random tick or a click would and runs them until they are done. Boot 2 checks the done
// state survived the restart and harvests the outputs.
// Prints "[PORT-TEST] PHASE1 moreartisanmachines", "[PORT-TEST] PASS moreartisanmachines" or "[PORT-TEST] FAIL moreartisanmachines: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let x0 = spawn.x - 40;
  let z0 = spawn.z;
  let ids = ["society:tapper", "society:mushroom_log", "society:espresso_machine", "society:deluxe_worm_farm", "society:charging_rod"];
  let espressoRecipes = new Map([["herbalbrews:ground_coffee", { output: ["1x society:espresso"] }]]);
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let at = (i) => level.getBlock(x0 + i * 4, 300, z0);
  let ev = (block) => ({ level: level, block: block });
  let runTicks = (block, recipes, stages) => {
    for (let day = 0; day < 60 && !global.isBlockPropertyTrue(block, "mature"); day++) {
      global.handleBETick(ev(block), recipes, stages, false, true);
    }
  };

  try {
    if (String(at(0).id) !== "society:tapper") {
      let crafted = {};
      server.getRecipeManager().getRecipes().forEach((holder) => {
        crafted[String(holder.value().getResultItem(server.registryAccess()).id)] = true;
      });
      let uncraftable = ids.filter((id) => !crafted[id]);
      check(uncraftable.length === 0, `no crafting recipe makes ${uncraftable.join(", ")}`);

      // Tapper on an oak log: facing north, so the log is to the south.
      let tapper = at(0);
      level.getBlock(tapper.x, 300, tapper.z + 1).set("minecraft:oak_log");
      tapper.set("society:tapper", { facing: "north" });
      global.handleTapperRandomTick(ev(tapper));
      check(!global.isBlockPropertyTrue(tapper, "error"), "the tapper on an oak log is in the error state");
      check(global.isBlockPropertyTrue(tapper, "working"), "the tapper on an oak log did not start");
      runTicks(tapper, global.tapperRecipes, 7);
      check(global.isBlockPropertyTrue(tapper, "mature"), "the tapper is not done after 60 mornings");

      // Mushroom Log between oak logs.
      let log = at(1);
      log.set("society:mushroom_log", { facing: "north" });
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach((o) => level.getBlock(log.x + o[0], 300, log.z + o[1]).set("minecraft:oak_log"));
      global.handleMushroomLogRandomTick(ev(log));
      check(global.isBlockPropertyTrue(log, "working"), "the mushroom log next to oak logs did not start");
      runTicks(log, global.mushroomLogRecipes, 4);
      check(global.isBlockPropertyTrue(log, "mature"), "the mushroom log is not done after 60 mornings");

      // Espresso Machine: four ground coffee, then one random tick.
      let espresso = at(2);
      espresso.set("society:espresso_machine", { facing: "north" });
      check(global.itemExists("herbalbrews:ground_coffee"), "herbalbrews:ground_coffee is missing");
      let used = global.artisanInsert(espresso, Item.of("herbalbrews:ground_coffee", 64), level, espressoRecipes, 4,
        "minecraft:block.wood.place", true, false, true, server, null);
      check(used > 0 && global.isBlockPropertyTrue(espresso, "working"), "the espresso machine did not take ground coffee");
      global.handleBERandomTick(ev(espresso), true, 1);
      check(global.isBlockPropertyTrue(espresso, "mature"), "the espresso machine is not done after a random tick");

      // Deluxe Worm Farm: four crab trap bait, then two random ticks.
      let farm = at(3);
      farm.set("society:deluxe_worm_farm", { facing: "north" });
      used = global.artisanInsert(farm, Item.of("crabbersdelight:crab_trap_bait", 64), level, global.deluxeWormFarmRecipes, 4,
        "minecraft:block.wood.place", true, false, true, server, null);
      check(used > 0 && global.isBlockPropertyTrue(farm, "working"), "the deluxe worm farm did not take crab trap bait");
      for (let i = 0; i < 4 && !global.isBlockPropertyTrue(farm, "mature"); i++) global.handleBERandomTick(ev(farm), true, 2);
      check(global.isBlockPropertyTrue(farm, "mature"), "the deluxe worm farm is not done after its random ticks");

      // Charging Rod: started like a lightning strike does, then five mornings.
      let rod = at(4);
      rod.set("society:charging_rod", { facing: "north" });
      global.setMachineData(rod, { stage: 0 });
      global.setBlockProperties(rod, { working: true, mature: false });
      runTicks(rod, null, 5);
      check(global.isBlockPropertyTrue(rod, "mature"), "the charging rod is not done after 60 mornings");
      check(String(rod.id) === "society:charging_rod", "setBlockProperties changed the charging rod");
      console.info("[PORT-TEST] PHASE1 moreartisanmachines");
    } else {
      ids.forEach((id, i) => {
        check(String(at(i).id) === id, `${id} is gone after the restart`);
        check(global.isBlockPropertyTrue(at(i), "mature"), `${id} lost its done state on restart`);
      });
      check(global.getBlockProperty(at(0), "facing") === "north", "the tapper lost its facing");
      let harvests = [
        [0, global.tapperRecipes, 7],
        [1, global.mushroomLogRecipes, 7],
        [2, espressoRecipes, 4],
        [3, global.deluxeWormFarmRecipes, 4],
      ];
      harvests.forEach((h) => {
        let block = at(h[0]);
        let recipe = global.getMachineString(block, "recipe");
        let outputs = global.artisanHarvest(block, h[1], h[2], 1, false, true, server, null);
        check(outputs && outputs.length > 0, `${block.id} harvested nothing from ${recipe}`);
        outputs.forEach((stack) => check(!stack.isEmpty(), `${block.id} harvested an empty stack from ${recipe}`));
      });
      for (let i = 0; i < ids.length; i++) {
        let block = at(i);
        [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach((o) => level.getBlock(block.x + o[0], 300, block.z + o[1]).set("minecraft:air"));
      }
      console.info("[PORT-TEST] PASS moreartisanmachines");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL moreartisanmachines: ${e}`);
  }
});
