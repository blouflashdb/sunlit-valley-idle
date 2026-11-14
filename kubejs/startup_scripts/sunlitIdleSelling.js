// Sunlit Valley Idle: prices items sold from the idle skills storage with the shipping bin rules.
// The mod posts dev.sunlitidle.idle.IdleSellEvent; this handler empties the slots it sells and pays coins.
console.info("[SOCIETY] sunlitIdleSelling.js loaded");

NativeEvents.onEvent(Java.loadClass("dev.sunlitidle.idle.IdleSellEvent"), (event) => {
  const player = event.getPlayer();
  const items = event.getItems();
  const profile = global.getSellProfile(player);
  const result = global.processShippingBinInventory(items, items.getSlots(), profile, true, false);
  if (!result || result.calculatedValue <= 0) return;
  result.removedItems.forEach((slot) => {
    items.setStackInSlot(slot, Item.of("minecraft:air"));
  });
  let value = Math.round(result.calculatedValue);
  event.setValue(value);
  value = Math.round(global.handleShippingBinDebt(value, String(player.getUuid()), player.getServer(), player));
  global.calculateCoinsFromValue(value, global.coinMap).forEach((entry) => {
    let remaining = entry.count;
    while (remaining > 0) {
      let count = Math.min(64, remaining);
      event.addPayout(Item.of(entry.coin, count));
      remaining -= count;
    }
  });
});
