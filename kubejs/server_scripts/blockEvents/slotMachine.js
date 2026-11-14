console.info("[SOCIETY] slotMachine.js loaded");

// Tanuki Decor's slot machine takes a coin per spin. Three equal symbols pay three coins of the bet (four with
// The Red and the Black); big coins can also win Prismatic Shards and The Red and the Black.
// 1.21.1: the machine has no "working" block state any more; its block entity tells whether it is spinning
// and whether the spin is a jackpot.
const slotMachineCoins = [
  "numismatics:spur",
  "numismatics:bevel",
  "numismatics:sprocket",
  "numismatics:cog",
  "numismatics:crown",
  "numismatics:sun",
  "numismatics:ancient_coin",
  "numismatics:neptunium_coin",
  "numismatics:prismatic_coin",
];
const slotMachineBigCoins = ["numismatics:sun", "numismatics:neptunium_coin", "numismatics:ancient_coin", "numismatics:prismatic_coin"];

const slotMachineEntity = (block) => {
  for (let candidate of [block, block.up, block.down]) {
    let entity = candidate.entity;
    if (String(candidate.id) === "tanukidecor:slot_machine" && entity && entity.isJackpot) return entity;
  }
  return null;
};

BlockEvents.rightClicked("tanukidecor:slot_machine", (e) => {
  const { block, player, hand, item, server } = e;
  if (player.isFake() || player.isCrouching() || String(hand) !== "MAIN_HAND") return;
  const machine = slotMachineEntity(block);
  if (!machine) return;
  if (machine.isActive()) {
    e.cancel();
    return;
  }
  const coin = String(item.id);
  if (!slotMachineCoins.includes(coin)) return;
  const facing = global.getBlockProperty(block, "facing");
  item.shrink(1);

  server.scheduleInTicks(115, () => {
    if (!machine.isJackpot()) {
      societyPlaySound(server, "stardew_fishing:fish_escape", player);
      return;
    }
    const bonus = player.stages.has("the_red_and_the_black") ? 1 : 0;
    block.popItemFromFace(Item.of(coin, 3 + bonus), facing);
    societyPlaySound(server, "stardew_fishing:complete", player);
    if (!slotMachineBigCoins.includes(coin)) return;
    if (
      player.stages.has("adventuring_mastery") &&
      !player.stages.has("the_red_and_the_black") &&
      Math.random() < 0.05
    ) {
      block.popItemFromFace("society:the_red_and_the_black", facing);
      server.tell(Text.translatable("society.slot_machine.win_big", Text.red(`${player.username}`)).black());
    }
    if (Math.random() < (coin === "numismatics:sun" ? 0.005 : 0.1)) {
      block.popItemFromFace(Item.of("society:prismatic_shard", 1 + bonus), facing);
      server.tell(Text.translatable("society.slot_machine.win_big", Text.gold(`${player.username}`)).gray());
    }
  });
});
