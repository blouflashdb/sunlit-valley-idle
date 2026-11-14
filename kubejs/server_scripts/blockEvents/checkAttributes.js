console.info("[SOCIETY] checkAttributes.js loaded");

// Left clicking a shipping bin shows its owner and the owner's sell multipliers. The bin keeps the multipliers
// of its owner while the owner is offline (global.cacheShippingBin).
const shippingBinInfoThrottle = societyThrottle();
const shippingBinMultipliers = [
  ["shippingbin:crop_sell_multiplier", "tooltip.society.farmer_product"],
  ["shippingbin:wood_sell_multiplier", "tooltip.society.artisan_product"],
  ["shippingbin:gem_sell_multiplier", "tooltip.society.geologist_product"],
  ["shippingbin:meat_sell_multiplier", "tooltip.society.adventurer_product"],
];

BlockEvents.leftClicked(global.shippingBins, (e) => {
  const { player, block, server } = e;
  if (player.isFake() || shippingBinInfoThrottle(player, 30, "shipping_bin_info")) return;
  const cached = global.cacheShippingBin(block, server);
  if (!cached.player) {
    player.tell(Text.translatable("society.shipping_bin.offline").gray());
    if (!cached.profile) return;
  } else {
    player.tell(Text.translatable("society.shipping_bin.owner", Text.of(`${cached.player.username}`).gold()));
  }
  player.tell(Text.translatable("society.shipping_bin.sell_multipliers").gray());
  shippingBinMultipliers.forEach(([attribute, key]) => {
    let value = cached.profile.attributes[attribute];
    player.tell(
      Text.translatable("society.shipping_bin.multiplier", Text.translatable(key), Text.green(`${value || 1}`))
    );
  });
});
