// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 places each artisan machine of #11 above spawn, inserts a sample input from its recipe map and runs the
// morning ticks until it is done. Boot 2 checks the done state survived the restart and harvests the output.
// Prints "[PORT-TEST] PHASE1 artisanmachines", "[PORT-TEST] PASS artisanmachines" or "[PORT-TEST] FAIL artisanmachines: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  // [block id, recipe map, stages for an insert, multiple inputs, tag recipes, stages for a tick, halve time]
  let machines = [
    ["society:wine_keg", global.wineKegRecipes, 3, true, true, 6, false],
    ["society:aging_cask", global.agingCaskRecipes, 10, false, false, 10, true],
    ["society:ancient_cask", global.ancientCaskRecipes, 4, true, false, 20, false],
    ["society:bait_maker", global.baitMakerRecipes, 1, false, false, 1, false],
    ["society:cheese_press", global.cheesePressRecipes, 3, false, false, 2, false],
    ["society:dehydrator", global.dehydratorRecipes, 8, true, false, 1, false],
    ["society:fish_smoker", global.fishSmokerRecipes, 5, false, false, 2, false],
    ["society:loom", global.loomRecipes, 5, true, true, 1, false],
    ["society:mayonnaise_machine", global.mayonnaiseMachineRecipes, 3, false, false, 1, false],
    ["society:oil_maker", global.oilMakerRecipes, 1, false, false, 1, false],
    ["society:recycling_machine", global.recyclingMachineRecipes, 1, false, false, 1, false],
    ["society:seed_maker", global.seedMakerRecipes, 3, true, false, 1, false],
  ];
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let sampleInput = (recipes) => {
    let keys = Array.from(recipes.keys()).filter((key) => !key.startsWith("#") && global.itemExists(key));
    return keys.length > 0 ? keys[0] : null;
  };

  try {
    let first = level.getBlock(spawn.x + 20, 300, spawn.z);
    if (String(first.id) !== "society:wine_keg") {
      let crafted = {};
      server.getRecipeManager().getRecipes().forEach((holder) => {
        crafted[String(holder.value().getResultItem(server.registryAccess()).id)] = true;
      });
      let uncraftable = machines.map((m) => m[0]).filter((id) => !crafted[id]);
      // The Loom needs society:treated_log, which comes from Create filling with oak resin (not ported yet).
      uncraftable = uncraftable.filter((id) => id !== "society:loom");
      check(uncraftable.length === 0, `no crafting recipe makes ${uncraftable.join(", ")}`);

      machines.forEach((machine, i) => {
        let id = machine[0];
        let recipes = machine[1];
        let block = level.getBlock(spawn.x + 20 + i * 2, 300, spawn.z);
        let input = sampleInput(recipes);
        check(input !== null, `${id} has no recipe with an input in the pack`);
        block.set(id, { facing: "north" });
        check(String(block.id) === id, `placing ${id} failed, found ${block.id}`);
        let used = global.artisanInsert(block, Item.of(input, 64), level, recipes, machine[2],
          "minecraft:block.wood.place", machine[3], machine[4], true, server, null);
        check(used > 0, `${id} did not take ${input}`);
        check(global.isBlockPropertyTrue(block, "working"), `${id} is not working after ${input}`);
        for (let day = 0; day < 60 && !global.isBlockPropertyTrue(block, "mature"); day++) {
          global.handleBETick({ level: level, block: block }, recipes, machine[5], machine[6], true);
        }
        check(global.isBlockPropertyTrue(block, "mature"), `${id} is not done after 60 mornings`);
      });
      console.info("[PORT-TEST] PHASE1 artisanmachines");
    } else {
      machines.forEach((machine, i) => {
        let id = machine[0];
        let block = level.getBlock(spawn.x + 20 + i * 2, 300, spawn.z);
        check(String(block.id) === id, `${id} is gone after the restart`);
        check(global.isBlockPropertyTrue(block, "mature"), `${id} lost its done state on restart`);
        let recipe = global.getMachineString(block, "recipe");
        let outputs = global.artisanHarvest(block, machine[1], machine[2], 1, false, true, server, null);
        check(outputs && outputs.length > 0, `${id} harvested nothing from ${recipe}`);
        outputs.forEach((stack) => check(!stack.isEmpty(), `${id} harvested an empty stack from ${recipe}`));
        block.set("minecraft:air");
      });
      console.info("[PORT-TEST] PASS artisanmachines");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL artisanmachines: ${e}`);
  }
});
