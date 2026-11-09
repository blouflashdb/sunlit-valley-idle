// Items and categories the recipe viewers (JEI and EMI) hide or add (ported from the 1.20.1 hideJEIItems.js,
// addJeiItems.js and jeiCustomization.js, #18). KubeJS 7 replaced JEIEvents with RecipeViewerEvents.
// Removed items of mods that are not in the pack have no entry to hide, so only registered ids are passed on.
RecipeViewerEvents.removeEntries("item", (e) => {
  global.removedItems
    .concat(global.hiddenItems)
    .filter((id) => global.itemExists(id))
    .forEach((id) => e.remove(id));
});

RecipeViewerEvents.addEntries("item", (e) => {
  e.add(global.jeiAddedItems.map((text) => Item.of(text)));
});

RecipeViewerEvents.removeCategories((e) => {
  e.remove(global.jeiRemovedCategories);
});
