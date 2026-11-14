// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 places a working wine keg, a stocked fish pond and a plushie above spawn. Both boots post the sunlitidle
// mod's BlockInfoEvent for them (what Jade does when a player looks at them) and check the lines jadeInfo.js adds.
// Prints "[PORT-TEST] PHASE1 jadeinfo", "[PORT-TEST] PASS jadeinfo" or "[PORT-TEST] FAIL jadeinfo: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let bx = spawn.x + 30;
  let bz = spawn.z - 30;
  let y = 300;
  let $BlockInfoEvent = Java.loadClass("dev.sunlitidle.compat.BlockInfoEvent");
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let at = (dx) => level.getBlock(bx + dx, y, bz);
  let lines = (dx) => {
    let block = at(dx);
    // A Java List: Rhino cannot pass it to Array.from, so copy it by index.
    let collected = $BlockInfoEvent.collect(level, block.getPos(), block.getBlockState(), block.getEntity());
    let result = [];
    for (let i = 0; i < collected.size(); i++) result.push(String(collected.get(i).getString()).replace(/§./g, ""));
    return result;
  };
  let plushieId = "perfectplushies:adv_red_fox_plushie";

  try {
    let firstBoot = String(at(0).id) !== "society:wine_keg";
    if (firstBoot) {
      let grape = Array.from(global.wineKegRecipes.keys()).filter((key) => !key.startsWith("#") && global.itemExists(key))[0];
      at(0).set("society:wine_keg", { facing: "north" });
      let used = global.artisanInsert(at(0), Item.of(grape, 64), level, global.wineKegRecipes, 3,
        "minecraft:block.wood.place", true, true, true, server, null);
      check(used > 0, `the wine keg did not take ${grape}`);

      at(2).set("society:fish_pond", { facing: "north" });
      global.setMachineData(at(2), { type: "minecraft:cod", population: 2, max_population: 3 });

      at(4).set(plushieId, { facing: "north" });
      global.setMachineData(at(4), { type: 0, quest_id: 1, affection: 2, quality: 1 });
    }

    let keg = lines(0);
    check(keg.length === 1 && keg[0].includes("⬜"), `wine keg lines ${JSON.stringify(keg)}`);
    let pond = lines(2);
    check(pond.length === 1 && pond[0].includes("2/3") && pond[0].includes("Cod"), `fish pond lines ${JSON.stringify(pond)}`);
    let plushie = lines(4);
    check(plushie.length === 3 && plushie[0] === "★★☆☆" && plushie[2] === "❤❤❤❤", `plushie lines ${JSON.stringify(plushie)}`);
    // Blocks without Sunlit Valley data add nothing (a chest has a block entity, stone has none).
    at(8).set("minecraft:chest", { facing: "north" });
    check(lines(8).length === 0, `chest lines ${JSON.stringify(lines(8))}`);

    console.info(`[PORT-TEST] ${firstBoot ? "PHASE1" : "PASS"} jadeinfo`);
  } catch (err) {
    console.error(`[PORT-TEST] FAIL jadeinfo: ${err}`);
  }
});
