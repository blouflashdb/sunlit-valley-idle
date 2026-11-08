console.info("[SOCIETY] machineOwner.js loaded");

// Machines that apply their owner's skills remember who placed them (startup_scripts/globalMachineOwnerUtils.js).
// Add the other owner machines (Fish Pond Basket, Auto-Grabber, Fish Pond Manager and Hatchery) when they are ported.
BlockEvents.placed(["society:artisan_hopper", "society:mini_artisan_hopper"], (e) => {
  if (!e.player) return;
  global.setMachineData(e.block, { owner: String(e.player.getUuid()) });
});
