console.info("[SOCIETY] manaFruitEvents.js loaded");

// Mana Fruit (#14, startup_scripts/mana/manaMachines.js): harvesting, planting only on farmland, and the
// stored mana shown with the Wand of the Forest. Also stops Quark from picking Botania's mystical flowers.

// The seed is the crop block itself; only allow planting it on farmland.
BlockEvents.rightClicked((e) => {
  if (String(e.item.id) !== "society:mana_fruit_crop" || e.block.hasTag("dewdrop:waterable")) return;
  e.player.inventoryMenu.broadcastFullState();
  e.cancel();
});

BlockEvents.rightClicked("society:mana_fruit_crop", (e) => {
  const { level, server, block, player, hand, item } = e;
  if (String(hand) !== "MAIN_HAND") return;
  if (String(item.id) === "botania:twig_wand") {
    player.setStatusMessage(Text.of(global.getManaFruitPips(block)).aqua());
    e.cancel();
    return;
  }
  if (global.getBlockProperty(block, "age") !== "7") return;
  global.setBlockProperties(block, { age: "0" });
  let count = 1;
  if (player.stages.has("paradise_crop")) count += 1;
  if (player.stages.has("crop_collector")) count *= 2;
  let fruit = Item.of("society:mana_fruit", count);
  const quality = global.getCropQuality(block);
  if (quality > 0) fruit = global.withItemQuality(fruit, quality);
  block.popItemFromFace(fruit, "up");
  player.swing();
  server.runCommandSilent(`playsound minecraft:block.grass.break block @a ${block.x} ${block.y} ${block.z} 0.5`);
  e.cancel();
});

// Quark's right-click harvest would pick mystical flowers (and the farmland under them) like crops.
BlockEvents.rightClicked((e) => {
  const { block, level } = e;
  if (block.hasTag("botania:mystical_flowers")) e.cancel();
  else if (block.hasTag("dewdrop:waterable") && level.getBlock(block.getPos().above()).hasTag("botania:mystical_flowers")) e.cancel();
});
