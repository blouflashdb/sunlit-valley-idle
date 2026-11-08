// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 places a Basic Shipping Bin, fills it with a crop (base and gold quality) and runs one sale.
// Boot 2 checks that the coins survived the restart and that they add up to the sale value.
// Prints "[PORT-TEST] PHASE1 shippingBin", "[PORT-TEST] PASS shippingBin" or "[PORT-TEST] FAIL shippingBin: ...".

ServerEvents.loaded((event) => {
  const server = event.server;
  const level = server.overworld();
  const spawn = level.getSharedSpawnPos();
  const block = level.getBlock(spawn.x + 2, 300, spawn.z);
  const check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  const coinValue = new Map(global.coinMap.map((c) => [c.coin, c.value]));
  const sumCoins = (inventory) => {
    let total = 0;
    for (let i = 0; i < inventory.getSlots(); i++) {
      let stack = inventory.getStackInSlot(i);
      if (stack.isEmpty()) continue;
      let value = coinValue.get(String(stack.id));
      check(value !== undefined, `unsold item left in slot ${i}: ${stack}`);
      total += value * stack.count;
    }
    return total;
  };

  try {
    if (String(block.id) !== "shippingbin:basic_shipping_bin") {
      check(global.trades.has("minecraft:wheat"), "minecraft:wheat has no trade");
      block.set("shippingbin:basic_shipping_bin", { facing: "north" });
      check(String(block.id) === "shippingbin:basic_shipping_bin", `placing failed, found ${block.id}`);
      let inventory = global.getShippingBinInventory(block);
      check(inventory && inventory.getSlots() === 36, "bin has no 36 slot inventory");
      let profile = { attributes: {}, stages: [] };
      global.setMachineData(block, { owner: "-1", attributes: "{}", stages: "[]" });

      let plain = Item.of("minecraft:wheat", 10);
      let gold = global.withItemQuality(Item.of("minecraft:wheat", 4), 2);
      check(global.getItemQuality(gold) === 2, `quality not applied: ${global.getItemQuality(gold)}`);
      let base = global.trades.get("minecraft:wheat").value;
      check(global.getStackSellValue(plain, profile) === base * 10, "base price is wrong");
      check(global.getStackSellValue(gold, profile) === Math.round(base * 1.5) * 4, "gold price is wrong");
      let expected = base * 10 + Math.round(base * 1.5) * 4;

      inventory.setStackInSlot(0, plain);
      inventory.setStackInSlot(5, gold);
      inventory.setStackInSlot(6, Item.of("minecraft:bedrock"));
      check(global.runShippingBin(block, server, false), "sale did not go through");
      check(String(inventory.getStackInSlot(6).id) === "minecraft:bedrock", "unsellable item was removed");
      inventory.setStackInSlot(6, Item.of("minecraft:air"));
      check(sumCoins(inventory) === expected, `coins ${sumCoins(inventory)} != ${expected}`);
      global.setMachineData(block, { expected: expected });
      console.info("[PORT-TEST] PHASE1 shippingBin");
    } else {
      let inventory = global.getShippingBinInventory(block);
      let expected = global.getMachineInt(block, "expected");
      check(expected > 0, "test data was lost on restart");
      check(sumCoins(inventory) === expected, `coins after restart ${sumCoins(inventory)} != ${expected}`);
      for (let i = 0; i < inventory.getSlots(); i++) inventory.setStackInSlot(i, Item.of("minecraft:air"));
      block.set("minecraft:air");
      console.info("[PORT-TEST] PASS shippingBin");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL shippingBin: ${e}`);
  }
});
