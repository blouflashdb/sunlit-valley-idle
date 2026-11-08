//priority: 100
console.info("[SOCIETY] oilMaker.js loaded");

global.oilMakerRecipes = new Map([
  ["society:truffle", { output: ["1x society:truffle_oil"] }],
  ["farm_and_charm:corn", { output: ["1x society:oil"] }],
  ["atmospheric:yellow_blossoms", { output: ["1x society:oil"] }],
  ["minecraft:torchflower", { output: ["3x society:oil"] }],
  ["beachparty:coconut_open", { output: ["1x society:coconut_oil"] }],
]);

StartupEvents.registry("block", (event) => {
  event
    .create("society:oil_maker", "cardinal")
    .property(workingProperty)
    .property(matureProperty)
    .property(upgradedProperty)
    .defaultCutout()
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:mineable/axe")
    .tagBlock("minecraft:needs_stone_tool")
    // Blockstate: client_scripts/machineBlockstates.js. Models: tools/port/assets/make_machine_placeholder.py.
    .parentModel("society:block/kubejs/oil_maker/oil_maker_off")
    .item((item) => {
      item.tooltip(
        Text.translatable("block.society.oil_maker.description").gray()
      );
      item.parentModel("society:block/kubejs/oil_maker/oil_maker_off");
    })
    .defaultState((state) => {
      state
        .set(workingProperty, false)
        .set(matureProperty, false)
        .set(upgradedProperty, false);
    })
    .placementState((state) => {
      state
        .set(workingProperty, false)
        .set(matureProperty, false)
        .set(upgradedProperty, false);
    })
    .rightClick((click) => {
      let { block } = click;
      let upgraded = global.isBlockPropertyTrue(block, "upgraded");
      global.handleBERightClick(
        "supplementaries:block.jar.place",
        click,
        global.oilMakerRecipes,
        1,
        false,
        false,
        1
      );
    })
    .blockEntity((blockInfo) => {
      blockInfo.initialData({ stage: 0, recipe: "" });
      blockInfo.serverTicking();
      blockInfo.tickFrequency(artMachineTickRate);
    });
});
// Morning tick: server_scripts/blockEvents/machineTicks.js
