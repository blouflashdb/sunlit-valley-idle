// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 checks the geode tags, geode cracking, the mining loot rules (with a fake player that breaks ores) and
// the magnifying glass areas. Boot 2 checks the mining loot again after the restart.
// Prints "[PORT-TEST] PHASE1 miningloot", "[PORT-TEST] PASS miningloot" or "[PORT-TEST] FAIL miningloot: ...".
const $MiningTestFakePlayers = Java.loadClass("net.neoforged.neoforge.common.util.FakePlayerFactory");
const $MiningTestBlock = Java.loadClass("net.minecraft.world.level.block.Block");
const $MiningTestBlocks = Java.loadClass("net.minecraft.world.level.block.Blocks");
const $MiningTestBlockPos = Java.loadClass("net.minecraft.core.BlockPos");
const $MiningTestKeys = Java.loadClass("net.minecraft.core.registries.Registries");
const $MiningTestEnchantments = Java.loadClass("net.minecraft.world.item.enchantment.Enchantments");

ServerEvents.loaded((event) => {
  let server = event.server;
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  try {
    let level = server.overworld();
    let pos = new $MiningTestBlockPos(0, 64, 0);
    let miner = $MiningTestFakePlayers.getMinecraft(level);
    let drops = (block, tool) => {
      let counts = {};
      $MiningTestBlock.getDrops(block.defaultBlockState(), level, pos, null, miner, tool).forEach((stack) => {
        let id = String(stack.getItem().builtInRegistryHolder().key().location());
        counts[id] = (counts[id] || 0) + stack.getCount();
      });
      return counts;
    };
    let pickaxe = Item.of("minecraft:iron_pickaxe");
    let silkPickaxe = Item.of("minecraft:iron_pickaxe");
    silkPickaxe.enchant(level.registryAccess().registryOrThrow($MiningTestKeys.ENCHANTMENT).getHolderOrThrow($MiningTestEnchantments.SILK_TOUCH), 1);
    check(hasSilkTouchTool(silkPickaxe) && !hasSilkTouchTool(pickaxe), "silk touch is not detected");

    // Breaking an ore with the fake player runs the rules through LootJS. Fake players keep no stages, so the
    // stage rules are checked on a stand-in player below.
    let calls = miningLootLast.calls;
    let gold = drops($MiningTestBlocks.GOLD_ORE, pickaxe);
    check(gold["minecraft:raw_gold"] >= 1, `gold ore drops ${JSON.stringify(gold)}`);
    check(miningLootLast.calls - calls >= 10, `breaking gold ore checked ${miningLootLast.calls - calls} rules`);
    check(String(miningLootLast.state).indexOf("silk=false") !== -1, `the last break was ${miningLootLast.state}`);
    drops($MiningTestBlocks.GOLD_ORE, silkPickaxe);
    check(String(miningLootLast.state).indexOf("silk=true") !== -1, `the silk touch break was ${miningLootLast.state}`);

    let stagePlayer = (stage) => ({ stages: { has: (name) => name === stage } });
    let breakState = (stage, silk) => ({
      level: level,
      pos: pos,
      player: stage === null ? null : stagePlayer(stage),
      silk: silk,
      dimension: "minecraft:overworld",
    });
    let rule = (stage, block) => miningLootRules.find((r) => r.stage === stage && r.blocks.indexOf(block) !== -1);
    let goldRush = rule("gold_rush", "minecraft:gold_ore");
    check(goldRush && goldRush.item === "minecraft:raw_gold_block" && goldRush.count === 4, "no Gold Rush rule");
    check(miningRuleHolds(goldRush, breakState("gold_rush", false)), "Gold Rush does not hold with the stage");
    check(!miningRuleHolds(goldRush, breakState("gold_rush", true)), "Gold Rush holds with silk touch");
    check(!miningRuleHolds(goldRush, breakState("other", false)), "Gold Rush holds without the stage");
    check(!miningRuleHolds(goldRush, breakState(null, false)), "Gold Rush holds without a player");

    if (!server.persistentData.contains("miningLootTest")) {
      check(miningLootRules.length >= 40, `only ${miningLootRules.length} mining loot rules`);

      let spark = rule("the_spark_also_rises", "minecraft:iron_ore");
      check(spark && spark.item === "society:sparkstone" && miningRuleHolds(spark, breakState("the_spark_also_rises", false)), "no spark rule");
      let moon = rule("moon_extra_ore", "minecraft:iron_ore");
      let rawIron = moon.modify(Item.of("minecraft:raw_iron"));
      check(rawIron.getCount() === 2, `moon_extra_ore makes ${rawIron.getCount()} raw iron`);
      check(moon.modify(Item.of("minecraft:cobblestone")).getCount() === 1, "moon_extra_ore adds cobblestone");
      let cold = miningLootRules.filter((r) => r.biome === "c:is_cold").length;
      check(cold >= 4, `only ${cold} cold biome rules`);

      // Geode tags and cracking
      ["society:geode_junk", "society:geode_treasure", "society:frozen_geode_treasure", "society:magma_geode_treasure"].forEach(
        (tag) => check(geodeTagItems(tag).length >= 4, `${tag} has ${geodeTagItems(tag)}`)
      );
      let omniTreasure = geodeTagItems("society:omni_geode_treasure");
      check(omniTreasure.length >= 30, `the omni geode treasure has ${omniTreasure.length} items`);
      let treasure = geodeTagItems("society:geode_treasure");
      check(treasure.indexOf(crackGeode("society:geode", true, 0.95)) !== -1, "the first geode gave no treasure");
      check(crackGeode("society:geode", false, 0.95) === null, "a 0.95 roll gave an item");
      let junk = crackGeode("society:geode", false, 0.5);
      check(geodeTagItems("society:geode_junk").indexOf(junk) !== -1, `a 0.5 roll gave ${junk}`);
      let bonus = crackGeode("society:magma_geode", false, 0.25);
      check(geodeTagItems("society:magma_geode_bonus").indexOf(bonus) !== -1, `a 0.25 roll gave ${bonus}`);
      check(omniTreasure.indexOf(crackGeode("society:omni_geode", false, 0.5)) !== -1, "the omni geode gave no treasure");

      // Magnifying glass
      check(magnifyingGlassBlocks.length >= 15, `only ${magnifyingGlassBlocks.length} magnifying glass blocks`);
      let glassPos = new $MiningTestBlockPos(0, 200, 0);
      level.setBlockAndUpdate(glassPos, Block.getBlock("society:auto_grabber").defaultBlockState());
      let area = magnifyingGlassArea(level.getBlock(glassPos));
      check(area && area.from.x === -5 && area.to.y === 205, `the auto grabber area is ${area && area.from} - ${area && area.to}`);
      level.setBlockAndUpdate(glassPos, $MiningTestBlocks.AIR.defaultBlockState());

      server.persistentData.putBoolean("miningLootTest", true);
      console.info("[PORT-TEST] PHASE1 miningloot");
    } else {
      console.info("[PORT-TEST] PASS miningloot");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL miningloot: ${e}`);
  }
});
