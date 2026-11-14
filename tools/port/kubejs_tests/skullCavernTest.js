// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 checks the Skull Cavern dimension, its generated rock, the cavern biome tags, the chunk parity and the
// rock regeneration. Boot 2 checks the chunk parity was saved.
// Prints "[PORT-TEST] PHASE1 skullcavern", "[PORT-TEST] PASS skullcavern" or "[PORT-TEST] FAIL skullcavern: ...".
const $SkullTestRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $SkullTestRL = Java.loadClass("net.minecraft.resources.ResourceLocation");
const $SkullTestBlockPos = Java.loadClass("net.minecraft.core.BlockPos");
const $SkullTestBlockItem = Java.loadClass("net.minecraft.world.item.BlockItem");

ServerEvents.loaded((event) => {
  let server = event.server;
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  try {
    let cavern = server.getLevel("society:skull_cavern");
    check(cavern != null, "no society:skull_cavern level");
    let pos = new $SkullTestBlockPos(8, 0, 8);
    if (!server.persistentData.contains("skullCavernTest")) {
      [
        "society:skull_cavern_teleporter",
        "society:stone_boulder",
        "society:end_stone_boulder",
        "society:skull_stone",
        "society:oak_supply_crate",
        "society:cavern_air",
        "society:iridium_ore",
        "society:geode_node",
        "society:earth_crystal",
        "society:fire_quartz",
      ].forEach((id) => check($SkullTestRegistries.BLOCK.containsKey($SkullTestRL.parse(id)), `${id} is not registered`));
      check(Item.of("society:earth_crystal").getItem() instanceof $SkullTestBlockItem, "the earth crystal item places no block");

      let skullBlocks = 0;
      let column = [];
      for (let y = 0; y < 512; y += 4) {
        let id = String(cavern.getBlock(8, y, 8).id);
        if (id.startsWith("society:skull_")) skullBlocks++;
        if (column.indexOf(id) === -1) column.push(id);
      }
      check(skullBlocks > 10, `only ${skullBlocks} skull blocks in a cavern column: ${column}`);

      let biome = cavern.getBiome(new $SkullTestBlockPos(8, 300, 8));
      let biomeTags = String(biome.tags().map((tag) => tag.location()).toList());
      check(biomeTags.indexOf("society:is_skull_cavern") !== -1, `the cavern biome ${biome.unwrapKey().get().location()} has tags ${biomeTags}`);

      let parity = global.getSkullChunkParity(cavern, pos);
      check(parity != null, "the loaded cavern chunk has no parity");

      // Mined rock turns into cavern air of this day; air of an earlier day regrows.
      let probe = null;
      for (let y = 20; y < 500 && !probe; y++) {
        if (String(cavern.getBlock(8, y, 8).id) === "minecraft:air") probe = new $SkullTestBlockPos(8, y, 8);
      }
      check(probe != null, `no air in the cavern column: ${column}`);
      check(global.placeSkullCavernAir(cavern, probe, 1), "cavern air was not placed");
      let air = cavern.getBlock(probe);
      check(String(air.id) === "society:cavern_air", `the probe is ${air.id}`);
      check(global.getBlockProperty(air, "chunkbit") === String(parity.getInt("toggleBit")), "the cavern air has the wrong parity");
      check(global.handleSkullCavernRegen(cavern, air) === null, "cavern air of this day regrew");
      air.set("society:cavern_air", { type: "1", chunkbit: String(1 - parity.getInt("toggleBit")) });
      let regrown = global.handleSkullCavernRegen(cavern, cavern.getBlock(probe));
      let iceRocks = global.skullCavernRockTables[1].map((entry) => entry.block);
      check(regrown !== null && iceRocks.indexOf(regrown) !== -1, `the cavern air regrew into ${regrown}`);
      check(String(cavern.getBlock(probe).id) === regrown, "the regrown rock was not placed");
      cavern.getBlock(probe).set("minecraft:air");

      server.persistentData.putInt("skullCavernTest", parity.getInt("toggleBit"));
      server.persistentData.putInt("skullCavernTestDay", parity.getInt("day"));
      console.info("[PORT-TEST] PHASE1 skullcavern");
    } else {
      let parity = global.getSkullChunkParity(cavern, pos);
      check(parity != null, "the chunk parity was not saved");
      let sameDay = parity.getInt("day") === server.persistentData.getInt("skullCavernTestDay");
      let expected = sameDay ? server.persistentData.getInt("skullCavernTest") : 1 - server.persistentData.getInt("skullCavernTest");
      check(parity.getInt("toggleBit") === expected, `toggle bit ${parity.getInt("toggleBit")} instead of ${expected}`);
      console.info("[PORT-TEST] PASS skullcavern");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL skullcavern: ${e}`);
  }
});
