//priority: 100
console.info("[SOCIETY] loom.js loaded");

global.loomRecipes = new Map([
  ["#minecraft:wool", { output: ["society:canvas"] }],
  ["etcetera:cotton_flower", { output: ["society:canvas"] }],
  ["society:fine_wool", { output: ["society:merino_wool"] }],
  ["botania:mana_string", { output: ["botania:manaweave_cloth"] }],
  ["crittersandcompanions:silk", { output: ["society:merino_wool"] }],
]);

StartupEvents.registry("block", (event) => {
  event
    .create("society:loom", "cardinal")
    .property(workingProperty)
    .property(matureProperty)
    .property(upgradedProperty)
    .box(0, 0, 1, 16, 26, 16)
    .defaultCutout()
    .displayName("Canvas Loom")
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:mineable/axe")
    .tagBlock("minecraft:needs_stone_tool")
    // Blockstate: client_scripts/machineBlockstates.js. Models: tools/port/assets/make_machine_placeholder.py.
    .parentModel("society:block/kubejs/loom/loom_off")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.loom.description").gray());
      item.parentModel("society:block/kubejs/loom/loom_off");
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
      let facing = global.getBlockProperty(block, "facing");

      if (String(hand) === "OFF_HAND") return;
      if (String(hand) === "MAIN_HAND") {
        if (!upgraded && String(item.id) === "society:tiny_gnome") {
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
            upgraded: true,
          });
        }
      }

      if (upgraded && global.isBlockPropertyTrue(block, "mature") && rnd25()) {
        let furniture = Ingredient.of("#society:loot_furniture").itemIds;
        block.popItemFromFace(furniture[Math.floor(Math.random() * furniture.length)], facing);
      }
      let outputCount = 1;
      if (player.stages.has("rancher") && Math.random() <= 0.2) {
        outputCount = 2;
      }
      global.handleBERightClick(
        "minecraft:block.wool.fall",
        click,
        global.loomRecipes,
        5,
        true,
        true,
        outputCount
      );
    })
    .blockEntity((blockInfo) => {
      blockInfo.initialData({ stage: 0, recipe: "" });
      blockInfo.serverTicking();
      blockInfo.tickFrequency(artMachineTickRate);
    });
});
// Morning tick: server_scripts/blockEvents/machineTicks.js
