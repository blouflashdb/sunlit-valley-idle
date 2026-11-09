// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Checks that the pack's fluids (startup_scripts/fluids/registerFluids.js) are registered with their buckets and
// tags, and that the Create fluid recipes (server_scripts/recipes/fluidRecipes.js) loaded. Prints
// "[PORT-TEST] PHASE1 fluids", "[PORT-TEST] PASS fluids" or "[PORT-TEST] FAIL fluids: ...".
const $FluidsTestRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $FluidsTestRL = Java.loadClass("net.minecraft.resources.ResourceLocation");

const fluidsTestIds = [
  "society:oak_resin", "society:pine_tar", "society:maple_syrup", "society:mystic_syrup", "society:vinegar",
  "society:alchemical_varnish", "society:mystic_jelly", "society:milk", "vinery:apple_juice",
  "vinery:white_grape_juice", "vinery:red_grape_juice", "society:ancient_fruit_juice", "society:starfruit_juice",
  "society:sparkpod_juice", "society:mana_fruit_juice", "relics:relic_experience",
];

ServerEvents.loaded((event) => {
  let server = event.server;
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  try {
    let missing = fluidsTestIds.filter((id) => !$FluidsTestRegistries.FLUID.containsKey($FluidsTestRL.parse(id)));
    check(missing.length === 0, `fluids not registered: ${missing.join(" ")}`);
    let buckets = fluidsTestIds.filter((id) => Item.of(`${id}_bucket`).isEmpty());
    check(buckets.length === 0, `buckets missing: ${buckets.join(" ")}`);
    let milk = $FluidsTestRegistries.FLUID.get($FluidsTestRL.parse("society:milk"));
    let milkTags = milk.builtInRegistryHolder().tags().map((t) => String(t.location())).toList();
    check(String(milkTags).indexOf("c:milk") !== -1, `society:milk is not in c:milk (${milkTags})`);

    let ids = Object.keys(processingRecipeIds);
    let kinds = ["mixing", "emptying", "filling", "compacting"];
    kinds.forEach((kind) => {
      let n = ids.filter((id) => id.indexOf(`society:processing/${kind}/`) === 0).length;
      check(n > 0, `no ${kind} recipes with the pack's fluids`);
    });
    let skipped = Object.keys(processingRecipeSkipped).filter((id) =>
      processingRecipeSkipped[id].some((s) => fluidsTestIds.indexOf(s) !== -1)
    );
    check(skipped.length === 0, `recipes skipped for a pack fluid: ${skipped.join(" ")}`);

    if (!server.persistentData.contains("fluidsTest")) {
      server.persistentData.putBoolean("fluidsTest", true);
      console.info(`[PORT-TEST] fluids: ${fluidsTestIds.length} fluids, ${ids.length} processing recipes`);
      console.info("[PORT-TEST] PHASE1 fluids");
    } else {
      console.info("[PORT-TEST] PASS fluids");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL fluids: ${e}`);
  }
});
