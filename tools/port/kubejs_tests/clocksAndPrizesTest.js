// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 places the Golden Clock next to a working Wine Keg, the Iridium Clock, the Prize Machine and both statues
// of #11 above spawn and runs the clocks once. Boot 2 checks the clock counter, its spinel and the prize survived.
// Prints "[PORT-TEST] PHASE1 clocksandprizes", "[PORT-TEST] PASS clocksandprizes" or "[PORT-TEST] FAIL clocksandprizes: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let x0 = spawn.x;
  let z0 = spawn.z + 40;
  let at = (i) => level.getBlock(x0 + i * 4, 300, z0);
  let ev = (block) => ({ level: level, block: block });
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let countIn = (block, id) => {
    let inventory = block.getEntity().attachments.get("inventory");
    let total = 0;
    for (let i = 0; i < inventory.getSlots(); i++) {
      let stack = inventory.getStackInSlot(i);
      if (String(stack.id) === id) total += stack.count;
    }
    return total;
  };

  try {
    if (String(at(0).id) !== "society:golden_clock") {
      check(global.compareDay(5, 4, 1) && global.compareDay(4, 5, 1) && !global.compareDay(5, 5, 1), "compareDay is wrong");

      // Golden Clock: one extra stage for the Wine Keg next to it.
      let clock = at(0);
      clock.set("society:golden_clock", { facing: "north" });
      let keg = level.getBlock(clock.x + 1, 300, clock.z);
      keg.set("society:wine_keg", { facing: "north" });
      let grape = Array.from(global.wineKegRecipes.keys()).filter((key) => !key.startsWith("#") && global.itemExists(key))[0];
      global.artisanInsert(keg, Item.of(grape, 64), level, global.wineKegRecipes, 3, "minecraft:block.wood.place", true, true, true, server, null);
      check(global.isBlockPropertyTrue(keg, "working"), `the wine keg did not take ${grape}`);
      let before = global.getMachineInt(keg, "stage");
      global.runGoldenClock(ev(clock), true);
      check(global.getMachineInt(keg, "stage") === before + 1 || global.isBlockPropertyTrue(keg, "mature"),
        `the golden clock did not advance the wine keg (stage ${before} -> ${global.getMachineInt(keg, "stage")})`);

      // Iridium Clock: 1 spinel on the first morning, 2 on the second.
      let iridium = at(1);
      iridium.set("society:iridium_clock", { facing: "north" });
      global.runIridiumClock(ev(iridium), true);
      global.runIridiumClock(ev(iridium), true);
      check(global.getMachineInt(iridium, "triggerTimes") === 2, "the iridium clock counter is not 2");
      let spinel = countIn(iridium, "society:spinel") + countIn(iridium, "society:pristine_spinel");
      check(spinel === 3, `the iridium clock holds ${spinel} spinel, not 3`);

      // Prize Machine: the prize is kept on the item and in the block entity.
      check(global.getPrizeMachineItemPrize(global.prizeMachineItem(5)) === 5, "the prize machine item does not keep its prize");
      let prize = at(2);
      prize.set("society:prize_machine", { facing: "north" });
      global.setMachineData(prize, { prize: 3 });

      at(3).set("society:moon_statue", { facing: "north" });
      at(4).set("society:ancient_goddess_statue", { facing: "north" });
      check(String(at(4).id) === "society:ancient_goddess_statue", "placing the ancient goddess statue failed");
      console.info("[PORT-TEST] PHASE1 clocksandprizes");
    } else {
      let iridium = at(1);
      check(global.getMachineInt(iridium, "triggerTimes") === 2, "the iridium clock counter was lost on restart");
      let spinel = countIn(iridium, "society:spinel") + countIn(iridium, "society:pristine_spinel");
      check(spinel === 3, `the iridium clock holds ${spinel} spinel after the restart, not 3`);
      check(global.getMachineInt(at(2), "prize") === 3, "the prize machine lost its prize on restart");
      check(String(at(3).id) === "society:moon_statue", "the moon statue is gone after the restart");
      level.getBlock(at(0).x + 1, 300, at(0).z).set("minecraft:air");
      for (let i = 0; i < 5; i++) at(i).set("minecraft:air");
      console.info("[PORT-TEST] PASS clocksandprizes");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL clocksandprizes: ${e}`);
  }
});
