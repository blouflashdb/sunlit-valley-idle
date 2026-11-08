// NOT LOADED. Mana fruit part of havestHandling.js; the rest is ported in kubejs/server_scripts/blockEvents.
BlockEvents.rightClicked((e) => {
  if (["society:mana_fruit_crop"].includes(e.item.getId())) {
    if (!e.block.hasTag("dewdrop:waterable")) {
      e.player.inventoryMenu.broadcastFullState();
      e.cancel();
    }
  }
});

BlockEvents.rightClicked("society:mana_fruit_crop", (e) => {
  const { level, server, block, player } = e;
  let blockProperties = level.getBlock(block.pos).getProperties();
  let age = Number(blockProperties.get("age"));

  if (age == 7) {
    blockProperties.age = "0";
    block.set(block.id, blockProperties);
    let quality = global.getCropQuality(block);
    let count = 1;
    if (player.stages.has("paradise_crop")) count += 1;
    if (player.stages.has("crop_collector")) count *= 2;
    if (quality) {
      block.popItemFromFace(
        Item.of(
          `${count}x society:mana_fruit`,
          `{quality_food:{effects:[],quality:${quality}}}`,
        ),
        "up",
      );
    } else {
      block.popItemFromFace(Item.of(`${count}x society:mana_fruit`), "up");
    }
    player.swing();
    server.runCommandSilent(
      `playsound minecraft:block.grass.break block @a ${block.x} ${block.y} ${block.z} 0.5`,
    );
  }
});
