console.info("[SOCIETY] machineOwner.js loaded");

// Machines that apply their owner's skills remember who placed them (startup_scripts/globalMachineOwnerUtils.js).
BlockEvents.placed(
  [
    "society:artisan_hopper",
    "society:mini_artisan_hopper",
    "society:auto_grabber",
    "society:fish_pond_basket",
    "society:fish_pond_hatchery",
    "society:fish_pond_manager",
  ],
  (e) => {
    if (!e.player) return;
    global.setMachineData(e.block, { owner: String(e.player.getUuid()) });
  }
);
