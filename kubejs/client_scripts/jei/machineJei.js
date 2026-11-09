// JEI categories of the artisan machines, the Mushroom Log and the Fish Pond (ported from the 1.20.1
// blockEntityJei.js, #18). The recipes come from the machine globals (recipeViewerData.js).
const workTimeText = (days) => {
  if (days < 1) return Text.translatable("jei.society.working_block_entity.short");
  if (days > 1) return Text.translatable("jei.society.working_block_entity.days", `${days}`);
  return Text.translatable("jei.society.working_block_entity.day", `${days}`);
};

const registerMachineCategory = (event, category) => {
  event.custom(`society:${category.id}`, (builder) => {
    const guiHelper = builder.jeiHelpers.guiHelper;
    builder
      .title(Text.translatable(`jei.society.category.${category.id}`))
      .background(guiHelper.createBlankDrawable(142, 42))
      .icon(guiHelper.createDrawableItemStack(Item.of(`society:${category.block}`)))
      .isRecipeHandled((recipe) => recipe?.data?.output !== undefined)
      .setDrawHandler((recipe, slots, guiGraphics) => {
        guiHelper.getRecipeArrow().draw(guiGraphics, 74, 2);
        jeiText(guiGraphics, workTimeText(recipe.getRecipeData().time || category.days), 72, 29);
      })
      .handleLookup((slots, recipe) => {
        const { input, output, fluidOutput } = recipe.data;
        if (input.startsWith("#")) {
          slots
            .addSlot("INPUT", 2, 2)
            .addItemStacks(Array.from(Ingredient.of(input).itemIds).map((id) => Item.of(id, 2)))
            .setBackground(guiHelper.getSlotDrawable(), -1, -1);
        } else if (input) {
          let count = output.length > 0 && String(output[0]).includes("steamed_milk") ? 1 : category.inputCount;
          jeiSlot(slots, guiHelper, "INPUT", 2, 2, `${count}x ${input}`);
        }
        jeiSlot(slots, guiHelper, "CATALYST", 52, 2, `society:${category.block}`);
        let fluid = fluidOutput && category.id !== "tapping" ? jeiFluid(fluidOutput) : null;
        if (fluid) {
          slots.addSlot("OUTPUT", 104, 2).addFluidStack(fluid, 1000).setBackground(guiHelper.getSlotDrawable(), -1, -1);
        } else {
          output.forEach((item, index) => jeiSlot(slots, guiHelper, "OUTPUT", 104 + index * 21, 2, item));
        }
      });
  });
};

const registerMushroomLogCategory = (event) => {
  event.custom("society:mushroom_growing", (builder) => {
    const guiHelper = builder.jeiHelpers.guiHelper;
    builder
      .title(Text.translatable("jei.society.category.mushroom_growing"))
      .background(guiHelper.createBlankDrawable(142, 42))
      .icon(guiHelper.createDrawableItemStack(Item.of("society:mushroom_log")))
      .isRecipeHandled((recipe) => recipe?.data?.input !== undefined && recipe?.data?.output !== undefined)
      .setDrawHandler((recipe, slots, guiGraphics) => {
        guiHelper.getRecipeArrow().draw(guiGraphics, 74, 2);
        jeiText(guiGraphics, Text.translatable("jei.society.working_block_entity.days", 4), 72, 29);
      })
      .handleLookup((slots, recipe) => {
        const { input, output } = recipe.data;
        const strong = global.dominantMushroomLogBlocks.get(input) !== undefined;
        jeiSlot(slots, guiHelper, "INPUT", 2, 2, input, () => [
          strong
            ? Text.translatable("jei.society.mushroom_growing.strong").darkGreen()
            : Text.translatable("jei.society.mushroom_growing.weak").aqua(),
        ]);
        jeiSlot(slots, guiHelper, "CATALYST", 52, 2, "society:mushroom_log");
        output.forEach((item, index) =>
          jeiSlot(slots, guiHelper, "OUTPUT", 104 + index * 21, 2, item, () => [
            Text.translatable("jei.society.mushroom_growing.mult").green(),
          ])
        );
      });
  });
};

const registerFishPondCategory = (event) => {
  event.custom("society:fish_farming", (builder) => {
    const guiHelper = builder.jeiHelpers.guiHelper;
    builder
      .title(Text.translatable("jei.society.category.fish_farming"))
      .background(guiHelper.createBlankDrawable(177, 61))
      .icon(guiHelper.createDrawableItemStack(Item.of("society:fish_pond")))
      .isRecipeHandled((recipe) => recipe?.data?.item !== undefined)
      .setDrawHandler((recipe, slots, guiGraphics) => {
        jeiText(guiGraphics, Text.translatable("jei.society.working_block_entity.item"), 2, 49);
      })
      .handleLookup((slots, recipe) => {
        const { item, additionalRewards } = recipe.data;
        const rewards = [{ item: global.getRoe(item), count: 1 }].concat(additionalRewards || []);
        jeiSlot(slots, guiHelper, "CATALYST", 2, 28, "society:fish_pond");
        jeiSlot(slots, guiHelper, "INPUT", 2, 2, item);
        rewards.forEach((reward, index) => {
          jeiSlot(
            slots,
            guiHelper,
            "OUTPUT",
            26 + (index > 6 ? index - 7 : index) * 21,
            index > 6 ? 28 : 2,
            `${reward.count}x ${reward.item}`,
            () => {
              let lines = [];
              if (reward.minPopulation) {
                lines.push(Text.translatable("jei.society.fish_farming.population", `${reward.minPopulation}`).aqua());
              }
              if (reward.chance) {
                lines.push(Text.translatable("jei.society.husbandry.chance", `${Math.round(reward.chance * 100)}`).gold());
              }
              return lines;
            }
          );
        });
      });
  });
};

JEIAddedEvents.registerCategories((e) => {
  global.jeiMachineCategories.forEach((category) => registerMachineCategory(e, category));
  registerMushroomLogCategory(e);
  registerFishPondCategory(e);
});

JEIAddedEvents.registerRecipes((e) => {
  global.jeiMachineCategories.forEach((category) => {
    global.getJeiMachineRecipes(category).forEach((recipe) => e.custom(`society:${category.id}`).add(recipe));
  });
  Array.from(global.mushroomLogRecipes.keys()).forEach((input) => {
    let output = global.mushroomLogRecipes.get(input).output;
    if (global.jeiItemsExist([input].concat(output))) e.custom("society:mushroom_growing").add({ input: input, output: output });
  });
  Array.from(global.fishPondDefinitions.keys())
    .filter((fish) => global.itemExists(fish))
    .forEach((fish) => {
      e.custom("society:fish_farming").add({ item: fish, additionalRewards: global.fishPondDefinitions.get(fish).additionalRewards });
    });
});
