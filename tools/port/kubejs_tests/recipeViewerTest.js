// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// The custom JEI categories (kubejs/client_scripts/jei) are built on the client only; this checks every id of their
// data (startup_scripts/recipeViewer/recipeViewerData.js and the machine globals) on the server, and the loot
// furniture list. Machine recipes, fish, animals and rewards with items of mods that are not in the 1.21.1 pack are
// left out of JEI on purpose (the machines skip them too) and only listed. Prints "[PORT-TEST] PHASE1 recipeviewer", "[PORT-TEST] PASS recipeviewer" or
// "[PORT-TEST] FAIL recipeviewer: ...".
const $RecipeViewerTestRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $RecipeViewerTestRL = Java.loadClass("net.minecraft.resources.ResourceLocation");
const $RecipeViewerTestTrophies = Java.loadClass("trofers.registry.ModRegistries");

ServerEvents.loaded((event) => {
  let server = event.server;
  try {
    let problems = [];
    let skipped = [];
    let item = (where, text) => {
      if (!text) return;
      let id = global.parseCountedId(text).id;
      if (id.startsWith("#")) {
        if (Ingredient.of(id).itemIds.length === 0) problems.push(`${where}: empty tag ${id}`);
      } else if (!global.itemExists(id)) problems.push(`${where}: item ${id}`);
    };

    if (global.getSpawnEggId("minecraft:cow") !== "minecraft:cow_spawn_egg") {
      problems.push(`spawn egg of minecraft:cow is ${global.getSpawnEggId("minecraft:cow")}`);
    }

    let skipMissing = (where, texts) =>
      texts.filter((text) => !global.jeiItemsExist([text])).forEach((text) => skipped.push(`${where}: ${text}`));
    global.jeiMachineCategories.forEach((category) => {
      item(category.id, `society:${category.block}`);
      let shownRecipes = global.getJeiMachineRecipes(category);
      if (shownRecipes.length === 0) problems.push(`${category.id}: no recipes`);
      global.getJeiMachineRecipes(category, true).forEach((recipe) => skipMissing(category.id, [recipe.input].concat(recipe.output)));
      shownRecipes.forEach((recipe) => {
        if (recipe.fluidOutput && !$RecipeViewerTestRegistries.FLUID.containsKey($RecipeViewerTestRL.parse(recipe.fluidOutput))) {
          skipped.push(`${category.id}: fluid ${recipe.fluidOutput}`);
        }
      });
    });
    Array.from(global.mushroomLogRecipes.keys()).forEach((input) => {
      skipMissing("mushroom_growing", [input].concat(global.mushroomLogRecipes.get(input).output));
    });
    Array.from(global.fishPondDefinitions.keys()).forEach((fish) => {
      if (!global.itemExists(fish)) {
        skipped.push(`fish ${fish}`);
        return;
      }
      item("fish_farming", global.getRoe(fish));
      skipMissing(`fish_farming ${fish}`, (global.fishPondDefinitions.get(fish).additionalRewards || []).map((reward) => reward.item));
    });

    let shown = (definition) => {
      if (global.getSpawnEggId(definition.animal)) return true;
      skipped.push(`animal ${definition.animal}`);
      return false;
    };
    global.husbandryMilkingDefinitions.filter(shown).forEach((definition) => {
      item(`milking ${definition.animal}`, definition.milk.sm);
      item(`milking ${definition.animal}`, definition.milk.lg);
    });
    global.husbandryForagingDefinitions.filter(shown).forEach((definition) => {
      definition.forages.forEach((forage) => skipMissing(`foraging ${definition.animal}`, forage.itemPool || [forage.item]));
    });
    global.petGifts.filter(shown).forEach((definition) => {
      definition.gifts.filter((id) => !global.itemExists(id)).forEach((id) => skipped.push(`pet gift ${id}`));
    });

    global.jeiLootBoxes.forEach((box) => {
      item("loot_box", box.input);
      item("loot_box", `#${box.tag}`);
    });
    global.lootFurniture.forEach((id) => item("loot_furniture", id));
    global.jeiEnrichedBoneMealing.forEach((entry) => {
      item("enriched_bone_mealing", entry.crop);
      item("enriched_bone_mealing", entry.bonemealTarget);
    });
    global.jeiBlockPurchasing.forEach((entry) => [entry.catalog, entry.cost, entry.output].forEach((id) => item("block_purchasing", id)));
    global.jeiTeaDrying.forEach((entry) => [entry.input, entry.output].forEach((id) => item("tea_drying", id)));
    global.jeiAddedItems.forEach((text) => {
      let match = /^([^[]+)(?:\[trofers:trophy="([^"]+)"\])?$/.exec(text);
      item("added items", match[1]);
      if (match[2] && !$RecipeViewerTestTrophies.get($RecipeViewerTestTrophies.TROPHIES, match[2])) {
        problems.push(`added items: trophy ${match[2]}`);
      }
    });
    // The trophy stacks are built from their text on the client.
    let trophy = Item.of(global.jeiAddedItems[global.jeiAddedItems.length - 1]);
    if (!/"trofers:trophy":"trofers:perfection"/.test(String(trophy.save(server.registryAccess())))) {
      problems.push(`trophy stack is ${trophy.save(server.registryAccess())}`);
    }

    skipped.forEach((s) => console.info(`[PORT-TEST] INFO recipeviewer not shown: ${s}`));
    if (problems.length > 0) {
      problems.forEach((p) => console.info(`[PORT-TEST] INFO recipeviewer missing ${p}`));
      throw new Error(`${problems.length} missing: ${problems.join(", ")}`);
    }
    if (!server.persistentData.contains("recipeViewerTest")) {
      server.persistentData.putBoolean("recipeViewerTest", true);
      console.info("[PORT-TEST] PHASE1 recipeviewer");
    } else {
      console.info("[PORT-TEST] PASS recipeviewer");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL recipeviewer: ${e}`);
  }
});
