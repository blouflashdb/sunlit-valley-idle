// Guards for storage blocks, ported from compactingDrawerExploit.js and preventChestVoid.js (1.20.1):
//  - quality items can't go into compacting drawers (compacting would drop or copy the quality);
//  - a double chest that holds items can't take the Sophisticated Storage tier upgrade (the upgrade voids one half);
//  - the mincer takes no second stack of the item it already holds (the extra items were lost).
console.info("[SOCIETY] storageGuards.js loaded");

const $StorageGuardRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $StorageGuardRL = Java.loadClass("net.minecraft.resources.ResourceLocation");

const compactingDrawers = [
  "functionalstorage:compacting_drawer",
  "functionalstorage:simple_compacting_drawer",
  "functionalstorage:compacting_framed_drawer",
  "functionalstorage:framed_simple_compacting_drawer",
];

// True when a quality item would go into a compacting drawer.
const compactingDrawerRefuses = (item) => !item.isEmpty() && global.getItemQuality(item) > 0;

BlockEvents.rightClicked(compactingDrawers, (e) => {
  let { item, player } = e;
  if (!compactingDrawerRefuses(item)) return;
  player.tell(Text.translatable("society.compacting_drawer.quality_item").red());
  e.cancel();
});

const upgradeableChests = [
  "minecraft:chest",
  "quark:ancient_chest",
  "quark:azalea_chest",
  "quark:blossom_chest",
  "quark:oak_chest",
  "quark:spruce_chest",
  "quark:birch_chest",
  "quark:jungle_chest",
  "quark:acacia_chest",
  "quark:dark_oak_chest",
  "quark:crimson_chest",
  "quark:warped_chest",
  "quark:mangrove_chest",
  "quark:bamboo_chest",
  "quark:cherry_chest",
  "quark:nether_brick_chest",
  "quark:purpur_chest",
  "quark:prismarine_chest",
  "quark:jungle_trapped_chest",
].filter((id) => $StorageGuardRegistries.BLOCK.containsKey($StorageGuardRL.parse(id)));

// True when the tier upgrade would void the items of a double chest.
const chestUpgradeVoids = (block, item) => {
  if (String(item.id) !== "sophisticatedstorage:basic_tier_upgrade") return false;
  let type = block.getProperties().get("type");
  if (!type || String(type) === "single") return false;
  let entity = block.getEntity();
  return entity !== null && !entity.isEmpty();
};

BlockEvents.rightClicked(upgradeableChests, (e) => {
  let { block, player, hand, item } = e;
  if (String(hand) !== "MAIN_HAND" || !chestUpgradeVoids(block, item)) return;
  player.tell(Text.translatable("society.chest_upgrade.void_warn").red());
  e.cancel();
});

BlockEvents.rightClicked("farm_and_charm:mincer", (e) => {
  let { block, player, item } = e;
  if (player.isCrouching() || item.isEmpty()) return;
  let entity = block.getEntity();
  if (!entity || !entity.getItem) return;
  if (String(entity.getItem(0).getItem().builtInRegistryHolder().key().location()) !== String(item.id)) return;
  player.tell(Text.translatable("society.mincer.warn").red());
  player.inventoryMenu.broadcastFullState();
  e.cancel();
});
