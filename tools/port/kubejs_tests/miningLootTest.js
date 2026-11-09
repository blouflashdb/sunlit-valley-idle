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

    // Gold Rush: four raw gold blocks from gold ore, not with silk touch.
    miner.stages.add("gold_rush");
    let gold = drops($MiningTestBlocks.GOLD_ORE, pickaxe);
    check(gold["minecraft:raw_gold_block"] === 4, `gold ore with gold_rush drops ${JSON.stringify(gold)}`);
    let silkGold = drops($MiningTestBlocks.GOLD_ORE, silkPickaxe);
    check(!silkGold["minecraft:raw_gold_block"], `silk touched gold ore drops ${JSON.stringify(silkGold)}`);
    miner.stages.remove("gold_rush");
    let plainGold = drops($MiningTestBlocks.GOLD_ORE, pickaxe);
    check(!plainGold["minecraft:raw_gold_block"], `gold ore without the stage drops ${JSON.stringify(plainGold)}`);

    if (!server.persistentData.contains("miningLootTest")) {
      check(miningLootRules.length >= 40, `only ${miningLootRules.length} mining loot rules`);

      // The Spark Also Rises: a sparkstone from every ore; Moon Statue: one more raw iron.
      miner.stages.add("the_spark_also_rises");
      miner.stages.add("moon_extra_ore");
      let iron = drops($MiningTestBlocks.IRON_ORE, pickaxe);
      check(iron["society:sparkstone"] === 1, `iron ore with the_spark_also_rises drops ${JSON.stringify(iron)}`);
      check(iron["minecraft:raw_iron"] === 2, `iron ore with moon_extra_ore drops ${JSON.stringify(iron)}`);
      miner.stages.remove("the_spark_also_rises");
      miner.stages.remove("moon_extra_ore");

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
