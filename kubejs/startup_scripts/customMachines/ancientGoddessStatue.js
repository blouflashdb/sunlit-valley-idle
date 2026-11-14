//priority: 100
console.info("[SOCIETY] ancientGoddessStatue.js loaded");

// Once a day, a stack of 64 of the season's offering gives the season's reward.
global.ancientGoddessOfferings = {
  spring: { item: "society:ancient_fruit", reward: "society:prismatic_shard" },
  summer: { item: "vintagedelight:ghost_pepper", reward: "64x society:sparkstone" },
  autumn: { item: "farm_and_charm:corn", reward: "4x society:pristine_star_shards" },
  winter: { item: "snowyspirit:ginger", reward: "4x minecraft:netherite_scrap" },
};

global.handleAncientGoddessStatueClick = (click) => {
  let { player, item, block, hand, level } = click;
  if (player.isFake()) return;
  if (!player.stages.has("farmers_blessing")) {
    player.tell(Text.translatable("block.society.ancient_goddess_statue.no_skill").red());
    return;
  }
  if (String(hand) !== "MAIN_HAND") return;
  let season = global.getSeasonFromLevel(level);
  let offering = global.ancientGoddessOfferings[season];
  if (!offering) return;
  if (!global.compareDay(global.getDay(level), global.getPlayerDay(player, "ancientGoddessStatueDay"), 1)) {
    player.tell(Text.translatable("block.society.ancient_goddess_statue.already_taken").red());
    return;
  }
  if (String(item.id) !== offering.item || item.count !== 64) {
    player.tell(Text.translatable(`block.society.ancient_goddess_statue.${season}`).aqua());
    return;
  }
  block.popItemFromFace(offering.reward, global.getBlockProperty(block, "facing"));
  if (!player.isCreative()) item.count -= 64;
  successParticles(level, block);
  global.setPlayerDay(player, "ancientGoddessStatueDay", global.getDay(level));
};

StartupEvents.registry("block", (event) => {
  event
    .create("society:ancient_goddess_statue", "cardinal")
    .box(3, 0, 3, 13, 20, 13)
    .defaultCutout()
    .soundType("stone")
    .hardness(4.5)
    .resistance(9.0)
    .requiresTool(false)
    // Placeholder model: tools/port/assets/make_machine_placeholder.py --single.
    .modelGenerator((m) => m.parent("society:block/kubejs/ancient_goddess_statue/ancient_goddess_statue"))
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.ancient_goddess_statue.description").gray());
      item.tooltip(Text.translatable("block.society.ancient_goddess_statue.description.warn").red());
      item.parentModel("society:block/kubejs/ancient_goddess_statue/ancient_goddess_statue");
    })
    .rightClick((click) => global.handleAncientGoddessStatueClick(click));
});
