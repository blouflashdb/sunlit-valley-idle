// Every Furniture Box item (global.lootFurniture) can be built at the Tanuki DIY workbench.
// The 1.20.1 Fantasy Furniture recipes are gone with the mod.
console.info("[SOCIETY] addRefurbishedWorkbenchRecipes.js loaded");

ServerEvents.recipes((e) => {
  global.lootFurniture
    .filter((item) => global.itemExists(item))
    .forEach((item) => {
      e.custom({
        type: "tanukidecor:diy",
        result: { id: item, count: 1 },
      });
    });
});
