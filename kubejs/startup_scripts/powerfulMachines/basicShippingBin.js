// priority: 1
// Basic Shipping Bin: 36 slots, sells everything sellable each morning and pays coins into its own slots.
// The morning tick is in server_scripts/blockEvents/machineTicks.js (global.runShippingBin).
console.info("[SOCIETY] basicShippingBin.js loaded");

StartupEvents.registry("block", (event) => {
  event
    .create("shippingbin:basic_shipping_bin", "cardinal")
    .soundType("wood")
    .tagBlock("minecraft:mineable/axe")
    .tagBlock("society:shipping_bin")
    .parentModel("shippingbin:block/shipping_bin")
    .item((item) => {
      item.tooltip(Text.translatable("tooltip.society.shipping_bin").gray());
      item.parentModel("shippingbin:block/shipping_bin");
    })
    .blockEntity((blockInfo) => {
      blockInfo.initialData({ owner: "-1" });
      blockInfo.inventory("inventory", [], 9, 4);
      blockInfo.rightClickOpensInventory("inventory");
      blockInfo.serverTicking();
      blockInfo.tickFrequency(10);
    });
});
