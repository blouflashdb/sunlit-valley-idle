console.info("[SOCIETY] customBlockEntityBroken.js loaded");

// The artisan machine drops (handleBrokenMachine) are ported: kubejs/server_scripts/blockEvents/artisanMachineBroken.js

// society:fish_pond is ported: kubejs/server_scripts/blockEvents/fishPondEvents.js

// society:prize_machine is ported: kubejs/server_scripts/blockEvents/prizeMachineEvents.js

BlockEvents.broken("society:coin_leaderboard", (e) => {
  global.clearOldTextDisplay(e.block, e.level, "leaderboard");
});

BlockEvents.broken("society:shipping_bin_monitor", (e) => {
  global.clearOldTextDisplay(e.block, e.level, "shipping_bin_monitor");
});

// society:fish_pond_basket is ported: kubejs/server_scripts/blockEvents/fishPondEvents.js
// society:auto_grabber is ported: kubejs/server_scripts/blockEvents/autoGrabberUpgrade.js
