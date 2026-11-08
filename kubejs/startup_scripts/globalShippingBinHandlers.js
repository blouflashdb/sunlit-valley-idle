// priority: 1000
// Shipping bin pricing and payout, shared by the basic and smart shipping bins, the shipping bin monitor and
// the idle skills "sell" button (sunlitIdleSelling.js).
//
// 1.21.1 changes:
// - Items carry the quality in the quality_food:quality component (global.getItemQuality).
// - The owner's sell multipliers (shippingbin:*_sell_multiplier attributes) and the selling stages are cached
//   in the bin's data as JSON strings, so a bin keeps selling at the owner's rates while the owner is offline.
// - Messages go to the action bar; debts live in server.persistentData.debts as {uuid: amount}.
// - Splendid Slimes plorts and hearts are plain items now (#13) and are priced through global.trades by id.
console.info("[SOCIETY] globalShippingBinHandlers.js loaded");

const $SBRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $SBUUID = Java.loadClass("java.util.UUID");
const $SBResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");

global.sellAttributes = [
  "shippingbin:crop_sell_multiplier",
  "shippingbin:wood_sell_multiplier",
  "shippingbin:gem_sell_multiplier",
  "shippingbin:meat_sell_multiplier",
];

global.sellStages = [
  "bluegill_meridian",
  "phenomenology_of_treasure",
  "brine_and_punishment",
  "the_quality_of_the_earth",
  "the_metamorphosize",
];

// Coins of the basic shipping bin: it pays into its own 36 slots, so it never uses the big coins.
global.basicCoinMap = [
  { coin: "numismatics:sun", value: 4096 },
  { coin: "numismatics:crown", value: 512 },
  { coin: "numismatics:cog", value: 64 },
  { coin: "numismatics:sprocket", value: 16 },
  { coin: "numismatics:bevel", value: 8 },
  { coin: "numismatics:spur", value: 1 },
];

global.shippingBins = ["shippingbin:basic_shipping_bin", "shippingbin:smart_shipping_bin"];

global.calculateQualityValue = (number, quality, doubled) => {
  if (quality === 1) return Math.round(number * (doubled ? 1.5 : 1.25));
  if (quality === 2) return Math.round(number * (doubled ? 2 : 1.5));
  if (quality === 3) return Math.round(number * (doubled ? 3 : 2));
  return number;
};

// [{coin, count}], biggest coins first.
global.calculateCoinsFromValue = (price, coinMap) => {
  const coins = [];
  let left = Math.max(0, Math.floor(price));
  for (let i = 0; i < coinMap.length && left > 0; i++) {
    let { coin, value } = coinMap[i];
    let count = Math.floor(left / value);
    if (count > 0) {
      coins.push({ coin: coin, count: count });
      left -= count * value;
    }
  }
  return coins;
};

global.calculateSlotsNeeded = (coins) => {
  let slots = 0;
  coins.forEach((entry) => {
    slots += Math.ceil(entry.count / 64);
  });
  return slots;
};

// The owner's value of a sell multiplier attribute, 1 when the attribute is missing.
global.getPlayerSellMultiplier = (player, attributeId) => {
  try {
    let holder = $SBRegistries.ATTRIBUTE.getHolder($SBResourceLocation.parse(attributeId));
    if (!holder.isPresent()) return 1;
    let instance = player.getAttribute(holder.get());
    return instance ? Number(instance.getValue()) : 1;
  } catch (e) {
    return 1;
  }
};

// {attributeId: value} and the list of selling stages of a player.
global.getSellProfile = (player) => {
  const attributes = {};
  global.sellAttributes.forEach((id) => {
    attributes[id] = global.getPlayerSellMultiplier(player, id);
  });
  const stages = global.sellStages.filter((stage) => player.stages.has(stage));
  return { attributes: attributes, stages: stages };
};

const getCachedProfile = (block) => {
  const attributes = global.getMachineString(block, "attributes");
  const stages = global.getMachineString(block, "stages");
  if (!attributes || !stages) return null;
  try {
    return { attributes: JSON.parse(attributes), stages: JSON.parse(stages) };
  } catch (e) {
    return null;
  }
};

const getOnlineOwner = (server, block) => {
  const owner = global.getMachineString(block, "owner");
  if (!owner || owner === "-1") return null;
  let found = null;
  server.players.forEach((p) => {
    if (String(p.getUuid()) === owner) found = p;
  });
  return found;
};

/**
 * Refreshes the cached sell profile from the owner when the owner is online.
 * Returns {player, profile}; player is null when the owner is offline, profile null when it was never cached.
 */
global.cacheShippingBin = (block, server) => {
  const player = getOnlineOwner(server, block);
  if (player) {
    let profile = global.getSellProfile(player);
    global.setMachineData(block, {
      attributes: JSON.stringify(profile.attributes),
      stages: JSON.stringify(profile.stages),
    });
    return { player: player, profile: profile };
  }
  return { player: null, profile: getCachedProfile(block) };
};

const hasItemTag = (stack, tag) => {
  try {
    return stack.hasTag(tag);
  } catch (e) {
    return false;
  }
};

/**
 * Price of one stack under a sell profile, 0 when it does not sell.
 */
global.getStackSellValue = (stack, profile) => {
  if (stack.isEmpty()) return 0;
  const id = String(stack.id);
  const trade = global.trades.get(id);
  if (!trade) return 0;
  const stages = profile.stages;
  const quality = global.getItemQuality(stack);
  const doubleQuality =
    quality > 0 &&
    stages.includes("the_quality_of_the_earth") &&
    String(trade.multiplier) === "shippingbin:crop_sell_multiplier" &&
    !hasItemTag(stack, "minecraft:fishes");
  let itemValue = global.calculateQualityValue(trade.value, quality, doubleQuality);
  if (stages.includes("bluegill_meridian") && id === "aquaculture:bluegill") {
    itemValue = global.calculateQualityValue(666, quality, false);
  }
  if (
    stages.includes("phenomenology_of_treasure") &&
    (hasItemTag(stack, "society:artifacts") || hasItemTag(stack, "society:relics"))
  ) {
    itemValue *= 3;
  }
  if (stages.includes("brine_and_punishment") && hasItemTag(stack, "society:brine_and_punishment")) {
    itemValue *= 2;
  }
  let multiplier = Number(profile.attributes[trade.multiplier]);
  if (!(multiplier > 0)) multiplier = 1;
  const value = Math.round(itemValue * stack.count * multiplier);
  return isNaN(value) ? itemValue * stack.count : value;
};

/**
 * Prices an item handler. Returns {calculatedValue, removedItems}; removedItems are the sold slots.
 * Unless simulated, sold slots are emptied (or only listed, with returnRemoved).
 */
global.processShippingBinInventory = (inventory, slots, profile, returnRemoved, simulated) => {
  let calculatedValue = 0;
  const removedItems = [];
  for (let i = 0; i < slots; i++) {
    let stack = inventory.getStackInSlot(i);
    let value = global.getStackSellValue(stack, profile);
    if (value <= 0) continue;
    calculatedValue += value;
    removedItems.push(i);
    if (!simulated && !returnRemoved) inventory.setStackInSlot(i, Item.of("minecraft:air"));
  }
  return { calculatedValue: calculatedValue, removedItems: removedItems };
};

// Debts (hospital bills). Stored as server.persistentData.debts = {uuid: amount}.
global.getDebt = (server, uuid) => {
  const debts = server.persistentData.getCompound("debts");
  return debts.contains(String(uuid)) ? Number(debts.getLong(String(uuid))) : 0;
};

global.setDebt = (server, uuid, amount) => {
  const debts = server.persistentData.getCompound("debts");
  if (amount > 0) debts.putLong(String(uuid), Math.round(amount));
  else debts.remove(String(uuid));
  server.persistentData.put("debts", debts);
};

global.addDebt = (server, uuid, amount) => {
  global.setDebt(server, uuid, global.getDebt(server, uuid) + amount);
};

// Pays the owner's debt from a sale first and returns what is left.
global.handleShippingBinDebt = (value, ownerUuid, server, player) => {
  if (!ownerUuid || ownerUuid === "-1") return value;
  const debt = global.getDebt(server, ownerUuid);
  if (debt <= 0) return value;
  const paid = Math.min(debt, value);
  global.setDebt(server, ownerUuid, debt - paid);
  if (player) {
    player.setStatusMessage(
      paid >= debt
        ? Text.translatable("society.shipping_bin.debt_paid_all", global.formatPrice(paid.toFixed())).green()
        : Text.translatable("society.shipping_bin.debt_paid", global.formatPrice(paid.toFixed()))
    );
  }
  return value - paid;
};

const popCoins = (block, outputs, facing) => {
  outputs.forEach((output) => {
    let left = output.count;
    while (left > 0) {
      let count = Math.min(64, left);
      block.popItemFromFace(Item.of(output.coin, count), facing);
      left -= count;
    }
  });
};

const ownerAccount = (ownerUuid) => {
  try {
    return global.GLOBAL_BANK.getAccount($SBUUID.fromString(ownerUuid));
  } catch (e) {
    return null;
  }
};

/**
 * Pays out a sale.
 * Basic bin (external false): coins go into the bin's own slots; the sold slots are only emptied when the
 * coins fit. Smart bin (external true): money goes into the owner's Numismatics account, or is dropped in
 * front of the bin when there is no account. Returns true when the sale went through.
 */
global.processValueOutput = (value, slots, removedSlots, player, server, block, inventory, external) => {
  if (value <= 0) return false;
  const ownerUuid = global.getMachineString(block, "owner");
  value = Math.round(global.handleShippingBinDebt(value, ownerUuid, server, player));
  const outputs = global.calculateCoinsFromValue(value, external ? global.coinMap : global.basicCoinMap);
  let free = 0;
  for (let i = 0; i < slots; i++) {
    if (inventory.getStackInSlot(i).isEmpty()) free++;
  }
  const hasRoom = external || free + removedSlots.length - global.calculateSlotsNeeded(outputs) >= 0;
  if (!hasRoom) {
    if (player) {
      server.runCommandSilent(`playsound stardew_fishing:fish_escape block @a ${player.x} ${player.y} ${player.z} 0.3`);
      player.setStatusMessage(Text.translatable("society.shipping_bin.full").red());
    }
    return false;
  }
  removedSlots.forEach((slot) => inventory.setStackInSlot(slot, Item.of("minecraft:air")));
  if (external) {
    let account = ownerAccount(ownerUuid);
    if (account && value > 0 && account.getBalance() + value < 2147483000) {
      account.deposit(value);
    } else {
      popCoins(block, outputs, global.getBlockProperty(block, "facing"));
    }
  } else {
    outputs.forEach((output) => {
      let left = output.count;
      for (let i = 0; i < slots && left > 0; i++) {
        if (inventory.getStackInSlot(i).isEmpty()) {
          let count = Math.min(64, left);
          inventory.setStackInSlot(i, Item.of(output.coin, count));
          left -= count;
        }
      }
    });
  }
  if (player && !block.level.hasNeighborSignal(block.pos)) {
    server.runCommandSilent(`playsound etcetera:item.handbell.ring block @a ${player.x} ${player.y} ${player.z} 0.3`);
    player.setStatusMessage(Text.translatable("society.shipping_bin.goods_sold", " ", global.formatPrice(value.toFixed())));
  }
  return true;
};

global.getShippingBinInventory = (block) => {
  const entity = block.getEntity();
  return entity && entity.attachments ? entity.attachments.get("inventory") : null;
};

/**
 * One sale of a shipping bin. The basic bin calls it every morning, the smart bin every 4000 ticks.
 */
global.runShippingBin = (block, server, external) => {
  const inventory = global.getShippingBinInventory(block);
  if (!inventory) return false;
  const cached = global.cacheShippingBin(block, server);
  if (!cached.profile) return false;
  const slots = inventory.getSlots();
  const result = global.processShippingBinInventory(inventory, slots, cached.profile, true, false);
  return global.processValueOutput(
    Math.round(result.calculatedValue),
    slots,
    result.removedItems,
    cached.player,
    server,
    block,
    inventory,
    external
  );
};
