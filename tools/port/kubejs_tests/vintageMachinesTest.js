// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 places the Preserves Jar, Fermenting Jar, Pickling Can and Evaporator above spawn and runs each once.
// Boot 2 checks that the jar's finished state and the fermented pickles survived the restart.
// Prints "[PORT-TEST] PHASE1 vintagemachines", "[PORT-TEST] PASS vintagemachines" or "[PORT-TEST] FAIL vintagemachines: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let at = (dx, y) => level.getBlock(spawn.x + dx, y, spawn.z);
  let jar = at(6, 300);
  let fermenter = at(8, 300);
  let chest = at(10, 300);
  let can = at(10, 301);
  let salt = at(11, 301);
  let evaporator = at(12, 300);
  let water = at(13, 300);
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let inventoryOf = (block) => block.getEntity().attachments.get("inventory");
  let countIn = (handler, id) => {
    let count = 0;
    for (let i = 0; i < handler.getSlots(); i++) {
      let stack = handler.getStackInSlot(i);
      if (String(stack.id) === id) count += stack.count;
    }
    return count;
  };

  try {
    if (String(jar.id) !== "society:preserves_jar") {
      let machines = ["society:preserves_jar", "society:pickling_can", "vintagedelight:fermenting_jar", "vintagedelight:evaporator"];
      machines.forEach((id) => check(global.itemExists(id), `${id} is not registered`));
      let crafted = {};
      server.getRecipeManager().getRecipes().forEach((holder) => {
        crafted[String(holder.value().getResultItem(server.registryAccess()).id)] = true;
      });
      let skipped = (global.vintageDelightSkippedRecipes || []).join("; ");
      machines.forEach((id) => check(crafted[id], `no crafting recipe makes ${id}; skipped recipes: ${skipped}`));

      // Preserves Jar: five cucumbers, three mornings, relish.
      jar.set("society:preserves_jar", { facing: "north" });
      let used = global.artisanInsert(jar, Item.of("vintagedelight:cucumber", 5), level, global.preservesJarRecipes, 5,
        "minecraft:block.wood.place", true, true, true, server, null);
      check(used === 5, `preserves jar took ${used} cucumbers`);
      check(global.isBlockPropertyTrue(jar, "working"), "preserves jar is not working");
      for (let day = 0; day < 3; day++) global.handleBETick({ level: level, block: jar }, global.preservesJarRecipes, 3, false, true);
      check(global.isBlockPropertyTrue(jar, "mature"), "preserves jar not done after 3 mornings");

      // Fermenting Jar: five cucumbers and salt become five pickles.
      fermenter.set("vintagedelight:fermenting_jar");
      let ferment = inventoryOf(fermenter);
      ferment.setStackInSlot(0, Item.of("vintagedelight:cucumber", 7));
      ferment.setStackInSlot(1, Item.of("vintagedelight:salt"));
      check(global.handleFermentingJar(level, fermenter) === "pickle", "fermenting jar did not start the pickle recipe");
      check(countIn(ferment, "vintagedelight:cucumber") === 2, "fermenting jar did not take five cucumbers");
      check(countIn(ferment, "vintagedelight:salt") === 0, "fermenting jar did not take the salt");
      check(global.handleFermentingJar(level, fermenter) === null, "fermenting jar finished too early");
      global.setMachineData(fermenter, { remaining: 100 });
      check(global.handleFermentingJar(level, fermenter) === "pickle", "fermenting jar did not finish");
      check(countIn(ferment, "vintagedelight:pickle") === 5, `fermenting jar made ${countIn(ferment, "vintagedelight:pickle")} pickles`);

      // Pickling Can: one cucumber into the chest below, with salt next to it.
      chest.set("minecraft:chest");
      can.set("society:pickling_can");
      inventoryOf(can).setStackInSlot(0, Item.of("vintagedelight:cucumber", 2));
      check(global.handlePicklingCan(level, can) === null, "pickling can worked without salt");
      salt.set("vintagedelight:salt");
      let pickle = global.handlePicklingCan(level, can);
      check(pickle && String(pickle.id) === "vintagedelight:pickle", `pickling can made ${pickle}`);
      check(countIn(global.getInventoryBelow(level, can), "vintagedelight:pickle") === 1, "no pickle in the chest below");
      check(countIn(inventoryOf(can), "vintagedelight:cucumber") === 1, "pickling can did not use a cucumber");

      // Evaporator: one side in water makes two salt.
      evaporator.set("vintagedelight:evaporator");
      check(global.handleEvaporator(level, evaporator) === 0, "evaporator made salt without water");
      water.set("minecraft:water");
      check(global.handleEvaporator(level, evaporator) === 2, "evaporator did not make two salt");
      check(countIn(inventoryOf(evaporator), "vintagedelight:salt") === 2, "salt is not in the evaporator");
      console.info("[PORT-TEST] PHASE1 vintagemachines");
    } else {
      check(global.isBlockPropertyTrue(jar, "mature"), "preserves jar lost its done state on restart");
      let outputs = global.artisanHarvest(jar, global.preservesJarRecipes, 5, 1, false, true, server, null);
      check(outputs && outputs.length === 1 && String(outputs[0].id) === "vintagedelight:relish_mason_jar",
        `preserves jar harvested ${outputs}`);
      check(countIn(inventoryOf(fermenter), "vintagedelight:pickle") === 5, "pickles in the fermenting jar were lost on restart");
      [water, evaporator, salt, can, chest, fermenter, jar].forEach((block) => block.set("minecraft:air"));
      console.info("[PORT-TEST] PASS vintagemachines");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL vintagemachines: ${e}`);
  }
});
