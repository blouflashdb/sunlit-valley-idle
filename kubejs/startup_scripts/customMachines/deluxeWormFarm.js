//priority: 100
console.info("[SOCIETY] deluxeWormFarm.js loaded");

global.deluxeWormFarmRecipes = new Map([
  ["crabbersdelight:crab_trap_bait", { output: ["4x crabbersdelight:deluxe_crab_trap_bait"] }],
]);

StartupEvents.registry("block", (event) => {
  event
    .create("society:deluxe_worm_farm", "cardinal")
    .property(workingProperty)
    .property(matureProperty)
    .property(upgradedProperty)
    .soundType("copper")
    .box(2, 0, 2, 14, 15, 14)
    .defaultCutout()
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    // Blockstate: client_scripts/machineBlockstates.js. Models: tools/port/assets/make_machine_placeholder.py.
    .parentModel("society:block/kubejs/deluxe_worm_farm/deluxe_worm_farm_off")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.deluxe_worm_farm.description").gray());
      item.parentModel("society:block/kubejs/deluxe_worm_farm/deluxe_worm_farm_off");
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
      let { player, item, block, hand, level } = click;
      if (player.isFake()) return;
      let upgraded = global.isBlockPropertyTrue(block, "upgraded");

      if (String(hand) === "OFF_HAND") return;
      if (String(hand) === "MAIN_HAND") {
        if (!upgraded && String(item.id) === "society:infinity_worm") {
          if (!player.isCreative()) item.count--;
          level.spawnParticles(
            "farmersdelight:star",
            true,
            block.x,
            block.y + 1,
            block.z,
            0.2 * rnd(1, 2),
            0.2 * rnd(1, 2),
            0.2 * rnd(1, 2),
            3,
            0.01
          );
          global.setBlockProperties(block, { upgraded: true });
        }
      }

      global.handleBERightClick(
        "aquaculture:fish_flop",
        click,
        global.deluxeWormFarmRecipes,
        4,
        true
      );

      if (upgraded && !global.isBlockPropertyTrue(block, "working")) {
        global.setMachineData(block, { recipe: "crabbersdelight:crab_trap_bait", stage: 0 });
        global.setBlockProperties(block, { working: true, mature: false });
      }
    })
    .randomTick((tick) => {
      global.handleBERandomTick(tick, rnd50(), 2);
    })
    .blockEntity((blockInfo) => {
      blockInfo.initialData({ stage: 0, recipe: "" });
    });
});
// Morning tick or random tick: see the block entity above and server_scripts/blockEvents/machineTicks.js
