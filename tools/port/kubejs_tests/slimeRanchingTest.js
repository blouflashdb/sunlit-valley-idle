// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 checks the plort and Slime Heart items of the sunlitidle mod and their prices, then runs a Plort Ripper and
// a Plort Press over chests above spawn. Boot 2 checks the ripped resources and the heart are still in the chests.
// Prints "[PORT-TEST] PHASE1 slimeranching", "[PORT-TEST] PASS slimeranching" or "[PORT-TEST] FAIL slimeranching: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let bx = spawn.x + 8;
  let bz = spawn.z - 12;
  let y = 320;
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let at = (dx, dy, dz) => level.getBlock(bx + dx, y + dy, bz + dz);
  let inv = (block) => block.getEntity().attachments.get("inventory");
  let ripper = () => at(0, 0, 0);
  let press = () => at(3, 0, 0);
  let below = (block) => global.getInventoryBelow(level, block);

  try {
    if (String(ripper().id) !== "society:plort_ripper") {
      check(global.slimeBreeds.length === 24, `there are ${global.slimeBreeds.length} breeds`);
      global.slimeBreeds.forEach((breed) => {
        check(global.itemExists(`splendid_slimes:plort_${breed}`), `splendid_slimes:plort_${breed} is missing`);
        check(global.itemExists(`splendid_slimes:slime_heart_${breed}`), `splendid_slimes:slime_heart_${breed} is missing`);
        check(global.trades.has(`splendid_slimes:plort_${breed}`), `the ${breed} plort has no price`);
      });
      check(global.ripPlort("slimy") !== null, "slimy plorts rip into nothing");

      // Plort Ripper: one plort a run into the chest below.
      ripper().set("society:plort_ripper");
      at(0, -1, 0).set("minecraft:chest");
      global.insertIntoHandler(inv(ripper()), Item.of("splendid_slimes:plort_rotting", 3), false);
      let ripped = global.runPlortRipper({ level: level, block: ripper() });
      check(ripped !== null && String(ripped.id) === "minecraft:rotten_flesh", `the rotting plort ripped into ${ripped}`);
      check(global.countInHandler(inv(ripper()), "splendid_slimes:plort_rotting") === 2, "the ripper used no plort");
      check(global.countInHandler(below(ripper()), "minecraft:rotten_flesh") === 3, "the ripped flesh is not in the chest");

      // Plort Press: 16 plorts of one breed make its heart.
      press().set("society:plort_press");
      at(3, -1, 0).set("minecraft:chest");
      global.insertIntoHandler(inv(press()), Item.of("splendid_slimes:plort_bony", 17), false);
      check(global.runPlortPress({ level: level, block: press() }) !== null, "the press made no heart");
      check(global.countInHandler(inv(press()), "splendid_slimes:plort_bony") === 1, "the press did not use 16 plorts");
      check(global.countInHandler(below(press()), "splendid_slimes:slime_heart_bony") === 1, "the heart is not in the chest");
      check(global.runPlortPress({ level: level, block: press() }) === null, "the press made a heart from one plort");
      console.info("[PORT-TEST] PHASE1 slimeranching");
    } else {
      check(global.countInHandler(below(ripper()), "minecraft:rotten_flesh") === 3, "the ripped flesh is gone after the restart");
      check(global.countInHandler(below(press()), "splendid_slimes:slime_heart_bony") === 1, "the heart is gone after the restart");
      for (let dx = 0; dx <= 3; dx++) {
        at(dx, 0, 0).set("minecraft:air");
        at(dx, -1, 0).set("minecraft:air");
      }
      console.info("[PORT-TEST] PASS slimeranching");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL slimeranching: ${e}`);
  }
});
