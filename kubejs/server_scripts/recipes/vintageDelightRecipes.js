// Recipes for the Vintage Delight content rebuilt in KubeJS (startup_scripts/registration/registerVintageDelight.js).
// Vintage Delight shipped most of these itself; the mason jars come from the Preserves Jar and the pickles from
// the Fermenting Jar (both ported with the machines). A recipe whose items are missing is skipped, not an error.
console.info("[SOCIETY] vintageDelightRecipes.js loaded");

const $VDRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $VDResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");

const vdHasItem = (id) => $VDRegistries.ITEM.containsKey($VDResourceLocation.parse(id));

// Ingredient strings: "minecraft:egg" or "#c:foods/berry".
const vdIngredient = (s) => (s.startsWith("#") ? { tag: s.substring(1) } : { item: s });

const vdAllExist = (ids) => ids.every((s) => s.startsWith("#") || vdHasItem(s.replace(/^\d+x /, "")));

ServerEvents.recipes((e) => {
  const VD = "vintagedelight";
  const skipped = [];

  const shapeless = (output, inputs) => {
    if (!vdAllExist([output].concat(inputs))) return skipped.push(output);
    e.shapeless(output, inputs);
  };
  const shaped = (output, pattern, key) => {
    if (!vdAllExist([output].concat(Object.values(key)))) return skipped.push(output);
    e.shaped(output, pattern, key);
  };
  const cooking = (output, inputs, container, time) => {
    if (!vdAllExist([output, container].concat(inputs))) return skipped.push(output);
    e.custom({
      type: "farmersdelight:cooking",
      container: { count: 1, id: container },
      cookingtime: time || 200,
      experience: 1.0,
      ingredients: inputs.map(vdIngredient),
      recipe_book_tab: "meals",
      result: { count: 1, id: output },
    });
  };
  const cutting = (input, output, count) => {
    if (!vdAllExist([input, output])) return skipped.push(output);
    e.custom({
      type: "farmersdelight:cutting",
      ingredients: [{ item: input }],
      result: [{ item: { count: count, id: output } }],
      tool: { tag: "c:tools/knife" },
    });
  };
  const roast = (input, output) => {
    if (!vdAllExist([input, output])) return skipped.push(output);
    e.smelting(output, input).xp(0.35);
    e.smoking(output, input).xp(0.35);
    e.campfireCooking(output, input).xp(0.35);
  };

  // Storage blocks
  [
    ["cucumber_crate", "cucumber"],
    ["ghost_pepper_crate", "ghost_pepper"],
    ["peanut_crate", "peanut"],
    ["gearo_berry_bag", "gearo_berry"],
  ].forEach((pair) => {
    let block = pair[0];
    let item = pair[1];
    shaped(`${VD}:${block}`, ["###", "###", "###"], { "#": `${VD}:${item}` });
    shapeless(`9x ${VD}:${item}`, [`${VD}:${block}`]);
  });

  // Salt
  shaped(`${VD}:salt_block`, ["##", "##"], { "#": `${VD}:salt` });
  shapeless(`4x ${VD}:salt`, [`${VD}:salt_block`]);
  if (vdAllExist([`${VD}:salt_block`, `${VD}:smooth_salt_block`])) e.smelting(`${VD}:smooth_salt_block`, `${VD}:salt_block`);
  shaped(`4x ${VD}:salt_bricks`, ["##", "##"], { "#": `${VD}:smooth_salt_block` });
  shaped(`4x ${VD}:mixed_salt_bricks`, ["#s", "s#"], { "#": `${VD}:salt_bricks`, s: "minecraft:stone_bricks" });
  shaped(`${VD}:salt_lamp_default`, ["#", "t"], { "#": `${VD}:salt_block`, t: "minecraft:torch" });
  shapeless(`${VD}:salt_lamp`, [`${VD}:salt_lamp_default`]);
  [
    ["blue", "minecraft:blue_dye"],
    ["gray", "minecraft:gray_dye"],
    ["green", "minecraft:green_dye"],
    ["light_blue", "minecraft:light_blue_dye"],
    ["pink", "minecraft:pink_dye"],
    ["purple", "minecraft:purple_dye"],
  ].forEach((pair) => {
    let color = pair[0];
    let dye = pair[1];
    shapeless(`${VD}:salt_lamp_${color}`, [`${VD}:salt_lamp_default`, dye]);
  });

  // Magic vine
  if (vdAllExist([`${VD}:magic_vine`, `${VD}:stripped_magic_vine`])) {
    e.custom({
      type: "farmersdelight:cutting",
      ingredients: [{ item: `${VD}:magic_vine` }],
      result: [{ item: { count: 1, id: `${VD}:stripped_magic_vine` } }],
      tool: { tag: "c:tools/axe" },
    });
  }

  // Snacks
  roast(`${VD}:peanut`, `${VD}:roasted_peanut`);
  roast(`${VD}:magic_vine`, `${VD}:ghost_charcoal`);
  shapeless(`${VD}:honey_roasted_peanut`, [`${VD}:roasted_peanut`, `${VD}:roasted_peanut`, "minecraft:honey_bottle"]);
  shapeless(`${VD}:nut_milk_bottle`, [`${VD}:peanut`, `${VD}:peanut`, "minecraft:glass_bottle", "minecraft:sugar"]);
  shapeless(`${VD}:nut_mash_bottle`, [`${VD}:roasted_peanut`, `${VD}:roasted_peanut`, `${VD}:roasted_peanut`, "minecraft:glass_bottle"]);
  shapeless(`${VD}:salted_cod`, ["minecraft:cod", `${VD}:salt`]);
  shapeless(`${VD}:salted_salmon`, ["minecraft:salmon", `${VD}:salt`]);
  shapeless(`3x ${VD}:chocolate_nut_granola_bar`, ["farm_and_charm:oat", "minecraft:honey_bottle", "minecraft:cocoa_beans", `${VD}:roasted_peanut`]);
  shapeless(`3x ${VD}:fruity_granola_bar`, ["farm_and_charm:oat", "minecraft:honey_bottle", "#c:foods/berry", "#c:foods/berry"]);
  shapeless(`4x ${VD}:deluxe_granola_bar`, ["farm_and_charm:oat", "minecraft:honey_bottle", "minecraft:cocoa_beans", `${VD}:honey_roasted_peanut`, "#c:foods/berry", "#c:foods/berry"]);
  shapeless(`8x ${VD}:oatmeal_cookie`, ["farm_and_charm:oat", "farm_and_charm:oat", "minecraft:honey_bottle"]);
  shapeless(`${VD}:oat_bread`, ["farm_and_charm:oat", "farm_and_charm:oat", "farm_and_charm:oat"]);
  shapeless(`${VD}:pb_j`, ["minecraft:bread", `${VD}:nut_mash_bottle`, `${VD}:gearo_berry_mason_jar`]);
  shapeless(`4x ${VD}:meat_pizza_slice`, [`${VD}:meat_pizza`]);
  shaped(`${VD}:meat_pizza`, ["tpt", "bdb"], {
    t: "farmersdelight:tomato_sauce",
    p: "minecraft:cooked_porkchop",
    b: "farmersdelight:bacon",
    d: "farmersdelight:wheat_dough",
  });
  shaped(`${VD}:cheese_burger`, [" b ", "cpc", " b "], {
    b: "minecraft:bread",
    c: "society:wheel_of_cheese",
    p: "farmersdelight:beef_patty",
  });
  shaped(`${VD}:deluxe_burger`, [" b ", "lpk", " b "], {
    b: "minecraft:bread",
    l: "farmersdelight:cabbage_leaf",
    p: "farmersdelight:beef_patty",
    k: `${VD}:pickle`,
  });
  shaped(`${VD}:stuffed_burrito`, ["rmr", " f "], {
    r: "farmersdelight:cooked_rice",
    m: "farmersdelight:minced_beef",
    f: "farmersdelight:wheat_dough",
  });
  shapeless(`${VD}:organic_mash`, ["minecraft:bone_meal", "#c:crops", "#c:crops"]);

  // Jars filled by hand (the other mason jars come from the Preserves Jar)
  shaped(`${VD}:honey_mason_jar`, ["X#", "##"], { X: "bakery:jar", "#": "minecraft:honey_bottle" });
  shaped(`${VD}:vinegar_mason_jar`, ["X#", "##"], { X: "bakery:jar", "#": `${VD}:vinegar_bottle` });

  // Cooking pot
  cooking(`${VD}:pad_thai`, [`${VD}:ghost_pepper`, "farmersdelight:raw_pasta", "farmersdelight:cooked_chicken_cuts", `${VD}:nut_mash_bottle`, `${VD}:peanut`], "minecraft:bowl");
  cooking(`${VD}:cheese_pasta`, ["farmersdelight:raw_pasta", "society:wheel_of_cheese"], "minecraft:bowl");
  cooking(`${VD}:cucumber_salad`, [`${VD}:cucumber`, `${VD}:cucumber`, "farmersdelight:onion", `${VD}:vinegar_bottle`], "minecraft:bowl");
  cooking(`${VD}:pickle_soup`, [`${VD}:pickle`, `${VD}:pickle`, "minecraft:potato", "farmersdelight:onion"], "minecraft:bowl");
  cooking(`${VD}:ghostly_chili`, [`${VD}:ghost_pepper`, `${VD}:ghost_pepper`, "farmersdelight:minced_beef", "farmersdelight:tomato", "farmersdelight:onion"], "minecraft:bowl");

  // Cutting board
  cutting(`${VD}:cucumber`, `${VD}:cucumber_noodles`, 2);

  if (skipped.length > 0) console.info(`[SOCIETY] Vintage Delight recipes skipped, items missing: ${skipped.join(", ")}`);
});
