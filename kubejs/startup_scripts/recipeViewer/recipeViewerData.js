console.info("[SOCIETY] recipeViewerData.js loaded");

// What the custom JEI categories show (#18). kubejs/client_scripts/jei reads it to build the categories, and the CI
// test (tools/port/kubejs_tests/recipeViewerTest.js) checks every id in it, because JEI only fails on the client
// when a player opens the category. Recipes of the machines are read from their globals when JEI asks for them.
const $RecipeViewerRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $RecipeViewerResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");
const $RecipeViewerSpawnEggItem = Java.loadClass("net.minecraft.world.item.SpawnEggItem");

/** The spawn egg item id of an entity, or null when the entity or its egg does not exist. */
global.getSpawnEggId = (entityId) => {
  let type = $RecipeViewerRegistries.ENTITY_TYPE.getOptional($RecipeViewerResourceLocation.parse(entityId));
  if (!type.isPresent()) return null;
  let egg = $RecipeViewerSpawnEggItem.byId(type.get());
  return egg ? String($RecipeViewerRegistries.ITEM.getKey(egg)) : null;
};

/** "6x farm_and_charm:kernels" -> { id: "farm_and_charm:kernels", count: 6 } */
global.parseCountedId = (text) => {
  let match = /^(\d+)x\s+(.+)$/.exec(String(text).trim());
  return match ? { id: match[2], count: Number(match[1]) } : { id: String(text).trim(), count: 1 };
};

// Machines with one input, a work time and outputs. inputCount is shown on the input stack, days is the default
// work time. As on 1.20.1, the Auto-Tapper shows the tapper recipes.
global.jeiMachineCategories = [
  { id: "seed_making", block: "seed_maker", inputCount: 3, days: 1, recipes: () => global.seedMakerRecipes },
  { id: "preserving", block: "preserves_jar", inputCount: 5, days: 3, recipes: () => global.preservesJarRecipes },
  { id: "wine_making", block: "wine_keg", inputCount: 3, days: 6, recipes: () => global.wineKegRecipes },
  { id: "bait_upgrading", block: "deluxe_worm_farm", inputCount: 4, days: 0.5, recipes: () => global.deluxeWormFarmRecipes },
  { id: "cask_aging", block: "aging_cask", inputCount: 1, days: 10, recipes: () => global.agingCaskRecipes },
  { id: "artisanal_cheese_pressing", block: "cheese_press", inputCount: 1, days: 2, recipes: () => global.cheesePressRecipes },
  { id: "ancient_aging", block: "ancient_cask", inputCount: 1, days: 20, recipes: () => global.ancientCaskRecipes },
  { id: "dehydrating", block: "dehydrator", inputCount: 8, days: 1, recipes: () => global.dehydratorRecipes },
  { id: "fish_smoking", block: "fish_smoker", inputCount: 1, days: 2, recipes: () => global.fishSmokerRecipes },
  { id: "bait_making", block: "bait_maker", inputCount: 1, days: 1, recipes: () => global.baitMakerRecipes },
  { id: "mayonnaise_making", block: "mayonnaise_machine", inputCount: 1, days: 1, recipes: () => global.mayonnaiseMachineRecipes },
  { id: "loom_weaving", block: "loom", inputCount: 5, days: 1, recipes: () => global.loomRecipes },
  { id: "crystal_growing", block: "crystalarium", inputCount: 1, days: 5, recipes: () => global.crystalariumCrystals },
  { id: "charging", block: "charging_rod", inputCount: 1, days: 5, recipes: () => new Map([["", { output: ["society:battery"] }]]) },
  { id: "espresso_brewing", block: "espresso_machine", inputCount: 4, days: 0.5, recipes: () => global.espressoMachineRecipes },
  {
    id: "goddess_offering",
    block: "ancient_goddess_statue",
    inputCount: 64,
    days: 0,
    recipes: () =>
      new Map(Object.keys(global.ancientGoddessOfferings).map((season) => {
        let offering = global.ancientGoddessOfferings[season];
        return [offering.item, { output: [offering.reward] }];
      })),
  },
  { id: "recycling", block: "recycling_machine", inputCount: 1, days: 1, recipes: () => global.recyclingMachineRecipes },
  { id: "oil_making", block: "oil_maker", inputCount: 1, days: 1, recipes: () => global.oilMakerRecipes },
  { id: "tapping", block: "tapper", inputCount: 1, days: 7, recipes: () => global.tapperRecipes },
  { id: "auto_tapping", block: "auto_tapper", inputCount: 1, days: 0.5, recipes: () => global.tapperRecipes },
  {
    id: "pickling",
    block: "pickling_can",
    inputCount: 1,
    days: 0.5,
    recipes: () =>
      new Map(Array.from(global.picklingRecipes.keys()).map((input) => [input, { output: [global.picklingRecipes.get(input).pickle] }])),
  },
];

/** The recipes of one machine category: [{ input, output: ["2x id", ...], time, fluidOutput }]. */
global.getJeiMachineRecipes = (category) => {
  let recipes = category.recipes();
  return Array.from(recipes.keys()).map((input) => {
    let recipe = recipes.get(input);
    return { input: input, output: recipe.output || [], time: recipe.time, fluidOutput: recipe.fluidOutput };
  });
};

// Loot boxes and the tags they draw from. Fantasy's Furniture is not in the 1.21.1 pack, so the Fantasy boxes
// have no furniture tags and no category.
global.jeiLootBoxes = [
  { input: "society:furniture_box", tag: "society:loot_furniture" },
  { input: "society:plushie_capsule", tag: "society:plushies" },
  { input: "society:bouquet_bag", tag: "society:bouquet_bag_flowers" },
];

// Bone meal targets that drop their crop with Enriched Bone Meal.
global.jeiEnrichedBoneMealing = [
  { crop: "minecraft:glow_berries" },
  { crop: "herbalbrews:lavender" },
  { crop: "herbalbrews:hibiscus" },
  { crop: "farm_and_charm:wild_ribwort" },
  { crop: "farm_and_charm:wild_nettle" },
  { crop: "vinery:cherry", bonemealTarget: "vinery:dark_cherry_leaves" },
  { crop: "minecraft:apple", bonemealTarget: "vinery:apple_leaves" },
].map((entry) => ({ crop: entry.crop, bonemealTarget: entry.bonemealTarget || entry.crop }));

global.jeiBlockPurchasing = [{ catalog: "whimsy_deco:gatcha_machine", cost: "1x numismatics:sun", output: "society:plushie_capsule" }];

// Herbal Brews tea leaf blocks dry in the sun.
global.jeiTeaDrying = [
  { input: "herbalbrews:green_tea_leaf_block", output: "herbalbrews:dried_out_green_tea_leaf_block" },
  { input: "herbalbrews:dried_green_tea_leaf_block", output: "herbalbrews:black_tea_leaf_block" },
  { input: "herbalbrews:mixed_tea_leaf_block", output: "herbalbrews:oolong_tea_leaf_block" },
];

// Items the recipe viewers do not list on their own: the pillar trophies of the community center rooms.
global.jeiAddedItems = ["minecraft:bundle", "snowyspirit:ginger_crate"].concat(
  [
    "pantry", "vault", "boiler_room", "crafts_room", "fish_tank", "artifacts", "minerals", "crops", "fish", "brews",
    "gems", "relics", "cooking", "wheels", "perfection",
  ].map((trophy) => `trofers:large_pillar[trofers:trophy="trofers:${trophy}"]`)
);

global.jeiRemovedCategories = [
  "waystones:warp_plate",
  "farm_and_charm:cooking_pot",
  "meadow:woodcutting",
  "trading_floor:potential_villager_trade",
];
