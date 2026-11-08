// Block tags the Tapper and the Mushroom Log scan for. Blocks from mods that are not in the 1.21.1 pack are left out.
console.info("[SOCIETY] artisanMachineTags.js loaded");

const $ArtisanTagRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $ArtisanTagResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");

const artisanBlockExists = (id) => $ArtisanTagRegistries.BLOCK.containsKey($ArtisanTagResourceLocation.parse(id));

ServerEvents.tags("block", (e) => {
  let blocks = (ids) => ids.filter((id) => !id.startsWith("#") && artisanBlockExists(id));
  // Only blocks whose recipe outputs exist, the same recipes pruneMachineRecipes.js keeps.
  let recipeBlocks = (recipes) =>
    blocks(Array.from(recipes.keys()).filter((id) => recipes.get(id).output.every(global.itemExists)));
  e.add("society:tappable_blocks", recipeBlocks(global.tapperRecipes));
  e.add("society:mushroom_log_detects", recipeBlocks(global.mushroomLogRecipes));
  e.add("society:mushroom_log_dominant", recipeBlocks(global.dominantMushroomLogBlocks));
  e.add("society:mushroom_log_leaves", ["#minecraft:leaves"]);
  e.add(
    "society:mushroom_log_leaves",
    blocks([
      "ribbits:red_toadstool",
      "ribbits:brown_toadstool",
      "minecraft:brown_mushroom_block",
      "cluttered:blue_mushroom_cap",
      "cluttered:red_mushroom_cap",
      "quark:glow_shroom_block",
      "quark:glow_shroom_ring",
    ])
  );
});
