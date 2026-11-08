// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 builds chest / Artisan Hopper / chest next to a Wine Keg above spawn. The hopper fills the keg from the
// chest above, the keg runs its mornings and the hopper harvests it into the chest below, paying sparkstone.
// Boot 2 checks the wine and the leftover sparkstone are still there.
// Prints "[PORT-TEST] PHASE1 artisanhopper", "[PORT-TEST] PASS artisanhopper" or "[PORT-TEST] FAIL artisanhopper: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let hx = spawn.x - 20;
  let hz = spawn.z - 20;
  let hopper = level.getBlock(hx, 300, hz);
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
  let chestBelow = () => global.getInventoryBelow(level, hopper);

  try {
    if (String(hopper.id) !== "society:artisan_hopper") {
      hopper.set("society:artisan_hopper", { facing: "north" });
      level.getBlock(hx, 301, hz).set("minecraft:chest");
      level.getBlock(hx, 299, hz).set("minecraft:chest");
      level.getBlock(hx + 1, 300, hz).set("society:wine_keg", { facing: "north" });
      // A LevelBlock caches its block state, and the hopper changes the keg through its own LevelBlock,
      // so read the keg again after each hopper run.
      let kegPos = level.getBlock(hx + 1, 300, hz).getPos();
      let keg = level.getBlock(kegPos);

      let fuel = hopper.getEntity().attachments.get("inventory");
      global.insertIntoHandler(fuel, Item.of("society:sparkstone", 10), false);
      let grape = Array.from(global.wineKegRecipes.keys()).filter((key) => !key.startsWith("#") && global.itemExists(key))[0];
      let above = level.getCapability(Java.loadClass("net.neoforged.neoforge.capabilities.Capabilities").ItemHandler.BLOCK,
        hopper.getPos().above(), Java.loadClass("net.minecraft.core.Direction").DOWN);
      check(above !== null, "the chest above the hopper has no item handler");
      global.insertIntoHandler(above, Item.of(grape, 16), false);

      check(global.runArtisanHopper(level, hopper, kegPos, null), `the hopper did nothing with ${grape} above`);
      keg = level.getBlock(kegPos);
      check(global.isBlockPropertyTrue(keg, "working"), `the hopper did not start the wine keg with ${grape}`);
      check(count(above, grape) < 16, "the hopper did not take the grapes from the chest above");
      for (let day = 0; day < 60 && !global.isBlockPropertyTrue(keg, "mature"); day++) {
        global.handleBETick({ level: level, block: keg }, global.wineKegRecipes, 6, false, true);
      }
      check(global.isBlockPropertyTrue(keg, "mature"), "the wine keg is not done after 60 mornings");
      check(global.runArtisanHopper(level, hopper, kegPos, null), "the hopper did not harvest the done wine keg");
      check(count(chestBelow(), null) > 0, "the chest below the hopper is empty after the harvest");
      check(count(fuel, "society:sparkstone") < 10, "the hopper used no sparkstone");
      console.info("[PORT-TEST] PHASE1 artisanhopper");
    } else {
      check(count(chestBelow(), null) > 0, "the harvested wine is gone after the restart");
      let fuel = hopper.getEntity().attachments.get("inventory");
      let left = count(fuel, "society:sparkstone");
      check(left > 0 && left < 10, `the hopper holds ${left} sparkstone after the restart`);
      [[0, 1, 0], [0, -1, 0], [1, 0, 0], [0, 0, 0]].forEach((o) => level.getBlock(hx + o[0], 300 + o[1], hz + o[2]).set("minecraft:air"));
      console.info("[PORT-TEST] PASS artisanhopper");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL artisanhopper: ${e}`);
  }
});
