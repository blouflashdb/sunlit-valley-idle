// Multipart blockstates of the artisan machines. KubeJS 7 removed the `blockstateJson` setter, so the
// blockstate files are generated here; the after_mods pack overrides the blockstate KubeJS builds itself.
console.info("[SOCIETY] machineBlockstates.js loaded");

const multipartMachines = ["crystalarium", "preserves_jar", "wine_keg", "aging_cask", "ancient_cask", "bait_maker", "cheese_press", "dehydrator", "fish_smoker", "loom", "mayonnaise_machine", "oil_maker", "recycling_machine", "seed_maker"];
// Machines whose done state shows no exclamation mark (getCardinalMultipartJson's disableExclamation).
const noExclamationMachines = ["fish_smoker"];

ClientEvents.generateAssets("after_mods", (event) => {
  multipartMachines.forEach((name) => {
    event.json(`society:blockstates/${name}`, {
      multipart: global.getCardinalMultipartJson(name, noExclamationMachines.includes(name)),
    });
  });
});
