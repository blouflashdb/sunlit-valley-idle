//priority: 80
console.info("[SOCIETY] fishPond.js loaded");

// Logic: startup_scripts/fishPonds/globalFishPond.js. Tick: server_scripts/blockEvents/machineTicks.js.
// Status message, placing and breaking: server_scripts/blockEvents/fishPondEvents.js.
// Blockstate: client_scripts/machineBlockstates.js.

StartupEvents.registry("block", (event) => {
  event
    .create("society:fish_pond", "cardinal")
    .property(pondValidProperty)
    .property(matureProperty)
    .property(upgradedProperty)
    .property(pondQuestProperty)
    .defaultCutout()
    .noDrops()
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:mineable/axe")
    .tagBlock("minecraft:needs_stone_tool")
    .parentModel("society:block/kubejs/fish_pond/fish_pond")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.fish_pond.description").gray());
      item.tooltip(Text.translatable("block.society.fish_pond.description.place").green());
      item.parentModel("society:block/kubejs/fish_pond/fish_pond");
      item.fireResistant(true);
    })
    .defaultState((state) => {
      state.set(pondValidProperty, true).set(matureProperty, false).set(upgradedProperty, false).set(pondQuestProperty, false);
    })
    .placementState((state) => {
      state.set(pondValidProperty, true).set(matureProperty, false).set(upgradedProperty, false).set(pondQuestProperty, false);
    })
    .rightClick((click) => {
      global.handleFishPondRightClick(click);
    })
    .blockEntity((blockInfo) => {
      blockInfo.initialData({ type: "", quest_id: 0, population: 0, max_population: 3, non_native_fish: 0 });
      blockInfo.serverTicking();
      blockInfo.tickFrequency(fishPondTickRate);
    });
});
