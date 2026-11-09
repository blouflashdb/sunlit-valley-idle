// JEI categories of milking, farm animal foraging and pet gifts (ported from the 1.20.1 husbandryJei.js, #18).
// Animals are shown by their spawn egg; animals of mods that are not in the 1.21.1 pack are left out.
const animalSlot = (slots, guiHelper, x, y, animal) => {
  let egg = global.getSpawnEggId(animal);
  return egg ? jeiSlot(slots, guiHelper, "INPUT", x, y, egg) : null;
};

const hearts = (key, value) => Text.translatable(`jei.society.husbandry.affection.${key}`, `${value}`).lightPurple();

JEIAddedEvents.registerCategories((e) => {
  e.custom("society:milking", (builder) => {
    const guiHelper = builder.jeiHelpers.guiHelper;
    builder
      .title(Text.translatable("jei.society.category.milking"))
      .background(guiHelper.createBlankDrawable(148, 40))
      .icon(guiHelper.createDrawableItemStack(Item.of("society:milk_pail")))
      .isRecipeHandled((recipe) => recipe?.data?.milk !== undefined)
      .setDrawHandler((recipe, slots, guiGraphics) => {
        let cooldown = recipe.getRecipeData().cooldown;
        guiHelper.getRecipeArrow().draw(guiGraphics, 74, 2);
        jeiText(
          guiGraphics,
          Text.translatable(
            "jei.society.husbandry.cooldown",
            Text.translatable(`jei.society.working_block_entity.day${cooldown > 1 ? "s" : ""}`, `${cooldown}`)
          ),
          2,
          26
        );
      })
      .handleLookup((slots, recipe) => {
        const { animal, milk } = recipe.data;
        animalSlot(slots, guiHelper, 2, 2, animal);
        jeiSlot(slots, guiHelper, "CATALYST", 48, 2, "society:milk_pail");
        jeiSlot(slots, guiHelper, "OUTPUT", 104, 2, milk.sm, () => [hearts("range", "1-5")]);
        jeiSlot(slots, guiHelper, "OUTPUT", 125, 2, milk.lg, () => [hearts("over", 6)]);
      });
  });

  e.custom("society:foraging", (builder) => {
    const guiHelper = builder.jeiHelpers.guiHelper;
    builder
      .title(Text.translatable("jei.society.category.foraging"))
      .background(guiHelper.createBlankDrawable(174, 40))
      .icon(guiHelper.createDrawableItemStack(Item.of("society:truffle")))
      .isRecipeHandled((recipe) => recipe?.data?.forages !== undefined)
      .setDrawHandler((recipe, slots, guiGraphics) => {
        jeiText(guiGraphics, Text.translatable("jei.society.working_block_entity.item"), 2, 28);
      })
      .handleLookup((slots, recipe) => {
        const { animal, forages } = recipe.data;
        animalSlot(slots, guiHelper, 2, 2, animal);
        let column = 0;
        forages.forEach((forage) => {
          let quality = () => (forage.hasQuality ? [Text.translatable("jei.society.husbandry.affection.quality").green()] : []);
          if (forage.itemPool) {
            // Pool items stay at the end, as on 1.20.1.
            forage.itemPool.forEach((poolItem) => {
              jeiSlot(slots, guiHelper, "OUTPUT", 50 + column++ * 21, 2, `${forage.countMult}x ${poolItem}`, () =>
                [
                  hearts("over", forage.minHearts),
                  Text.translatable("jei.society.husbandry.pool").gold(),
                  Text.translatable("jei.society.husbandry.pool.roll", `${Math.round(forage.chance * 100)}`).gold(),
                  Text.translatable("jei.society.husbandry.pool.select", `${Math.round((1 / forage.itemPool.length) * 100)}`).gold(),
                ].concat(quality())
              );
            });
          } else {
            jeiSlot(slots, guiHelper, "OUTPUT", 50 + column++ * 21, 2, `${forage.countMult}x ${forage.item}`, () =>
              [
                hearts("over", forage.minHearts),
                Text.translatable("jei.society.husbandry.chance", `${Math.round(forage.chance * 100)}`).gold(),
              ].concat(quality())
            );
          }
        });
      });
  });

  e.custom("society:pet_gifts", (builder) => {
    const guiHelper = builder.jeiHelpers.guiHelper;
    builder
      .title(Text.translatable("jei.society.category.pet_gifts"))
      .background(guiHelper.createBlankDrawable(174, 40))
      .icon(guiHelper.createDrawableItemStack(Item.of("supplementaries:present_magenta")))
      .isRecipeHandled((recipe) => recipe?.data?.gifts !== undefined)
      .setDrawHandler((recipe, slots, guiGraphics) => {
        jeiText(guiGraphics, Text.translatable("jei.society.working_block_entity.item"), 2, 28);
      })
      .handleLookup((slots, recipe) => {
        const { animal, gifts } = recipe.data;
        animalSlot(slots, guiHelper, 2, 2, animal);
        gifts.forEach((gift, index) => {
          jeiSlot(slots, guiHelper, "OUTPUT", 50 + index * 21, 2, gift, () => [
            hearts("at", 10),
            Text.translatable("jei.society.husbandry.pool.select", `${Math.round((1 / gifts.length) * 100)}`).gold(),
          ]);
        });
      });
  });
});

JEIAddedEvents.registerRecipes((e) => {
  const shown = (definition) => global.getSpawnEggId(definition.animal) !== null;
  global.husbandryMilkingDefinitions.filter(shown).forEach((definition) => e.custom("society:milking").add(definition));
  global.husbandryForagingDefinitions.filter(shown).forEach((definition) => e.custom("society:foraging").add(definition));
  global.petGifts.filter(shown).forEach((definition) => {
    let gifts = definition.gifts.filter((id) => global.itemExists(id));
    if (gifts.length > 0) e.custom("society:pet_gifts").add({ animal: definition.animal, gifts: gifts });
  });
});
