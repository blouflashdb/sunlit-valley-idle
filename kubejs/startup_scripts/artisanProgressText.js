console.info("[SOCIETY] artisanProgressText.js loaded");

/** The progress line for a machine that is not done yet, or null when it has nothing to show. */
global.getArtisanProgressText = (block) => {
  const id = String(block.id);
  const machine = global.artisanMachineDefinitions.filter((obj) => obj.id === id)[0];
  if (!machine || global.isBlockPropertyTrue(block, "mature")) return null;
  const working = global.isBlockPropertyTrue(block, "working");
  const upgraded = global.isBlockPropertyTrue(block, "upgraded");
  const recipeId = global.getMachineString(block, "recipe");
  const stage = global.getMachineInt(block, "stage");
  let outputId;
  let duration;
  if (id === "society:charging_rod") {
    outputId = "society:battery";
    duration = machine.stageCount;
  } else {
    if (recipeId === "" || typeof machine.recipes === "string") return null;
    const recipe = machine.recipes.get(recipeId);
    if (!recipe || !global.itemExists(recipe.output[0])) return null;
    outputId = String(Item.of(recipe.output[0]).id);
    duration = recipe.time || machine.stageCount;
  }
  if (id === "society:aging_cask" && upgraded) duration = duration / 2;
  const pipCount = working ? Math.round(duration) : machine.maxInput;
  let pips = "";
  for (let i = 0; i < pipCount; i++) pips += i < stage ? "⬛" : "⬜";
  const mark = upgraded ? "§a🡅§r " : "";
  return Text.empty()
    .append(Text.translatable(working ? "society.working_block_entity.making" : "society.working_block_entity.more_input").gray())
    .append(Text.of(" "))
    .append(Item.of(outputId).getHoverName().copy().gold())
    .append(Text.of(` ${mark}§6${pips}§r${upgraded ? " §a🡅" : ""}`));
};
