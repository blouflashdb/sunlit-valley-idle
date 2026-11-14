// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Checks the server event scripts ported in #19: every item, block and block state property they use exists,
// Tanuki Decor's slot machine has the block entity methods slotMachine.js calls, the pig race simulation
// ranks all four pigs, and the fish radar lists fish in the overworld and the Nether.
// Prints "[PORT-TEST] PHASE1 serverevents", "[PORT-TEST] PASS serverevents" or "[PORT-TEST] FAIL serverevents: ...".
const $ServerEventsTestRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $ServerEventsTestRL = Java.loadClass("net.minecraft.resources.ResourceLocation");

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let blockExists = (id) => $ServerEventsTestRegistries.BLOCK.containsKey($ServerEventsTestRL.parse(id));
  try {
    [
      "society:red_wrench", "society:fairy_dust", "society:wuthering_logs", "society:alias_moss", "society:mossberry",
      "society:enriched_bone_meal", "society:fish_radar", "society:neptuna", "society:furniture_box",
      "society:bouquet_bag", "society:scavenged_food_bag", "society:fantasy_box_nordic", "society:treasure_totem",
      "society:bubble_totem", "society:dry_totem", "society:rain_totem", "society:thunder_totem",
      "society:tubasmoke_stick", "society:dragontooth_axe", "society:pig_race_ticket",
      "society:multiplayer_pig_race_ticket", "society:the_red_and_the_black", "society:prismatic_shard",
      "society:book_of_stars", "society:yard_work_yearly", "society:crystal_of_regret_farming",
      "society:the_metamorphosize", "meadow:firewood", "meadow:wooden_bucket", "furniture:blueprints",
      "ftbquests:book", "waystones:sharestone", "moblassos:diamond_lasso", "pamhc2trees:pawpawitem",
      "pamhc2trees:appleitem", "vinery:cherry", "atmospheric:orange", "atmospheric:passion_fruit",
      "brewery:dark_brew", "farm_and_charm:fertilizer", "numismatics:prismatic_coin", "create:creative_blaze_cake",
      "autumnity:turkey_egg", "untitledduckmod:duck_egg", "refinedstorage:4k_storage_block",
    ].forEach((id) => check(Item.exists(id), `item ${id} is not registered`));
    [
      ["vinery:apple_leaves", ["can_grow_apples", "has_apples", "age"]],
      ["vinery:dark_cherry_leaves", ["can_grow_cherries", "has_cherries", "age"]],
      ["pamhc2trees:pamapple", ["age"]],
      ["minecraft:cave_vines", ["berries"]],
      ["tanukidecor:slot_machine", ["facing", "half"]],
      ["trofers:large_pillar", []],
      ["treechop:chopped_log", []],
      ["oreganized:lead_ore", []],
      ["herbalbrews:lavender", []],
      ["farm_and_charm:wild_nettle", []],
      ["society:shipping_bin_monitor", []],
    ].forEach((entry) => {
      let id = entry[0];
      let properties = entry[1];
      check(blockExists(id), `block ${id} is not registered`);
      let names = [];
      Block.getBlock(id).defaultBlockState().getProperties().forEach((p) => names.push(String(p.getName())));
      properties.forEach((p) => check(names.includes(p), `block ${id} has no ${p} property (${names})`));
    });
    Object.keys(global.goldenClockMachines).forEach((id) => check(blockExists(id), `fairy dust machine ${id} is missing`));

    let spawn = level.getSharedSpawnPos();
    let machineBlock = level.getBlock(spawn.x - 50, 300, spawn.z + 50);
    if (!server.persistentData.contains("serverEventsTest")) {
      machineBlock.set("tanukidecor:slot_machine", { half: "lower", facing: "north" });
      let machine = slotMachineEntity(machineBlock);
      check(machine, "the slot machine has no block entity");
      check(machine.isActive() === false && typeof machine.isJackpot() === "boolean", "slot machine methods");

      let race = simulatePigRace([[1.2, 1.9], [1.5, 1.0], [1.1, 1.1], [1.9, 1.2]]);
      check(race.frames.length === pigRaceFrames, `the race has ${race.frames.length} frames`);
      check(race.ranking.length === 4 && pigColors.every((pig) => race.ranking.includes(pig)), `ranking ${race.ranking}`);
      check(race.frames[pigRaceFrames - 1].every((p) => p === pigRaceFinish), "not every pig finished");

      let printed = [];
      let probe = { blockPosition: () => spawn };
      let print = (text) => printed.push(text);
      let overworldFish = societyOverworldRadar(level, probe, print);
      check(printed.length === 1, "the radar printed no conditions line");
      check(Array.isArray(overworldFish), "the radar returned no list");
      // The fish lists belong to globalFish.js; the radar skips unknown ids, so only report them.
      overworldFish.filter((id) => !Item.exists(id)).forEach((id) => console.info(`[serverevents] unknown radar fish ${id}`));
      let nether = null;
      server.getAllLevels().forEach((l) => {
        if (String(l.dimension) === "minecraft:the_nether") nether = l;
      });
      check(nether, "no Nether level");
      let netherFish = societyNetherRadar(nether, probe, print);
      check(netherFish.length >= 4 && netherFish.every((id) => Item.exists(id)), `nether radar fish ${netherFish}`);

      let throttle = societyThrottle();
      let fakeEntity = { age: 100, getUuid: () => "test" };
      check(!throttle(fakeEntity, 20, "a") && throttle(fakeEntity, 20, "a"), "the throttle does not throttle");

      server.persistentData.putBoolean("serverEventsTest", true);
      console.info("[PORT-TEST] PHASE1 serverevents");
      return;
    }
    check(String(machineBlock.id) === "tanukidecor:slot_machine", "the slot machine is gone after the restart");
    console.info("[PORT-TEST] PASS serverevents");
  } catch (e) {
    console.error(`[PORT-TEST] FAIL serverevents: ${e}`);
  }
});
