console.info("[SOCIETY] furnitureTags.js loaded");

// The furniture of the Furniture Box (global.lootFurniture), as item and block tags (ported from the 1.20.1
// handleItemBlockFluidTags.js). The Loom, the plushie husbandry and the recipe viewer read them. Furniture whose
// mod is not in the pack is left out; the CI test (recipeViewerTest.js) lists it.
ServerEvents.tags("item", (e) => {
  global.lootFurniture.filter((id) => global.itemExists(id)).forEach((id) => e.add("society:loot_furniture", id));
});

ServerEvents.tags("block", (e) => {
  global.lootFurniture.filter((id) => global.itemExists(id)).forEach((id) => e.add("society:loot_furniture", id));
});
