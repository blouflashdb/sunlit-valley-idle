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

  shaped("society:wine_keg", ["FoF", "IbI", "FfF"], {
    b: "minecraft:barrel",
    I: "minecraft:iron_block",
    f: "minecraft:quartz_block",
    o: "society:oak_resin",
    F: "meadow:fire_log",
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
    f: "meadow:fire_log",
    e: "society:earth_crystal",
    p: "society:pine_tar",
  });
  shaped("society:dehydrator", ["LGL", "pbp", "LfL"], {
    b: "minecraft:barrel",
    L: "meadow:fire_log",
    G: "society:raisins",
    f: "society:battery",
    p: "society:pine_tar",
  });
  shaped("society:fish_smoker", ["lCl", "asa", "lNl"], {
    s: "minecraft:smoker",
    N: "aquaculture:neptunium_ingot",
    a: "society:aquamarine",
    C: "society:sunlit_pearl",
    l: "meadow:fire_log",
  });
  shaped("society:loom", ["l  ", "l  ", "ltl"], {
    l: "meadow:fire_log",
    t: "society:treated_log",
  });
  shaped("society:mayonnaise_machine", [" p ", "fcf", "CeC"], {
    c: "minecraft:composter",
    C: "minecraft:copper_block",
    e: "society:earth_crystal",
    p: "society:pine_tar",
    f: "meadow:fire_log",
  });
  shaped("society:oil_maker", ["ccj", "ccs", "fgf"], {
    c: "minecraft:copper_block",
    g: "minecraft:gold_block",
    j: "society:jade",
    s: "supplementaries:jar",
    f: "meadow:fire_log",
  });
  shaped("society:recycling_machine", ["LIL", "fbf", "LIL"], {
    b: "minecraft:barrel",
    L: "meadow:fire_log",
    f: "society:fire_quartz",
    I: "minecraft:iron_block",
  });
  shaped("society:seed_maker", [" f ", "pcp", "FgF"], {
    g: "minecraft:gold_block",
    c: "minecraft:composter",
    f: "society:earth_crystal",
    p: "society:pine_tar",
    F: "meadow:fire_log",
  });

  shaped("society:tapper", [" C ", "lwl", " e "], {
    w: "meadow:wooden_bucket",
    l: "meadow:fire_log",
    e: "society:earth_crystal",
    C: "minecraft:copper_block",
  });
  shaped("society:mushroom_log", ["LLL", "LML", "mPm"], {
    L: "meadow:fire_log",
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

  if (skipped.length > 0) console.info(`[SOCIETY] Artisan machine recipes skipped: ${skipped.join("; ")}`);
});
