// priority: -21
// Pickling Can: every 600 ticks it pickles one vegetable or egg from its 9 slots into the inventory below,
// as long as a salt crust (vintagedelight:salt) lies within one block. Each pickle uses the salt up with a
// 1 in 16 chance (the 1.20.1 salt had layers; the KubeJS salt crust has none). Quality is kept.
// The tick is in server_scripts/blockEvents/machineTicks.js.
console.info("[SOCIETY] picklingCan.js loaded");

const $PicklingItemHandlerHelper = Java.loadClass("net.neoforged.neoforge.items.ItemHandlerHelper");
const $PicklingCapabilities = Java.loadClass("net.neoforged.neoforge.capabilities.Capabilities");
const $PicklingDirection = Java.loadClass("net.minecraft.core.Direction");

global.picklingRecipes = new Map([
  ["vintagedelight:ghost_pepper", { pickle: "vintagedelight:pickled_pepper" }],
  ["vintagedelight:cucumber", { pickle: "vintagedelight:pickle" }],
  ["minecraft:pitcher_pod", { pickle: "vintagedelight:pickled_pitcher_pod" }],
  ["minecraft:beetroot", { pickle: "vintagedelight:pickled_beetroot" }],
  ["farm_and_charm:onion", { pickle: "vintagedelight:pickled_onion" }],
  ["farmersdelight:cabbage", { pickle: "vintagedelight:kimchi" }],
  ["farmersdelight:cabbage_leaf", { pickle: "vintagedelight:kimchi" }],
  ["minecraft:egg", { pickle: "vintagedelight:pickled_egg" }],
  ["minecraft:turtle_egg", { pickle: "vintagedelight:pickled_egg" }],
  ["untitledduckmod:duck_egg", { pickle: "vintagedelight:pickled_egg" }],
  ["untitledduckmod:goose_egg", { pickle: "vintagedelight:pickled_egg" }],
  ["autumnity:turkey_egg", { pickle: "vintagedelight:pickled_egg" }],
  ["farmlife:galliraptor_egg", { pickle: "vintagedelight:pickled_egg" }],
  ["society:penguin_egg", { pickle: "vintagedelight:pickled_egg" }],
  ["society:flamingo_egg", { pickle: "vintagedelight:pickled_egg" }],
  ["society:cracked_egg", { pickle: "vintagedelight:pickled_egg" }],
]);
global.picklableVegetables.forEach((pickle) => {
  global.picklingRecipes.set(pickle.item, {
    pickle: `society:pickled_${pickle.item.split(":")[1]}`,
  });
});

/** The item handler of the block below, seen from its top face, or null. */
global.getInventoryBelow = (level, block) =>
  level.getCapability($PicklingCapabilities.ItemHandler.BLOCK, block.getPos().below(), $PicklingDirection.UP);

/** Inserts a stack into a handler; returns what did not fit. With simulate nothing changes. */
global.insertIntoHandler = (handler, stack, simulate) =>
  $PicklingItemHandlerHelper.insertItemStacked(handler, stack, simulate);

const findSaltNear = (level, block) => {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        let scan = level.getBlock(block.x + dx, block.y + dy, block.z + dz);
        if (String(scan.id) === "vintagedelight:salt") return scan;
      }
    }
  }
  return null;
};

/** One pickling step. Returns the pickle it made, or null. */
global.handlePicklingCan = (level, block) => {
  const entity = block.getEntity();
  const inventory = entity && entity.attachments ? entity.attachments.get("inventory") : null;
  if (!inventory) return null;
  const below = global.getInventoryBelow(level, block);
  if (!below) return null;
  for (let i = 0; i < inventory.getSlots(); i++) {
    let slotItem = inventory.getStackInSlot(i);
    if (slotItem.isEmpty()) continue;
    let recipe = global.picklingRecipes.get(String(slotItem.id));
    if (!recipe || !global.itemExists(recipe.pickle)) continue;
    let pickle = global.withItemQuality(Item.of(recipe.pickle), global.getItemQuality(slotItem));
    if (!global.insertIntoHandler(below, pickle.copy(), true).isEmpty()) continue;
    let salt = findSaltNear(level, block);
    if (!salt) return null;
    if (Math.random() < 1 / 16) salt.set("minecraft:air");
    global.insertIntoHandler(below, pickle.copy(), false);
    inventory.extractItem(i, 1, false);
    return pickle;
  }
  return null;
};

StartupEvents.registry("block", (event) => {
  event
    .create("society:pickling_can")
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .soundType("copper")
    .box(1, 0, 1, 15, 15, 15)
    .defaultCutout()
    // A parent model together with .box() would get our box elements added, so the model is set directly.
    .modelGenerator((model) => model.parent("etcetera:block/prickly_can"))
    .item((item) => {
      item.tooltip(Text.translatable("block.society.prickly_can.description").gray());
      item.tooltip(Text.translatable("block.society.prickly_can.description.warn").red());
      item.tooltip(Text.translatable("society.working_block_entity.can_use_hopper").green());
      item.tooltip(Text.translatable("society.working_block_entity.preserve_quality").green());
      item.parentModel("etcetera:block/prickly_can");
    })
    .blockEntity((blockInfo) => {
      blockInfo.inventory("inventory", [], 9, 1);
      blockInfo.rightClickOpensInventory("inventory");
      blockInfo.serverTicking();
      blockInfo.tickFrequency(600);
    });
});
