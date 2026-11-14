// priority: 0
console.info("[SOCIETY] handleItemBlockFluidTags.js loaded");

// Item, block and fluid tags (ported from the 1.20.1 handleItemBlockFluidTags.js). The forge: tags are c: tags on
// 1.21.1. Parts that earlier slices split off live elsewhere: society:loot_furniture (furnitureTags.js),
// society:raw_logs (woodTags.js), society:preserves (vintageDelightTags.js), society:animal_feed and the milk sizes
// (husbandryTags.js), the tapper and mushroom log tags (artisanMachineTags.js), society:opens_market (townTags.js);
// society:plushies, society:skill_book and society:botania_seeds are set where the startup scripts register them.
// Ids of mods that are not in the 1.21.1 pack are left out; lists built from globals are filtered at load.
const $ItemBlockTagRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $ItemBlockTagRL = Java.loadClass("net.minecraft.resources.ResourceLocation");
const itemBlockTagBlockExists = (id) => $ItemBlockTagRegistries.BLOCK.containsKey($ItemBlockTagRL.parse(String(id)));

// Items whose tags are all removed (they are hidden or replaced in this pack).
const itemTagStripped = [
  "PLACEHOLDER_STRIP",
];

const itemBlockTagOres = [
  "etcetera:nether_bismuth_ore",
  "society:sparkstone_ore",
  "society:deepslate_sparkstone_ore",
  "society:iridium_ore",
  "society:deepslate_iridium_ore",
];

const itemBlockTagStrippedLogs = [
  "cluttered:stripped_poplar_log",
  "cluttered:stripped_willow_log",
  "cluttered:stripped_fluorescent_maple_log",
  "cluttered:stripped_sycamore_log",
  "cluttered:stripped_flowering_crabapple_log",
  "cluttered:stripped_crabapple_log",
  "cluttered:stripped_flowering_willow_log",
  "minecraft:stripped_pale_oak_log",
];

ServerEvents.tags("item", (e) => {
  itemTagStripped.forEach((item) => e.removeAllTagsFrom(item));
  global.removedItems.filter(global.itemExists).forEach((item) => {
    e.removeAllTagsFrom(item);
    e.add("furniture:trash_bag_blacklist", item);
    e.add("c:hidden_from_recipe_viewers", item);
  });
  global.hiddenItems.filter(global.itemExists).forEach((item) => {
    e.add("furniture:trash_bag_blacklist", item);
    e.add("c:hidden_from_recipe_viewers", item);
  });
});

ServerEvents.tags("item", (e) => {
  // Misc tags
  e.add("stardew_fishing:bobbers", ["society:needle_bobber", "society:net_bobber"]);
  e.add("c:plates/lead", "oreganized:lead_sheet");
  e.add("c:plates/silver", "oreganized:silver_sheet");
  e.add("c:plates", ["oreganized:lead_sheet", "oreganized:silver_sheet"]);
  e.add("c:salt", "meadow:alpine_salt");
  e.add("c:crops", ["society:tubabbaco", "society:eggplant", "farm_and_charm:strawberry", "herbalbrews:green_tea_leaf"]);
  e.add("c:crops/cabbage", "farm_and_charm:lettuce");
  e.add("c:crops/eggplant", "society:eggplant");
  e.add("c:foods/vegetable", "society:eggplant");
  e.add("meadow:water_bottles", "herbalbrews:water_cup");
  e.add("farm_and_charm:water_bottles", "herbalbrews:water_cup");
  e.add("c:water_bottles", "herbalbrews:water_cup");
  e.add("c:foods/raw_pasta", "farm_and_charm:raw_pasta");
  e.add("c:seeds", "farm_and_charm:strawberry_seed");
  e.add("c:salad_ingredients", "farm_and_charm:lettuce");
  e.add("c:crops/corn", "farm_and_charm:corn");
  e.add("candlelight:butter", "farm_and_charm:butter");
  e.add("meadow:cheese_blocks", "meadow:amethyst_cheese_block");
  e.add("c:ropes", "brewery:rope");
  e.add("c:cobblestones", "meadow:cobbled_limestone");
  e.remove("c:chests/ender", "minecraft:ender_chest");
  e.remove("c:chests", "minecraft:ender_chest");
  e.remove("whimsy_deco:gatcha_machine_accepts", "minecraft:diamond");
  e.add("bakery:milk", "minecraft:milk_bucket");
  e.add("quark:seed_pouch_holdable", "farmersdelight:tomato_seeds");
  ["minecraft:potato", "minecraft:carrot", "farm_and_charm:onion", "veggiesdelight:sweet_potato", "vintagedelight:peanut"].forEach(
    (crop) => {
      e.add("society:need_seeds", crop);
      e.remove("minecraft:villager_plantable_seeds", crop);
      e.remove("quark:seed_pouch_holdable", crop);
    }
  );
  e.add("c:ores", itemBlockTagOres);
  const berries = [
    "society:boysenberry",
    "society:salmonberry",
    "society:crystalberry",
    "society:cranberry",
    "society:blueberry",
    "society:mossberry",
  ];
  e.add("c:crops", berries);
  e.add("c:foods/berry", berries);
  e.add("c:foods/fruit", berries);
  e.add("c:crops", ["society:ancient_fruit", "society:mana_fruit", "society:sparkpod"]);
  e.add("c:foods/fruit", ["society:ancient_fruit", "society:mana_fruit", "society:sparkpod"]);
  e.add("c:mushrooms", [
    "cluttered:fly_agaric",
    "cluttered:blue_roundhead",
    "quark:glow_shroom",
    "minecraft:warped_fungus",
    "minecraft:crimson_fungus",
  ]);
  e.add("c:foods/fruit", [
    "minecraft:apple",
    "minecraft:sweet_berries",
    "minecraft:melon_slice",
    "autumnity:foul_berries",
    "minecraft:chorus_fruit",
    "minecraft:glow_berries",
  ]);
  e.add("minecraft:saplings", ["cluttered:sycamore_sapling", "cluttered:fluorescent_maple_sapling", "cluttered:crabapple_sapling"]);
  e.add("c:foods/raw_meat", [
    "minecraft:porkchop",
    "minecraft:beef",
    "autumnity:turkey",
    "minecraft:mutton",
    "minecraft:chicken",
    "autumnity:turkey_piece",
    "minecraft:rabbit",
    "meadow:raw_buffalo_meat",
    "untitledduckmod:raw_duck",
    "untitledduckmod:raw_goose",
    "wildernature:pelican_meat",
  ]);
  e.add("c:foods/cooked_meat", [
    "minecraft:cooked_rabbit",
    "autumnity:cooked_turkey_piece",
    "autumnity:cooked_turkey",
    "minecraft:cooked_mutton",
    "minecraft:cooked_porkchop",
    "minecraft:cooked_chicken",
    "minecraft:cooked_beef",
    "meadow:cooked_buffalo_meat",
    "untitledduckmod:cooked_goose",
    "untitledduckmod:cooked_duck",
    "wildernature:cooked_pelican_meat",
  ]);
  e.add("c:milks", "meadow:wooden_grain_milk_bucket");
  e.add("farm_and_charm:milk", "meadow:wooden_grain_milk_bucket");
  e.add("c:tools/shear", "society:magic_shears");
  // Strawberries are fruit, not vegetables.
  ["c:foods/vegetable", "farm_and_charm:vegetables"].forEach((tag) => e.remove(tag, "farm_and_charm:strawberry"));

  global.fish.forEach((fish) => {
    const splitFish = String(fish.item).split(":");
    let fishId = splitFish[1];
    if (["barrel", "roe", "meat"].some((denied) => fishId.includes(denied))) return;
    if (!global.itemExists(fish.item)) return;
    if (fishId.includes("raw_")) {
      if (fishId === "raw_snowflake") fishId = "frosty_fin";
      else fishId = fishId.substring(4, fishId.length);
    }
    e.add("society:rod_fish", fish.item);
    e.add(`crabbersdelight:jei_display_results/society/${fishId}_bait`, fish.item);
  });
  global.geodeList
    .concat(global.frozenGeodeList, global.magmaGeodeList)
    .filter((mineral) => global.itemExists(mineral.item))
    .forEach((mineral) => e.add("society:mineral", mineral.item));
  e.add("c:eggs", "society:cracked_egg");
  e.add("society:large_eggs", [
    "society:large_egg",
    "society:large_duck_egg",
    "society:large_goose_egg",
    "society:large_turkey_egg",
    "society:large_galliraptor_egg",
    "society:penguin_egg",
    "society:flamingo_egg",
  ]);
  e.add("c:stripped_logs", itemBlockTagStrippedLogs);
  e.add("society:seashells", [
    "twigs:tangerine_seashell",
    "twigs:roseate_seashell",
    "twigs:opaline_seashell",
    "beachparty:seashell",
    "twigs:bronzed_seashell",
  ]);
  e.add("society:mirrors", [
    "furniture:cherry_mirror",
    "furniture:mangrove_mirror",
    "furniture:dark_oak_mirror",
    "furniture:acacia_mirror",
    "furniture:spruce_mirror",
    "furniture:jungle_mirror",
    "furniture:oak_mirror",
    "furniture:birch_mirror",
  ]);
  e.add("create:upright_on_belt", ["society:oak_resin", "society:maple_syrup", "society:pine_tar"]);
  e.add("create:crushed_raw_materials", "create:crushed_raw_bismuth");
  e.add("c:raw_materials", "etcetera:raw_bismuth");
  e.add("aquaculture:bobber", "society:neptunium_bobber");
  e.add("herbalbrews:small_water_fill", "herbalbrews:water_cup");
  global.cooking.filter((meal) => global.itemExists(meal.item)).forEach((meal) => e.add("society:dish", meal.item));
  e.add("minecraft:fishes", [
    "aquaculture:jellyfish",
    "aquaculture:goldfish",
    "aquaculture:leech",
    "society:neptuna",
    "netherdepthsupgrade:soulsucker",
    "aquaculture:box_turtle",
    "aquaculture:arrau_turtle",
    "aquaculture:starshell_turtle",
  ]);
  e.add("c:gems", [
    "society:topaz",
    "society:amethyst_chunk",
    "society:ruby",
    "society:aquamarine",
    "society:jade",
    "society:sparkstone",
    "society:prismatic_shard",
    "society:spinel",
  ]);
  // Shipping bin categories by sell multiplier (plorts and slime hearts are crops).
  Array.from(global.trades.keys())
    .filter(global.itemExists)
    .forEach((trade) => {
      e.add("society:sellable", trade);
      switch (global.trades.get(trade).multiplier) {
        case "shippingbin:crop_sell_multiplier":
          e.add("society:farmer_product", trade);
          break;
        case "shippingbin:gem_sell_multiplier":
          e.add("society:geologist_product", trade);
          break;
        case "shippingbin:wood_sell_multiplier":
          e.add("society:artisan_product", trade);
          break;
        case "shippingbin:meat_sell_multiplier":
        default:
          e.add("society:adventurer_product", trade);
      }
    });
});

ServerEvents.tags("block", (e) => {
  e.add("minecraft:crops", "farmersdelight:tomatoes");
  e.add("buildinggadgets2:deny", [
    "society:coin_leaderboard",
    "society:prize_machine",
    "cb_multipart:multipart",
    "minecraft:trial_spawner",
    "minecraft:spawner",
    "minecraft:vault",
    "fastpaintings:painting",
    "lootr:lootr_barrel",
    "lootr:lootr_chest",
    "lootr:lootr_trapped_chest",
    "lootr:lootr_inventory",
    "brewery:wooden_brewingstation",
    "brewery:copper_brewingstation",
    "brewery:netherite_brewingstation",
    "waystones:purple_sharestone",
    "waystones:blue_sharestone",
    "waystones:green_sharestone",
    "waystones:red_sharestone",
    "waystones:white_sharestone",
    "waystones:deepslate_waystone",
    "waystones:waystone",
  ]);
  const refinedStorageBlocks = [
    "refinedstorage:hollow_cover",
    "refinedstorage:cover",
    "refinedstorage:wireless_transmitter",
    "refinedstorage:network_transmitter",
    "refinedstorage:security_manager",
    "refinedstorage:detector",
    "refinedstorage:network_receiver",
    "refinedstorage:relay",
    "refinedstorage:crafting_grid",
    "refinedstorage:controller",
    "refinedstorage:storage_monitor",
    "refinedstorage:importer",
    "refinedstorage:exporter",
    "refinedstorage:interface",
    "refinedstorage:external_storage",
    "refinedstorage:64k_storage_block",
    "refinedstorage:4k_storage_block",
    "refinedstorage:cable",
  ];
  e.add("create:wrench_pickup", refinedStorageBlocks);
  e.add("oreganized:mineable/scribe", refinedStorageBlocks);
  global.plushies.filter(itemBlockTagBlockExists).forEach((block) => e.add("quality_foods:quality_blocks", block));
  e.add("c:ores", itemBlockTagOres);
  e.add("c:stripped_logs", itemBlockTagStrippedLogs);
  e.add("minecraft:beacon_base_blocks", [
    "society:prismatic_shard_block",
    "society:sparkstone_block",
    "aquaculture:neptunium_block",
    "society:supreme_mayonnaise",
  ]);
  e.remove("minecraft:dirt", "farmersdelight:rich_soil");
  const immovableTags = ["buildinggadgets2:deny", "c:relocation_not_supported", "create:non_movable"];
  [
    "society:fish_pond",
    "society:coin_leaderboard",
    "society:iridium_clock",
    "society:golden_clock",
    "society:mana_clock",
    "society:sparkstone_recycler",
    "society:artisan_hopper",
    "society:mini_artisan_hopper",
    "society:auto_grabber",
    "society:auto_tapper",
    "society:auto_worm_farm",
    "society:feeding_trough",
    "society:fish_pond_basket",
    "society:growth_obelisk",
    "society:juice_inserter",
    "society:mana_milker",
    "society:mana_sprinkler",
    "society:quality_washer",
    "society:snow_melter",
    "society:villager_home",
    "society:shipping_bin_monitor",
    "society:ribbit_hut",
    "society:ribbit_hut_block",
    "society:roe_recycler",
    "society:pickling_can",
    "society:mana_fruit_crop",
    "shippingbin:smart_shipping_bin",
    "shippingbin:basic_shipping_bin",
    "society_trading:auto_trader",
    "society:fish_pond_manager",
    "society:fish_pond_hatchery",
    "society:caterpillar_box",
    "society:growth_obelisk_upper",
  ].forEach((block) => immovableTags.forEach((tag) => e.add(tag, block)));
  const unbreakableTags = [
    "minecraft:wither_immune",
    "buildinggadgets2:deny",
    "minecraft:lava_pool_stone_cannot_replace",
    "c:relocation_not_supported",
    "create:non_movable",
    "create:non_breakable",
    "quark:iron_rod_immune",
  ];
  [
    "society:cavern_air",
    "society:skull_stone",
    "society:skull_permafrost",
    "society:skull_sandstone",
    "society:skull_arid_sandstone",
    "society:skull_blackstone",
    "society:skull_end_stone",
  ].forEach((block) => unbreakableTags.forEach((tag) => e.add(tag, block)));
  [
    "meadow:eriophorum_tall",
    "meadow:alpine_poppy",
    "meadow:delphinium",
    "meadow:saxifrage",
    "meadow:enzian",
    "meadow:fire_lily",
    "meadow:eriophorum",
    "meadow:small_fir",
  ].forEach((flower) => {
    e.add("minecraft:flowers", flower);
    e.add(flower !== "meadow:eriophorum_tall" ? "minecraft:small_flowers" : "minecraft:tall_flowers", flower);
  });
  // Sails
  e.remove("create:windmill_sails", "#minecraft:wool");
  global.artisanMachineIds.filter(itemBlockTagBlockExists).forEach((machine) => {
    e.add("society:artisan_machine", machine);
    e.add("society:golden_clock_advanced", machine);
    e.add("buildinggadgets2:deny", machine);
    e.add("c:relocation_not_supported", machine);
    e.add("create:non_movable", machine);
  });
  e.add("society:aging_cask", ["society:aging_cask", "society:ancient_cask"]);
  // Random tick machines
  e.add("society:artisan_machine", ["society:charging_rod", "society:espresso_machine"]);
  e.remove("minecraft:leaves", "beachparty:palm_leaves");
  e.add("society:palm_leaves", "beachparty:palm_leaves");
  e.add("minecraft:leaves", "meadow:pine_leaves_2");
  e.add("society:opens_tanuki_catalog", "society:tanuki_catalog");
  e.add("society:opens_modern_catalog", "society:modern_catalog");
  e.add("ftbchunks:interact_whitelist", [
    "minecraft:crafting_table",
    "numismatics:andesite_depositor",
    "numismatics:brass_depositor",
    "numismatics:vendor",
    "numismatics:creative_vendor",
    "numismatics:bank_terminal",
    "refurbished_furniture:post_box",
    "bountiful:bountyboard",
    "tanukidecor:slot_machine",
    "whimsy_deco:gatcha_machine",
    "whimsy_deco:black_atm",
    "whimsy_deco:blue_atm",
    "whimsy_deco:red_atm",
    "whimsy_deco:yellow_atm",
    "whimsy_deco:green_atm",
    "whimsy_deco:blue_phone",
    "whimsy_deco:black_phone",
    "whimsy_deco:red_phone",
    "tanukidecor:antique_phone",
    "lootr:lootr_chest",
    "lootr:lootr_barrel",
    "lootr:lootr_trapped_chest",
  ]);
  e.add("minecraft:mineable/axe", "beachparty:cabinet");
  e.add("minecraft:mineable/pickaxe", "bakery:iron_bench");
  e.add("minecraft:mineable/shovel", "vinery:dirt_path_slab");
});

ServerEvents.tags("fluid", (e) => {
  e.removeAllTagsFrom("minecraft:milk");
  e.remove("c:milk", "minecraft:milk");
  e.remove("minecraft:milk", "minecraft:milk");
});
