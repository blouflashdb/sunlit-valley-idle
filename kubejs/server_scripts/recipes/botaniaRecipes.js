console.info("[SOCIETY] botaniaRecipes.js loaded");

// Botania recipes of the pack in the 1.21.1 format (Botania Revived): item results use "id", ingredients
// stay {item}/{tag}. Recipes whose items are not in the pack are skipped.
const $BotaniaRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $BotaniaResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");
const botaniaItemExists = (id) => $BotaniaRegistries.ITEM.containsKey($BotaniaResourceLocation.parse(id));

ServerEvents.recipes((e) => {
  const manaInfusion = (input, output, mana) => {
    if (!botaniaItemExists(input) || !botaniaItemExists(output)) return;
    e.custom({ type: "botania:mana_infusion", input: { item: input }, mana: mana, output: { id: output, count: 1 } });
  };
  // Mana Fruit (#14): infuse an Ancient Fruit seed.
  manaInfusion("society:ancient_fruit_seed", "society:mana_fruit_crop", 5000);
});
