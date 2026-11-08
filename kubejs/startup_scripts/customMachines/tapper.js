//priority: 100
console.info("[SOCIETY] tapper.js loaded");

global.tapperRecipes = new Map([
  [
    "minecraft:spruce_log",
    {
      leaves: ["minecraft:spruce_leaves"],
      output: ["1x society:pine_tar"],
      fluidOutput: "society:pine_tar",
      time: 5,
    },
  ],
  [
    "meadow:pine_log",
    {
      leaves: ["meadow:pine_leaves", "meadow:pine_leaves_2"],
      output: ["1x society:pine_tar"],
      fluidOutput: "society:pine_tar",
      time: 5,
    },
  ],
  [
    "minecraft:oak_log",
    {
      leaves: ["minecraft:oak_leaves"],
      output: ["1x society:oak_resin"],
      fluidOutput: "society:oak_resin",
      time: 5,
    },
  ],
  [
    "minecraft:dark_oak_log",
    {
      leaves: ["minecraft:dark_oak_leaves"],
      output: ["1x society:oak_resin"],
      fluidOutput: "society:oak_resin",
      time: 5,
    },
  ],
  [
    "autumnity:maple_log",
    {
      leaves: [
        "autumnity:maple_leaves",
        "autumnity:orange_maple_leaves",
        "autumnity:yellow_maple_leaves",
        "autumnity:red_maple_leaves",
      ],
      output: ["1x society:maple_syrup"],
      fluidOutput: "society:maple_syrup",
      time: 4,
    },
  ],
  [
    "minecraft:acacia_log",
    {
      leaves: ["minecraft:acacia_leaves"],
      output: ["4x society:sap"],
      fluidOutput: "create_central_kitchen:sap",
      time: 1,
    },
  ],
  [
    "mysticaloaktree:wise_oak",
    {
      leaves: ["minecraft:oak_leaves"],
      output: ["4x botania:black_lotus"],
      fluidOutput: "society:oak_resin",
      time: 2,
    },
  ],
  [
    "minecraft:pale_oak_log",
    {
      leaves: ["minecraft:pale_oak_leaves"],
      output: ["32x minecraft:resin_clump"],
      fluidOutput: "society:oak_resin",
      time: 2,
    },
  ],
  [
    "windswept:pine_log",
    {
      leaves: ["meadow:pine_leaves", "meadow:pine_leaves_2"],
      output: ["1x society:pine_tar"],
      fluidOutput: "society:pine_tar",
      time: 5,
    },
  ],
  [
    "cluttered:willow_log",
    {
      leaves: ["cluttered:flowering_willow_leaves", "cluttered:willow_leaves"],
      output: ["1x society:mystic_syrup"],
      fluidOutput: "society:mystic_syrup",
      time: 7,
    },
  ],
]);

StartupEvents.registry("block", (event) => {
  event
    .create("society:tapper", "cardinal")
    .property(workingProperty)
    .property(matureProperty)
    .property(upgradedProperty)
    .property(errorProperty)
    .soundType("copper")
    .defaultCutout()
    .box(3, 0, 6, 13, 16, 16)
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:mineable/axe")
    .tagBlock("minecraft:needs_stone_tool")
    // Blockstate: client_scripts/machineBlockstates.js. Models: tools/port/assets/make_machine_placeholder.py.
    .parentModel("society:block/kubejs/tapper/tapper_off")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.tapper.description").gray());
      item.parentModel("society:block/kubejs/tapper/tapper_off");
    })
    .defaultState((state) => {
      state
        .set(workingProperty, false)
        .set(matureProperty, false)
        .set(upgradedProperty, false)
        .set(errorProperty, false);
    })
    .placementState((state) => {
      state
        .set(workingProperty, false)
        .set(matureProperty, false)
        .set(upgradedProperty, false)
        .set(errorProperty, false);
    })
    .rightClick((click) => {
      let { player, item, block, hand, level } = click;
      if (player.isFake()) return;
      let upgraded = global.isBlockPropertyTrue(block, "upgraded");

      if (String(hand) === "OFF_HAND") return;
      if (String(hand) === "MAIN_HAND") {
        if (!upgraded && String(item.id) === "society:slime_gel") {
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
          let upgradedProperties = block.getProperties();
          upgradedProperties.upgraded = true;
          block.set(block.id, upgradedProperties);
        }
      }
      if (
        !player.stages.has("canadian_and_famous") &&
        global.isBlockPropertyTrue(block, "mature") &&
        Math.random() <= 0.01
      ) {
        block.popItemFromFace("society:canadian_and_famous", global.getBlockProperty(block, "facing"));
      }

      global.handleBERightClick(
        "vinery:cabinet_close",
        click,
        global.tapperRecipes,
        7,
        false,
        false,
        player.stages.has("canadian_and_famous") ? 2 : 1,
        true
      );
      global.handleTapperRandomTick(click);
    })
    .randomTick((tick) => {
      global.handleTapperRandomTick(tick);
    })
    .blockEntity((blockInfo) => {
      blockInfo.initialData({ stage: 0, recipe: "" });
      blockInfo.serverTicking();
      blockInfo.tickFrequency(artMachineTickRate);
    });
});
// Morning tick: server_scripts/blockEvents/machineTicks.js
