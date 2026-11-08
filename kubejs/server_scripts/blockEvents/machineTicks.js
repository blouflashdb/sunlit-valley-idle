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

BlockEvents.blockEntityTick("society:preserves_jar", (event) => {
  global.handleBETick(event, global.preservesJarRecipes, 3);
});

// Pickling Can: every 600 ticks, one pickle into the inventory below.
BlockEvents.blockEntityTick("society:pickling_can", (event) => {
  global.handlePicklingCan(event.level, event.block);
});

// Fermenting Jar: every 100 ticks.
BlockEvents.blockEntityTick("vintagedelight:fermenting_jar", (event) => {
  global.handleFermentingJar(event.level, event.block);
});

// Evaporator: ticks every 200 ticks, makes salt once in the morning window.
BlockEvents.blockEntityTick("vintagedelight:evaporator", (event) => {
  const morning = Number(event.level.dayTime()) % 24000;
  if (morning >= 20 && morning < 220) global.handleEvaporator(event.level, event.block);
});
