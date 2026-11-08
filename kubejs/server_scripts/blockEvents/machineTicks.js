// Morning ticks of the artisan machines. The block entities tick every artMachineTickRate (200) ticks;
// global.handleBETick only advances a machine inside the morning window. BlockEvents.blockEntityTick
// can only be registered from server (or client) scripts in KubeJS 7.
console.info("[SOCIETY] machineTicks.js loaded");

BlockEvents.blockEntityTick("society:crystalarium", (event) => {
  global.handleBETick(event, global.crystalariumCrystals, 5);
});

// Basic Shipping Bin: ticks every 10 ticks, sells once in the morning window.
BlockEvents.blockEntityTick("shippingbin:basic_shipping_bin", (event) => {
  const { level, block } = event;
  const morning = Number(level.dayTime()) % 24000;
  if (morning >= 5 && morning < 15) global.runShippingBin(block, level.getServer(), false);
  else if (Math.random() < 0.05) global.cacheShippingBin(block, level.getServer());
});

// Smart Shipping Bin: ticks every 4000 ticks.
BlockEvents.blockEntityTick("shippingbin:smart_shipping_bin", (event) => {
  global.runShippingBin(event.block, event.level.getServer(), true);
});

BlockEvents.blockEntityTick("society:shipping_bin_monitor", (event) => {
  global.runShippingBinMonitor(event.block, event.level);
});
