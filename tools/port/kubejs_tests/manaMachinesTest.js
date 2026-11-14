// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 builds a Botania mana pool above spawn and fills it, then lets a Mana Sprinkler feed a Mana Fruit, grows
// the fruit and pays a Sparkstone Recycler from the pool. Boot 2 checks the pool and the fruit kept their state.
// Prints "[PORT-TEST] PHASE1 manamachines", "[PORT-TEST] PASS manamachines" or "[PORT-TEST] FAIL manamachines: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let bx = spawn.x - 8;
  let bz = spawn.z + 12;
  let y = 305;
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let at = (dx, dy, dz) => level.getBlock(bx + dx, y + dy, bz + dz);
  let pool = () => at(0, 0, 0);
  let poolMana = () => global.getPoolMana(pool().getEntity());
  let fruit = () => at(2, 0, 0);
  let FULL = 100000;

  try {
    if (String(pool().id) !== "botania:mana_pool") {
      pool().set("botania:mana_pool");
      check(String(pool().id) === "botania:mana_pool", "there is no botania:mana_pool");
      let entity = pool().getEntity();
      // A pool learns its capacity on its first server tick; write it into the pool's data instead of waiting.
      let poolData = entity.saveWithoutMetadata(level.registryAccess());
      poolData.putInt("manaCap", 1000000);
      entity.loadWithComponents(poolData, level.registryAccess());
      check(entity.getMaxMana() > 0, `the pool has no capacity (${entity.getMaxMana()})`);
      check(global.getPoolMana(entity) === 0, `the new pool reads ${global.getPoolMana(entity)} mana (${entity})`);
      entity.receiveMana(FULL);
      check(poolMana() === FULL, `the pool holds ${poolMana()} mana after a fill`);

      // Mana Sprinkler next to the pool feeds the Mana Fruit two blocks away.
      at(1, 0, 0).set("society:mana_sprinkler");
      at(2, -1, 0).set("minecraft:farmland");
      fruit().set("society:mana_fruit_crop");
      check(global.runManaSprinkler({ level: level, block: at(1, 0, 0) }) === 1, "the sprinkler fed no fruit");
      check(global.getMachineInt(fruit(), "mana") === 50, `the fruit holds ${global.getMachineInt(fruit(), "mana")} mana`);
      check(poolMana() === FULL - 50, `the pool holds ${poolMana()} mana after the sprinkler`);

      // A morning: 2500 mana make the fruit grow a stage.
      global.setMachineData(fruit(), { mana: 2500 });
      global.runManaFruit({ level: level, block: fruit() }, true);
      check(Number(global.getBlockProperty(fruit(), "age")) >= 1, "the fruit did not grow");
      check(global.getMachineInt(fruit(), "mana") === 0, "the fruit kept its mana");

      // Sparkstone Recycler next to the pool pays a sparkstone for 5000 mana.
      at(0, 1, 0).set("society:sparkstone_recycler");
      check(global.sparkstoneRecycled !== undefined, "global.sparkstoneRecycled is missing");
      check(global.checkSparkstoneRecyclers(level, at(0, 2, 0), true), "the recycler paid nothing");
      check(poolMana() === FULL - 5050, `the pool holds ${poolMana()} mana after the recycler`);
      check(!global.drawPoolMana(level, at(1, 0, 0), FULL), "a pool paid more mana than it holds");
      // Keep the pool as it is until boot 2: no sprinkler, and enough mana that the fruit does not wither.
      at(1, 0, 0).set("minecraft:air");
      global.setMachineData(fruit(), { mana: 10000 });
      console.info("[PORT-TEST] PHASE1 manamachines");
    } else {
      check(poolMana() === FULL - 5050, `the pool holds ${poolMana()} mana after the restart`);
      check(Number(global.getBlockProperty(fruit(), "age")) >= 1, "the fruit lost its growth after the restart");
      for (let dx = 0; dx <= 2; dx++) {
        for (let dy = -1; dy <= 1; dy++) at(dx, dy, 0).set("minecraft:air");
      }
      console.info("[PORT-TEST] PASS manamachines");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL manamachines: ${e}`);
  }
});
