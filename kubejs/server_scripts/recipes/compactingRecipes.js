// Storage block, coin and large milk recipes both ways, ported from addCompactingRecipes.js (1.20.1).
// The compacting drawers use these crafting recipes to find their compacted forms.
console.info("[SOCIETY] compactingRecipes.js loaded");

ServerEvents.recipes((e) => {
  let compact = (block, item, count) => {
    let name = processingPath(block);
    addProcessingRecipe(e, "compacting_unpack", name, [block, item], [], () => e.shapeless(`${count}x ${item}`, [block]));
    addProcessingRecipe(e, "compacting_pack", name, [block, item], [], () => e.shapeless(block, [`${count}x ${item}`]));
  };
  compact("numismatics:bevel", "numismatics:spur", 8);
  compact("numismatics:sprocket", "numismatics:bevel", 2);
  compact("numismatics:cog", "numismatics:sprocket", 4);
  compact("numismatics:crown", "numismatics:cog", 8);
  compact("numismatics:sun", "numismatics:crown", 8);
  compact("numismatics:neptunium_coin", "numismatics:sun", 8);
  compact("numismatics:ancient_coin", "numismatics:neptunium_coin", 8);
  compact("numismatics:prismatic_coin", "numismatics:ancient_coin", 64);
  compact("society:sparkstone_block", "society:sparkstone", 9);
  compact("society:animal_feed_sack", "society:animal_feed", 9);
  compact("herbalbrews:coffee_beans_sack", "herbalbrews:coffee_beans", 9);
  compact("herbalbrews:rooibos_leaf_block", "herbalbrews:rooibos_leaf", 9);
  compact("herbalbrews:yerba_mate_leaf_block", "herbalbrews:yerba_mate_leaf", 9);
  compact("society:ancient_fruit_crate", "society:ancient_fruit", 9);
  compact("society:blueberry_crate", "society:blueberry", 9);
  compact("society:eggplant_crate", "society:eggplant", 9);
  compact("society:tubabacco_leaf_block", "society:tubabacco_leaf", 9);
  compact("society:tubasmoke_carton", "society:tubasmoke_stick", 9);
  compact("society:mana_fruit_crate", "society:mana_fruit", 9);
  compact("society:sparkpod_crate", "society:sparkpod", 9);
  compact("society:prismatic_shard_block", "society:prismatic_shard", 9);
  compact("society:sturdy_bamboo_block", "minecraft:bamboo_block", 9);
  compact("etcetera:bismuth_ingot", "etcetera:bismuth_nugget", 9);
  compact("society:salmonberry_crate", "society:salmonberry", 9);
  compact("society:boysenberry_crate", "society:boysenberry", 9);
  compact("society:cranberry_crate", "society:cranberry", 9);
  compact("society:crystalberry_crate", "society:crystalberry", 9);
  ["milk", "goat_milk", "buffalo_milk", "sheep_milk", "warped_milk", "grain_milk", "amethyst_milk", "tri_bull_milk"].forEach((milk) =>
    compact(`society:large_${milk}`, `society:${milk}`, 4)
  );
  ["warped", "crimson"].forEach((grape) => {
    let crate = `nethervinery:${grape}_grape_crate`;
    let item = `nethervinery:${grape}_grape`;
    addProcessingRecipe(e, "compacting_unpack", processingPath(crate), [crate, item], [], () => e.shapeless(`9x ${item}`, [crate]));
  });
});
