console.info("[SOCIETY] autoPetter.js loaded");

const autoPetterTickRate = 20;

/** Every morning it pets the farm animals within 2 blocks (5x5x5). Hungry or crowded animals lose affection. */
global.runAutoPetter = (entity) => {
  const { block, level } = entity;
  if (!global.isMorningTick(level, autoPetterTickRate)) return;
  const day = global.getDay(level);
  global.getAnimalsAround(level, block, 2).forEach((animal) => {
    let data = animal.persistentData;
    if (day <= global.animalInt(data, "ageLastPet")) return;
    let hungry = global.compareDay(day, global.animalInt(data, "ageLastFed"), 1);
    let increase = (global.animalFlag(data, "bribed") ? 10 : 5) * (animal.isBaby() ? 2 : 1);
    if (hungry) increase = -15;
    else if (!global.getAnimalIsNotCramped(animal, 1.1)) increase = -25;
    global.addAffection(data, increase);
    global.setAnimalInt(data, "ageLastPet", day);
    level.spawnParticles("minecraft:heart", true, animal.x, animal.y + 1.5, animal.z, 0, 0.1, 0, 1, 0.01);
  });
};

StartupEvents.registry("block", (e) => {
  e.create("society:auto_petter", "cardinal")
    .displayName("Auto-Petter")
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .box(0, 0, 0, 16, 8, 16)
    .defaultCutout()
    // Placeholder model: tools/port/assets/make_machine_placeholder.py --single.
    .modelGenerator((m) => m.parent("society:block/kubejs/auto_petter/auto_petter"))
    .item((item) => {
      item.tooltip(Text.translatable("block.society.auto_petter.description").gray());
      item.tooltip(Text.translatable("tooltip.society.area", "5x5x5").green());
      item.parentModel("society:block/kubejs/auto_petter/auto_petter");
    })
    .blockEntity((blockInfo) => {
      blockInfo.serverTicking();
      blockInfo.tickFrequency(autoPetterTickRate);
    });
});
// Tick: server_scripts/blockEvents/machineTicks.js
