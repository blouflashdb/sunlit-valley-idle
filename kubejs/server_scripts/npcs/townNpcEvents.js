console.info("[SOCIETY] townNpcEvents.js loaded");

// Town villagers (#15): the events for startup_scripts/npcs/townNpcs.js.

ItemEvents.entityInteracted((e) => {
  const { hand, player, item, target } = e;
  if (String(hand) !== "MAIN_HAND" || player.isFake()) return;
  if (String(item.id) === "easy_npc_config_ui:easy_npc_wand") return;
  const type = String(target.type);
  if (global.townNpcIds.indexOf(type) !== -1) {
    const npcId = global.getTownNpcKey(target);
    if (npcId && global.handleTownNpc(player, npcId, target, item)) e.cancel();
  } else if (type === "minecraft:villager" && !player.isCrouching()) {
    global.handleGnomeVillager(player, target, item);
    e.cancel();
  }
});

BlockEvents.rightClicked("mysticaloaktree:wise_oak", (e) => {
  const { hand, player, block, item } = e;
  if (String(hand) !== "MAIN_HAND" || player.isFake()) return;
  if (global.handleTownNpc(player, "wise_oak", block, item)) e.cancel();
});

ItemEvents.rightClicked("society:invitation", (e) => {
  const { player, item, server } = e;
  if (player.isFake() || global.isItemOnCooldown(player, item)) return;
  global.useInvitation(player, item, server);
  global.addItemCooldown(player, item, 4);
  e.cancel();
});

BlockEvents.placed("society:villager_home", (e) => {
  const { player, block } = e;
  if (!player || player.isFake()) {
    e.cancel();
    return;
  }
  let item = player.getMainHandItem();
  if (String(item.id) !== "society:villager_home") item = player.getOffHandItem();
  const npcId = global.getVillagerHomeItemNpc(item);
  const error = npcId ? global.placeVillagerHome(player, block, npcId) : "society.villager_home.error";
  if (error) {
    player.tell(Text.translatable(error).red());
    player.inventoryMenu.broadcastFullState();
    e.cancel();
  }
});

BlockEvents.broken("society:villager_home", (e) => {
  if (!global.breakVillagerHome(e.player, e.block)) e.cancel();
});
