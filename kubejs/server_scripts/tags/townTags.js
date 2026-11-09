console.info("[SOCIETY] townTags.js loaded");

// Town (#15): blocks that open a shop (Society Trading block_tag) and the villager gift exceptions.
ServerEvents.tags("block", (e) => {
  e.add("society:opens_market", "farmingforblockheads:market");
});
