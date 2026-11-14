// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Checks that every recipe that tools/port/port_recipe_data.py ported (portedRecipesData.js) loaded and that every
// item those recipes name is registered. Prints "[PORT-TEST] PHASE1 portedrecipes", "[PORT-TEST] PASS portedrecipes"
// or "[PORT-TEST] FAIL portedrecipes: ...".
const $PortedRecipesRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $PortedRecipesRL = Java.loadClass("net.minecraft.resources.ResourceLocation");

ServerEvents.loaded((event) => {
  let server = event.server;
  try {
    let problems = [];
    let missingItems = portedRecipeItems.filter((id) => !$PortedRecipesRegistries.ITEM.containsKey($PortedRecipesRL.parse(id)));
    if (missingItems.length > 0) problems.push(`${missingItems.length} items are not registered: ${missingItems.join(" ")}`);
    let recipes = server.getRecipeManager();
    let missingRecipes = portedRecipeIds.filter((id) => !recipes.byKey($PortedRecipesRL.parse(id)).isPresent());
    if (missingRecipes.length > 0) problems.push(`${missingRecipes.length} recipes did not load: ${missingRecipes.join(" ")}`);
    if (problems.length > 0) throw new Error(problems.join("; "));
    if (!server.persistentData.contains("portedRecipesTest")) {
      server.persistentData.putBoolean("portedRecipesTest", true);
      console.info("[PORT-TEST] PHASE1 portedrecipes");
    } else {
      console.info("[PORT-TEST] PASS portedrecipes");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL portedrecipes: ${e}`);
  }
});
