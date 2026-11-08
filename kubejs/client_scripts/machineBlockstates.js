// Multipart blockstates of the artisan machines. KubeJS 7 removed the `blockstateJson` setter, so the
// blockstate files are generated here; the after_mods pack overrides the blockstate KubeJS builds itself.
console.info("[SOCIETY] machineBlockstates.js loaded");

const multipartMachines = ["crystalarium", "preserves_jar", "wine_keg", "aging_cask", "ancient_cask", "bait_maker", "cheese_press", "dehydrator", "fish_smoker", "loom", "mayonnaise_machine", "oil_maker", "recycling_machine", "seed_maker", "tapper", "mushroom_log", "espresso_machine", "charging_rod", "deluxe_worm_farm"];
// Machines whose done state shows no exclamation mark (getCardinalMultipartJson's disableExclamation).
const noExclamationMachines = ["fish_smoker"];

ClientEvents.generateAssets("after_mods", (event) => {
  // Feeding Trough: Farm & Charm's trough models by fill level.
  const troughFacings = { north: 0, east: 90, south: 180, west: 270 };
  const troughVariants = {};
  Object.keys(troughFacings).forEach((facing) => {
    for (let fill = 0; fill <= 4; fill++) {
      troughVariants[`facing=${facing},fill=${fill}`] = { model: `farm_and_charm:block/feeding_trough_size_${fill}`, y: troughFacings[facing] };
    }
  });
  event.json("society:blockstates/feeding_trough", { variants: troughVariants });

  multipartMachines.forEach((name) => {
    event.json(`society:blockstates/${name}`, {
      multipart: global.getCardinalMultipartJson(name, noExclamationMachines.includes(name)),
    });
  });
});
