console.info("[SOCIETY] openShippingBin.js loaded");

BlockEvents.rightClicked(global.shippingBins, (e) => {
  const { player, server } = e;
  server.runCommandSilent(`playsound shippingbin:block.shippingbin.open block @a ${player.x} ${player.y} ${player.z}`);
});

// The placer owns the bin: their sell multipliers and stages price its contents, and the smart bin pays
// into their account.
BlockEvents.placed(global.shippingBins, (e) => {
  if (!e.player) return;
  global.setMachineData(e.block, { owner: String(e.player.getUuid()) });
  global.cacheShippingBin(e.block, e.level.getServer());
});
