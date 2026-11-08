//priority: 100
console.info("[SOCIETY] mayonnaiseMachine.js loaded");

global.mayonnaiseMachineRecipes = new Map([
  ["minecraft:egg", { output: ["1x society:mayonnaise"] }],
  ["untitledduckmod:duck_egg", { output: ["1x society:duck_mayonnaise"] }],
  ["untitledduckmod:goose_egg", { output: ["1x society:goose_mayonnaise"] }],
  ["quark:egg_parrot_red_blue", { output: ["1x society:parrot_mayonnaise"] }],
  ["quark:egg_parrot_blue", { output: ["1x society:parrot_mayonnaise"] }],
  ["quark:egg_parrot_green", { output: ["1x society:parrot_mayonnaise"] }],
  ["quark:egg_parrot_yellow_blue", { output: ["1x society:parrot_mayonnaise"] }],
  ["quark:egg_parrot_gray", { output: ["1x society:parrot_mayonnaise"] }],
  ["minecraft:turtle_egg", { output: ["1x society:turtle_mayonnaise"] }],
  ["minecraft:sniffer_egg", { output: ["1x society:sniffer_mayonnaise"] }],
  ["minecraft:dragon_egg", { output: ["1x society:dragon_mayonnaise"] }],
  ["vintagedelight:golden_egg", { output: ["1x society:golden_mayonnaise"] }],
  ["autumnity:turkey_egg", { output: ["1x society:turkey_mayonnaise"] }],
  ["society:large_egg", { output: ["1x society:large_mayonnaise"] }],
  ["society:large_duck_egg", { output: ["1x society:large_duck_mayonnaise"] }],
  ["society:large_goose_egg", { output: ["1x society:large_goose_mayonnaise"] }],
  ["society:large_turkey_egg", { output: ["1x society:large_turkey_mayonnaise"] }],
  ["species:birt_egg", { output: ["1x society:birt_mayonnaise"] }],
  ["species:wraptor_egg", { output: ["1x society:wraptor_mayonnaise"] }],
  ["species:springling_egg", { output: ["1x society:springling_mayonnaise"] }],
  ["species:petrified_egg", { output: ["1x society:petrified_mayonnaise"] }],
  ["species:cruncher_egg", { output: ["1x society:cruncher_mayonnaise"] }],
  ["society:flamingo_egg", { output: ["1x society:flamingo_mayonnaise"] }],
  ["society:penguin_egg", { output: ["1x society:penguin_mayonnaise"] }],
  ["farmlife:galliraptor_egg", { output: ["1x society:galliraptor_mayonnaise"] }],
  ["society:large_galliraptor_egg", { output: ["1x society:large_galliraptor_mayonnaise"] }],
  ["minecraft:brown_egg", { output: ["1x society:mayonnaise"] }],
  ["minecraft:blue_egg", { output: ["1x society:mayonnaise"] }],
]);

StartupEvents.registry("block", (event) => {
  event
    .create("society:mayonnaise_machine", "cardinal")
    .property(workingProperty)
    .property(matureProperty)
    .property(upgradedProperty)
    .soundType("copper")
    .box(2, 0, 2, 14, 19, 14)
    .defaultCutout()
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:mineable/axe")
    .tagBlock("minecraft:needs_stone_tool")
    // Blockstate: client_scripts/machineBlockstates.js. Models: tools/port/assets/make_machine_placeholder.py.
    .parentModel("society:block/kubejs/mayonnaise_machine/mayonnaise_machine_off")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.mayonnaise_machine.description").gray());
      item.tooltip(Text.translatable("society.working_block_entity.preserve_quality").green());
      item.parentModel("society:block/kubejs/mayonnaise_machine/mayonnaise_machine_off");
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
      if (String(hand) === "OFF_HAND") return;
      if (String(hand) === "MAIN_HAND") {
        if (!upgraded && String(item.id) === "society:enkephalin") {
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
            facing: global.getBlockProperty(block, "facing"),
            working: global.getBlockProperty(block, "working"),
            mature: global.getBlockProperty(block, "mature"),
            upgraded: true,
          });
        }
      }
      if (upgraded && global.isBlockPropertyTrue(block, "mature") && rnd5()) {
        block.popItemFromFace(
          "society:supreme_mayonnaise",
          global.getBlockProperty(block, "facing")
        );
      }
      let outputCount = 1;
      if (player.stages.has("rancher") && Math.random() <= 0.2) {
        outputCount = 2;
      }
      global.handleBERightClick(
        "minecraft:block.sniffer_egg.plop",
        click,
        global.mayonnaiseMachineRecipes,
        3,
        false,
        false,
        outputCount
      );
    })
    .blockEntity((blockInfo) => {
      blockInfo.initialData({ stage: 0, recipe: "", quality: 0 });
      blockInfo.serverTicking();
      blockInfo.tickFrequency(artMachineTickRate);
    });
});
// Morning tick: server_scripts/blockEvents/machineTicks.js
