//priority: 100
console.info("[SOCIETY] espressoMachine.js loaded");

global.espressoMachineRecipes = new Map([
  ["herbalbrews:ground_coffee", { output: ["1x society:espresso"] }],
  ["society:large_milk", { output: ["4x society:steamed_milk"] }],
  ["society:large_sheep_milk", { output: ["4x society:steamed_milk"] }],
  ["society:large_goat_milk", { output: ["4x society:steamed_milk"] }],
  ["society:large_warped_milk", { output: ["4x society:steamed_milk"] }],
  ["society:large_buffalo_milk", { output: ["4x society:steamed_milk"] }],
  ["society:milk", { output: ["1x society:steamed_milk"] }],
  ["society:sheep_milk", { output: ["1x society:steamed_milk"] }],
  ["society:goat_milk", { output: ["1x society:steamed_milk"] }],
  ["society:warped_milk", { output: ["1x society:steamed_milk"] }],
  ["society:buffalo_milk", { output: ["1x society:steamed_milk"] }],
  [
    "farmersdelight:milk_bottle",
    { output: ["1x society:steamed_milk", "1x minecraft:glass_bottle"] },
  ],
  [
    "vintagedelight:nut_milk_bottle",
    { output: ["1x society:steamed_milk", "1x minecraft:glass_bottle"] },
  ],
]);

StartupEvents.registry("block", (event) => {
  event
    .create("society:espresso_machine", "cardinal")
    .property(workingProperty)
    .property(matureProperty)
    .property(upgradedProperty)
    .box(4, 0, 2, 12, 14, 14)
    .defaultCutout()
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    // Blockstate: client_scripts/machineBlockstates.js. Models: tools/port/assets/make_machine_placeholder.py.
    .parentModel("society:block/kubejs/espresso_machine/espresso_machine_off")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.espresso_machine.description").gray());
      item.parentModel("society:block/kubejs/espresso_machine/espresso_machine_off");
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
      let { item, block, hand, player, server } = click;

      if (player.isFake()) return;
      if (String(hand) === "OFF_HAND") return;
      if (String(hand) === "MAIN_HAND") {
        let recipe = global.espressoMachineRecipes.get(`${item.id}`);
        // Handle steamed milk
        if (recipe && recipe.output[0].includes("steamed_milk")) {
          if (!player.isCreative()) item.count--;
          server.runCommandSilent(
            `playsound minecraft:block.lava.extinguish block @a ${player.x} ${player.y} ${player.z}`
          );
          global.giveExperience(server, player, "farming", 10);
          recipe.output.forEach((e) => {
            block.popItemFromFace(e, global.getBlockProperty(block, "facing"));
          });
        }
      }

      global.handleBERightClick(
        "doapi:brewstation_whistle",
        click,
        new Map([["herbalbrews:ground_coffee", { output: ["1x society:espresso"] }]]),
        4,
        true
      );
    })
    .randomTick((tick) => {
      global.handleBERandomTick(tick, true, 1);
    })
    .blockEntity((blockInfo) => {
      blockInfo.initialData({ stage: 0, recipe: "" });
    });
});
// Morning tick or random tick: see the block entity above and server_scripts/blockEvents/machineTicks.js
