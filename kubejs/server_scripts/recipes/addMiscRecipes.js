console.info("[SOCIETY] addMiscRecipes.js loaded");

ServerEvents.recipes((e) => {
  // Farmer's Delight 1.21 formats: cutting result [{item: {id, count}}], cooking container/result {id, count}.
  const cutting = (input, output, count, toolTag) => {
    e.custom({
      type: "farmersdelight:cutting",
      ingredients: [{ item: input }],
      result: [{ item: { id: output, count: count } }],
      tool: { tag: toolTag },
    });
  };
  const cooking = (output, inputs, container) => {
    let json = {
      type: "farmersdelight:cooking",
      cookingtime: 200,
      experience: 3.0,
      ingredients: inputs.map((i) => (i.startsWith("#") ? { tag: i.substring(1) } : { item: i })),
      recipe_book_tab: "meals",
      result: { id: output, count: 1 },
    };
    if (container) json.container = { id: container, count: 1 };
    e.custom(json);
  };
  // Pristine minerals and gems uncraft into three of the mineral (only for the ones that are registered).
  const pristine = (item) => {
    let pristineItem = `society:pristine_${String(item).split(":")[1]}`;
    if (global.itemExists(item) && global.itemExists(pristineItem)) e.shapeless(`3x ${item}`, [pristineItem]);
  };
  e.shaped("society:crystalarium", ["III", "SDS", "ibi"], {
    D: "minecraft:diamond_block",
    S: "minecraft:netherite_ingot",
    b: "society:battery",
    I: "oreganized:lead_ingot",
    i: "oreganized:lead_block",
  });
  e.shaped("shippingbin:smart_shipping_bin", ["SSS", "SsS", "SbS"], {
    s: "shippingbin:basic_shipping_bin",
    S: "create:zinc_ingot",
    b: "society:battery",
  });
  e.shapeless("society:plushie_capsule", ["4x #society:plushies"]);
  // The first villager: the Carpenter's invitation.
  e.shapeless(global.townInvitation("carpenter"), ["minecraft:crafting_table", "minecraft:wooden_axe", "minecraft:cobblestone"]);
  // Sugar with a Quality Food quality (1.20.1 NBT {quality_food:{quality:N}} -> quality_food:quality component)
  e.shapeless(Item.of("minecraft:sugar", 8, '[quality_food:quality={type:"quality_food:diamond",level:3}]'), ["society:maple_syrup"]);
  e.shapeless(Item.of("minecraft:sugar", 3, '[quality_food:quality={type:"quality_food:gold",level:2}]'), ["minecraft:honey_bottle"]);
  e.shapeless(Item.of("minecraft:sugar", 1, '[quality_food:quality={type:"quality_food:iron",level:1}]'), ["minecraft:sugar_cane"]);
  e.shapeless("farm_and_charm:raw_pasta", ['veggiesdelight:potato_noodle', 'veggiesdelight:potato_noodle', 'veggiesdelight:potato_noodle'])
  e.shapeless("minecraft:feather", ['untitledduckmod:duck_feather'])
  e.shaped("atmospheric:blood_orange", ["mmm", "mom", "mmm"], {
    o: "atmospheric:orange",
    m: "farm_and_charm:minced_beef",
  });
  e.smelting("society:rubber", "society:sap").xp(0.35);
  e.smelting("etcetera:bismuth_ingot", "create:crushed_raw_bismuth").xp(0.7);
  e.blasting("etcetera:bismuth_ingot", "create:crushed_raw_bismuth").xp(0.7);
  cutting("herbalbrews:lavender", "herbalbrews:lavender_blossom", 2, "c:tools/knife");
  cutting("twigs:silt", "twigs:silt_ball", 4, "minecraft:shovels");
  cooking("society:chicken_tortilla_soup", ["#c:foods/raw_chicken", "farm_and_charm:onion", "farm_and_charm:corn", "meadow:cheese_slice", "farmersdelight:tomato_sauce"], "minecraft:bowl");
  cooking("society:mexican_street_corn", ["farm_and_charm:corn", "meadow:cheese_slice", "society:mayonnaise"]);
  cooking("society:deep_a_mochi", ["farmersdelight:cooked_rice", "golemoverhaul:honey_blob", "pamhc2trees:lemonitem"]);
  cooking("society:lemon_beignets", ["society:oil", "bakery:sweet_dough", "pamhc2trees:lemonitem", "minecraft:sugar"]);
  e.shaped("16x society:enriched_bone_meal", ["bbb", "bfb", "bbb"], {
    f: "farm_and_charm:fertilizer",
    b: "minecraft:bone_block",
  });
  e.shaped("society:magnifying_glass", [" g", "c "], {
    g: "minecraft:glass",
    c: "minecraft:copper_ingot",
  });

  // Mastery
  e.shaped("society:treasure_totem", ["fmf", "fsf", "fdf"], {
    s: "society:mystic_syrup",
    m: "#society:mineral",
    d: "society:dried_mossberry",
    f: "meadow:pine_log",
  });
  e.shaped("society:bubble_totem", ["fjf", "fsf", "fSf"], {
    s: "society:mystic_syrup",
    j: "society:ocean_jelly",
    S: "unusualfishmod:raw_sneep_snorp",
    f: "meadow:pine_log",
  });
  e.shaped("society:dry_totem", ["ppp", "ptp", "fff"], {
    p: "society:fire_quartz",
    t: "society:truffle_oil",
    f: "meadow:pine_log",
  });
  e.shaped("society:rain_totem", ["ppp", "ptp", "fff"], {
    p: "society:pine_tar",
    t: "society:truffle_oil",
    f: "meadow:pine_log",
  });
  e.shaped("society:thunder_totem", ["ppp", "tat", "fff"], {
    p: "society:oak_resin",
    t: "society:truffle_oil",
    a: "society:amulet_of_light",
    f: "meadow:pine_log",
  });
  // Earth Crystal
  // society:tapper is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  // society:mayonnaise_machine is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  // society:cheese_press is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  e.shaped("meadow:cheese_form", [" C ", "pcp", " b "], {
    c: "society:cheese_press",
    C: "minecraft:netherite_ingot",
    b: "society:battery",
    p: "society:pine_tar",
  });
  e.shaped("brewery:wooden_brewingstation", ["eee", "lll", "fcc"], {
    l: "#society:raw_logs",
    e: "society:earth_crystal",
    f: "minecraft:furnace",
    c: "minecraft:cauldron",
  });
  e.shaped("farmersdelight:rich_soil", ["ses", "ofo", "sos"], {
    f: "minecraft:dirt",
    o: "vintagedelight:organic_mash",
    e: "society:earth_crystal",
    s: "meadow:alpine_salt",
  });
  // society:loom is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  e.shaped("minecraft:beehive", ["ppp", "hhh", "pop"], {
    h: "minecraft:iron_ingot",
    p: "#minecraft:planks",
    o: "society:maple_syrup",
  });
  e.shaped("farm_and_charm:roaster", ["CCC", "ece", "CCC"], {
    C: "minecraft:iron_ingot",
    e: "society:earth_crystal",
    c: "farmersdelight:cooking_pot",
  });
  e.shaped("herbalbrews:tea_kettle", [" i ", "ici", "eie"], {
    c: "minecraft:cauldron",
    e: "society:earth_crystal",
    i: "minecraft:iron_ingot",
  });
  e.shaped("herbalbrews:copper_tea_kettle", [" i ", "ici", "eie"], {
    c: "minecraft:cauldron",
    e: "society:earth_crystal",
    i: "minecraft:copper_ingot",
  });
  e.shaped("4x farm_and_charm:silo_wood", ["lll", "rbr", "lel"], {
    b: "minecraft:barrel",
    l: "meadow:pine_log",
    r: "society:oak_resin",
    e: "society:earth_crystal",
  });
  e.shaped("bakery:baker_station", ["ppp", "rpr", "pep"], {
    p: "#minecraft:planks",
    e: "society:earth_crystal",
    r: "society:oak_resin",
  });
  e.shaped("farm_and_charm:crafting_bowl", ["zzz", "zbz", "eze"], {
    b: "minecraft:bowl",
    e: "society:earth_crystal",
    z: "create:zinc_ingot",
  });
  // Fire Quartz
  // society:seed_maker is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  e.shaped("brewery:copper_brewingstation", ["tct", "cbc", "fcf"], {
    t: "society:pine_tar",
    f: "society:fire_quartz",
    b: "brewery:wooden_brewingstation",
    c: "minecraft:copper_block",
  });
  e.shaped("brewery:netherite_brewingstation", [" n ", "nbn", "pjp"], {
    j: "society:jade",
    p: "society:pine_tar",
    b: "brewery:copper_brewingstation",
    n: "minecraft:netherite_scrap",
  });
  e.shaped("torchmaster:dreadlamp", [" C ", "fgf", " C "], {
    g: "minecraft:glowstone",
    C: "numismatics:crown",
    f: "society:fire_quartz",
  });
  // society:quality_washer is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  e.shaped("farm_and_charm:mincer", ["iCi", "ici", "ifi"], {
    c: "minecraft:iron_block",
    C: "quark:sturdy_stone",
    f: "society:fire_quartz",
    i: "minecraft:iron_ingot",
  });
  e.shaped("vinery:apple_press", [" f ", "tbt", "tft"], {
    b: "minecraft:barrel",
    f: "society:fire_quartz",
    t: "society:treated_log",
  });
  e.shaped("vinery:fermentation_barrel", ["FoF", "IbI", "FfF"], {
    b: "society:wine_keg",
    I: "minecraft:gold_block",
    f: "society:battery",
    o: "minecraft:netherite_ingot",
    F: "meadow:pine_log",
  });
  e.shaped("herbalbrews:cauldron", [" C ", "fcf", " f "], {
    c: "minecraft:cauldron",
    C: "society:jade",
    f: "society:fire_quartz",
  });
  // society:oil_maker is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  // society:preserves_jar is ported: kubejs/server_scripts/recipes/vintageDelightRecipes.js
  // society:dehydrator is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  // society:snow_melter is ported: kubejs/server_scripts/recipes/societyItemRecipes.js
  // society:recycling_machine is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  // society:mushroom_log is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  // Battery
  // society:espresso_machine is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  // society:pickling_can is ported: kubejs/server_scripts/recipes/vintageDelightRecipes.js
  e.shaped("beachparty:mini_fridge", ["zlz", "ziz", "zbz"], {
    l: "minecraft:lime_dye",
    i: "minecraft:ice",
    b: "society:battery",
    z: "create:zinc_ingot",
  });
  // Prismatic
  e.shaped("torchmaster:feral_flare_lantern", [" p ", "sls", " s "], {
    l: "minecraft:lantern",
    s: "numismatics:sun",
    p: "society:prismatic_shard",
  });
  e.shaped("minecraft:elytra", ["p p", "wew", "p p"], {
    w: "society:elytra_wing",
    e: "minecraft:dragon_egg",
    p: "society:prismatic_shard",
  });
  e.shaped("relics:magic_mirror", ["ppp", "pmp", "ppp"], {
    m: "oreganized:silver_mirror",
    p: "society:prismatic_shard",
  });
  e.shaped("relics:spore_sack", [" p ", " m ", " s "], {
    s: "supplementaries:sack",
    m: "farmersdelight:red_mushroom_colony",
    p: "society:prismatic_shard",
  });
  e.shaped("relics:rage_glove", ["   ", "lll", "lpl"], {
    l: "minecraft:leather",
    p: "society:prismatic_shard",
  });
  // society:ancient_goddess_statue is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  e.shapeless("rehooked:red_hook", [
    "rehooked:diamond_hook",
    "society:prismatic_shard",
  ]);
  // society:ancient_cask is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  e.shaped("4x waystones:waystone", ["ara", "bPg", "apa"], {
    r: "waystones:red_sharestone",
    b: "waystones:blue_sharestone",
    g: "waystones:green_sharestone",
    p: "waystones:purple_sharestone",
    P: "society:prismatic_shard",
    a: "numismatics:ancient_coin",
  });
  e.shaped("create:mechanical_saw", ["oco", "nnn", "AaA"], {
    a: "create:andesite_casing",
    o: "create:powdered_obsidian",
    A: "minecraft:netherite_upgrade_smithing_template",
    c: "numismatics:ancient_coin",
    n: "minecraft:netherite_ingot",
  });
  e.shaped("2x create:mechanical_saw", ["chc"], {
    h: "create:mechanical_saw",
    c: "minecraft:netherite_upgrade_smithing_template",
  });
  e.shaped("create:mechanical_harvester", ["pcp", "hhh", "oao"], {
    o: "create:powdered_obsidian",
    a: "create:andesite_casing",
    h: "minecraft:netherite_ingot",
    c: "numismatics:ancient_coin",
    p: "society:prismatic_shard",
  });
  e.shaped("2x create:mechanical_harvester", ["shs"], {
    h: "create:mechanical_harvester",
    s: "minecraft:netherite_upgrade_smithing_template",
  });
  e.shaped("create:mechanical_drill", ["cPo", "PpP", "oPa"], {
    o: "create:powdered_obsidian",
    a: "create:andesite_casing",
    P: "minecraft:netherite_ingot",
    c: "numismatics:ancient_coin",
    p: "society:prismatic_shard",
  });
  e.shaped("2x create:mechanical_drill", ["chc"], {
    h: "create:mechanical_drill",
    c: "minecraft:netherite_upgrade_smithing_template",
  });
  // Sparkstone
  // society:auto_grabber, cornucopia and drum_cornucopia are ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  // society:artisan_hopper and society:mini_artisan_hopper are ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  // society:fish_pond_basket, fish_pond_hatchery and fish_pond_manager are ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  // Fish
  // society:fish_pond is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  e.shaped("society:sunlit_pearl", [" n ", " p ", "r o"], {
    n: "society:nether_jelly",
    p: "crabbersdelight:pearl",
    r: "society:river_jelly",
    o: "society:ocean_jelly",
  });
  // society:fish_smoker is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  // society:bait_maker is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  // society:auto_worm_farm is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  // society:deluxe_worm_farm is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  e.shaped("crabbersdelight:crab_trap", ["nsn", "s s", "wpw"], {
    s: "create:zinc_ingot",
    n: "farmersdelight:safety_net",
    p: "crabbersdelight:pearl",
    w: "#minecraft:wooden_slabs",
  });
  // society:wine_keg is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js

  // Jade
  // society:aging_cask is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js

  // Other
  // society:charging_rod is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  // society:auto_tapper and society:juice_inserter are ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  e.shapeless("society:furniture_box", ["4x #society:loot_furniture"]);
  e.smoking("pamhc2trees:roastedhazelnutitem", "pamhc2trees:hazelnutitem").xp(
    0.35
  );
  // Crab trap bait
  e.shapeless("crabbersdelight:crab_trap_bait", ["aquaculture:worm"]);
  e.shapeless("4x crabbersdelight:crab_trap_bait", ["aquaculture:minnow"]);
  e.shapeless("16x crabbersdelight:crab_trap_bait", ["aquaculture:leech"]);

  // Neptuna
  cutting("society:neptuna", "aquaculture:neptunium_nugget", 3, "c:tools/knife");
  // Catalog Dupes
  e.shaped("2x society:tanuki_catalog", ["CCC", "CcC", "CCC"], {
    c: "society:tanuki_catalog",
    C: "numismatics:crown",
  });
  e.shaped("2x society:modern_catalog", ["CCC", "CcC", "CCC"], {
    c: "society:modern_catalog",
    C: "numismatics:crown",
  });
  e.shaped("2x tanukidecor:diy_workbench", ["CCC", "CcC", "CCC"], {
    c: "tanukidecor:diy_workbench",
    C: "numismatics:sun",
  });
  // Pristine uncrafting
  global.geodeList.forEach((geode) => {
    if (geode.item === "society:froggy_helm") return;
    pristine(geode.item);
  });
  global.frozenGeodeList.forEach((geode) => {
    if (geode.item === "society:ribbit_drum") return;
    pristine(geode.item);
  });
  global.magmaGeodeList.forEach((geode) => {
    if (geode.item === "society:ribbit_gadget") return;
    pristine(geode.item);
  });
  global.gems.forEach((gem) => pristine(gem.item));
  const vanillaPristine = [
    "minecraft:emerald",
    "minecraft:lapis_lazuli",
    "minecraft:diamond",
    "minecraft:amethyst_shard",
    "minecraft:prismarine_crystals",
    "minecraft:quartz",
  ];
  vanillaPristine.forEach((gem) => pristine(gem));


  e.shaped("8x minecraft:gunpowder", ["ggg", "gcg", "ggg"], {
    g: "minecraft:glowstone_dust",
    c: "vintagedelight:ghost_charcoal",
  });

  e.shapeless("society:energy_drink", [
    "society:ancient_juice",
    "pamhc2trees:pawpawitem",
    "minecraft:sugar",
  ]);
  e.shapeless("society:pink_energy_drink", [
    "society:sparkpod_juice",
    "pamhc2trees:peachitem",
    "minecraft:sugar",
  ]);
  e.shapeless("society:white_energy_drink", [
    "society:starfruit_juice",
    "pamhc2trees:dragonfruititem",
    "minecraft:sugar",
  ]);
  e.shapeless("society:mana_energy_drink", [
    "society:mana_fruit_juice",
    "pamhc2trees:lemonitem",
    "minecraft:sugar",
  ]);
  e.shapeless("society:death_liquid", [
    "minecraft:skeleton_skull",
    "society:battery",
    [
      "society:salmonberry",
      "society:boysenberry",
      "society:cranberry",
      "society:crystalberry",
    ],
  ]);
  e.shapeless('society:suspicious_milk_tea', [
    'society:warped_milk',
    'herbalbrews:black_tea',
    'atmospheric:aloe_gel_bottle'
  ]);
  e.shapeless("4x farmersdelight:canvas", ["society:canvas"]);
  e.shapeless("1x society:tubasmoke_stick", [
    "society:dried_tubabacco_leaf",
    "vintagedelight:ghost_charcoal",
    "minecraft:paper",
  ]);
  [
    "aquaculture:atlantic_herring",
    "minecraft:pufferfish",
    "aquaculture:minnow",
    "aquaculture:bluegill",
    "aquaculture:perch",
    "minecraft:salmon",
    "aquaculture:blackfish",
    "aquaculture:brown_trout",
    "aquaculture:carp",
    "aquaculture:piranha",
    "aquaculture:smallmouth_bass",
    "minecraft:cod",
    "aquaculture:pollock",
    "aquaculture:jellyfish",
    "aquaculture:rainbow_trout",
    "aquaculture:pink_salmon",
    "minecraft:tropical_fish",
    "aquaculture:red_grouper",
    "aquaculture:gar",
    "aquaculture:muskellunge",
    "aquaculture:synodontis",
    "aquaculture:tambaqui",
    "aquaculture:atlantic_cod",
    "aquaculture:boulti",
    "aquaculture:leech",
    "aquaculture:catfish",
    "aquaculture:tuna",
    "aquaculture:bayad",
    "aquaculture:arapaima",
    "aquaculture:atlantic_halibut",
    "aquaculture:starshell_turtle",
    "aquaculture:brown_shrooma",
    "aquaculture:red_shrooma",
    "aquaculture:arrau_turtle",
    "aquaculture:capitaine",
    "aquaculture:box_turtle",
    "aquaculture:pacific_halibut",
    "aquaculture:goldfish",
    "crabbersdelight:shrimp",
    "crabbersdelight:clawster",
    "crabbersdelight:crab",
    "crabbersdelight:clam",
    "netherdepthsupgrade:searing_cod",
    "netherdepthsupgrade:blazefish",
    "netherdepthsupgrade:lava_pufferfish",
    "netherdepthsupgrade:obsidianfish",
    "netherdepthsupgrade:bonefish",
    "netherdepthsupgrade:wither_bonefish",
    "netherdepthsupgrade:magmacubefish",
    "netherdepthsupgrade:glowdine",
    "netherdepthsupgrade:soulsucker",
    "netherdepthsupgrade:fortress_grouper",
    "netherdepthsupgrade:eyeball_fish",
    "society:neptuna",
  ].forEach((fish) => {
    e.shapeless(fish, [`society:smoked_${fish.split(":")[1]}`, "1x minecraft:blue_ice"]);
  });
  // Sprinklers
  e.shaped("dew_drop_farmland_growth:iron_sprinkler", [" C ", "IlI", " l "], {
    I: "minecraft:iron_block",
    C: "minecraft:copper_block",
    l: "#society:raw_logs",
  });
  e.shaped("dew_drop_farmland_growth:gold_sprinkler", ["fef", " s ", " G "], {
    G: "minecraft:gold_block",
    s: "dew_drop_farmland_growth:iron_sprinkler",
    f: "society:fire_quartz",
    e: "society:earth_crystal",
  });
  e.shaped("dew_drop_farmland_growth:gold_sprinkler", ["fef", "GlG", " l "], {
    l: "#society:raw_logs",
    G: "minecraft:gold_block",
    f: "society:fire_quartz",
    e: "society:earth_crystal",
  });
  // society:caterpillar_box is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  e.shaped(
    "dew_drop_farmland_growth:diamond_sprinkler",
    ["nDn", " s ", " b "],
    {
      s: "dew_drop_farmland_growth:gold_sprinkler",
      D: "minecraft:diamond_block",
      b: "society:battery",
      n: "aquaculture:neptunium_nugget",
    }
  );
  e.shaped(
    "dew_drop_farmland_growth:diamond_sprinkler",
    ["nDn", "blb", " l "],
    {
      l: "#society:raw_logs",
      D: "minecraft:diamond_block",
      b: "society:battery",
      n: "aquaculture:neptunium_nugget",
    }
  );
  e.shaped(
    "dew_drop_farmland_growth:netherite_sprinkler",
    ["nNn", " s ", " j "],
    {
      s: "dew_drop_farmland_growth:diamond_sprinkler",
      j: "society:jade",
      N: "minecraft:netherite_ingot",
      n: "aquaculture:neptunium_ingot",
    }
  );
  e.shaped(
    "dew_drop_farmland_growth:netherite_sprinkler",
    ["nNn", "jlj", " l "],
    {
      l: "#society:raw_logs",
      j: "society:jade",
      N: "minecraft:netherite_ingot",
      n: "aquaculture:neptunium_ingot",
    }
  );

  // Botania
  e.shaped("society:botanical_tribute", ["CCC", "CMC", "CCC"], {
    M: "botania:manasteel_ingot",
    C: "numismatics:sun",
  });

  e.shaped("unusualfishmod:fluvial_shell", [" r ", "nhn", " d "], {
    r: "botania:rune_summer",
    h: "botania:horn_grass",
    d: "minecraft:nautilus_shell",
    n: "aquaculture:neptunium_ingot",
  });

  e.shaped("unusualfishmod:clement_shell", [" r ", " h ", " g "], {
    r: "botania:rune_envy",
    h: "unusualfishmod:fluvial_shell",
    g: "vinery:glowing_wine",
  });

  e.shaped("unusualfishmod:thunderous_shell", [" r ", "chc", " c "], {
    r: "botania:rune_wrath",
    h: "unusualfishmod:fluvial_shell",
    c: "society:charging_rod",
  });


  // The 1.20.1 recipe used species:ichor_bottle (Species is not in the pack): a Bottle o' Enchanting instead.
  e.shaped("society:gnome", [" h ", "iti", " s "], {
    t: "society:tiny_gnome",
    i: "minecraft:experience_bottle",
    h: "simplehats:gnome",
    s: "paraglider:spirit_orb",
  });

  e.shaped("society:mana_milker", ["rtr", "nMn", "lTl"], {
    r: "botania:rune_earth",
    t: "society:botanical_tribute",
    n: "botania:terrasteel_nugget",
    M: "society:milk_pail",
    l: "botania:livingwood_log",
    T: "botania:mana_tablet",
  });
  e.shaped("society:mana_sprinkler", ["lil", "iSi", "lPl"], {
    i: "botania:manasteel_ingot",
    S: "dew_drop_farmland_growth:gold_sprinkler",
    l: "botania:livingwood_log",
    P: "botania:pump",
  });
  e.shaped("society:mana_clock", ["mrm", "ncn", "mTm"], {
    r: "botania:rune_sloth",
    T: "botania:terrasteel_ingot",
    m: "botania:manasteel_block",
    c: "minecraft:clock",
    n: "minecraft:netherite_ingot",
  });

  e.shaped("society:sparkstone_recycler", ["mrm", "ncn", "mTm"], {
    r: "botania:rune_greed",
    T: "botania:mana_pylon",
    m: "society:botanical_tribute",
    c: "botania:life_essence",
    n: "botania:dragonstone",
  });

  e.shaped("society:spark_gro", ["oso", "sps", "oso"], {
    o: "vintagedelight:organic_mash",
    s: "society:sparkstone_dust",
    p: "farm_and_charm:fertilizer",
  });

  e.shaped("4x society:spark_gro", ["oso", "sps", "oso"], {
    o: "vintagedelight:organic_mash",
    s: "society:sparkstone_dust",
    p: "society:moth_pollen",
  });
  // society:growth_obelisk is ported: kubejs/server_scripts/recipes/artisanMachineRecipes.js
  e.shaped("society:magic_bulb", ["dgf", "sbs", "SSS"], {
    d: "society:ribbit_drum",
    g: "society:ribbit_gadget",
    f: "society:froggy_helm",
    s: "society:sparkstone",
    S: "oreganized:silver_block",
    b: "etcetera:light_bulb",
  });
  [
    { input: "meadow:warped_wool", output: "minecraft:cyan_wool" },
  ].forEach((recipe) => {
    e.shapeless(recipe.output, [recipe.input]);
  });
  e.shapeless("society:sun_candy", ['pamhc2trees:lemonitem', 'atmospheric:blood_orange', 'pamhc2trees:mangoitem', 'atmospheric:passion_fruit', 'pamhc2trees:dragonfruititem', 'pamhc2trees:starfruititem', 'pamhc2trees:plumitem', 'pamhc2trees:peachitem'])
  // Sophisticated
  e.shapeless("sophisticatedbackpacks:stack_upgrade_tier_1", ["2x sophisticatedbackpacks:stack_upgrade_starter_tier"]);
  e.shapeless("sophisticatedbackpacks:stack_upgrade_tier_2", ["2x sophisticatedbackpacks:stack_upgrade_tier_1"]);
  e.shapeless("sophisticatedbackpacks:stack_upgrade_tier_3", ["2x sophisticatedbackpacks:stack_upgrade_tier_2"]);
  e.shapeless("sophisticatedbackpacks:stack_upgrade_tier_4", ["2x sophisticatedbackpacks:stack_upgrade_tier_3"]);


  e.shapeless("3x sophisticatedstorage:stack_upgrade_tier_2", ["4x sophisticatedstorage:stack_upgrade_tier_1_plus"]);
  e.shapeless("sophisticatedstorage:stack_upgrade_tier_2", ["2x sophisticatedstorage:stack_upgrade_tier_1"]);
  e.shapeless("sophisticatedstorage:stack_upgrade_tier_3", ["2x sophisticatedstorage:stack_upgrade_tier_2"]);
  e.shapeless("sophisticatedstorage:stack_upgrade_tier_4", ["2x sophisticatedstorage:stack_upgrade_tier_3"]);
  e.shapeless("sophisticatedstorage:stack_upgrade_tier_5", ["2x sophisticatedstorage:stack_upgrade_tier_4"]);
  e.shapeless("sophisticatedstorage:stack_upgrade_omega_tier", ["4x sophisticatedstorage:stack_upgrade_tier_5"]);

  e.shapeless("sophisticatedstorage:basic_to_netherite_tier_upgrade", ["sophisticatedstorage:basic_to_copper_tier_upgrade", "sophisticatedstorage:copper_to_iron_tier_upgrade", "sophisticatedstorage:iron_to_gold_tier_upgrade", "sophisticatedstorage:gold_to_diamond_tier_upgrade", "sophisticatedstorage:diamond_to_netherite_tier_upgrade"])
  e.shapeless("sophisticatedstorage:basic_to_diamond_tier_upgrade", ["sophisticatedstorage:basic_to_copper_tier_upgrade", "sophisticatedstorage:copper_to_iron_tier_upgrade", "sophisticatedstorage:iron_to_gold_tier_upgrade", "sophisticatedstorage:gold_to_diamond_tier_upgrade"])
  e.shapeless("sophisticatedstorage:basic_to_gold_tier_upgrade", ["sophisticatedstorage:basic_to_copper_tier_upgrade", "sophisticatedstorage:copper_to_iron_tier_upgrade", "sophisticatedstorage:iron_to_gold_tier_upgrade"])
  e.shapeless("sophisticatedstorage:basic_to_iron_tier_upgrade", ["sophisticatedstorage:basic_to_copper_tier_upgrade", "sophisticatedstorage:copper_to_iron_tier_upgrade"])
  e.shapeless("sophisticatedstorage:basic_to_copper_tier_upgrade", ["sophisticatedstorage:basic_to_copper_tier_upgrade"])

  e.shapeless("dew_drop_farmland_growth:hyper_fertilized_sand", ["minecraft:sand", "dew_drop_farmland_growth:hyper_fertilizer"])
  e.shapeless("dew_drop_farmland_growth:weak_fertilized_farmland", ["minecraft:dirt", "dew_drop_farmland_growth:weak_fertilizer"])
  e.shapeless("dew_drop_farmland_growth:strong_fertilized_farmland", ["minecraft:dirt", "dew_drop_farmland_growth:strong_fertilizer"])
  e.shapeless("dew_drop_farmland_growth:hyper_fertilized_farmland", ["minecraft:dirt", "dew_drop_farmland_growth:hyper_fertilizer"])
  e.shapeless("dew_drop_farmland_growth:bountiful_fertilized_farmland", ["minecraft:dirt", "dew_drop_farmland_growth:bountiful_fertilizer"])
  e.shapeless("dew_drop_farmland_growth:hydrating_farmland", ["minecraft:dirt", "dew_drop_farmland_growth:hydrating_fertilizer"])
  e.shapeless("dew_drop_farmland_growth:deluxe_hydrating_farmland", ["minecraft:dirt", "dew_drop_farmland_growth:deluxe_hydrating_fertilizer"])
  e.shapeless("dew_drop_farmland_growth:low_quality_fertilized_farmland", ["minecraft:dirt", "dew_drop_farmland_growth:low_quality_fertilizer"])
  e.shapeless("dew_drop_farmland_growth:high_quality_fertilized_farmland", ["minecraft:dirt", "dew_drop_farmland_growth:high_quality_fertilizer"])
  e.shapeless("dew_drop_farmland_growth:pristine_quality_fertilized_farmland", ["minecraft:dirt", "dew_drop_farmland_growth:pristine_quality_fertilizer"])

  e.custom({
    type: "create:filling",
    ingredients: [
      { item: "vintagedelight:roasted_peanut" },
      { type: "fluid_stack", fluid: "create:honey", amount: 125 },
    ],
    results: [{ id: "vintagedelight:honey_roasted_peanut", count: 1 }],
  });
});
