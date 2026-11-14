console.info("[SOCIETY] feedingTrough.js loaded");

const troughFillProperty = integerProperty.create("fill", 0, 4);

/** Feeds the hungry farm animals within 6 blocks (13x13x13) once a day: candied feed first, then mana feed, then feed. */
global.runFeedingTrough = (entity) => {
  const { block, level } = entity;
  const inventory = block.getEntity().attachments.get("inventory");
  const day = global.getDay(level);
  const feeds = [
    ["society:candied_animal_feed", 100],
    ["society:mana_feed", 30],
    ["society:animal_feed", 0],
  ];
  global.getAnimalsAround(level, block, 6).forEach((animal) => {
    let data = animal.persistentData;
    let ageLastFed = global.animalInt(data, "ageLastFed");
    if (!ageLastFed || day < ageLastFed) global.setAnimalInt(data, "ageLastFed", day);
    if (day <= global.animalInt(data, "ageLastFed")) return;
    let feed = feeds.filter((f) => global.countInHandler(inventory, f[0]) > 0)[0];
    if (!feed || global.useFromHandler(inventory, feed[0], 1) !== 1) return;
    animal.heal(4);
    global.setAnimalInt(data, "ageLastFed", day);
    if (feed[1] > 0) global.addAffection(data, feed[1]);
    level.spawnParticles("minecraft:happy_villager", true, animal.x, animal.y + 1.5, animal.z, 0.3, 0.3, 0.3, 5, 0.01);
  });
  // The trough looks fuller the more feed it holds.
  const feedCount = feeds.reduce((sum, f) => sum + global.countInHandler(inventory, f[0]), 0);
  let fill = 0;
  if (feedCount >= 512) fill = 4;
  else if (feedCount >= 256) fill = 3;
  else if (feedCount >= 128) fill = 2;
  else if (feedCount >= 8) fill = 1;
  if (Number(global.getBlockProperty(block, "fill")) !== fill) global.setBlockProperties(block, { fill: fill });
};

StartupEvents.registry("block", (event) => {
  event
    .create("society:feeding_trough", "cardinal")
    .property(troughFillProperty)
    .tagBlock("minecraft:mineable/axe")
    .tagBlock("minecraft:needs_stone_tool")
    .box(0, 0, 2, 16, 12, 14)
    .defaultCutout()
    // Blockstate (Farm & Charm trough models by fill): client_scripts/machineBlockstates.js.
    .modelGenerator((m) => m.parent("farm_and_charm:block/feeding_trough_size_0"))
    .item((item) => {
      item.tooltip(Text.translatable("block.society.feeding_trough.description").gray());
      item.tooltip(Text.translatable("tooltip.society.area", "13x13x13").green());
      item.parentModel("farm_and_charm:block/feeding_trough_size_0");
    })
    .defaultState((state) => {
      state.set(troughFillProperty, 0);
    })
    .placementState((state) => {
      state.set(troughFillProperty, 0);
    })
    .blockEntity((blockInfo) => {
      blockInfo.inventory("inventory", [], 9, 1);
      blockInfo.rightClickOpensInventory("inventory");
      blockInfo.serverTicking();
      blockInfo.tickFrequency(300);
    });
});
// Tick: server_scripts/blockEvents/machineTicks.js
