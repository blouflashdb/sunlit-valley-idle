console.info("[SOCIETY] fishPondEvents.js loaded");

// Fish ponds (#12). Logic: startup_scripts/fishPonds/. On 1.20.1 the pond status was a Paint UI overlay;
// KubeJS 7 has no Paint, so it is shown in the action bar and the quest in chat.

BlockEvents.rightClicked("society:fish_pond", (e) => {
  const { block, hand, item, player, server } = e;
  if (String(hand) !== "MAIN_HAND" || player.isCrouching()) return;
  const heldId = String(item.id);
  // After the pond's own right click (startup_scripts/fishPonds/globalFishPond.js) has run.
  server.scheduleInTicks(1, () => {
    const pond = block.getLevel().getBlock(block.getPos());
    if (String(pond.id) !== "society:fish_pond" || global.isBlockPropertyTrue(pond, "mature")) return;
    const type = global.getMachineString(pond, "type");
    player.displayClientMessage(global.getFishPondStatusText(pond), true);
    if (type !== "" && heldId !== type && heldId !== "minecraft:air" && global.isPondFish(heldId)) {
      player.tell(Text.translatable("block.society.fish_pond.cross_type_fish").red());
    }
    const quest = global.getPondQuest(pond);
    if (quest && quest.item !== heldId && heldId !== "unusualfishmod:ripper_tooth") {
      player.tell(
        Text.translatable("block.society.fish_pond.fish_quest", Text.darkAqua(`${global.getPondQuestCount(quest, player.stages)}`))
          .green()
          .append(" ")
          .append(Item.of(quest.item).getHoverName())
      );
    }
    if (type !== "" && !global.isBlockPropertyTrue(pond, "valid")) {
      player.tell(Text.translatable("block.society.fish_pond.not_valid").red());
    }
  });
});

// A broken pond keeps its fish; the Sea Biscut upgrade drops.
BlockEvents.placed("society:fish_pond", (e) => {
  if (!e.player) return;
  let item = e.player.getMainHandItem();
  if (String(item.id) !== "society:fish_pond") item = e.player.getOffHandItem();
  if (String(item.id) === "society:fish_pond") global.restoreFishPond(e.block, item);
});

BlockEvents.broken("society:fish_pond", (e) => {
  const { block } = e;
  block.popItem(global.fishPondItem(block));
  if (global.isBlockPropertyTrue(block, "upgraded")) block.popItem(Item.of("society:sea_biscut"));
});

// A bucket upgrades the basket and the hatchery: they then also take a fish out of full ponds.
BlockEvents.rightClicked(["society:fish_pond_basket", "society:fish_pond_hatchery"], (e) => {
  const { player, item, block, hand, level } = e;
  if (String(hand) !== "MAIN_HAND" || String(item.id) !== "minecraft:bucket") return;
  if (global.isBlockPropertyTrue(block, "upgraded")) return;
  if (!player.isCreative()) item.shrink(1);
  level.spawnParticles("minecraft:happy_villager", true, block.x + 0.5, block.y + 1, block.z + 0.5, 0.4, 0.4, 0.4, 3, 0.01);
  global.setBlockProperties(block, { upgraded: true });
  e.cancel();
});

BlockEvents.broken(["society:fish_pond_basket", "society:fish_pond_hatchery"], (e) => {
  if (global.isBlockPropertyTrue(e.block, "upgraded")) e.block.popItem(Item.of("minecraft:bucket"));
});

// Sneak-clicking the Fish Pond Manager with an empty hand lists what the ponds around it ask for
// (1.20.1: copied to a Create clipboard, which is not in the 1.21.1 pack).
BlockEvents.rightClicked("society:fish_pond_manager", (e) => {
  const { player, item, block, hand, level } = e;
  if (String(hand) !== "MAIN_HAND" || !player.isCrouching() || !item.isEmpty()) return;
  const lines = global.getFishPondManagerRequests(level, block);
  if (lines.length === 0) player.tell(Text.translatable("block.society.fish_pond_manager.no_requests").gray());
  lines.forEach((line) => player.tell(line));
  e.cancel();
});
