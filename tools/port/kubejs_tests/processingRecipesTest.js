// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 checks that the processing, compacting, kinetic and track recipes (server_scripts/recipes) loaded, that only
// recipes of items from later slices were skipped, and the storage guards (blockEvents/storageGuards.js).
// Boot 2 checks the recipes again. Prints "[PORT-TEST] PHASE1 processingrecipes", "[PORT-TEST] PASS processingrecipes"
// or "[PORT-TEST] FAIL processingrecipes: ...".
const $ProcessingTestRL = Java.loadClass("net.minecraft.resources.ResourceLocation");
const $ProcessingTestBlockPos = Java.loadClass("net.minecraft.core.BlockPos");

// Items and fluids that are not there yet; recipes with them are skipped until then.
const processingTestLaterItems = [
  // Society blocks of startup_scripts/registration/registerBlocks.js (not ported yet)
  "society:animal_feed_sack",
  "society:sparkstone_block",
  "society:ancient_fruit_crate",
  "society:blueberry_crate",
  "society:eggplant_crate",
  "society:tubabacco_leaf_block",
  "society:mana_fruit_crate",
  "society:sparkpod_crate",
  "society:prismatic_shard_block",
  "society:sturdy_bamboo_block",
  "society:salmonberry_crate",
  "society:boysenberry_crate",
  "society:cranberry_crate",
  "society:crystalberry_crate",
  // Not in HerbalBrews or Create: Central Kitchen for 1.21.1
  "herbalbrews:coffee_beans_sack",
  "herbalbrews:rooibos_leaf_block",
  "herbalbrews:yerba_mate_leaf_block",
  "create_central_kitchen:sap",
];

ServerEvents.loaded((event) => {
  let server = event.server;
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  try {
    let recipes = server.getRecipeManager();
    let ids = Object.keys(processingRecipeIds);
    check(ids.length >= 100, `only ${ids.length} processing recipes`);
    let missing = ids.filter((id) => !recipes.byKey($ProcessingTestRL.parse(id)).isPresent());
    check(missing.length === 0, `${missing.length} recipes did not load: ${missing.join(" ")}`);
    let skipped = Object.keys(processingRecipeSkipped).filter((id) =>
      processingRecipeSkipped[id].some((item) => processingTestLaterItems.indexOf(item) === -1)
    );
    check(skipped.length === 0, `recipes skipped: ${skipped.map((id) => `${id} (${processingRecipeSkipped[id].join(" ")})`).join(", ")}`);

    if (!server.persistentData.contains("processingRecipesTest")) {
      check(compactingDrawerRefuses(global.withItemQuality(Item.of("minecraft:apple"), 2)), "a quality apple goes into a compacting drawer");
      check(!compactingDrawerRefuses(Item.of("minecraft:apple")), "a plain apple does not go into a compacting drawer");

      let level = server.overworld();
      let left = new $ProcessingTestBlockPos(8, 310, 8);
      let right = new $ProcessingTestBlockPos(9, 310, 8);
      level.getBlock(left).set("minecraft:chest", { facing: "north", type: "left" });
      level.getBlock(right).set("minecraft:chest", { facing: "north", type: "right" });
      let upgrade = Item.of("sophisticatedstorage:basic_tier_upgrade");
      check(!chestUpgradeVoids(level.getBlock(left), upgrade), "an empty double chest refuses the upgrade");
      level.getBlock(left).getEntity().setItem(0, Item.of("minecraft:apple"));
      check(chestUpgradeVoids(level.getBlock(left), upgrade), "a full double chest takes the upgrade");
      level.getBlock(left).set("minecraft:air");
      level.getBlock(right).set("minecraft:air");

      server.persistentData.putBoolean("processingRecipesTest", true);
      console.info(`[PORT-TEST] processingrecipes: ${ids.length} recipes, skipped ${Object.keys(processingRecipeSkipped).length}`);
      console.info("[PORT-TEST] PHASE1 processingrecipes");
    } else {
      console.info("[PORT-TEST] PASS processingrecipes");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL processingrecipes: ${e}`);
  }
});
