// Plain blocks of the pack.
console.info("[SOCIETY] registerBlocks.js loaded");

StartupEvents.registry("block", (e) => {
  // Treated Log: a log soaked in oak resin (Create filling), used for the Loom. Textures: society:block/treated_log
  // and society:block/treated_log_top (placeholders in kubejs/assets/minecraft/atlases/blocks.json).
  e.create("society:treated_log", "pillar")
    .soundType("wood")
    .hardness(1.0)
    .resistance(1.0)
    .tagBlock("minecraft:mineable/axe");
});

// Storage blocks and decor. Textures named society:block/... are placeholders in
// kubejs/assets/minecraft/atlases/blocks.json; the others come from the mods.
const blockAllSides = (builder, texture) => {
  ["up", "down", "north", "east", "south", "west", "particle"].forEach((side) => builder.texture(side, texture));
  return builder;
};

const blockSides = (builder, top, bottom, side) => {
  builder.texture("up", top).texture("down", bottom).texture("particle", side);
  ["north", "east", "south", "west"].forEach((face) => builder.texture(face, side));
  return builder;
};

StartupEvents.registry("block", (e) => {
  ["sparkstone_block", "prismatic_shard_block"].forEach((name) => {
    blockAllSides(e.create(`society:${name}`), `society:block/${name}`)
      .soundType("amethyst")
      .hardness(2)
      .resistance(1.0)
      .tagBlock("minecraft:mineable/pickaxe");
  });

  // Placeholder model: tools/port/assets/make_machine_placeholder.py --single.
  e.create("society:animal_feed_sack", "cardinal")
    .parentModel("society:block/kubejs/animal_feed_sack/animal_feed_sack")
    .item((item) => item.parentModel("society:block/kubejs/animal_feed_sack/animal_feed_sack"))
    .mapColor("dirt")
    .soundType("sand")
    .hardness(1.0)
    .resistance(1.0)
    .requiresTool(false);

  blockSides(
    e.create("herbalbrews:coffee_beans_sack"),
    "quark:block/cocoa_beans_sack_top",
    "quark:block/cocoa_beans_sack_bottom",
    "quark:block/cocoa_beans_sack"
  )
    .mapColor("dirt")
    .soundType("sand")
    .hardness(1.0)
    .resistance(1.0)
    .requiresTool(false);

  [
    ["herbalbrews:yerba_mate_leaf_block", "herbalbrews:block/green_tea_leaf2"],
    ["herbalbrews:rooibos_leaf_block", "herbalbrews:block/green_tea_leaf2"],
    ["society:tubabacco_leaf_block", "herbalbrews:block/green_tea_leaf1"],
  ].forEach(([id, texture]) => {
    blockAllSides(e.create(id), texture)
      .mapColor("grass")
      .soundType("azalea_leaves")
      .hardness(1.0)
      .resistance(1.0)
      .requiresTool(false);
  });

  [
    "blueberry",
    "eggplant",
    "ancient_fruit",
    "sparkpod",
    "salmonberry",
    "boysenberry",
    "cranberry",
    "crystalberry",
    "mana_fruit",
  ].forEach((type) => {
    blockSides(
      e.create(`society:${type}_crate`),
      `society:block/${type}_crate_top`,
      "farmersdelight:block/crate_bottom",
      `society:block/${type}_crate_side`
    )
      .mapColor("grass")
      .soundType("wood")
      .hardness(1.0)
      .resistance(1.0)
      .requiresTool(false);
  });

  // A pillar block takes society:block/sturdy_bamboo_block and society:block/sturdy_bamboo_block_top.
  e.create("society:sturdy_bamboo_block", "pillar")
    .displayName("Sturdy Block of Bamboo")
    .soundType("wood")
    .hardness(1.0)
    .resistance(1.0)
    .requiresTool(true)
    .tagBoth("minecraft:logs")
    .tagBlock("minecraft:mineable/axe");

  // The greenhouse glass stairs and slab (moreminecarts:*) are dropped with More Minecarts (#5).
});
