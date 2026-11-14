console.info("[SOCIETY] customBlockEntityBroken.js loaded");

// The other machines of the 1.20.1 file are ported with their machines (artisanMachineBroken.js,
// fishPondEvents.js, prizeMachineEvents.js, townEconomyEvents.js, autoGrabberUpgrade.js).

// A broken Shipping Bin Monitor removes its price display (global.runShippingBinMonitor).
BlockEvents.broken("society:shipping_bin_monitor", (e) => {
  const { block, level, server } = e;
  server.runCommandSilent(
    `execute in ${String(level.dimension)} run kill @e[type=minecraft:text_display,tag=shipping_bin_monitor-${block.x}-${block.y}-${block.z}]`
  );
});
