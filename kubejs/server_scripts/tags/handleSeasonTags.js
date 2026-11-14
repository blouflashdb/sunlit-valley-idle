console.info("[SOCIETY] handleSeasonTags.js loaded");

// The lists mix items and blocks and name mods that are not in the 1.21.1 pack; each tag event only gets the
// ids its registry has.
const $SeasonRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $SeasonResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");
const seasonTagTarget = (e, registry) => {
  const has = (id) => registry.containsKey($SeasonResourceLocation.parse(id));
  return {
    add: (tag, id) => {
      if (has(id)) e.add(tag, id);
    },
    remove: (tag, id) => {
      if (has(id)) e.remove(tag, id);
    },
  };
};

// Remove tags
const stripTags = [
  "veggiesdelight:garlic_clove",
  "minecraft:apple",
  "pamhc2trees:lycheeitem",
  "pamhc2trees:bananaitem",
  "pamhc2trees:peachitem",
  "pamhc2trees:mangoitem",
  "atmospheric:orange",
  "pamhc2trees:plumitem",
  "pamhc2trees:pamdragonfruit",
  "pamhc2trees:starfruititem",
  "pamhc2trees:pampeach",
  "pamhc2trees:dragonfruititem",
  "pamhc2trees:plum_sapling",
  "pamhc2trees:pamapple",
  "pamhc2trees:pamlychee",
  "pamhc2trees:pamplum",
  "pamhc2trees:apple_sapling",
  "pamhc2trees:lychee_sapling",
  "pamhc2trees:cherry_sapling",
  "pamhc2trees:pamcherry",
  "pamhc2trees:pamorange",
  "pamhc2trees:pammango",
  "pamhc2trees:pambanana",
  "pamhc2trees:banana_sapling",
  "pamhc2trees:peach_sapling",
  "pamhc2trees:mango_sapling",
  "pamhc2trees:orange_sapling",
  "pamhc2trees:dragonfruit_sapling",
  "pamhc2trees:pamstarfruit",
  "pamhc2trees:starfruit_sapling",
  "pamhc2trees:cherryitem",
  "pamhc2trees:cinnamon_sapling",
  "pamhc2trees:cinnamonitem",
  "pamhc2trees:pamcinnamon",
  "vintagedelight:peanut",
  "vintagedelight:peanut_crop",
  "vintagedelight:gearo_berry",
  "vintagedelight:gearo_berry_bush",
  "brewery:hops_seeds",
  "pamhc2trees:orangeitem",
  "pamhc2trees:pampassionfruit",
  "pamhc2trees:passionfruit_sapling",
  "minecraft:potatoes",
  "minecraft:carrots",
  "vintagedelight:peanut_crop",
  "veggiesdelight:sweet_potato_crop",
  "farm_and_charm:onion_crop",
  "veggiesdelight:turnip_seeds",
  "veggiesdelight:turnip",
  "veggiesdelight:turnip_crop",
  "veggiesdelight:broccoli_seeds",
  "veggiesdelight:broccoli",
  "veggiesdelight:broccoli_crop",
  "veggiesdelight:cauliflower",
  "veggiesdelight:cauliflower_seeds",
  "veggiesdelight:cauliflower_crop",
  "veggiesdelight:sweet_potato_crop",
  "veggiesdelight:sweet_potato",
  "veggiesdelight:garlic_crop",
  "veggiesdelight:bellpepper_crop",
  "veggiesdelight:bellpepper",
  "veggiesdelight:bellpepper_seeds",
];
const stripSeasons = (e, item) => {
  e.remove("sereneseasons:summer_crops", "vintagedelight:cucumber_crop");
  e.remove("sereneseasons:summer_crops", "vintagedelight:cucumber_seeds");
  e.remove("sereneseasons:spring_crops", "vintagedelight:ghost_pepper_crop");
  e.remove("sereneseasons:spring_crops", "vintagedelight:ghost_pepper_seeds");
  e.remove("sereneseasons:spring_crops", item);
  e.remove("sereneseasons:summer_crops", item);
  e.remove("sereneseasons:autumn_crops", item);
  e.remove("sereneseasons:winter_crops", item);
};
ServerEvents.tags("item", (event) => {
  const e = seasonTagTarget(event, $SeasonRegistries.ITEM);
  stripTags.forEach((item) => {
    stripSeasons(e, item);
  });
});

ServerEvents.tags("block", (event) => {
  const e = seasonTagTarget(event, $SeasonRegistries.BLOCK);
  stripTags.forEach((item) => {
    stripSeasons(e, item);
  });
});
const springCrops = [
  "society:salmonberry",
  "farm_and_charm:onion",
  "farm_and_charm:strawberry",
  "farm_and_charm:strawberry_crop",
  "farm_and_charm:strawberry_seed",
  "farm_and_charm:lettuce",
  "farm_and_charm:lettuce_seeds",
  "herbalbrews:coffee_beans",
  "farm_and_charm:onion_crop",
  "farm_and_charm:lettuce_crop",
  "herbalbrews:coffee_plant",
  "farmersdelight:tomato",
  "farmersdelight:budding_tomatoes",
  "farmersdelight:tomatoes",
  "farmersdelight:tomato_seeds",
  "vintagedelight:gearo_berry",
  "vintagedelight:gearo_berry_bush",
  "vinery:cherry",
  "pamhc2trees:pamcherry",
  "pamhc2trees:lycheeitem",
  "pamhc2trees:cherry_sapling",
  "pamhc2trees:lychee_sapling",
  "pamhc2trees:pamlychee",
  "pamhc2trees:pampassionfruit",
  "atmospheric:passion_fruit",
  "pamhc2trees:passionfruit_sapling",
  "pamhc2trees:pamlemon",
  "pamhc2trees:lemon_sapling",
  "pamhc2trees:lemonitem",
  "society:ancient_fruit",
  "society:ancient_fruit_seeds",
  "society:sparkpod",
  "society:sparkpod_seeds",
  "society:tubabacco_leaf",
  "society:tubabacco_leaf_seeds",
  "vintagedelight:cucumber",
  "vintagedelight:cucumber_crop",
  "vintagedelight:cucumber_seeds",
  "herbalbrews:yerba_mate_leaf",
  "herbalbrews:green_tea_leaf",
  "herbalbrews:tea_plant",
  "herbalbrews:tea_blossom",
  "herbalbrews:yerba_mate_plant",
  "veggiesdelight:cauliflower",
  "veggiesdelight:cauliflower_seeds",
  "veggiesdelight:cauliflower_crop",
  "veggiesdelight:garlic_crop",
  "veggiesdelight:garlic_seed",
  "veggiesdelight:garlic",
  "society:potato",
  "society:potato_seeds",
  "society:carrot",
  "society:carrot_seeds",
  "society:onion",
  "society:onion_seeds",
  "veggiesdelight:turnip_seeds",
  "veggiesdelight:turnip",
  "veggiesdelight:turnip_crop",
  "vinery:savanna_grapes_red",
  "vinery:savanna_grapes_white",
  "vinery:savanna_grape_seeds_red",
  "vinery:savanna_grape_seeds_white",
  "vinery:red_grape_seeds",
  "vinery:red_grape",
  "vinery:white_grape_seeds",
  "vinery:white_grape",
  "nethervinery:crimson_grape_seeds",
  "nethervinery:warped_grape",
  "nethervinery:crimson_grape",
  "nethervinery:warped_grape_seeds",
];

const summerCrops = [
  "minecraft:melon_slice",
  "society:boysenberry",
  "farm_and_charm:oat_crop",
  "farm_and_charm:corn_crop",
  "farm_and_charm:oat",
  "farm_and_charm:kernels",
  "farm_and_charm:corn",
  "society:blueberry",
  "society:blueberry_seeds",
  "farm_and_charm:oat_seeds",
  "herbalbrews:rooibos_leaf",
  "herbalbrews:rooibos_plant",
  "beachparty:palm_sapling",
  "pamhc2trees:bananaitem",
  "pamhc2trees:peachitem",
  "atmospheric:orange",
  "pamhc2trees:mangoitem",
  "pamhc2trees:banana_sapling",
  "pamhc2trees:peach_sapling",
  "pamhc2trees:mango_sapling",
  "pamhc2trees:orange_sapling",
  "pamhc2trees:pambanana",
  "pamhc2trees:pampeach",
  "pamhc2trees:pammango",
  "pamhc2trees:pamorange",
  "pamhc2trees:pamlemon",
  "pamhc2trees:lemon_sapling",
  "pamhc2trees:lemonitem",
  "farmersdelight:rice_panicle",
  "farmersdelight:tomato",
  "farmersdelight:budding_tomatoes",
  "supplementaries:stick_tomatoes",
  "farmersdelight:tomatoes",
  "farmersdelight:tomato_seeds",
  "vintagedelight:ghost_pepper_seeds",
  "vintagedelight:ghost_pepper",
  "vintagedelight:ghost_pepper_crop",
  "society:ancient_fruit",
  "society:ancient_fruit_seeds",
  "etcetera:cotton",
  "etcetera:cotton_flower",
  "etcetera:cotton_seeds",
  "brewery:hops",
  "brewery:hop_trellis_seeds",
  "brewery:hop_trellis",
  "moreminecarts:glass_cactus",
  "atmospheric:aloe_vera",
  "atmospheric:aloe_kernels",
  "atmospheric:aloe_leaves",
  "atmospheric:yucca_branch",
  "atmospheric:yucca_bundle",
  "atmospheric:yucca_fruit",
  "atmospheric:yucca_sapling",
  "herbalbrews:yerba_mate_leaf",
  "herbalbrews:green_tea_leaf",
  "herbalbrews:tea_plant",
  "herbalbrews:yerba_mate_plant",
  "herbalbrews:tea_blossom",
  "veggiesdelight:bellpepper_crop",
  "veggiesdelight:bellpepper",
  "veggiesdelight:bellpepper_seeds",
  "veggiesdelight:zucchini",
  "veggiesdelight:zucchini_crop",
  "vinery:jungle_grapes_red",
  "vinery:jungle_grape_seeds_red",
  "vinery:jungle_grape_seeds_white",
  "vinery:jungle_grapes_white",
  "vinery:savanna_grapes_red",
  "vinery:savanna_grapes_white",
  "vinery:savanna_grape_seeds_red",
  "vinery:savanna_grape_seeds_white",
];
const autumnCrops = [
  "society:cranberry",
  "society:cranberry_seeds",
  "society:mossberry",
  "farm_and_charm:barley_crop",
  "farm_and_charm:corn_crop",
  "minecraft:beetroot",
  "farm_and_charm:kernels",
  "farm_and_charm:corn",
  "farm_and_charm:barley_seeds",
  "farm_and_charm:barley",
  "vintagedelight:peanut",
  "vintagedelight:peanut_crop",
  "farmersdelight:rice_panicle",
  "farmersdelight:cabbage",
  "farmersdelight:tomato",
  "farmersdelight:budding_tomatoes",
  "farmersdelight:tomatoes",
  "farmersdelight:tomato_seeds",
  "autumnity:foul_berries",
  "autumnity:tall_foul_berry_bush",
  "minecraft:apple",
  "pamhc2trees:pamapple",
  "pamhc2trees:plumitem",
  "pamhc2trees:pamplum",
  "pamhc2trees:apple_sapling",
  "pamhc2trees:plum_sapling",
  "society:ancient_fruit",
  "society:ancient_fruit_seeds",
  "pamhc2trees:cinnamon_sapling",
  "pamhc2trees:cinnamonitem",
  "pamhc2trees:pamcinnamon",
  "herbalbrews:yerba_mate_leaf",
  "herbalbrews:green_tea_leaf",
  "herbalbrews:tea_plant",
  "herbalbrews:tea_blossom",
  "herbalbrews:yerba_mate_plant",
  "veggiesdelight:sweet_potato_crop",
  "veggiesdelight:sweet_potato",
  "society:eggplant",
  "society:eggplant_seeds",
  "pamhc2trees:pampawpaw",
  "pamhc2trees:pawpaw_sapling",
  "pamhc2trees:pawpawitem",
  "pamhc2trees:hazelnut_sapling",
  "pamhc2trees:pamhazelnut",
  "pamhc2trees:hazelnutitem",
  "society:carrot",
  "society:carrot_seeds",
  "society:peanut",
  "society:peanut_seeds",
  "society:sweet_potato",
  "society:sweet_potato_seeds",
  "veggiesdelight:broccoli_seeds",
  "veggiesdelight:broccoli",
  "veggiesdelight:broccoli_crop",
  "vinery:red_grape_seeds",
  "vinery:red_grape",
  "vinery:white_grape_seeds",
  "vinery:white_grape",
  "nethervinery:crimson_grape_seeds",
  "nethervinery:warped_grape",
  "nethervinery:crimson_grape",
  "nethervinery:warped_grape_seeds",
];
const winterCrops = [
  "society:crystalberry",
  "farm_and_charm:barley_crop",
  "farm_and_charm:barley_seeds",
  "farm_and_charm:barley",
  "snowyspirit:ginger",
  "snowyspirit:ginger_flower",
  "quark:ancient_sapling",
  "farmersdelight:cabbage",
  "pamhc2trees:dragonfruit_sapling",
  "pamhc2trees:pamdragonfruit",
  "pamhc2trees:dragonfruititem",
  "pamhc2trees:cinnamon_sapling",
  "pamhc2trees:cinnamonitem",
  "pamhc2trees:pamcinnamon",
  "society:tubabacco_leaf",
  "society:tubabacco_leaf_seeds",
  "atmospheric:kousa_sapling",
  "windswept:wild_berry_bush",
  "windswept:wild_berries",
  "vinery:taiga_grape_seeds_red",
  "vinery:taiga_grapes_red",
  "vinery:taiga_grapes_white",
  "vinery:taiga_grape_seeds_white",
];
const allSeasonCrops = [
  "cluttered:willow_sapling",
  "cluttered:poplar_sapling",
  "cluttered:crabapple_sapling",
  "cluttered:sycamore_sapling",
  "cluttered:fluorescent_maple_sapling",
  "society:mana_fruit",
  "society:mana_fruit_crop",
  "atmospheric:laurel_sapling",
  "atmospheric:dry_laurel_sapling",
  "botania_seeds:white_mystical_flower_seeds",
  "botania_seeds:orange_mystical_flower_seeds",
  "botania_seeds:magenta_mystical_flower_seeds",
  "botania_seeds:light_blue_mystical_flower_seeds",
  "botania_seeds:yellow_mystical_flower_seeds",
  "botania_seeds:lime_mystical_flower_seeds",
  "botania_seeds:pink_mystical_flower_seeds",
  "botania_seeds:gray_mystical_flower_seeds",
  "botania_seeds:light_gray_mystical_flower_seeds",
  "botania_seeds:cyan_mystical_flower_seeds",
  "botania_seeds:purple_mystical_flower_seeds",
  "botania_seeds:blue_mystical_flower_seeds",
  "botania_seeds:brown_mystical_flower_seeds",
  "botania_seeds:green_mystical_flower_seeds",
  "botania_seeds:red_mystical_flower_seeds",
  "botania_seeds:black_mystical_flower_seeds",
  "botania_seeds:white_mystical_flower",
  "botania_seeds:orange_mystical_flower",
  "botania_seeds:magenta_mystical_flower",
  "botania_seeds:light_blue_mystical_flower",
  "botania_seeds:yellow_mystical_flower",
  "botania_seeds:lime_mystical_flower",
  "botania_seeds:pink_mystical_flower",
  "botania_seeds:gray_mystical_flower",
  "botania_seeds:light_gray_mystical_flower",
  "botania_seeds:cyan_mystical_flower",
  "botania_seeds:purple_mystical_flower",
  "botania_seeds:blue_mystical_flower",
  "botania_seeds:brown_mystical_flower",
  "botania_seeds:green_mystical_flower",
  "botania_seeds:red_mystical_flower",
  "botania_seeds:black_mystical_flower",
  "atmospheric:grimwood_sapling",
  "atmospheric:aspen_sapling",
  "atmospheric:green_aspen_sapling",
  "atmospheric:rosewood_sapling",
  "atmospheric:yucca_sapling",
  "atmospheric:morado_sapling",
  "autumnity:red_maple_sapling",
  "autumnity:yellow_maple_sapling",
  "autumnity:orange_maple_sapling",
  "autumnity:maple_sapling",
  "vinery:apple_tree_sapling",
  "vinery:dark_cherry_sapling",
  "quark:yellow_blossom_sapling",
  "quark:lavender_blossom_sapling",
  "quark:blue_blossom_sapling",
  "quark:orange_blossom_sapling",
  "meadow:pine_sapling",
  "quark:red_blossom_sapling",
  "pamhc2trees:starfruititem",
  "pamhc2trees:starfruit_sapling",
  "pamhc2trees:pamstarfruit",
  "vintagedelight:magic_peanut",
  "atmospheric:currant",
  "atmospheric:currant_stalk",
  "atmospheric:hanging_currant",
  "atmospheric:currant_seedling",
  "minecraft:chorus_flower",
  "minecraft:chorus_fruit",
  "minecraft:pale_oak_sapling",
];

ServerEvents.tags("item", (event) => {
  const e = seasonTagTarget(event, $SeasonRegistries.ITEM);
  springCrops.forEach((crop) => {
    e.add("sereneseasons:spring_crops", crop);
  });
  summerCrops.forEach((crop) => {
    e.add("sereneseasons:summer_crops", crop);
  });
  autumnCrops.forEach((crop) => {
    e.add("sereneseasons:autumn_crops", crop);
  });
  winterCrops.forEach((crop) => {
    e.add("sereneseasons:winter_crops", crop);
  });
  allSeasonCrops.forEach((crop) => {
    e.add("sereneseasons:spring_crops", crop);
    e.add("sereneseasons:autumn_crops", crop);
    e.add("sereneseasons:summer_crops", crop);
    e.add("sereneseasons:winter_crops", crop);
  });
});

ServerEvents.tags("block", (event) => {
  const e = seasonTagTarget(event, $SeasonRegistries.BLOCK);
  springCrops.forEach((crop) => {
    e.add("sereneseasons:spring_crops", crop);
  });
  summerCrops.forEach((crop) => {
    e.add("sereneseasons:summer_crops", crop);
  });
  autumnCrops.forEach((crop) => {
    e.add("sereneseasons:autumn_crops", crop);
  });
  winterCrops.forEach((crop) => {
    e.add("sereneseasons:winter_crops", crop);
  });
  allSeasonCrops.forEach((crop) => {
    e.add("sereneseasons:spring_crops", crop);
    e.add("sereneseasons:autumn_crops", crop);
    e.add("sereneseasons:summer_crops", crop);
    e.add("sereneseasons:winter_crops", crop);
  });
});
