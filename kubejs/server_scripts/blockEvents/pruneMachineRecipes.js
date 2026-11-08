// The machine recipe maps of the startup scripts list items of mods that are not (yet) in the 1.21.1 pack.
// Drop those recipes once at server start, so a machine never takes an input it cannot turn into anything.
console.info("[SOCIETY] pruneMachineRecipes.js loaded");

ServerEvents.loaded(() => {
  let prune = (name, recipes, outputsOf) => {
    let removed = [];
    Array.from(recipes.keys()).forEach((input) => {
      let ok = (input.startsWith("#") || global.itemExists(input)) && outputsOf(recipes.get(input)).every(global.itemExists);
      if (!ok) {
        recipes.delete(input);
        removed.push(input);
      }
    });
    if (removed.length > 0) console.info(`[SOCIETY] ${name}: ${removed.length} recipes skipped, items missing`);
  };
  prune("Preserves Jar", global.preservesJarRecipes, (recipe) => recipe.output);
  prune("Pickling Can", global.picklingRecipes, (recipe) => [recipe.pickle]);
  prune("Crystalarium", global.crystalariumCrystals, (recipe) => recipe.output);
});
