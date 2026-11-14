console.info("[SOCIETY] fairyDust.js loaded");

// Fairy Dust advances a working machine by one stage, like the Golden Clock (global.handleProgress).
BlockEvents.rightClicked(Object.keys(global.goldenClockMachines), (e) => {
  const { player, block, hand, item, server, level } = e;
  if (String(hand) !== "MAIN_HAND" || String(item.id) !== "society:fairy_dust") return;
  if (!global.isBlockPropertyTrue(block, "working") || global.isBlockPropertyTrue(block, "mature")) return;
  const { x, y, z } = block;
  global.handleProgress(level, block);
  societyPlaySound(server, "minecraft:block.amethyst_block.resonate", block, "0.2 1");
  level.spawnParticles(
    "snowyspirit:glow_light",
    true,
    x,
    y + 0.5,
    z,
    0.2 * societyRnd(1, 4),
    0.2 * societyRnd(1, 4),
    0.2 * societyRnd(1, 4),
    5,
    2
  );
  if (!player.isCreative()) item.shrink(1);
});
