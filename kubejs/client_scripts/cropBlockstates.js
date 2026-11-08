// Blockstates of the crops in startup_scripts/registration/registerCrops.js. KubeJS 7 removed the
// `blockstateJson` setter, so they are written here; the after_mods pack overrides KubeJS' own blockstate.
console.info("[SOCIETY] cropBlockstates.js loaded");

ClientEvents.generateAssets("after_mods", (event) => {
  Object.keys(global.cropBlockstates).forEach((id) => {
    let [namespace, path] = id.split(":");
    event.json(`${namespace}:blockstates/${path}`, global.cropBlockstates[id]);
  });
});
