// Multipart blockstates of the artisan machines. KubeJS 7 removed the `blockstateJson` setter, so the
// blockstate files are generated here; the after_mods pack overrides the blockstate KubeJS builds itself.
console.info("[SOCIETY] machineBlockstates.js loaded");

const multipartMachines = ["crystalarium"];

ClientEvents.generateAssets("after_mods", (event) => {
  multipartMachines.forEach((name) => {
    event.json(`society:blockstates/${name}`, { multipart: global.getCardinalMultipartJson(name) });
  });
});
