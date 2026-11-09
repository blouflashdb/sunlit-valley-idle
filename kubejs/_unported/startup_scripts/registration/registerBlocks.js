StartupEvents.registry("block", (e) => {
  // society:treated_log is ported: kubejs/startup_scripts/registration/registerBlocks.js
  // Ores, geode nodes, crystals and the Skull Cavern blocks are ported: kubejs/startup_scripts/skullCavern/skullCavern.js
  e.create(`society:sparkstone_block`)
    .soundType("amethyst")
    .hardness(2)
    .resistance(1.0)
    .tagBlock("minecraft:mineable/pickaxe")
    .textureAll("society:block/sparkstone_block");

  e.create(`society:prismatic_shard_block`)
    .soundType("amethyst")
    .hardness(2)
    .resistance(1.0)
    .tagBlock("minecraft:mineable/pickaxe")
    .textureAll("society:block/prismatic_shard_block");
    
  // Compressed Crops block
  e.create("society:animal_feed_sack", "cardinal")
    .model("society:block/kubejs/animal_feed_sack")
    .mapColor("dirt")
    .soundType("sand")
    .hardness(1.0)
    .resistance(1.0)
    .requiresTool(false);

  e.create("herbalbrews:coffee_beans_sack")
    .texture("up", "quark:block/cocoa_beans_sack_top")
    .texture("down", "quark:block/cocoa_beans_sack_bottom")
    .texture("north", "quark:block/cocoa_beans_sack")
    .texture("east", "quark:block/cocoa_beans_sack")
    .texture("south", "quark:block/cocoa_beans_sack")
    .texture("west", "quark:block/cocoa_beans_sack")
    .mapColor("dirt")
    .soundType("sand")
    .hardness(1.0)
    .resistance(1.0)
    .requiresTool(false)
    .texture("particle", "quark:block/cocoa_beans_sack");

  e.create("herbalbrews:yerba_mate_leaf_block")
    .textureAll("herbalbrews:block/green_tea_leaf2")
    .mapColor("grass")
    .soundType("azalea_leaves")
    .hardness(1.0)
    .resistance(1.0)
    .requiresTool(false)
    .texture("particle", "herbalbrews:block/green_tea_leaf2");

  e.create("herbalbrews:rooibos_leaf_block")
    .textureAll("herbalbrews:block/green_tea_leaf2")
    .mapColor("grass")
    .soundType("azalea_leaves")
    .hardness(1.0)
    .resistance(1.0)
    .requiresTool(false)
    .texture("particle", "herbalbrews:block/green_tea_leaf2");

  const createCrate = (type) => {
    e.create(`society:${type}_crate`)
      .texture("up", `society:block/${type}_crate_top`)
      .texture("down", "farmersdelight:block/crate_bottom")
      .texture("north", `society:block/${type}_crate_side`)
      .texture("east", `society:block/${type}_crate_side`)
      .texture("south", `society:block/${type}_crate_side`)
      .texture("west", `society:block/${type}_crate_side`)
      .texture("particle", `society:block/${type}_crate_top`)
      .mapColor("grass")
      .soundType("wood")
      .hardness(1.0)
      .resistance(1.0)
      .requiresTool(false);
  };

  const crates = [
    "blueberry",
    "eggplant",
    "ancient_fruit",
    "sparkpod",
    "salmonberry",
    "boysenberry",
    "cranberry",
    "crystalberry",
    "mana_fruit",
  ];
  crates.forEach((crate) => {
    createCrate(crate);
  });

  e.create("society:tubabacco_leaf_block")
    .textureAll("herbalbrews:block/green_tea_leaf1")
    .mapColor("grass")
    .soundType("azalea_leaves")
    .hardness(1.0)
    .resistance(1.0)
    .requiresTool(false)
    .texture("particle", "herbalbrews:block/green_tea_leaf1");

  // Decor
  e
    .create("society:sturdy_bamboo_block")
    .tag("minecraft:logs")
    .property(BlockProperties.AXIS)
    .placementState((e) => e.set(BlockProperties.AXIS, e.clickedFace.axis))
    .displayName("Sturdy Block of Bamboo")
    .soundType("wood")
    .hardness(1.0)
    .resistance(1.0)
    .item((item) => {
      item.modelJson({
        parent: "society:block/kubejs/sturdy_bamboo_block",
      });
    })
    .requiresTool(true)
    .tagBlock("minecraft:mineable/axe").blockstateJson = {
    variants: {
      "axis=x": {
        model: "society:block/kubejs/sturdy_bamboo_block_horizontal",
        x: 90,
        y: 90,
      },
      "axis=y": {
        model: "society:block/kubejs/sturdy_bamboo_block",
      },
      "axis=z": {
        model: "society:block/kubejs/sturdy_bamboo_block_horizontal",
        x: 90,
      },
    },
  };
  // The drinks and society:supreme_mayonnaise are ported as items: kubejs/startup_scripts/registration/registerDrinks.js
  // society:fantasy_catalog is dropped (Fantasy's Furniture has no 1.21.1 build, #15).

  e.create("moreminecarts:greenhouse_glass_stairs", "stairs")
    .soundType("glass")
    .resistance(0.8)
    .renderType("translucent")
    .textureAll("moreminecarts:block/chiseled_organic_glass");

  e.create("moreminecarts:greenhouse_glass_slab", "slab")
    .soundType("glass")
    .resistance(0.8)
    .renderType("translucent")
    .textureAll("moreminecarts:block/chiseled_organic_glass");
});
