// Ported part of addMiscRecipes.js. The rest is in kubejs/_unported/server_scripts/recipes/addMiscRecipes.js
// and moves here with the slice that ports its items.
console.info("[SOCIETY] addMiscRecipes.js loaded");

ServerEvents.recipes((e) => {
  e.shaped("society:crystalarium", ["III", "SDS", "ibi"], {
    D: "minecraft:diamond_block",
    S: "minecraft:netherite_ingot",
    b: "society:battery",
    I: "oreganized:lead_ingot",
    i: "oreganized:lead_block",
  });
});
