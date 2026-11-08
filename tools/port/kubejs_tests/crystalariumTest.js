// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 places a Crystalarium, inserts a diamond and runs the morning ticks until it is done.
// Boot 2 checks that the finished state survived the restart and harvests two diamonds.
// Prints "[PORT-TEST] PHASE1 crystalarium", "[PORT-TEST] PASS crystalarium" or "[PORT-TEST] FAIL crystalarium: ...".

ServerEvents.loaded((event) => {
  const server = event.server;
  const level = server.overworld();
  const spawn = level.getSharedSpawnPos();
  const block = level.getBlock(spawn.x, 300, spawn.z);
  const recipes = global.crystalariumCrystals;
  const sound = "minecraft:block.amethyst_block.step";
  const check = (ok, message) => {
    if (!ok) throw new Error(message);
  };

  try {
    if (String(block.id) !== "society:crystalarium") {
      check(!Item.of("society:crystalarium").isEmpty(), "block item is not registered");
      check(!Item.of("society:pristine_diamond").isEmpty(), "society:pristine_diamond is not registered");
      let hasRecipe = false;
      server.getRecipeManager().getRecipes().forEach((holder) => {
        const result = holder.value().getResultItem(server.registryAccess());
        if (String(result.id) === "society:crystalarium") hasRecipe = true;
      });
      check(hasRecipe, "no crafting recipe makes society:crystalarium");

      block.set("society:crystalarium", { facing: "north" });
      check(String(block.id) === "society:crystalarium", `placing failed, found ${block.id}`);
      check(global.getMachineData(block) !== null, "no KubeJS block entity data");
      check(global.getMachineString(block, "recipe") === "", "new machine already has a recipe");

      const used = global.artisanInsert(block, Item.of("minecraft:diamond"), level, recipes, 5, sound, false, false, true, server, null);
      check(used === 1, `insert used ${used} items`);
      check(global.getMachineString(block, "recipe") === "minecraft:diamond", "recipe was not stored");
      check(global.isBlockPropertyTrue(block, "working"), "machine is not working after insert");

      // Diamonds take 4 mornings.
      for (let day = 0; day < 4; day++) {
        check(!global.isBlockPropertyTrue(block, "mature"), `done too early, after ${day} mornings`);
        global.handleBETick({ level: level, block: block }, recipes, 5, false, true);
      }
      check(global.isBlockPropertyTrue(block, "mature"), "not done after 4 mornings");
      check(!global.isBlockPropertyTrue(block, "working"), "still working after it is done");
      console.info("[PORT-TEST] PHASE1 crystalarium");
    } else {
      check(global.isBlockPropertyTrue(block, "mature"), "done state was lost on restart");
      check(global.getMachineString(block, "recipe") === "minecraft:diamond", "recipe was lost on restart");
      const outputs = global.artisanHarvest(block, recipes, 5, 1, false, true, server, null);
      check(outputs && outputs.length === 1, `harvest returned ${outputs}`);
      check(String(outputs[0].id) === "minecraft:diamond" && outputs[0].count === 2, `harvested ${outputs[0]}`);
      check(global.getMachineString(block, "recipe") === "", "recipe not cleared after harvest");
      check(!global.isBlockPropertyTrue(block, "mature"), "still done after harvest");
      block.set("minecraft:air");
      console.info("[PORT-TEST] PASS crystalarium");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL crystalarium: ${e}`);
  }
});
