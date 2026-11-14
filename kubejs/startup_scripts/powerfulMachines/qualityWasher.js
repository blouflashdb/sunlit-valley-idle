console.info("[SOCIETY] qualityWasher.js loaded");

/** Moves one item a second from its inventory to the inventory below, without its Quality Food quality. */
global.handleQualityWasher = (entity) => {
  const { level, block } = entity;
  const inventory = block.getEntity().attachments.get("inventory");
  const below = global.getInventoryBelow(level, block);
  if (!below) return;
  for (let i = 0; i < inventory.getSlots(); i++) {
    let slotItem = inventory.getStackInSlot(i);
    if (slotItem.isEmpty()) continue;
    let washed =
      global.getItemQuality(slotItem) > 0 && !slotItem.hasTag("society:plushies")
        ? Item.of(String(slotItem.id), 1)
        : slotItem.copyWithCount(1);
    if (!global.insertIntoHandler(below, washed, true).isEmpty()) continue;
    global.insertIntoHandler(below, washed, false);
    inventory.extractItem(i, 1, false);
    return;
  }
};

StartupEvents.registry("block", (event) => {
  event
    .create("society:quality_washer", "cardinal")
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .defaultCutout()
    // Placeholder model: tools/port/assets/make_machine_placeholder.py --single.
    .parentModel("society:block/kubejs/quality_washer/quality_washer")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.quality_washer.description").gray());
      item.tooltip(Text.translatable("block.society.quality_washer.description.warn").red());
      item.tooltip(Text.translatable("society.working_block_entity.can_use_hopper").green());
      item.parentModel("society:block/kubejs/quality_washer/quality_washer");
    })
    .blockEntity((blockInfo) => {
      blockInfo.inventory("inventory", [], 9, 1);
      blockInfo.rightClickOpensInventory("inventory");
      blockInfo.serverTicking();
      blockInfo.tickFrequency(20);
    });
});
// Tick: server_scripts/blockEvents/machineTicks.js
