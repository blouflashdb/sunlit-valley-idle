// Crafting recipes of the artisan machines ported in #11. A recipe whose items are not in the pack is skipped
// and logged, so a missing mod does not stop the script.
console.info("[SOCIETY] artisanMachineRecipes.js loaded");

const $ArtisanRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $ArtisanResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");

const artisanMissing = (ids) =>
  ids.filter((id) => !id.startsWith("#") && !$ArtisanRegistries.ITEM.containsKey($ArtisanResourceLocation.parse(id.replace(/^\d+x /, ""))));

ServerEvents.recipes((e) => {
  let skipped = [];
  let shaped = (output, pattern, key) => {
    let missing = artisanMissing([output].concat(Object.values(key)));
    if (missing.length > 0) return skipped.push(`${output} (missing ${missing.join(", ")})`);
    e.shaped(output, pattern, key);
  };
  let shapeless = (output, inputs) => {
    let missing = artisanMissing([output].concat(inputs));
    if (missing.length > 0) return skipped.push(`${output} (missing ${missing.join(", ")})`);
    e.shapeless(output, inputs);
  };

  shaped("society:wine_keg", ["FoF", "IbI", "FfF"], {
    b: "minecraft:barrel",
    I: "minecraft:iron_block",
    f: "minecraft:quartz_block",
    o: "society:oak_resin",
    F: "meadow:firewood",
  });
  shaped("society:aging_cask", [" j ", "pbp", "SpS"], {
    b: "society:wine_keg",
    S: "oreganized:lead_block",
    j: "society:jade",
    p: "society:pine_tar",
  });
  shaped("society:ancient_cask", [" p ", "vav", " p "], {
    a: "society:aging_cask",
    p: "society:prismatic_shard",
    v: "society:aged_ancient_vespertine",
  });
  shaped("society:bait_maker", [" S ", "asa", "lll"], {
    s: "society:seed_maker",
    a: "aquaculture:neptunium_ingot",
    S: "society:sunlit_pearl",
    l: "create:zinc_ingot",
  });
  shaped("society:cheese_press", [" p ", "fef", "fff"], {
    f: "meadow:firewood",
    e: "society:earth_crystal",
    p: "society:pine_tar",
  });
  shaped("society:dehydrator", ["LGL", "pbp", "LfL"], {
    b: "minecraft:barrel",
    L: "meadow:firewood",
    G: "society:raisins",
    f: "society:battery",
    p: "society:pine_tar",
  });
  shaped("society:fish_smoker", ["lCl", "asa", "lNl"], {
    s: "minecraft:smoker",
    N: "aquaculture:neptunium_ingot",
    a: "society:aquamarine",
    C: "society:sunlit_pearl",
    l: "meadow:firewood",
  });
  shaped("society:loom", ["l  ", "l  ", "ltl"], {
    l: "meadow:firewood",
    t: "society:treated_log",
  });
  shaped("society:mayonnaise_machine", [" p ", "fcf", "CeC"], {
    c: "minecraft:composter",
    C: "minecraft:copper_block",
    e: "society:earth_crystal",
    p: "society:pine_tar",
    f: "meadow:firewood",
  });
  shaped("society:oil_maker", ["ccj", "ccs", "fgf"], {
    c: "minecraft:copper_block",
    g: "minecraft:gold_block",
    j: "society:jade",
    s: "supplementaries:jar",
    f: "meadow:firewood",
  });
  shaped("society:recycling_machine", ["LIL", "fbf", "LIL"], {
    b: "minecraft:barrel",
    L: "meadow:firewood",
    f: "society:fire_quartz",
    I: "minecraft:iron_block",
  });
  shaped("society:seed_maker", [" f ", "pcp", "FgF"], {
    g: "minecraft:gold_block",
    c: "minecraft:composter",
    f: "society:earth_crystal",
    p: "society:pine_tar",
    F: "meadow:firewood",
  });

  shaped("society:tapper", [" C ", "lwl", " e "], {
    w: "meadow:wooden_bucket",
    l: "meadow:firewood",
    e: "society:earth_crystal",
    C: "minecraft:copper_block",
  });
  shaped("society:mushroom_log", ["LLL", "LML", "mPm"], {
    L: "meadow:firewood",
    P: "society:mossberry_preserves",
    m: "society:mossberry",
    M: "farmersdelight:rich_soil",
  });
  shaped("society:espresso_machine", ["iii", "ltl", "bib"], {
    t: "herbalbrews:tea_kettle",
    l: "minecraft:lime_dye",
    b: "society:battery",
    i: "create:zinc_ingot",
  });
  shaped("society:deluxe_worm_farm", ["zNz", "pwp", "zaz"], {
    w: "aquaculture:worm_farm",
    N: "aquaculture:neptunium_ingot",
    a: "society:aquamarine",
    p: "crabbersdelight:pearl_block",
    z: "create:zinc_block",
  });
  shaped("society:charging_rod", [" f ", "zlz", "ZbZ"], {
    Z: "create:zinc_block",
    z: "etcetera:bismuth_ingot",
    l: "minecraft:lightning_rod",
    f: "society:fire_quartz",
    b: "quark:blaze_lantern",
  });

  shaped("society:prize_machine", ["ttt", "tbt", "ttt"], {
    b: "bountiful:bountyboard",
    t: "society:prize_ticket",
  });
  shapeless("society:ancient_goddess_statue", ["paraglider:goddess_statue", "society:prismatic_shard"]);

  shaped("society:artisan_hopper", ["zaz", "bhb", "nsn"], {
    a: "numismatics:ancient_coin",
    n: "minecraft:netherite_ingot",
    h: "minecraft:hopper",
    b: "society:battery",
    s: "society:sparkstone",
    z: "create:zinc_ingot",
  });
  shapeless("society:artisan_hopper", ["4x society:mini_artisan_hopper"]);
  shapeless("4x society:mini_artisan_hopper", ["society:artisan_hopper"]);
  shaped("society:mini_artisan_hopper", ["zsz", "nhn", "aba"], {
    a: "numismatics:neptunium_coin",
    n: "minecraft:netherite_scrap",
    h: "minecraft:hopper",
    b: "society:battery",
    s: "society:sparkstone",
    z: "create:zinc_ingot",
  });

  shaped("society:quality_washer", [" S ", "zcz", "fzf"], {
    c: "minecraft:cauldron",
    S: "dew_drop_farmland_growth:high_quality_fertilizer",
    f: "society:fire_quartz",
    z: "create:zinc_ingot",
  });
  shaped("society:auto_tapper", [" F ", "bTb", "fPf"], {
    f: "create_factory_logistics:fluid_mechanism",
    F: "create:fluid_tank",
    T: "society:tapper",
    b: "society:battery",
    P: "create:precision_mechanism",
  });
  shaped("society:juice_inserter", ["fff", "rFb", "fff"], {
    f: "meadow:firewood",
    F: "create:fluid_tank",
    b: "minecraft:bamboo_block",
    r: "society:rubber",
  });
  shaped("society:auto_worm_farm", ["lpl", "asa", "CSC"], {
    s: "farmersdelight:rich_soil",
    S: "society:sunlit_pearl",
    p: "create:precision_mechanism",
    a: "aquaculture:worm_farm",
    C: "society:battery",
    l: "minecraft:iron_ingot",
  });
  shaped("society:growth_obelisk", ["sis", "sjs", "sbs"], {
    s: "minecraft:stone_bricks",
    i: "minecraft:netherite_ingot",
    j: "society:jade",
    b: "society:magic_bulb",
  });

  // Husbandry automation (#12). The Auto-Petter and Feeding Trough are bought in the shepherd shop.
  shaped("society:auto_grabber", ["lal", "bfb", "nsn"], {
    f: "society:animal_feed",
    a: "numismatics:ancient_coin",
    n: "minecraft:netherite_ingot",
    b: "society:battery",
    s: "society:sparkstone",
    l: "meadow:firewood",
  });
  shaped("society:cornucopia", [" p ", "php", " p "], {
    p: "botania:pixie_dust",
    h: "botania:horn_grass",
  });
  shaped("society:cornucopia", [" c ", "shs", " s "], {
    c: "numismatics:neptunium_coin",
    s: "society:sparkstone_block",
    h: "minecraft:goat_horn",
  });
  shaped("society:drum_cornucopia", ["LLL", "lcl", "lbl"], {
    L: "minecraft:leather",
    c: "society:cornucopia",
    b: "society:magic_bulb",
    l: "meadow:firewood",
  });

  // Fish ponds (#12)
  shaped("society:fish_pond", [" j ", "PwP", "rNr"], {
    j: "society:river_jelly",
    N: "aquaculture:neptunium_ingot",
    P: "crabbersdelight:pearl",
    r: "society:oak_resin",
    w: "meadow:wooden_bucket",
  });
  shaped("society:fish_pond_basket", ["NaN", "bhb", "nsn"], {
    a: "farmersdelight:safety_net",
    n: "minecraft:netherite_ingot",
    h: "minecraft:hopper",
    b: "society:battery",
    s: "society:sparkstone",
    N: "aquaculture:neptunium_ingot",
  });
  shaped("society:fish_pond_hatchery", ["NSN", "sbs", "sss"], {
    S: "society:sunlit_pearl",
    b: "society:fish_pond_basket",
    s: "oreganized:silver_ingot",
    N: "aquaculture:algae",
  });
  shaped("society:fish_pond_manager", ["NCN", "ScS", "NbN"], {
    c: "cozycafe:cafe_manager",
    C: "minecraft:conduit",
    b: "society:magic_bulb",
    S: "society:sunlit_pearl",
    N: "aquaculture:neptunium_ingot",
  });

  // Longwings (#12)
  shaped("society:caterpillar_box", ["isi", "abm", "iBi"], {
    s: "#minecraft:saplings",
    i: "minecraft:iron_block",
    b: "minecraft:barrel",
    B: "society:battery",
    a: "society:butterfly_amber",
    m: "society:moth_pollen",
  });

  // Slime Ranching (#13): the Splendid Slimes Plort Rippit and Plort Press recipes.
  shaped("society:plort_ripper", ["iei", "sps", "III"], {
    I: "minecraft:iron_block",
    p: "splendid_slimes:plort_slimy",
    s: "minecraft:slime_ball",
    e: "society:battery",
    i: "minecraft:iron_ingot",
  });
  shaped("society:plort_press", ["ipi", "apa", "ILI"], {
    I: "minecraft:iron_block",
    L: "society:battery",
    p: "minecraft:piston",
    a: "minecraft:netherite_ingot",
    i: "minecraft:iron_ingot",
  });

  // Mana machines (#14)
  shaped("society:mana_milker", ["rtr", "nMn", "lTl"], {
    r: "botania:rune_earth",
    t: "society:botanical_tribute",
    n: "botania:terrasteel_nugget",
    M: "society:milk_pail",
    l: "botania:livingwood_log",
    T: "botania:mana_tablet",
  });
  shaped("society:mana_sprinkler", ["lil", "iSi", "lPl"], {
    i: "botania:manasteel_ingot",
    S: "dew_drop_farmland_growth:gold_sprinkler",
    l: "botania:livingwood_log",
    P: "botania:pump",
  });
  shaped("society:mana_clock", ["mrm", "ncn", "mTm"], {
    r: "botania:rune_sloth",
    T: "botania:terrasteel_ingot",
    m: "botania:manasteel_block",
    c: "minecraft:clock",
    n: "minecraft:netherite_ingot",
  });
  shaped("society:sparkstone_recycler", ["mrm", "ncn", "mTm"], {
    r: "botania:rune_greed",
    T: "botania:mana_pylon",
    m: "society:botanical_tribute",
    c: "botania:life_essence",
    n: "botania:dragonstone",
  });

  if (skipped.length > 0) console.info(`[SOCIETY] Artisan machine recipes skipped: ${skipped.join("; ")}`);
});
