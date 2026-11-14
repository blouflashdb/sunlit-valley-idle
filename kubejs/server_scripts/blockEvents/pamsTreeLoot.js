console.info("[SOCIETY] pamsTreeLoot.js loaded");

// Harvesting a ripe Pam's fruit gives farming experience; Tree Whisperer and Banana Karenina add fruit.
const pamWeirdFruits = {
  "pamhc2trees:pamcherry": "vinery:cherry",
  "pamhc2trees:pamorange": "atmospheric:orange",
  "pamhc2trees:pampassionfruit": "atmospheric:passion_fruit",
};

BlockEvents.rightClicked(pamFruitBlocks, (e) => {
  const { block, player, server } = e;
  if (
    player.isHoldingInAnyHand("minecraft:bone_meal") ||
    player.isHoldingInAnyHand("farm_and_charm:fertilizer") ||
    player.isHoldingInAnyHand("meadow:watering_can")
  )
    return;
  if (Number(global.getBlockProperty(block, "age")) < 7) return;
  const id = String(block.id);
  // pamhc2trees:pamcherry -> pamhc2trees:cherryitem; Pam's apple trees drop the vanilla apple on 1.21.1.
  const fruitItem =
    id === "pamhc2trees:pamapple" ? "minecraft:apple" : `pamhc2trees:${id.substring(id.indexOf(":") + 4)}item`;
  if (player.stages.has("tree_whisperer")) block.popItem(Item.of(pamWeirdFruits[id] || fruitItem, 2));
  if (id === "pamhc2trees:pambanana" && player.stages.has("banana_karenina")) {
    block.popItem(Item.of(fruitItem, player.stages.has("tree_whisperer") ? 5 : 3));
  }
  global.giveExperience(server, player, "farming", 40);
});
