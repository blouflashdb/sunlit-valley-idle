//priority: 100
console.info("[SOCIETY] moonStatue.js loaded");

const statueBuffs = ["moon_extra_ore", "moon_geode_roll", "moon_rope_reveal", "moon_remains", "moon_damage"];

/** Once a day a player with Mining Mastery gets one random mining buff (a stage) from the statue. */
global.handleMoonStatueClick = (click) => {
  let { player, hand, block, level } = click;
  if (player.isFake()) return;
  if (!player.stages.has("mining_mastery")) {
    player.tell(Text.translatable("block.society.moon_statue.no_mastery").red());
    return;
  }
  if (String(hand) !== "MAIN_HAND") return;
  if (!global.claimPlayerDay(player, level, "moonStatueDay")) {
    player.tell(Text.translatable("block.society.moon_statue.already_taken").red());
    return;
  }
  let selectedBuff = statueBuffs[Math.floor(Math.random() * statueBuffs.length)];
  player.tell(Text.translatable("block.society.moon_statue.announce").aqua());
  player.tell(Text.translatable(`block.society.moon_statue.${selectedBuff}`).green());
  statueBuffs.forEach((buff) => player.stages.remove(buff));
  player.stages.add(selectedBuff);
  level.server.runCommandSilent(`playsound create:peculiar_bell_use block @a ${player.x} ${player.y} ${player.z}`);
  level.spawnParticles("minecraft:soul", true, block.x + 0.5, block.y + 1.5, block.z + 0.5, 0.2, 0.2, 0.2, 6, 0.02);
};

StartupEvents.registry("block", (event) => {
  event
    .create("society:moon_statue", "cardinal")
    .displayName("Statue of The Moon Gnome")
    .defaultCutout()
    .soundType("stone")
    .hardness(4.5)
    .resistance(9.0)
    .lightLevel(0.8)
    .requiresTool(false)
    // Placeholder model: tools/port/assets/make_machine_placeholder.py --single.
    .parentModel("society:block/kubejs/moon_statue/moon_statue")
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.moon_statue.description").gray());
      item.parentModel("society:block/kubejs/moon_statue/moon_statue");
    })
    .rightClick((click) => global.handleMoonStatueClick(click));
});
