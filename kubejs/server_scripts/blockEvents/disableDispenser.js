console.info("[SOCIETY] disableDispenser.js loaded");

// Dispensers do not use bone meal or plant crops; they keep the item.
const $DisableDispenserBlock = Java.loadClass("net.minecraft.world.level.block.DispenserBlock");
// Rhino cannot turn a JS function into a DispenseItemBehavior; NOOP returns the stack unchanged.
const $DisableDispenseBehavior = Java.loadClass("net.minecraft.core.dispenser.DispenseItemBehavior");
[
  "minecraft:bone_meal",
  "minecraft:carrot",
  "minecraft:potato",
  "farm_and_charm:onion",
  "veggiesdelight:sweet_potato",
].forEach((id) => {
  if (Item.exists(id)) $DisableDispenserBlock.registerBehavior(Item.of(id).getItem(), $DisableDispenseBehavior.NOOP);
});
