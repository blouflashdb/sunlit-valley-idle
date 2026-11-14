// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 builds a cod Fish Pond with ice behind it above spawn, grows it, harvests it, opens a quest and lets a
// Fish Pond Manager hand it in, then runs a Fish Pond Basket and a Roe Recycler over chests and checks the pond item
// keeps the fish. Boot 2 checks the pond, the roe and the restored pond are still there.
// Prints "[PORT-TEST] PHASE1 fishpond", "[PORT-TEST] PASS fishpond" or "[PORT-TEST] FAIL fishpond: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let bx = spawn.x + 24;
  let bz = spawn.z - 24;
  let y = 300;
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let at = (dx, dy, dz) => level.getBlock(bx + dx, y + dy, bz + dz);
  let inv = (block) => block.getEntity().attachments.get("inventory");
  let machine = (dx, dy, dz) => ({ level: level, block: at(dx, dy, dz) });
  let pond = () => at(0, 0, 0);

  try {
    if (String(pond().id) !== "society:fish_pond") {
      // A north-facing pond takes the 3x4 behind it (south).
      pond().set("society:fish_pond", { facing: "north" });
      for (let dx = -1; dx <= 1; dx++) for (let dz = 1; dz <= 4; dz++) at(dx, 0, dz).set("minecraft:ice");
      check(global.isPondFish("minecraft:cod"), "cod cannot live in a pond");
      global.startFishPond(pond(), "minecraft:cod");
      check(global.validatePond(level, pond(), false), "the pond with 12 ice behind it is not valid");
      at(1, 0, 4).set("minecraft:stone");
      check(!global.validatePond(level, pond(), false), "the pond with 11 ice behind it is valid");
      at(1, 0, 4).set("minecraft:ice");

      // Morning: one fish more a day until the cap of 3; with two fish the pond can be harvested.
      global.growFishPond(level, pond());
      check(global.getMachineInt(pond(), "population") === 2, `the pond has ${global.getMachineInt(pond(), "population")} fish`);
      global.growFishPond(level, pond());
      check(global.getMachineInt(pond(), "population") === 3, "the pond did not grow to 3 fish");
      check(global.isBlockPropertyTrue(pond(), "mature"), "the pond with 3 fish cannot be harvested");
      let harvest = global.handleFishHarvest(level, pond(), null, global.NO_STAGES);
      check(harvest.some((s) => String(s.id) === "society:cod_roe"), `the harvest is ${harvest.map((s) => String(s)).join(",")}`);
      check(!global.isBlockPropertyTrue(pond(), "mature"), "the pond is still harvestable after the harvest");

      // A full pond opens a quest (75% a morning); the Fish Pond Manager hands it in from its inventory.
      for (let i = 0; i < 30 && !global.isBlockPropertyTrue(pond(), "quest"); i++) global.growFishPond(level, pond());
      let quest = global.getPondQuest(pond());
      check(quest !== null, "the full pond opened no quest");
      at(0, 0, -3).set("society:fish_pond_manager", { facing: "north" });
      global.insertIntoHandler(inv(at(0, 0, -3)), Item.of(quest.item, quest.count), false);
      check(global.runFishPondManager(machine(0, 0, -3), true) === 1, "the fish pond manager handed in no quest");
      check(global.getMachineInt(pond(), "max_population") === 5, "the quest did not raise the cap to 5");
      check(!global.isBlockPropertyTrue(pond(), "quest"), "the quest is still open");

      // Fish Pond Basket (diagonal to the pond) harvests into the chest below for one sparkstone.
      global.setBlockProperties(pond(), { mature: true });
      at(-1, 0, -1).set("society:fish_pond_basket");
      at(-1, -1, -1).set("minecraft:chest");
      global.insertIntoHandler(inv(at(-1, 0, -1)), Item.of("society:sparkstone", 3), false);
      global.runFishPondBaskets(machine(-1, 0, -1), 1);
      check(global.countInHandler(global.getInventoryBelow(level, at(-1, 0, -1)), "society:cod_roe") > 0, "the basket put no roe in the chest");
      check(global.countInHandler(inv(at(-1, 0, -1)), "society:sparkstone") === 2, "the basket did not use one sparkstone");

      // Roe Recycler: one roe a run.
      at(3, 0, -3).set("society:roe_recycler", { facing: "north" });
      at(3, -1, -3).set("minecraft:chest");
      global.insertIntoHandler(inv(at(3, 0, -3)), Item.of("society:cod_roe", 3), false);
      global.runRoeRecycler(machine(3, 0, -3), true);
      check(global.countInHandler(inv(at(3, 0, -3)), "society:cod_roe") === 2, "the roe recycler used no roe");

      // A broken pond keeps its fish in the item.
      let pondItem = global.fishPondItem(pond());
      at(6, 0, 0).set("society:fish_pond", { facing: "north" });
      global.restoreFishPond(at(6, 0, 0), pondItem);
      check(global.getMachineString(at(6, 0, 0), "type") === "minecraft:cod", "the pond item lost the fish");
      check(global.getMachineInt(at(6, 0, 0), "max_population") === 5, "the pond item lost the cap");
      console.info(`[PORT-TEST] fishpond status: ${global.getFishPondStatusText(pond()).getString()}`);
      console.info("[PORT-TEST] PHASE1 fishpond");
    } else {
      check(global.getMachineString(pond(), "type") === "minecraft:cod", "the pond lost its fish after the restart");
      check(global.getMachineInt(pond(), "max_population") === 5, "the pond lost its cap after the restart");
      check(global.countInHandler(global.getInventoryBelow(level, at(-1, 0, -1)), "society:cod_roe") > 0, "the roe is gone after the restart");
      check(global.getMachineString(at(6, 0, 0), "type") === "minecraft:cod", "the restored pond lost its fish after the restart");
      for (let dx = -2; dx <= 6; dx++) {
        for (let dz = -3; dz <= 4; dz++) {
          at(dx, 0, dz).set("minecraft:air");
          at(dx, -1, dz).set("minecraft:air");
        }
      }
      console.info("[PORT-TEST] PASS fishpond");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL fishpond: ${e}`);
  }
});
