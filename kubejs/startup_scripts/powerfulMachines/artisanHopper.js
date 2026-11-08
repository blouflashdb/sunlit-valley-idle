console.info("[SOCIETY] artisanHopper.js loaded");

// The Artisan Hopper (7x7x7) and Mini Artisan Hopper (3x3x3) harvest the artisan machines around them into the
// inventory below and refill them from the inventory above. Every action uses one sparkstone from their own
// inventory. They apply the skills of the player who placed them (server_scripts/blockEvents/machineOwner.js).

const $HopperCapabilities = Java.loadClass("net.neoforged.neoforge.capabilities.Capabilities");
const $HopperDirection = Java.loadClass("net.minecraft.core.Direction");

const artisanHopperOwnerStages = ["slouching_towards_artistry", "ancient_aging", "rancher", "aged_prize", "canadian_and_famous"];

const getInventoryAbove = (level, block) =>
  level.getCapability($HopperCapabilities.ItemHandler.BLOCK, block.getPos().above(), $HopperDirection.DOWN);

const handlerHasRoomFor = (handler, stacks) =>
  handler && stacks.every((stack) => global.insertIntoHandler(handler, Item.of(stack), true).isEmpty());

const countInHandler = (handler, id) => {
  let total = 0;
  for (let i = 0; i < handler.getSlots(); i++) {
    let stack = handler.getStackInSlot(i);
    if (String(stack.id) === id) total += stack.count;
  }
  return total;
};

const useFromHandler = (handler, id) => {
  for (let i = 0; i < handler.getSlots(); i++) {
    if (String(handler.getStackInSlot(i).id) === id) {
      handler.extractItem(i, 1, false);
      return true;
    }
  }
  return false;
};

/** True when a Sparkstone Recycler nearby pays for the action (ported with the mana machines). */
const sparkstoneRecycled = (level, block) => (global.checkSparkstoneRecyclers ? global.checkSparkstoneRecyclers(level, block) : false);

const extraOutputs = (artisanMachine, recipes, recipeId, upgraded, stages) => {
  switch (String(artisanMachine.id)) {
    case "society:loom": {
      if (!upgraded || !rnd25()) return [];
      let furniture = Ingredient.of("#society:loot_furniture").itemIds;
      return furniture.length > 0 ? [String(furniture[Math.floor(Math.random() * furniture.length)])] : [];
    }
    case "society:crystalarium": {
      let recipe = recipes.get(recipeId);
      if (!upgraded || !rnd10() || !recipe) return [];
      return recipe.output.map((item) => `society:pristine_${String(Item.of(item).id).split(":")[1]}`).filter(global.itemExists);
    }
    case "society:seed_maker":
      return upgraded && rnd5() ? ["society:ancient_fruit_seed"] : [];
    case "society:aging_cask":
      return stages.has("aged_prize") && rnd5() ? ["society:prize_ticket"] : [];
    case "society:wine_keg":
      return upgraded && rnd5() ? ["society:relic_trove"].filter(global.itemExists) : [];
    case "society:mayonnaise_machine":
      return upgraded && rnd5() ? ["society:supreme_mayonnaise"].filter(global.itemExists) : [];
  }
  return [];
};

global.getArtisanMachineData = (player, block, upgraded, stages) => {
  let machineData = {
    recipes: [],
    stageCount: 0,
    multipleInputs: false,
    hasTag: false,
    outputMult: 1,
    soundType: "minecraft:ui.toast.in",
  };
  let rancherOutputCount;
  if (stages.has("rancher") && Math.random() <= 0.2) {
    rancherOutputCount = 2;
  }
  switch (String(block.id)) {
    case "society:loom":
      machineData = {
        recipes: global.loomRecipes,
        stageCount: 5,
        multipleInputs: true,
        hasTag: true,
        outputMult: rancherOutputCount,
        soundType: "minecraft:block.wool.fall",
      };
      break;
    case "society:mayonnaise_machine":
      machineData = {
        recipes: global.mayonnaiseMachineRecipes,
        stageCount: 3,
        outputMult: rancherOutputCount,
        soundType: "minecraft:block.sniffer_egg.plop",
      };
      break;
    case "society:preserves_jar":
      machineData = {
        recipes: global.preservesJarRecipes,
        stageCount: upgraded ? 3 : 5,
        multipleInputs: true,
        soundType: "minecraft:block.wood.place",
      };
      break;
    case "society:crystalarium":
      machineData = {
        recipes: global.crystalariumCrystals,
        stageCount: 5,
        soundType: "minecraft:block.amethyst_block.step",
      };
      break;
    case "society:wine_keg":
      machineData = {
        recipes: global.wineKegRecipes,
        stageCount: 3,
        multipleInputs: true,
        soundType: "minecraft:block.wood.place",
      };
      break;
    case "society:aging_cask":
      machineData = {
        recipes: global.agingCaskRecipes,
        stageCount: 10,
        soundType: "minecraft:block.wood.place",
      };
      break;
    case "society:cheese_press":
      machineData = {
        recipes: global.cheesePressRecipes,
        stageCount: 2,
        outputMult: rancherOutputCount,
        soundType: "minecraft:block.mud.place",
      };
      break;
    case "society:ancient_cask":
      if (stages.has("ancient_aging")) {
        if (upgraded) {
          machineData = {
            recipes: global.ancientCaskRecipes,
            stageCount: 4,
            multipleInputs: true,
            hasTag: false,
            outputMult: 4,
            soundType: "",
          };
        } else
          machineData = {
            recipes: global.ancientCaskRecipes,
            stageCount: 20,
            soundType: "minecraft:block.wood.place",
          };
      } else machineData = undefined;
      break;
    case "society:dehydrator":
      machineData = {
        recipes: global.dehydratorRecipes,
        stageCount: 8,
        multipleInputs: true,
        soundType: "minecraft:block.azalea_leaves.place",
      };
      break;
    case "society:deluxe_worm_farm":
      machineData = {
        recipes: global.deluxeWormFarmRecipes,
        stageCount: 4,
        multipleInputs: true,
        soundType: "aquaculture:fish_flop",
      };
      break;
    case "society:seed_maker":
      machineData = {
        recipes: global.seedMakerRecipes,
        stageCount: 3,
        multipleInputs: true,
        soundType: "minecraft:block.sand.place",
      };
      break;
    case "society:fish_smoker":
      machineData = {
        recipes: global.fishSmokerRecipes,
        stageCount: 5,
        outputMult: upgraded ? 2 : 1,
        soundType: "farmersdelight:block.skillet.add_food",
      };
      break;
    case "society:espresso_machine":
      machineData = {
        recipes: global.espressoMachineRecipes,
        stageCount: 4,
        multipleInputs: true,
        soundType: "doapi:brewstation_whistle",
      };
      break;
    case "society:bait_maker":
      machineData = {
        recipes: global.baitMakerRecipes,
        stageCount: 1,
        soundType: "aquaculture:fish_death",
      };
      break;
    case "society:recycling_machine":
      machineData = {
        recipes: global.recyclingMachineRecipes,
        stageCount: 1,
        soundType: "minecraft:block.basalt.fall",
        outputMult: upgraded ? 2 : 1,
      };
      break;
    case "society:oil_maker":
      machineData = {
        recipes: global.oilMakerRecipes,
        stageCount: 1,
        soundType: "supplementaries:block.jar.place",
      };
      break;
    case "society:tapper":
      machineData = {
        recipes: global.tapperRecipes,
        stageCount: 1,
        soundType: "vinery:cabinet_close",
        outputMult: stages.has("canadian_and_famous") ? 2 : 1,
      };
      break;
    case "society:mushroom_log":
      machineData = {
        recipes: global.mushroomLogRecipes,
        stageCount: 1,
        soundType: "minecraft:block.moss.place",
        outputMult: global.getMachineInt(block, "baseCount") || 1,
      };
      break;
    case "society:charging_rod":
      machineData = { recipes: null, stageCount: 5, soundType: "" };
      break;
    default:
      machineData = undefined;
  }
  return machineData;
};

/**
 * Harvests one machine into the inventory below the hopper and refills it from the inventory above.
 * `hopper` is the hopper block; returns true when it did anything.
 */
global.runArtisanHopper = (level, hopper, artisanMachinePos, player) => {
  const server = level.server;
  const artisanMachine = level.getBlock(artisanMachinePos);
  const { x, y, z } = artisanMachine;
  const machineId = String(artisanMachine.id);
  const fuel = hopper.getEntity().attachments.get("inventory");
  const below = global.getInventoryBelow(level, hopper);
  const upgraded = global.isBlockPropertyTrue(artisanMachine, "upgraded");
  const stages = global.getBlockEntityStages(hopper);
  const loadedData = global.getArtisanMachineData(player, artisanMachine, upgraded, stages);
  if (!loadedData) return false;
  const { recipes, stageCount, multipleInputs, hasTag, outputMult, soundType } = loadedData;
  const season = global.getSeasonFromLevel(level);
  const chargingRodOutput = Item.of("society:battery", upgraded && season === "winter" ? 3 : 1);
  const hasInfinityWorm = machineId === "society:deluxe_worm_farm" && upgraded;
  const currentStage = global.getMachineInt(artisanMachine, "stage");
  const recipeId = global.getMachineString(artisanMachine, "recipe");
  let didWork = false;
  let payFuel = (saveChance) => {
    if (sparkstoneRecycled(level, hopper) || Math.random() < (saveChance || 0)) {
      level.spawnParticles("minecraft:glow", true, x + 0.5, y + 0.5, z + 0.5, 0.2, 0.2, 0.2, 5, 0.01);
    } else useFromHandler(fuel, "society:sparkstone");
  };

  // Harvest
  let expected = machineId === "society:charging_rod" ? [chargingRodOutput] : recipes && recipes.has(recipeId) ? recipes.get(recipeId).output : null;
  if (
    global.isBlockPropertyTrue(artisanMachine, "mature") &&
    expected &&
    handlerHasRoomFor(below, expected) &&
    countInHandler(fuel, "society:sparkstone") > 0
  ) {
    let machineOutputs = [];
    if (machineId === "society:charging_rod") {
      machineOutputs.push(chargingRodOutput);
      global.setMachineData(artisanMachine, { stage: 0 });
      global.setBlockProperties(artisanMachine, { working: false, mature: false });
    } else if (hasInfinityWorm) {
      machineOutputs.push(Item.of("crabbersdelight:deluxe_crab_trap_bait", 4));
      global.setMachineData(artisanMachine, { recipe: "crabbersdelight:crab_trap_bait", stage: 0 });
      global.setBlockProperties(artisanMachine, { working: true, mature: false });
    } else {
      machineOutputs = global.artisanHarvest(artisanMachine, recipes, stageCount, outputMult, machineId === "society:cheese_press", true, server, null) || [];
    }
    if (machineOutputs.length > 0) {
      server.runCommandSilent(`playsound stardew_fishing:dwop block @a ${x} ${y} ${z}`);
      if (machineId === "society:dehydrator" && upgraded && global.dehydratableMushroomOutputs.includes(String(machineOutputs[0].id))) {
        machineOutputs.forEach((output) => (output.count = 2));
      }
      extraOutputs(artisanMachine, recipes, recipeId, upgraded, stages).forEach((id) => machineOutputs.push(Item.of(id)));
      payFuel(stages.has("slouching_towards_artistry") ? currentStage * 0.05 : 0);
      machineOutputs.forEach((output) => global.insertIntoHandler(below, output, false));
      didWork = true;
    }
  }

  // Refill from the inventory above
  const above = getInventoryAbove(level, hopper);
  if (recipes && above && !global.isBlockPropertyTrue(artisanMachine, "working") && countInHandler(fuel, "society:sparkstone") > 0) {
    for (let i = 0; i < above.getSlots(); i++) {
      let slotStack = above.getStackInSlot(i);
      if (slotStack.isEmpty()) continue;
      if (multipleInputs && slotStack.count < stageCount) continue;
      let used = global.artisanInsert(artisanMachine, slotStack.copy(), level, recipes, stageCount, soundType, multipleInputs, hasTag, true, server);
      if (used > 0) {
        payFuel(0);
        server.runCommandSilent(`playsound create:fwoomp block @a ${x} ${y} ${z} 0.8`);
        above.extractItem(i, used, false);
        didWork = true;
        break;
      }
    }
  }
  if (hasInfinityWorm && !global.isBlockPropertyTrue(artisanMachine, "working") && !global.isBlockPropertyTrue(artisanMachine, "mature")) {
    global.setMachineData(artisanMachine, { recipe: "crabbersdelight:crab_trap_bait", stage: 0 });
    global.setBlockProperties(artisanMachine, { working: true, mature: false });
  }
  return didWork;
};

/** Runs the hopper on every artisan machine within `radius`, one machine every 5 ticks. */
global.artisanHopperScan = (entity, radius) => {
  const { block, level } = entity;
  const owner = global.cacheOwner(entity, artisanHopperOwnerStages);
  let scanned = 0;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        let scanBlock = level.getBlock(block.x + dx, block.y + dy, block.z + dz);
        if (!global.artisanMachineIds.includes(String(scanBlock.id))) continue;
        let pos = scanBlock.getPos();
        level.server.scheduleInTicks(scanned * 5, () => global.runArtisanHopper(level, level.getBlock(block.getPos()), pos, owner));
        scanned++;
      }
    }
  }
};

const registerArtisanHopper = (event, id, area) => {
  event
    .create(id, "cardinal")
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .defaultCutout()
    .soundType("copper")
    // Placeholder model: tools/port/assets/make_machine_placeholder.py --single.
    .parentModel(`society:block/kubejs/${id.split(":")[1]}/${id.split(":")[1]}`)
    .item((item) => {
      item.tooltip(Text.translatable("block.society.artisan_hopper.description").gray());
      item.tooltip(Text.translatable("society.working_block_entity.apply_player_skill").gray());
      item.tooltip(Text.translatable("tooltip.society.area", area).green());
      item.tooltip(Text.translatable("block.society.artisan_hopper.description.fuel").lightPurple());
      item.parentModel(`society:block/kubejs/${id.split(":")[1]}/${id.split(":")[1]}`);
    })
    .blockEntity((blockInfo) => {
      blockInfo.inventory("inventory", [], 9, 2);
      blockInfo.rightClickOpensInventory("inventory");
      blockInfo.initialData({ owner: "-1" });
      blockInfo.serverTicking();
      blockInfo.tickFrequency(600);
    });
};

StartupEvents.registry("block", (event) => {
  registerArtisanHopper(event, "society:artisan_hopper", "7x7x7");
  registerArtisanHopper(event, "society:mini_artisan_hopper", "3x3x3");
});
// Tick: server_scripts/blockEvents/machineTicks.js
