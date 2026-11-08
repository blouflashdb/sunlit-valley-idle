console.info("[SOCIETY] multiBlockHandlers.js loaded");

// The Growth Obelisk is two blocks high: placing it adds the top half, breaking either half removes both.
BlockEvents.placed("society:growth_obelisk", (e) => {
  let { block, level } = e;
  let above = level.getBlock(block.pos.above());
  if (String(above.id) === "minecraft:air") above.set("society:growth_obelisk_upper", { facing: global.getBlockProperty(block, "facing") });
});

BlockEvents.broken("society:growth_obelisk", (e) => {
  let { block, level } = e;
  if (String(level.getBlock(block.pos.above()).id) === "society:growth_obelisk_upper") level.destroyBlock(block.pos.above(), false);
});

BlockEvents.broken("society:growth_obelisk_upper", (e) => {
  let { block, level } = e;
  if (String(level.getBlock(block.pos.below()).id) === "society:growth_obelisk") level.destroyBlock(block.pos.below(), true);
});
