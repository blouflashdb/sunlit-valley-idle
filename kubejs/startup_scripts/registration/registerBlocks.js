// Plain blocks of the pack, ported one by one from kubejs/_unported/startup_scripts/registration/registerBlocks.js.
console.info("[SOCIETY] registerBlocks.js loaded");

StartupEvents.registry("block", (e) => {
  // Treated Log: a log soaked in oak resin (Create filling), used for the Loom. Textures: society:block/treated_log
  // and society:block/treated_log_top (placeholders in kubejs/assets/minecraft/atlases/blocks.json).
  e.create("society:treated_log", "pillar")
    .soundType("wood")
    .hardness(1.0)
    .resistance(1.0)
    .tagBlock("minecraft:mineable/axe");
});
