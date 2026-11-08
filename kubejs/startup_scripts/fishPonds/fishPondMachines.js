//priority: 80
console.info("[SOCIETY] fishPondMachines.js loaded");

// Fish pond automation (#12): Fish Pond Basket and Hatchery (harvest the ponds around them into the inventory
// below), Fish Pond Manager (hands in pond quests from its inventory) and Roe Recycler (turns roe into pond rewards).
// The basket, hatchery and manager apply the skills of the player who placed them
// (server_scripts/blockEvents/machineOwner.js). Ticks: server_scripts/blockEvents/machineTicks.js.

const fishPondBasketStages = ["bullfish_jobs", "caper_catcher", "caviar_catcher", "hot_hands", "mitosis", "scum_collector"];

/** The fish ponds in a box around a block. */
const fishPondsAround = (level, block, rx, ry, rz) => {
  const ponds = [];
  const { x, y, z } = block;
  $PondBlockPos.betweenClosed(x - rx, y - ry, z - rz, x + rx, y + ry, z + rz).forEach((pos) => {
    if (level.isLoaded(pos) && String(level.getBlock(pos).id) === "society:fish_pond") ponds.push(pos.immutable());
  });
  return ponds;
};

/** Pays one sparkstone from the machine's inventory (or a Sparkstone Recycler); false when there is none. */
const payPondSparkstone = (level, block, fuel) => {
  if (global.sparkstoneRecycled(level, block)) return true;
  return global.useFromHandler(fuel, "society:sparkstone", 1) === 1;
};

/**
 * Harvests one pond into the inventory below the basket for one sparkstone. Upgraded with a bucket, the basket
 * also takes a fish out of a full pond.
 */
global.runFishPondBasket = (entity, pondPos, owner) => {
  const { level, block } = entity;
  const fuel = block.getEntity().attachments.get("inventory");
  const stages = global.getBlockEntityStages(entity);
  const pond = level.getBlock(pondPos);
  if (!global.isBlockPropertyTrue(pond, "mature") || global.countInHandler(fuel, "society:sparkstone") < 1) return;
  const below = global.getInventoryBelow(level, block);
  if (!below) return;
  const roe = global.getRoe(global.getMachineString(pond, "type"));
  if (!global.itemExists(roe) || !global.insertIntoHandler(below, Item.of(roe, 8), true).isEmpty()) return;
  if (!payPondSparkstone(level, block, fuel)) return;
  const harvest = global.handleFishHarvest(level, pond, null, stages);
  // Whatever does not fit below drops on top of the basket.
  harvest.forEach((stack) => {
    let left = global.insertIntoHandler(below, stack, false);
    if (!left.isEmpty()) block.popItem(left);
  });
  level.spawnParticles("minecraft:happy_villager", true, pond.x + 0.5, pond.y + 1, pond.z + 0.5, 0.3, 0.3, 0.3, 3, 0.01);

  const population = global.getMachineInt(pond, "population");
  if (!global.isBlockPropertyTrue(level.getBlock(block.getPos()), "upgraded")) return;
  if (population <= 0 || population !== global.getMachineInt(pond, "max_population")) return;
  if (!global.insertIntoHandler(below, Item.of(global.getMachineString(pond, "type"), 2), true).isEmpty()) return;
  if (!payPondSparkstone(level, block, fuel)) return;
  const extracted = global.handleFishExtraction(level, pond, stages);
  if (extracted) global.insertIntoHandler(below, extracted, false);
};

/** Basket: the ponds in 3x3x3. Hatchery: 3x7x3. */
global.runFishPondBaskets = (entity, height) => {
  const { level, block } = entity;
  const owner = global.cacheOwner(entity, fishPondBasketStages);
  fishPondsAround(level, block, 1, height, 1).forEach((pos) => global.runFishPondBasket(entity, pos, owner));
};

/** Fish Pond Manager: every morning at 7:00, hands in the open quests of the ponds in 21x21x21 from its inventory. */
global.runFishPondManager = (entity, forced) => {
  const { level, block } = entity;
  if (!forced && !global.isMorningTick(level, artMachineTickRate)) return;
  global.cacheOwner(entity, ["pond_house_five"]);
  const stages = global.getBlockEntityStages(entity);
  const inventory = block.getEntity().attachments.get("inventory");
  let completed = 0;
  fishPondsAround(level, block, 10, 10, 10).forEach((pos) => {
    const pond = level.getBlock(pos);
    const quest = global.getPondQuest(pond);
    if (!quest) return;
    const needed = global.getPondQuestCount(quest, stages);
    if (global.countInHandler(inventory, quest.item) < needed) return;
    global.useFromHandler(inventory, quest.item, needed);
    global.completePondQuest(level, pond);
    completed++;
  });
  if (completed > 0) level.server.runCommandSilent(`playsound minecraft:block.amethyst_block.chime block @a ${block.x} ${block.y} ${block.z}`);
  return completed;
};

/** The quest items the ponds around a Fish Pond Manager ask for, as lines "4 x Sea Pickle". */
global.getFishPondManagerRequests = (level, block) => {
  const stages = global.getBlockEntityStages(block);
  const totals = new Map();
  fishPondsAround(level, block, 10, 10, 10).forEach((pos) => {
    const quest = global.getPondQuest(level.getBlock(pos));
    if (quest) totals.set(quest.item, (totals.get(quest.item) || 0) + global.getPondQuestCount(quest, stages));
  });
  const lines = [];
  totals.forEach((count, item) => lines.push(Text.of(`${count} x `).append(Item.of(item).getHoverName())));
  return lines;
};

/** Roe Recycler: 10% a second, turns one roe from its inventory into a roll of that fish's pond rewards. */
global.runRoeRecycler = (entity, forced) => {
  const { level, block } = entity;
  if (!forced && !rnd10()) return;
  const inventory = block.getEntity().attachments.get("inventory");
  const below = global.getInventoryBelow(level, block);
  if (!below) return;
  for (let i = 0; i < inventory.getSlots(); i++) {
    let roeId = String(inventory.getStackInSlot(i).id);
    if (!roeId.endsWith("_roe") || roeId.includes("aged_") || roeId === "society:ancient_roe") continue;
    let outputs = [];
    let fish = global.fishPondDefinitions.get(global.getFishFromRoe(roeId));
    let population = rnd(1, 10);
    if (fish && fish.additionalRewards) {
      fish.additionalRewards.forEach((reward) => {
        if (!global.itemExists(reward.item) || population < reward.minPopulation || Math.random() > reward.chance / 2) return;
        let count =
          population === 10
            ? reward.count
            : Math.floor(Math.max(1, reward.count / 4) * ((population - reward.minPopulation) / (10 - reward.minPopulation)));
        outputs.push(Item.of(reward.item, Math.max(1, count)));
      });
    }
    if (outputs.length === 0 && rnd10()) outputs.push(Item.of("aquaculture:algae"));
    if (outputs.length > 0 && !global.insertAllBelow(level, block, outputs)) continue;
    inventory.extractItem(i, 1, false);
    level.server.runCommandSilent(`playsound minecraft:block.bubble_column.bubble_pop block @a ${block.x} ${block.y} ${block.z}`);
    level.spawnParticles("minecraft:bubble_pop", true, block.x + 0.5, block.y + 1, block.z + 0.5, 0.2, 0.2, 0.2, rnd(2, 6), 0.001);
    return outputs;
  }
};

StartupEvents.registry("block", (event) => {
  const pondBasket = (id, area) => {
    event
      .create(id)
      .tagBlock("minecraft:mineable/axe")
      .tagBlock("minecraft:needs_stone_tool")
      .soundType("copper")
      .defaultCutout()
      .property(upgradedProperty)
      .defaultState((state) => {
        state.set(upgradedProperty, false);
      })
      .placementState((state) => {
        state.set(upgradedProperty, false);
      })
      // Placeholder model: tools/port/assets/make_machine_placeholder.py --single. Blockstate: machineBlockstates.js.
      .parentModel(`society:block/kubejs/${id.split(":")[1]}/${id.split(":")[1]}`)
      .item((item) => {
        item.tooltip(Text.translatable("block.society.fish_pond_basket.description").gray());
        item.tooltip(Text.translatable("society.working_block_entity.apply_player_skill").gray());
        item.tooltip(Text.translatable("block.society.fish_pond_basket.description.upgrade").gold());
        item.tooltip(Text.translatable("tooltip.society.area", area).green());
        item.tooltip(Text.translatable("block.society.fish_pond_basket.description.fuel").lightPurple());
        item.parentModel(`society:block/kubejs/${id.split(":")[1]}/${id.split(":")[1]}`);
        item.fireResistant(true);
      })
      .blockEntity((blockInfo) => {
        blockInfo.inventory("inventory", [], 9, 2);
        blockInfo.rightClickOpensInventory("inventory");
        blockInfo.initialData({ owner: "-1" });
        blockInfo.serverTicking();
        blockInfo.tickFrequency(600);
      });
  };
  pondBasket("society:fish_pond_basket", "3x3x3");
  pondBasket("society:fish_pond_hatchery", "3x7x3");

  event
    .create("society:fish_pond_manager", "cardinal")
    .tagBlock("minecraft:mineable/axe")
    .tagBlock("minecraft:needs_stone_tool")
    .soundType("copper")
    .defaultCutout()
    .parentModel("society:block/kubejs/fish_pond_manager/fish_pond_manager")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.fish_pond_manager.description").gray());
      item.tooltip(Text.translatable("block.society.fish_pond_manager.requests").gray());
      item.tooltip(Text.translatable("society.working_block_entity.apply_player_skill").gray());
      item.tooltip(Text.translatable("tooltip.society.area", "21x21x21").green());
      item.parentModel("society:block/kubejs/fish_pond_manager/fish_pond_manager");
    })
    .blockEntity((blockInfo) => {
      blockInfo.inventory("inventory", [], 9, 2);
      blockInfo.rightClickOpensInventory("inventory");
      blockInfo.initialData({ owner: "-1" });
      blockInfo.serverTicking();
      blockInfo.tickFrequency(artMachineTickRate);
    });

  event
    .create("society:roe_recycler", "cardinal")
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .defaultCutout()
    .parentModel("society:block/kubejs/roe_recycler/roe_recycler")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.roe_recycler.description").gray());
      item.parentModel("society:block/kubejs/roe_recycler/roe_recycler");
    })
    .blockEntity((blockInfo) => {
      blockInfo.inventory("inventory", [], 9, 1);
      blockInfo.rightClickOpensInventory("inventory");
      blockInfo.serverTicking();
      blockInfo.tickFrequency(20);
    });
});
