console.info("[SOCIETY] registerWhimsyBlocks.js loaded");

// Statue of Endless Fortune (Witch shop): once a day it gives a random valuable when right-clicked.
// On 1.20.1 it was a GeckoLib block that turned "mature" every morning. The GeckoLib model came from Society Tweaks
// (ARR), so it is a plain block with a placeholder model now. It stores the last day it paid out instead of ticking,
// starting with the day of the first click. The Sunlit Singing Frog is dropped: nothing in the pack used it.

const endlessFortuneDrops = [
  "society:pristine_diamond",
  "minecraft:netherite_ingot",
  "society:omni_geode",
  "oreganized:electrum_ingot",
];

global.handleEndlessFortuneClick = (click) => {
  const { block, level, hand, player } = click;
  if (level.isClientSide() || player.isFake() || String(hand) !== "MAIN_HAND") return;
  const day = global.getDay(level);
  const lastDay = global.getMachineInt(block, "day");
  if (lastDay === 0) {
    // First click after placing: the statue pays out from the next morning on, so breaking and placing it
    // again gives nothing.
    global.setMachineData(block, { day: day });
    return;
  }
  if (lastDay >= day) return;
  global.setMachineData(block, { day: day });
  block.popItemFromFace(
    endlessFortuneDrops[Math.floor(Math.random() * endlessFortuneDrops.length)],
    global.getBlockProperty(block, "facing")
  );
  level.getServer().runCommandSilent(
    `execute in ${String(level.dimension)} run playsound tanukidecor:block.cash_register.ring block @a ${block.x} ${block.y} ${block.z}`
  );
};

StartupEvents.registry("block", (e) => {
  e.create("whimsy_deco:statue_endless_fortune", "cardinal")
    .displayName("Statue of Endless Fortune")
    .defaultCutout()
    .box(1, 0, 1, 15, 16, 15)
    .soundType("stone")
    .hardness(2.0)
    .tagBlock("minecraft:mineable/pickaxe")
    .parentModel("society:block/kubejs/statue_endless_fortune/statue_endless_fortune")
    .item((item) => item.parentModel("society:block/kubejs/statue_endless_fortune/statue_endless_fortune"))
    .blockEntity((blockInfo) => blockInfo.initialData({ day: 0 }))
    .rightClick((click) => global.handleEndlessFortuneClick(click));
});
