console.info("[SOCIETY] cancelItemEvents.js loaded");

// Dark brew is only drunk while crouching, and fertilizer is not used on air.
ItemEvents.rightClicked("brewery:dark_brew", (e) => {
  if (!e.player.isCrouching()) e.cancel();
});

ItemEvents.rightClicked("farm_and_charm:fertilizer", (e) => e.cancel());

// Fishing rods do not work in deployers.
BlockEvents.rightClicked("create:deployer", (e) => {
  if (e.player.getMainHandItem().hasTag("c:tools/fishing_rod")) {
    e.player.tell(Text.translatable("society.fishing_rod.on_deployer").red());
    e.cancel();
  }
});

// Crouch-using a storage block would take it apart.
ItemEvents.rightClicked(["refinedstorage:4k_storage_block", "refinedstorage:64k_storage_block"], (e) => {
  if (e.player.isCrouching()) e.cancel();
});

// The Skull Cavern tool ban is ported: skullCavern/skullCavernEvents.js

// Two fishing rods at once only work on a fish pond.
BlockEvents.rightClicked((e) => {
  const { player, block } = e;
  if (
    player.getMainHandItem().hasTag("c:tools/fishing_rod") &&
    player.getOffhandItem().hasTag("c:tools/fishing_rod") &&
    String(block.id) !== "society:fish_pond"
  ) {
    e.cancel();
  }
});
