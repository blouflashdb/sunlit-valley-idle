// Create kinetic sources and train tracks, ported from addKineticsRecipes.js and addTrainTrackRecipes.js (1.20.1).
// The kinetic machines need the Kinetic Blueprint, which the recipe keeps.
console.info("[SOCIETY] kineticRecipes.js loaded");

ServerEvents.recipes((e) => {
  let shaped = (kind, output, pattern, key, keep) => {
    let id = output.replace(/^\d+x /, "");
    addProcessingRecipe(e, kind, processingPath(id), [output].concat(Object.values(key)), [], () => {
      let recipe = e.shaped(output, pattern, key);
      return keep ? recipe.keepIngredient(keep) : recipe;
    });
  };
  let blueprint = "society:kinetic_blueprint";
  shaped("kinetics", `2x ${blueprint}`, ["ppp", "pBp", "ppp"], { B: blueprint, p: "minecraft:paper" });
  shaped("kinetics", "create:windmill_bearing", [" B ", "aCa", "asa"], { B: blueprint, C: "oreganized:lead_block", s: "create:shaft", a: "create:andesite_casing" }, blueprint);
  shaped("kinetics", "create:water_wheel", ["LlL", "lBl", "LlL"], { B: blueprint, L: "oreganized:lead_ingot", l: "meadow:fire_log" }, blueprint);
  shaped("kinetics", "create:steam_engine", [" B ", " L ", " c "], { B: blueprint, L: "oreganized:lead_block", c: "create:copper_casing" }, blueprint);
  shaped("kinetics", "create:mechanical_bearing", [" B ", "CbC", "asa"], { B: blueprint, C: "oreganized:lead_block", s: "create:shaft", b: "society:battery", a: "create:andesite_casing" }, blueprint);
  shaped("kinetics", "create:cart_assembler", [" B ", "bEb", "l l"], { B: blueprint, E: "oreganized:electrum_block", l: "oreganized:lead_ingot", b: "create:brass_casing" }, blueprint);

  // Steam 'n' Rails tracks from any Create track and a block; narrow, normal and wide gauges convert.
  [
    ["minecraft:oak_planks", "oak"],
    ["minecraft:acacia_planks", "acacia"],
    ["minecraft:dark_oak_planks", "dark_oak"],
    ["minecraft:birch_planks", "birch"],
    ["minecraft:jungle_planks", "jungle"],
    ["minecraft:spruce_planks", "spruce"],
    ["minecraft:mangrove_planks", "mangrove"],
    ["minecraft:cherry_planks", "cherry"],
    ["minecraft:warped_planks", "warped"],
    ["minecraft:crimson_planks", "crimson"],
    ["minecraft:stripped_bamboo_block", "stripped_bamboo"],
    ["minecraft:bamboo_block", "bamboo"],
    ["quark:ancient_planks", "quark_ancient"],
    ["quark:azalea_planks", "quark_azalea"],
    ["quark:blossom_planks", "quark_blossom"],
    ["minecraft:end_stone", "ender"],
    ["minecraft:blackstone", "blackstone"],
  ].forEach((pair) => {
    let block = pair[0];
    let track = `railways:track_${pair[1]}`;
    let shapeless = (name, output, inputs) =>
      addProcessingRecipe(e, "tracks", `${pair[1]}_${name}`, [output].concat(inputs), [], () => e.shapeless(output, inputs));
    shapeless("from_block", track, ["#create:tracks", block]);
    shapeless("wide_from_narrow", `${track}_wide`, [`4x ${track}_narrow`]);
    shapeless("from_narrow", track, [`2x ${track}_narrow`]);
    shapeless("narrow", `2x ${track}_narrow`, [track]);
    shapeless("from_wide", `2x ${track}`, [`${track}_wide`]);
    shapeless("wide", `${track}_wide`, [`2x ${track}`]);
  });
  ["minecraft:iron_ingot", "create:zinc_ingot"].forEach((ingot) =>
    addProcessingRecipe(e, "tracks", `oak_from_${processingPath(ingot)}`, ["railways:track_oak", ingot, "meadow:fire_log"], [], () =>
      e.shaped("32x railways:track_oak", ["fif", "f f", "fif"], { i: ingot, f: "meadow:fire_log" })
    )
  );
});
