// Recipes of the drinks, Prismatic weapons and Snow Melter ported in #18 (from kubejs/_unported addCupRecipes.js,
// addToolRecipes.js and addMiscRecipes.js). A recipe whose items are not in the pack is skipped and logged;
// artisanMissing is defined in artisanMachineRecipes.js.
console.info("[SOCIETY] societyItemRecipes.js loaded");

ServerEvents.recipes((e) => {
  let skipped = [];
  let shapeless = (output, inputs) => {
    let missing = artisanMissing([output].concat(inputs));
    if (missing.length > 0) return skipped.push(`${output} (missing ${missing.join(", ")})`);
    e.shapeless(output, inputs);
  };
  let smithing = (output, template, base, addition) => {
    let missing = artisanMissing([output, template, base, addition]);
    if (missing.length > 0) return skipped.push(`${output} (missing ${missing.join(", ")})`);
    e.smithing(output, template, base, addition);
  };

  // Coffee and tea drinks
  shapeless("8x herbalbrews:water_cup", ["minecraft:water_bucket"]);
  shapeless("herbalbrews:milk_coffee", ["herbalbrews:coffee", "#society:small_milk"]);
  shapeless("society:chai_blend", ["herbalbrews:dried_black_tea", "minecraft:sugar", "society:ground_cinnamon"]);
  shapeless("society:latte", ["society:espresso", "society:espresso", "society:steamed_milk"]);
  shapeless("society:mocha", ["society:espresso", "bakery:chocolate_jam", "society:steamed_milk", "minecraft:sugar"]);
  shapeless("society:dirty_chai", ["society:espresso", "herbalbrews:chai_tea", "society:steamed_milk"]);
  shapeless("society:bowl_of_soul", ["herbalbrews:rooibos_tea", "society:ground_cinnamon", "society:steamed_milk"]);
  shapeless("society:truffle_tea", [
    "herbalbrews:yerba_mate_tea",
    "society:truffle",
    "society:dried_tubabacco_leaf",
    "society:steamed_milk",
  ]);

  // Prismatic weapons
  smithing("society:galaxy_sword", "minecraft:netherite_upgrade_smithing_template", "minecraft:netherite_sword", "society:prismatic_shard");
  smithing("society:meowmageddon", "simplehats:nekoears", "society:galaxy_sword", "society:prismatic_shard");
  smithing("society:dragontooth_axe", "minecraft:netherite_upgrade_smithing_template", "minecraft:diamond_axe", "minecraft:bone_block");

  let snowMelter = { b: "minecraft:blast_furnace", B: "society:battery", f: "society:fire_quartz" };
  let missing = artisanMissing(["society:snow_melter"].concat(Object.values(snowMelter)));
  if (missing.length > 0) skipped.push(`society:snow_melter (missing ${missing.join(", ")})`);
  else e.shaped("society:snow_melter", [" f ", "fbf", " B "], snowMelter);

  if (skipped.length > 0) console.info(`[SOCIETY] Society item recipes skipped: ${skipped.join("; ")}`);
});
