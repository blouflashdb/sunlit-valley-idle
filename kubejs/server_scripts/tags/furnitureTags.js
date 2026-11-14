console.info("[SOCIETY] furnitureTags.js loaded");

// The furniture of the Furniture Box (global.lootFurniture), as item and block tags (ported from the 1.20.1
// handleItemBlockFluidTags.js). The Loom, the plushie husbandry and the recipe viewer read them.
ServerEvents.tags("item", (e) => {
  global.lootFurniture.filter((id) => global.itemExists(id)).forEach((id) => e.add("society:loot_furniture", id));
});

// Paintings, canvases and pells are items without a block of the same id.
const $FurnitureTagRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $FurnitureTagRL = Java.loadClass("net.minecraft.resources.ResourceLocation");
ServerEvents.tags("block", (e) => {
  global.lootFurniture
    .filter((id) => $FurnitureTagRegistries.BLOCK.containsKey($FurnitureTagRL.parse(id)))
    .forEach((id) => e.add("society:loot_furniture", id));
});
