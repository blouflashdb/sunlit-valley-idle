// Morning ticks of the artisan machines. The block entities tick every artMachineTickRate (200) ticks;
// global.handleBETick only advances a machine inside the morning window. BlockEvents.blockEntityTick
// can only be registered from server (or client) scripts in KubeJS 7.
console.info("[SOCIETY] machineTicks.js loaded");

BlockEvents.blockEntityTick("society:crystalarium", (event) => {
  global.handleBETick(event, global.crystalariumCrystals, 5);
});
