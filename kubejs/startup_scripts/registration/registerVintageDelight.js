// priority: 10
// Vintage Delight has no 1.21.1 build, so its content used by the pack is registered here under the old
// vintagedelight:* ids (issue #10). Quests, Cozy Cafe menus, shop data and recipes keep working.
// Textures are placeholders: each vintagedelight:item/... and vintagedelight:block/... sprite is an alias in
// kubejs/assets/minecraft/atlases/blocks.json (tools/port/assets/make_vintage_delight_placeholders.py).
// Crop stage models: tools/port/assets/make_crop_placeholders.py, blockstates via global.cropBlockstates.
console.info("[SOCIETY] registerVintageDelight.js loaded");

const VD = "vintagedelight";

// [id, nutrition, saturation modifier, options]
// options: bowl / bottle / jar (returns the container), drink (drink animation), fast (fast to eat)
global.vintageDelightFoods = [
  // Crops and snacks
  ["peanut", 2, 0.3, { fast: true }],
  ["roasted_peanut", 3, 0.5, { fast: true }],
  ["honey_roasted_peanut", 4, 0.6, { fast: true }],
  ["magic_peanut", 6, 1.0, { fast: true }],
  ["cucumber", 3, 0.4, {}],
  ["ghost_pepper", 2, 0.3, {}],
  ["gearo_berry", 2, 0.2, { fast: true }],
  // Fermented and preserved
  ["pickle", 4, 0.5, {}],
  ["pickled_egg", 5, 0.6, {}],
  ["pickled_pepper", 4, 0.5, {}],
  ["pickled_beetroot", 4, 0.5, {}],
  ["pickled_onion", 4, 0.5, {}],
  ["pickled_pitcher_pod", 5, 0.6, {}],
  ["century_egg", 6, 0.7, {}],
  ["surstromming", 7, 0.6, {}],
  ["salted_cod", 5, 0.6, {}],
  ["salted_salmon", 6, 0.7, {}],
  ["kimchi", 6, 0.7, { bowl: true }],
  // Dishes
  ["pad_thai", 12, 0.8, { bowl: true }],
  ["cheese_pasta", 10, 0.8, { bowl: true }],
  ["cucumber_salad", 7, 0.6, { bowl: true }],
  ["cucumber_noodles", 3, 0.4, { fast: true }],
  ["pickle_soup", 9, 0.7, { bowl: true }],
  ["ghostly_chili", 11, 0.8, { bowl: true }],
  ["overnight_oats", 8, 0.6, { bowl: true }],
  ["stuffed_burrito", 10, 0.8, {}],
  ["deluxe_burger", 14, 0.9, {}],
  ["cheese_burger", 12, 0.8, {}],
  ["meat_pizza_slice", 6, 0.6, { fast: true }],
  ["pb_j", 8, 0.6, {}],
  ["oatmeal_cookie", 3, 0.3, { fast: true }],
  ["oat_bread", 6, 0.6, {}],
  ["fruity_granola_bar", 5, 0.5, { fast: true }],
  ["deluxe_granola_bar", 7, 0.7, { fast: true }],
  ["chocolate_nut_granola_bar", 6, 0.6, { fast: true }],
  // Bottles and jars
  ["nut_milk_bottle", 4, 0.3, { bottle: true, drink: true }],
  ["nut_mash_bottle", 4, 0.4, { bottle: true, drink: true }],
  ["apple_sauce_mason_jar", 6, 0.5, { jar: true }],
  ["gearo_berry_mason_jar", 6, 0.5, { jar: true }],
  ["glow_berry_mason_jar", 6, 0.6, { jar: true }],
  ["honey_mason_jar", 6, 0.6, { jar: true }],
  ["nut_mash_mason_jar", 7, 0.6, { jar: true }],
  ["pepper_jam_mason_jar", 6, 0.6, { jar: true }],
  ["relish_mason_jar", 6, 0.5, { jar: true }],
  ["sweet_berry_mason_jar", 6, 0.5, { jar: true }],
];

global.vintageDelightItems = [
  "mason_jar",
  "vinegar_bottle",
  "vinegar_mason_jar",
  "organic_mash",
  "ghost_charcoal",
  "golden_egg",
  "meat_pizza",
];

// Simple cubes; the texture is vintagedelight:block/<id>.
global.vintageDelightBlocks = [
  "salt_block",
  "smooth_salt_block",
  "salt_bricks",
  "mixed_salt_bricks",
  "cucumber_crate",
  "ghost_pepper_crate",
  "peanut_crate",
  "gearo_berry_bag",
];

global.vintageDelightSaltLamps = [
  "salt_lamp",
  "salt_lamp_default",
  "salt_lamp_blue",
  "salt_lamp_gray",
  "salt_lamp_green",
  "salt_lamp_light_blue",
  "salt_lamp_pink",
  "salt_lamp_purple",
];

StartupEvents.registry("item", (e) => {
  global.vintageDelightFoods.forEach((entry) => {
    let id = entry[0];
    let nutrition = entry[1];
    let saturation = entry[2];
    let options = entry[3];
    let builder = e.create(`${VD}:${id}`);
    builder.food((food) => {
      food.nutrition(nutrition);
      food.saturation(saturation);
      if (options.fast) food.fastToEat();
      if (options.drink) food.alwaysEdible();
      if (options.bowl) food.usingConvertsTo(Item.of("minecraft:bowl"));
      if (options.bottle) food.usingConvertsTo(Item.of("minecraft:glass_bottle"));
      if (options.jar) food.usingConvertsTo(Item.of(`${VD}:mason_jar`));
    });
    if (options.bowl || options.jar) builder.maxStackSize(16);
    if (options.drink) builder.useAnimation("drink");
  });
  global.vintageDelightItems.forEach((id) => {
    let builder = e.create(`${VD}:${id}`);
    if (id === "vinegar_bottle") builder.containerItem("minecraft:glass_bottle");
    if (id === "vinegar_mason_jar") builder.containerItem(`${VD}:mason_jar`);
    if (id === "ghost_charcoal") builder.burnTime(2400);
  });
});

StartupEvents.registry("block", (e) => {
  global.vintageDelightBlocks.forEach((id) => {
    let wooden = id.endsWith("_crate") || id.endsWith("_bag");
    e.create(`${VD}:${id}`)
      .soundType(wooden ? "wood" : "stone")
      .hardness(wooden ? 2 : 1.5)
      .tagBlock(wooden ? "minecraft:mineable/axe" : "minecraft:mineable/pickaxe");
  });

  global.vintageDelightSaltLamps.forEach((id) => {
    e.create(`${VD}:${id}`)
      .soundType("stone")
      .hardness(1)
      .lightLevel(1)
      .box(4, 0, 4, 12, 10, 12)
      .defaultCutout()
      .tagBlock("minecraft:mineable/pickaxe");
  });

  // Salt crust: a thin layer the salt item places (the Pickling Can looks for it around itself).
  e.create(`${VD}:salt`)
    .soundType("sand")
    .hardness(0.3)
    .box(0, 0, 0, 16, 2, 16)
    .tagBlock("minecraft:mineable/shovel");

  e.create(`${VD}:magic_vine`, "pillar")
    .soundType("wood")
    .hardness(2)
    .tagBlock("minecraft:mineable/axe")
    .tagBlock("minecraft:logs");
  e.create(`${VD}:stripped_magic_vine`, "pillar")
    .soundType("wood")
    .hardness(2)
    .tagBlock("minecraft:mineable/axe")
    .tagBlock("minecraft:logs");

  // Crops. The seeds are vintagedelight:<crop>_seeds as in Vintage Delight.
  [
    ["cucumber", 5, 2],
    ["ghost_pepper", 5, 2],
  ].forEach((crop) => {
    let id = crop[0];
    let age = crop[1];
    let count = crop[2];
    e.create(`${VD}:${id}`, "crop")
      .age(age)
      .survive((state, level, pos) => global.surviveCheck(level, pos))
      .noSeeds()
      .crop(`${VD}:${id}`, count)
      .tagBlock("minecraft:mineable/hoe")
      .tagBlock("minecraft:crops")
      .randomTick((tick) => {})
      .item((seedItem) => {
        seedItem.texture(`${VD}:item/${id}_seeds`);
      });
    let variants = {};
    for (let stage = 0; stage <= age; stage++) {
      variants[`age=${stage}`] = { model: `${VD}:block/${id}_stage${stage}` };
    }
    global.cropBlockstates[`${VD}:${id}`] = { variants: variants };
  });

  // Gearo berry bush: planted with gearo berries (server_scripts/blockEvents/plantGearoBerry.js).
  e.create(`${VD}:gearo_berry_bush`, "crop")
    .age(3)
    .survive((state, level, pos) => global.surviveCheck(level, pos))
    .noSeeds()
    .noItem()
    .crop(`${VD}:gearo_berry`, 3)
    .tagBlock("minecraft:mineable/hoe")
    .tagBlock("minecraft:crops")
    .randomTick((tick) => {});
  let bushVariants = {};
  for (let stage = 0; stage <= 3; stage++) {
    bushVariants[`age=${stage}`] = { model: `${VD}:block/gearo_berry_bush_stage${stage}` };
  }
  global.cropBlockstates[`${VD}:gearo_berry_bush`] = { variants: bushVariants };
});
