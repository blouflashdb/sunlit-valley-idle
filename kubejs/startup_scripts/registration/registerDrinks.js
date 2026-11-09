console.info("[SOCIETY] registerDrinks.js loaded");

// Drinks of the Espresso Machine, the Wine Keg, the Aging Cask and the Mayonnaise Machine (#18). On 1.20.1 these
// were placeable cups and bottles (registerBlocks.js); like society:espresso (registerItems.js) they are items for
// now. They keep the block.society.* translation keys of the 1.20.1 blocks, so every language file still names them.
// Effects of mods that are not in the 1.21.1 pack are replaced: Legendary Creatures' convulsion by nausea, Nether
// Vinery's netherite by fire resistance.
const packDrinks = [
  { id: "mocha", effects: [["minecraft:speed", 1200, 1]] },
  { id: "latte", effects: [["minecraft:speed", 1200, 1]] },
  { id: "dirty_chai", effects: [["minecraft:speed", 2400, 1], ["herbalbrews:tough", 2400, 1]] },
  { id: "bowl_of_soul", effects: [["herbalbrews:fortune", 3600, 1]] },
  { id: "truffle_tea", effects: [["minecraft:nausea", 1600, 1]], tooltip: ["block.society.truffle_tea.description", "darkPurple"] },
  { id: "beer_london", fast: true, effects: [["vinery:jellie", 1200, 1]] },
  { id: "beer_attunecore", fast: true, effects: [["vinery:jellie", 200, 1]] },
  { id: "ancient_cider", fast: true, effects: [["minecraft:fire_resistance", 400, 1]] },
  { id: "ancient_vespertine", fast: true, effects: [["vinery:luck_effect", 2400, 1]] },
  { id: "dewy_star", fast: true, effects: [["brewery:haley", 2400, 1]] },
  { id: "starcardi", fast: true, effects: [["brewery:haley", 2400, 1]] },
  { id: "star_coquito", fast: true, effects: [["brewery:haley", 2400, 1]] },
  { id: "violet_moon", fast: true, effects: [["brewery:lightning_strike", 2400, 1]] },
  { id: "sparkling_le_roy", fast: true, effects: [["windswept:frost_resistance", 2400, 1]] },
  { id: "laputa_franc", fast: true, effects: [["botania:soul_cross", 2400, 1]] },
  { id: "mana_king", fast: true, effects: [["botania:clear", 2400, 1]] },
  { id: "forks_of_blue", fast: true, effects: [["autumnity:extension", 1200, 1]] },
  { id: "good_catawba", fast: true, effects: [["herbalbrews:tough", 2400, 1]] },
  { id: "nutty_basil", fast: true, effects: [["atmospheric:spitting", 1000, 1]] },
  {
    id: "supreme_mayonnaise",
    texture: "society:item/mayo/supreme_mayonnaise",
    fast: true,
    effects: [["vinery:creeper_effect", 120, 4]],
    tooltip: ["block.society.supreme_mayonnaise.description", "red"],
    obtainTooltip: true,
  },
];
global.packDrinks = packDrinks.map((drink) => `society:${drink.id}`);

StartupEvents.registry("item", (e) => {
  packDrinks.forEach((drink) => {
    let builder = e
      .create(`society:${drink.id}`)
      .texture(drink.texture || `society:item/drinks/${drink.id}`)
      .food((food) => {
        food.nutrition(0);
        food.saturation(0);
        food.alwaysEdible();
        if (drink.fast) food.fastToEat();
        drink.effects.forEach(([effect, duration, amplifier]) => food.effect(effect, duration, amplifier, 1.0));
      })
      .useAnimation("drink");
    if (drink.tooltip) builder.tooltip(Text.translatable(drink.tooltip[0])[drink.tooltip[1]]());
    if (drink.obtainTooltip) builder.tooltip(Text.translatable(`block.society.${drink.id}.description.obtain`).gray());
    builder.translationKey(`block.society.${drink.id}`);
  });
});
