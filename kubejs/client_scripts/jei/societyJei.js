// JEI categories of the loot boxes, Enriched Bone Meal, the Gatcha Machine and Herbal Brews' tea drying (ported from
// the 1.20.1 lootJEI.js and jeiCustomization.js, #18). The grapevine pot juicing category is gone with the
// grapevine pot, which Vinery for 1.21.1 does not have.
const simpleCategory = (event, id, title, icon, height, slotsOf) => {
  event.custom(id, (builder) => {
    const guiHelper = builder.jeiHelpers.guiHelper;
    builder
      .title(Text.translatable(title))
      .background(guiHelper.createBlankDrawable(177, height))
      .icon(guiHelper.createDrawableItemStack(Item.of(icon)))
      .isRecipeHandled(() => true)
      .setDrawHandler((recipe, slots, guiGraphics) => guiHelper.getRecipeArrow().draw(guiGraphics, 100, height > 20 ? 14 : 2))
      .handleLookup((slots, recipe) => slotsOf(slots, guiHelper, recipe.data));
  });
};

JEIAddedEvents.registerCategories((e) => {
  e.custom("society:loot_box", (builder) => {
    const guiHelper = builder.jeiHelpers.guiHelper;
    builder
      .title(Text.translatable("jei.society.category.loot_box"))
      .background(guiHelper.createBlankDrawable(144, 148))
      .icon(guiHelper.createDrawableItemStack(Item.of("society:furniture_box")))
      .isRecipeHandled((recipe) => recipe?.data?.input !== undefined && recipe?.data?.outputs !== undefined)
      .handleLookup((slots, recipe) => {
        const { input, outputs } = recipe.data;
        jeiSlot(slots, guiHelper, "INPUT", 73, 2, input);
        outputs.forEach((output, index) => {
          jeiSlot(slots, guiHelper, "OUTPUT", (index % 8) * 18 + 1, Math.floor(index / 8) * 18 + 21, output);
        });
      });
  });

  simpleCategory(e, "society:enriched_bone_mealing", "jei.society.category.enriched_bone_mealing", "society:enriched_bone_meal", 20, (slots, guiHelper, data) => {
    jeiSlot(slots, guiHelper, "INPUT", 27, 2, data.bonemealTarget);
    jeiSlot(slots, guiHelper, "INPUT", 63, 2, "society:enriched_bone_meal");
    jeiSlot(slots, guiHelper, "OUTPUT", 132, 2, data.crop);
  });

  simpleCategory(e, "society:furniture_catalog", "jei.society.category.block_purchasing", "whimsy_deco:gatcha_machine", 20, (slots, guiHelper, data) => {
    jeiSlot(slots, guiHelper, "INPUT", 27, 2, data.catalog);
    jeiSlot(slots, guiHelper, "INPUT", 63, 2, data.cost);
    jeiSlot(slots, guiHelper, "OUTPUT", 132, 2, data.output);
  });

  e.custom("herbalbrews:tea_drying", (builder) => {
    const guiHelper = builder.jeiHelpers.guiHelper;
    builder
      .title(Text.translatable("jei.society.category.tea_drying"))
      .background(guiHelper.createBlankDrawable(122, 48))
      .icon(guiHelper.createDrawableItemStack(Item.of("herbalbrews:green_tea_leaf")))
      .isRecipeHandled(() => true)
      .setDrawHandler((recipe, slots, guiGraphics) => {
        guiHelper.getRecipeArrow().draw(guiGraphics, 46, 14);
        jeiText(guiGraphics, Text.translatable("jei.society.tea_drying"), 2, 36);
      })
      .handleLookup((slots, recipe) => {
        jeiSlot(slots, guiHelper, "INPUT", 20, 14, recipe.data.input);
        jeiSlot(slots, guiHelper, "OUTPUT", 84, 14, recipe.data.output);
      });
  });
});

JEIAddedEvents.registerRecipes((e) => {
  // 56 outputs per page, as on 1.20.1.
  global.jeiLootBoxes.forEach((box) => {
    let outputs = jeiTagItemIds(`#${box.tag}`);
    for (let start = 0; start < outputs.length; start += 56) {
      e.custom("society:loot_box").add({ input: box.input, outputs: outputs.slice(start, start + 56) });
    }
  });
  global.jeiEnrichedBoneMealing.forEach((entry) => e.custom("society:enriched_bone_mealing").add(entry));
  global.jeiBlockPurchasing.forEach((entry) => e.custom("society:furniture_catalog").add(entry));
  global.jeiTeaDrying.forEach((entry) => e.custom("herbalbrews:tea_drying").add(entry));
});
