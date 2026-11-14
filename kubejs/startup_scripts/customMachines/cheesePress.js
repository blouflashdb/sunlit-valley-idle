//priority: 100
console.info("[SOCIETY] mayonnaiseMachine.js loaded");

global.cheesePressRecipes = new Map([
  ["society:sheep_milk", { output: ["1x meadow:piece_of_sheep_cheese"] }],
  ["society:milk", { output: ["1x meadow:piece_of_cheese"] }],
  ["society:buffalo_milk", { output: ["1x meadow:piece_of_buffalo_cheese"] }],
  ["society:goat_milk", { output: ["1x meadow:piece_of_goat_cheese"] }],
  ["society:warped_milk", { output: ["1x meadow:piece_of_warped_cheese"] }],
  ["society:tri_bull_milk", { output: ["1x farmlife:tribull_cheese_wedge"] }],
  ["society:grain_milk", { output: ["1x meadow:piece_of_grain_cheese"] }],
  ["society:amethyst_milk", { output: ["1x meadow:piece_of_amethyst_cheese"] }],
  ["society:large_sheep_milk", { output: ["1x meadow:sheep_cheese_block"] }],
  ["society:large_milk", { output: ["1x meadow:cheese_block"] }],
  [
    "society:large_buffalo_milk",
    { output: ["1x meadow:buffalo_cheese_block"] },
  ],
  ["society:large_goat_milk", { output: ["1x meadow:goat_cheese_block"] }],
  ["society:large_warped_milk", { output: ["1x meadow:warped_cheese_block"] }],
  [
    "society:large_tri_bull_milk",
    { output: ["1x farmlife:tribull_cheese_wheel"] },
  ],
  ["society:large_grain_milk", { output: ["1x meadow:grain_cheese_block"] }],
  [
    "society:large_amethyst_milk",
    { output: ["1x meadow:amethyst_cheese_block"] },
  ],
]);

StartupEvents.registry("block", (event) => {
  event
    .create("society:cheese_press", "cardinal")
    .property(workingProperty)
    .property(matureProperty)
    .property(upgradedProperty)
    .soundType("copper")
    .box(2, 0, 2, 14, 19, 14)
    .defaultCutout()
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:mineable/axe")
    .tagBlock("minecraft:needs_stone_tool")
    .displayName("Artisan Cheese Press")
    // Blockstate: client_scripts/machineBlockstates.js. Models: tools/port/assets/make_machine_placeholder.py.
    .parentModel("society:block/kubejs/cheese_press/cheese_press_off")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.cheese_press.description").gray());
      item.tooltip(Text.translatable("society.working_block_entity.preserve_quality").green());
      item.parentModel("society:block/kubejs/cheese_press/cheese_press_off");
    })
    .defaultState((state) => {
      state
        .set(workingProperty, false)
        .set(matureProperty, false)
        .set(upgradedProperty, false)
    })
    .placementState((state) => {
      state
        .set(workingProperty, false)
        .set(matureProperty, false)
        .set(upgradedProperty, false)
    })
    .rightClick((click) => {
      let { player, item, block, hand, level } = click;
      if (player.isFake()) return;
      let upgraded = global.isBlockPropertyTrue(block, "upgraded");
      let facing = global.getBlockProperty(block, "facing");

      if (String(hand) === "OFF_HAND") return;
      if (String(hand) === "MAIN_HAND") {
        if (!upgraded && String(item.id) === "society:pink_matter") {
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
          block.set(block.id, {
            facing: facing,
            working: global.getBlockProperty(block, "working"),
            mature: global.getBlockProperty(block, "mature"),
            upgraded: true
          });
        }
      }
      let outputCount = 1;
      if (player.stages.has("rancher") && Math.random() <= 0.2) {
        outputCount = 2;
      }
      global.handleBERightClick(
        "species:block.frozen_meat.place",
        click,
        global.cheesePressRecipes,
        3,
        false,
        false,
        outputCount,
        false,
        true
      );
    })
    .blockEntity((blockInfo) => {
      blockInfo.initialData({ stage: 0, recipe: "", quality: 0 });
      blockInfo.serverTicking();
      blockInfo.tickFrequency(artMachineTickRate);
    });
});
// Morning tick: server_scripts/blockEvents/machineTicks.js
