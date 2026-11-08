// priority: 1
// Smart Shipping Bin: 54 slots, sells every 4000 ticks and pays into the owner's Numismatics account
// (or drops coins in front of it). Placeholder model: the Shipping Bin mod's own bin.
console.info("[SOCIETY] smartShippingBin.js loaded");

StartupEvents.registry("block", (event) => {
  event
    .create("shippingbin:smart_shipping_bin", "cardinal")
    .soundType("wood")
    .tagBlock("minecraft:mineable/axe")
    .tagBlock("society:shipping_bin")
    .parentModel("shippingbin:block/shipping_bin")
    .item((item) => {
      item.tooltip(Text.translatable("tooltip.society.smart_shipping_bin").gray());
      item.tooltip(Text.translatable("tooltip.society.smart_shipping_bin.warn").red());
      item.parentModel("shippingbin:block/shipping_bin");
    })
    .blockEntity((blockInfo) => {
      blockInfo.initialData({ owner: "-1" });
      blockInfo.inventory("inventory", [], 9, 6);
      blockInfo.rightClickOpensInventory("inventory");
      blockInfo.serverTicking();
      blockInfo.tickFrequency(4000);
    });
});
