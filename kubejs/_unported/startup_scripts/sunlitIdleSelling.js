// Sunlit Valley Idle: prices items sold from the idle skills storage with the shipping bin rules.
// The mod posts dev.sunlitidle.idle.IdleSellEvent; this handler empties the slots it sells and pays coins.
const idleCoinsFor = (price) => {
  const coins = [];
  let left = price;
  for (let i = 0; i < global.coinMap.length && left > 0; i++) {
    const { coin, value } = global.coinMap[i];
    const count = Math.floor(left / value);
    if (count > 0) {
      coins.push({ coin: coin, count: count });
      left -= count * value;
    }
  }
  return coins;
};

ForgeEvents.onEvent("dev.sunlitidle.idle.IdleSellEvent", (event) => {
  const player = event.getPlayer();
  const items = event.getItems();
  const result = global.processShippingBinInventory(
    items,
    items.getSlots(),
    player.nbt.Attributes,
    player.stages,
    true,
    false
  );
  if (!result || result.calculatedValue <= 0) return;
  result.removedItems.forEach((slot) => {
    items.setStackInSlot(slot, Item.of("minecraft:air"));
  });
  const value = Math.round(result.calculatedValue);
  event.setValue(value);
  idleCoinsFor(value).forEach((entry) => {
    let remaining = entry.count;
    while (remaining > 0) {
      const count = Math.min(64, remaining);
      event.addPayout(Item.of(entry.coin, count));
      remaining -= count;
    }
  });
});
