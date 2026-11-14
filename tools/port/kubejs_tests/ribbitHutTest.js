// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 builds a Ribbit Hut above spawn with ripe wheat next to it and runs its morning, then hatches Caterpillar
// Eggs in a Caterpillar Box and checks the longwing breeding. Boot 2 checks the harvest is still in the hut.
// Prints "[PORT-TEST] PHASE1 ribbithut", "[PORT-TEST] PASS ribbithut" or "[PORT-TEST] FAIL ribbithut: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let cx = spawn.x - 24;
  let cz = spawn.z + 24;
  let y = 300;
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let at = (dx, dy, dz) => level.getBlock(cx + dx, y + dy, cz + dz);
  let inv = (block) => block.getEntity().attachments.get("inventory");
  let door = () => at(0, 0, -1);

  try {
    if (String(door().id) !== "society:ribbit_hut") {
      let center = at(0, 0, 0).getPos();
      check(global.ribbitHutHasRoom(level, center), "the empty sky has no room for a ribbit hut");
      global.buildRibbitHut(level, center, "north", "");
      check(String(door().id) === "society:ribbit_hut", `the hut door is ${door().id}`);
      check(String(at(1, 2, 1).id) === "society:ribbit_hut_block", "the hut walls are missing");
      check(!global.ribbitHutHasRoom(level, center), "a built hut still has room for another");

      // Ripe wheat on farmland 3 blocks east of the hut's center, and unripe wheat next to it.
      at(3, -1, 0).set("minecraft:farmland");
      at(3, 0, 0).set("minecraft:wheat", { age: "7" });
      at(4, -1, 0).set("minecraft:farmland");
      at(4, 0, 0).set("minecraft:wheat", { age: "3" });
      check(at(3, 0, 0).hasTag("society:ribbit_hut_harvests"), "wheat is not in society:ribbit_hut_harvests");
      let harvested = global.runRibbitHut({ level: level, block: door() }, true);
      check(harvested === 1, `the ribbits harvested ${harvested} plants`);
      check(global.countInHandler(inv(door()), "minecraft:wheat") >= 1, "the hut holds no wheat");
      check(global.getBlockProperty(at(3, 0, 0), "age") === "0", "the harvested wheat was not replanted");
      check(global.getBlockProperty(at(4, 0, 0), "age") === "3", "the unripe wheat was touched");

      // Longwings: breeding picks a child variant; a Caterpillar Box hatches eggs into a longwing.
      check(global.getLongwingFromEgg("monarch", "monarch") === "monarch", "two monarchs do not make a monarch");
      let child = global.getLongwingFromEgg("monarch", "zebra");
      check(global.longwings.some((wing) => wing.variant === child), `monarch + zebra makes ${child}`);
      at(6, 0, 0).set("society:caterpillar_box");
      global.insertIntoHandler(inv(at(6, 0, 0)), global.caterpillarEggs("monarch", "zebra", child, 1.0), false);
      let longwing = global.runCaterpillarBox({ level: level, block: at(6, 0, 0) });
      check(longwing !== null, "the caterpillar box hatched nothing");
      check(global.isLongwing(longwing), `the caterpillar box hatched ${global.entityTypeId(longwing)}`);
      check(global.countInHandler(inv(at(6, 0, 0)), "society:caterpillar_eggs") === 0, "the caterpillar box kept the eggs");
      let data = global.getLongwingData(longwing);
      console.info(`[PORT-TEST] ribbithut longwing ${global.entityTypeId(longwing)} variant=${data.variant} size=${data.size} odds=${global.getLongwingOdds(longwing).chance}`);
      longwing.discard();
      console.info("[PORT-TEST] PHASE1 ribbithut");
    } else {
      check(global.countInHandler(inv(door()), "minecraft:wheat") >= 1, "the wheat is gone after the restart");
      global.removeRibbitHut(level, door());
      door().set("minecraft:air");
      check(String(at(0, 0, 0).id) === "minecraft:air", "the hut was not removed");
      for (let dx = 3; dx <= 6; dx++) {
        at(dx, 0, 0).set("minecraft:air");
        at(dx, -1, 0).set("minecraft:air");
      }
      console.info("[PORT-TEST] PASS ribbithut");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL ribbithut: ${e}`);
  }
});
