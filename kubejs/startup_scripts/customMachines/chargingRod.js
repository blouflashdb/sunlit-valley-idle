//priority: 100
console.info("[SOCIETY] chargingRod.js loaded");

StartupEvents.registry("block", (event) => {
  event
    .create("society:charging_rod", "cardinal")
    .property(workingProperty)
    .property(matureProperty)
    .property(upgradedProperty)
    .soundType("copper")
    .box(4, 0, 4, 12, 16, 12)
    .defaultCutout()
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    // Blockstate: client_scripts/machineBlockstates.js. Models: tools/port/assets/make_machine_placeholder.py.
    .parentModel("society:block/kubejs/charging_rod/charging_rod_off")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.charging_rod.description").gray());
      item.parentModel("society:block/kubejs/charging_rod/charging_rod_off");
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
      let { player, item, block, hand, level, server } = click;
      if (player.isFake()) return;
      let upgraded = global.isBlockPropertyTrue(block, "upgraded");
      let season = global.getSeasonFromLevel(level);

      if (String(hand) === "OFF_HAND") return;
      if (String(hand) === "MAIN_HAND") {
        if (!upgraded && String(item.id) === "society:frosted_tip") {
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
      if (global.isBlockPropertyTrue(block, "mature")) {
        block.popItemFromFace(
          Item.of(`${upgraded && season === "winter" ? 3 : 1}x society:battery`),
          "up"
        );
        server.runCommandSilent(
          `playsound stardew_fishing:dwop block @a ${player.x} ${player.y} ${player.z}`
        );
        global.giveExperience(server, player, "farming", 40);
        global.setBlockProperties(block, { working: false, mature: false });
      }
    })
    .randomTick((tick) => {
      let { block, level } = tick;
      let { x, y, z } = block;
      let upgraded = global.isBlockPropertyTrue(block, "upgraded");

      if (
        !global.isBlockPropertyTrue(block, "working") &&
        !global.isBlockPropertyTrue(block, "mature")
      ) {
        let season = global.getSeasonFromLevel(level);
        if ((!upgraded && season === "winter") || !level.isRaining() || !level.canSeeSky(block.pos.above())) return;
        if (season !== "winter" && !level.isThundering()) return;
        level.spawnParticles(
          "minecraft:campfire_cosy_smoke",
          true,
          x + 0.5,
          y + 1,
          z + 0.5,
          0.1 * rnd(1, 2),
          0.1 * rnd(1, 2),
          0.1 * rnd(1, 2),
          rnd(1, 4),
          0.1
        );
        level.server.runCommandSilent(
          `execute in ${level.dimension} run summon lightning_bolt ${block.x} ${block.y} ${block.z}`
        );
        global.setMachineData(block, { stage: 0 });
        global.setBlockProperties(block, { working: true, mature: false });
      }
    })
    .blockEntity((blockInfo) => {
      blockInfo.initialData({ stage: 0, recipe: "" });
      blockInfo.serverTicking();
      blockInfo.tickFrequency(artMachineTickRate);
    });
});
// Morning tick or random tick: see the block entity above and server_scripts/blockEvents/machineTicks.js
