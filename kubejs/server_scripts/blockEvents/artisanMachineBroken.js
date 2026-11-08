console.info("[SOCIETY] artisanMachineBroken.js loaded");

// A broken artisan machine drops its upgrade, a finished product or the inputs it was working on.
const dropFromBrokenMachine = (block) => {
  const id = String(block.id);
  const machine = global.artisanMachineDefinitions.filter((obj) => obj.id === id)[0];
  if (!machine) return;
  const working = global.isBlockPropertyTrue(block, "working");
  const upgraded = global.isBlockPropertyTrue(block, "upgraded");
  const recipeId = global.getMachineString(block, "recipe");
  const recipes = typeof machine.recipes === "string" ? null : machine.recipes;
  const currentRecipe = recipes && recipeId !== "" ? recipes.get(recipeId) : undefined;
  const pop = (count, itemId) => {
    if (count > 0 && global.itemExists(itemId)) block.popItem(Item.of(itemId, count));
  };
  if (machine.upgrade && upgraded) pop(1, machine.upgrade);
  if (global.isBlockPropertyTrue(block, "mature")) {
    if (!currentRecipe) return;
    currentRecipe.output.forEach((element) => {
      if (global.itemExists(element)) block.popItem(Item.of(element));
    });
    if (id === "society:ancient_cask" && upgraded) pop(3, String(Item.of(currentRecipe.output[0]).id));
    return;
  }
  if (["society:charging_rod", "society:tapper", "society:mushroom_log"].includes(id) || !currentRecipe) return;
  if (id === "society:deluxe_worm_farm" && upgraded) return; // the infinity worm makes its own bait
  const stage = global.getMachineInt(block, "stage");
  const inputs = global.getMachineInputs(block);
  if (id === "society:ancient_cask" && upgraded) pop(working ? 4 : stage, recipeId);
  else if (id === "society:preserves_jar" && upgraded) pop(working ? 3 : stage, recipeId);
  else if (inputs.length > 0) inputs.forEach((input) => global.itemExists(input) && block.popItem(Item.of(input)));
  else if (!recipeId.startsWith("#")) pop(working ? machine.maxInput : stage, recipeId);
};

BlockEvents.broken(global.artisanMachineIds, (e) => {
  dropFromBrokenMachine(e.block);
});
