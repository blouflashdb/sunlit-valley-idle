console.info("[SOCIETY] plortMachines.js loaded");

// Slime Ranching (#13): the sunlitidle mod registers the plorts and Slime Hearts of the 24 breeds
// (splendid_slimes:plort_<breed>, splendid_slimes:slime_heart_<breed>) and the idle skill that makes plorts.
// These two machines replace the Splendid Slimes ones and put their output in the inventory below them:
// the Plort Ripper rips one plort into a roll of its table, the Plort Press presses 16 plorts into a Slime Heart.
// Ticks: server_scripts/blockEvents/machineTicks.js.

/** Ripping results of each breed, with weights (from the Splendid Slimes plort_ripping recipes of 1.20.1). */
global.plortRipping = {
  all_seeing: [
    { item: "minecraft:spider_eye", count: 3, weight: 16 },
    { item: "society:pristine_tigerseye", count: 3, weight: 1 },
  ],
  bear: [
    { item: "meadow:flecked_wool", count: 4, weight: 44 },
    { item: "society:fine_wool", count: 1, weight: 22 },
    { item: "species:werefang", count: 1, weight: 10 },
    { item: "buzzier_bees:moobloom_spawn_egg", count: 1, weight: 5 },
    { item: "society:beemonican_seal", count: 1, weight: 1 },
  ],
  bitwise: [
    { item: "minecraft:redstone", count: 32, weight: 10 },
    { item: "society:battery", count: 1, weight: 1 },
  ],
  blazing: [
    { item: "minecraft:blaze_powder", count: 3, weight: 4 },
    { item: "minecraft:blaze_rod", count: 1, weight: 1 },
    { item: "society:fire_quartz", count: 1, weight: 1 },
  ],
  bony: [
    { item: "minecraft:bone", count: 4, weight: 3 },
    { item: "minecraft:bone_block", count: 1, weight: 1 },
    { item: "society:enriched_bone_meal", count: 16, weight: 1 },
  ],
  boomcat: [
    { item: "minecraft:gunpowder", count: 3, weight: 1 },
  ],
  dusty: [
    { item: "minecraft:sand", count: 32, weight: 1 },
    { item: "minecraft:red_sand", count: 32, weight: 1 },
    { item: "atmospheric:arid_sand", count: 32, weight: 1 },
    { item: "atmospheric:red_arid_sand", count: 32, weight: 1 },
    { item: "beachparty:sandwaves", count: 32, weight: 1 },
  ],
  ender: [
    { item: "minecraft:ender_pearl", count: 1, weight: 1 },
  ],
  gold: [
    { item: "numismatics:crown", count: 4, weight: 100 },
    { item: "vintagedelight:golden_egg", count: 1, weight: 2 },
    { item: "pamhc2trees:lemon_sapling", count: 1, weight: 1 },
  ],
  juicy: [
    { item: "vintagedelight:gearo_berry", count: 1, weight: 1 },
    { item: "vinery:red_grapejuice", count: 1, weight: 8 },
  ],
  luminous: [
    { item: "minecraft:glowstone_dust", count: 16, weight: 12 },
    { item: "etcetera:light_bulb", count: 1, weight: 4 },
    { item: "etcetera:tinted_light_bulb", count: 1, weight: 1 },
  ],
  minty: [
    { item: "minecraft:dragon_breath", count: 1, weight: 150 },
    { item: "botania:pixie_dust", count: 1, weight: 50 },
    { item: "quark:dragon_scale", count: 1, weight: 50 },
    { item: "minecraft:dragon_egg", count: 1, weight: 2 },
  ],
  orby: [
    { item: "create:experience_nugget", count: 32, weight: 1 },
  ],
  phantom: [
    { item: "minecraft:phantom_membrane", count: 3, weight: 4 },
    { item: "society:jade", count: 1, weight: 1 },
  ],
  prisma: [
    { item: "atmospheric:ivory_travertine", count: 32, weight: 1 },
    { item: "atmospheric:peach_travertine", count: 32, weight: 1 },
    { item: "atmospheric:persimmon_travertine", count: 32, weight: 1 },
    { item: "atmospheric:saffron_travertine", count: 32, weight: 1 },
  ],
  puddle: [
    { item: "minecraft:prismarine_crystals", count: 1, weight: 1 },
    { item: "minecraft:prismarine_shard", count: 4, weight: 1 },
  ],
  rotting: [
    { item: "minecraft:rotten_flesh", count: 3, weight: 1 },
  ],
  shulking: [
    { item: "minecraft:shulker_shell", count: 1, weight: 1 },
  ],
  slimy: [
    { item: "minecraft:slime_ball", count: 6, weight: 400 },
    { item: "society:petrified_slime", count: 1, weight: 100 },
    { item: "gamediscs:game_disc_slime", count: 1, weight: 1 },
  ],
  sparkcat: [
    { item: "society:sparkstone", count: 16, weight: 12 },
  ],
  sweet: [
    { item: "minecraft:sugar", count: 32, weight: 5 },
    { item: "supplementaries:sugar_cube", count: 16, weight: 1 },
  ],
  webby: [
    { item: "minecraft:string", count: 4, weight: 4 },
    { item: "minecraft:cobweb", count: 1, weight: 1 },
    { item: "society:spider_silk", count: 1, weight: 1 },
  ],
  weeping: [
    { item: "minecraft:ghast_tear", count: 1, weight: 4 },
    { item: "minecraft:crying_obsidian", count: 1, weight: 1 },
    { item: "society:frozen_tear", count: 1, weight: 2 },
  ],
  // Splendid Slimes had no ripping recipe for Mechanic plorts.
  mechanic: [
    { item: "minecraft:iron_nugget", count: 9, weight: 8 },
    { item: "minecraft:copper_ingot", count: 2, weight: 4 },
  ],
};

global.slimeBreeds = Object.keys(global.plortRipping).sort();

/** The breed of a plort id, or null. */
global.getPlortBreed = (id) => {
  const text = String(id);
  return text.startsWith("splendid_slimes:plort_") ? text.substring("splendid_slimes:plort_".length) : null;
};

/** One roll of a breed's ripping table; results from mods that are not installed are left out. */
global.ripPlort = (breed) => {
  const results = (global.plortRipping[breed] || []).filter((r) => global.itemExists(r.item));
  if (results.length === 0) return null;
  let roll = Math.random() * results.reduce((sum, r) => sum + r.weight, 0);
  for (let i = 0; i < results.length; i++) {
    roll -= results[i].weight;
    if (roll < 0) return Item.of(results[i].item, results[i].count);
  }
  return Item.of(results[0].item, results[0].count);
};

/** Plort Ripper: rips one plort from its inventory into the inventory below. Returns the result or null. */
global.runPlortRipper = (entity) => {
  const { level, block } = entity;
  const inventory = block.getEntity().attachments.get("inventory");
  for (let i = 0; i < inventory.getSlots(); i++) {
    let breed = global.getPlortBreed(inventory.getStackInSlot(i).id);
    if (!breed) continue;
    let result = global.ripPlort(breed);
    if (!result || !global.insertAllBelow(level, block, [result])) continue;
    inventory.extractItem(i, 1, false);
    level.server.runCommandSilent(`playsound minecraft:entity.slime.squish block @a ${block.x} ${block.y} ${block.z}`);
    level.spawnParticles("minecraft:item_slime", true, block.x + 0.5, block.y + 1, block.z + 0.5, 0.2, 0.2, 0.2, 4, 0.01);
    return result;
  }
  return null;
};

/** What the Plort Press takes 16 of, and the heart it makes: every plort, and Honey Blobs for the Bear heart. */
const plortPressRecipes = () => {
  const recipes = global.slimeBreeds.map((breed) => [`splendid_slimes:plort_${breed}`, `splendid_slimes:slime_heart_${breed}`]);
  if (global.itemExists("golemoverhaul:honey_blob")) recipes.push(["golemoverhaul:honey_blob", "splendid_slimes:slime_heart_bear"]);
  return recipes;
};

/** Plort Press: presses 16 plorts of one breed into its Slime Heart, into the inventory below. */
global.runPlortPress = (entity) => {
  const { level, block } = entity;
  const inventory = block.getEntity().attachments.get("inventory");
  const recipes = plortPressRecipes();
  for (let i = 0; i < recipes.length; i++) {
    let input = recipes[i][0];
    let output = recipes[i][1];
    if (global.countInHandler(inventory, input) < 16) continue;
    let heart = Item.of(output);
    if (!global.insertAllBelow(level, block, [heart])) continue;
    global.useFromHandler(inventory, input, 16);
    level.server.runCommandSilent(`playsound minecraft:block.piston.extend block @a ${block.x} ${block.y} ${block.z}`);
    return heart;
  }
  return null;
};

StartupEvents.registry("block", (event) => {
  const slimeMachine = (id, tooltip) => {
    event
      .create(id)
      .tagBlock("minecraft:mineable/pickaxe")
      .tagBlock("minecraft:needs_stone_tool")
      .soundType("metal")
      .defaultCutout()
      // Placeholder model: tools/port/assets/make_machine_placeholder.py --single.
      .parentModel(`society:block/kubejs/${id.split(":")[1]}/${id.split(":")[1]}`)
      .item((item) => {
        item.tooltip(Text.translatable(tooltip).gray());
        item.tooltip(Text.translatable("society.working_block_entity.can_use_hopper").green());
        item.parentModel(`society:block/kubejs/${id.split(":")[1]}/${id.split(":")[1]}`);
      })
      .blockEntity((blockInfo) => {
        blockInfo.inventory("inventory", [], 9, 2);
        blockInfo.rightClickOpensInventory("inventory");
        blockInfo.serverTicking();
        blockInfo.tickFrequency(40);
      });
  };
  slimeMachine("society:plort_ripper", "block.society.plort_ripper.description");
  slimeMachine("society:plort_press", "block.society.plort_press.description");
});
