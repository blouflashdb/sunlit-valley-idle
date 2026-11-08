// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 plants a grown mystical flower crop and a wheat crop next to a Cropnolia with a mana pool, lets the
// Cropnolia eat them and checks the pool got their mana; it also checks the pack's Botania recipes loaded.
// Boot 2 checks the pool kept its mana.
// Prints "[PORT-TEST] PHASE1 mysticalflowers", "[PORT-TEST] PASS mysticalflowers" or "[PORT-TEST] FAIL mysticalflowers: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let bx = spawn.x + 8;
  let bz = spawn.z + 12;
  let y = 300;
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let at = (dx, dy, dz) => level.getBlock(bx + dx, y + dy, bz + dz);
  let pool = () => at(0, 0, 0);
  let poolMana = () => global.getPoolMana(pool().getEntity());
  let reg = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
  let rl = Java.loadClass("net.minecraft.resources.ResourceLocation");
  let itemExists = (id) => reg.ITEM.containsKey(rl.parse(id));
  // 4 stages (25 * 4 * 4) for the mystical flower, 8 stages (25 * 8 * 8) for wheat.
  let EXPECTED = 400 + 1600;

  try {
    if (String(pool().id) !== "botania:mana_pool") {
      Object.keys(global.mysticalFlowerColors).forEach((color) => {
        check(itemExists(`botania_seeds:${color}_mystical_flower_seeds`), `no ${color} mystical flower seeds`);
      });
      check(itemExists("croptania:cropnolia"), "no croptania:cropnolia");
      // Botania data from kubejs/data (tools/port/port_botania_data.py).
      let recipes = server.getRecipeManager();
      [
        "botania_seeds:petal_apothecary/white_mystical_flower_seeds",
        "croptania:cropnolia",
        "botania:mana_infusion/mana_seed",
        "botania:runic_altar/fire",
        "botania:runic_altar/air",
        "botania:elven_trade/moth_pollen",
        "botania:orechid/lead_ore",
      ].forEach((id) => check(recipes.byKey(rl.parse(id)).isPresent(), `recipe ${id} is missing`));
      let fireIngredients = recipes.byKey(rl.parse("botania:runic_altar/fire")).get().value().getIngredients();
      let fireItems = [];
      for (let i = 0; i < fireIngredients.size(); i++) {
        let stacks = fireIngredients.get(i).getItems();
        for (let j = 0; j < stacks.length; j++) fireItems.push(String(stacks[j].getId()));
      }
      check(fireItems.indexOf("society:fire_quartz") >= 0, `the fire rune is still Botania's: ${fireItems}`);

      pool().set("botania:mana_pool");
      let entity = pool().getEntity();
      let poolData = entity.saveWithoutMetadata(level.registryAccess());
      poolData.putInt("manaCap", 1000000);
      entity.loadWithComponents(poolData, level.registryAccess());

      at(1, 0, 0).set("croptania:cropnolia");
      at(2, -1, 0).set("minecraft:farmland");
      at(2, 0, 0).set("botania_seeds:white_mystical_flower", { age: "3" });
      at(3, -1, 0).set("minecraft:farmland");
      at(3, 0, 0).set("minecraft:wheat", { age: "7" });
      // A young crop is left alone.
      at(2, -1, 1).set("minecraft:farmland");
      at(2, 0, 1).set("botania_seeds:red_mystical_flower", { age: "1" });

      let made = global.runCropnolia(level, at(1, 0, 0));
      check(made === EXPECTED, `the cropnolia made ${made} mana`);
      check(poolMana() === EXPECTED, `the pool holds ${poolMana()} mana`);
      check(Number(global.getBlockProperty(at(2, 0, 0), "age")) === 0, "the mystical flower was not eaten");
      check(Number(global.getBlockProperty(at(3, 0, 0), "age")) === 0, "the wheat was not eaten");
      check(Number(global.getBlockProperty(at(2, 0, 1), "age")) === 1, "the young crop was eaten");
      check(global.runCropnolia(level, at(1, 0, 0)) === 0, "the cropnolia ate young crops");
      console.info("[PORT-TEST] PHASE1 mysticalflowers");
    } else {
      check(poolMana() === EXPECTED, `the pool holds ${poolMana()} mana after the restart`);
      for (let dx = 0; dx <= 3; dx++) {
        for (let dz = 0; dz <= 1; dz++) {
          for (let dy = -1; dy <= 0; dy++) at(dx, dy, dz).set("minecraft:air");
        }
      }
      console.info("[PORT-TEST] PASS mysticalflowers");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL mysticalflowers: ${e}`);
  }
});
