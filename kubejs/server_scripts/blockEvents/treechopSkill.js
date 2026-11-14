console.info("[SOCIETY] treechopSkill.js loaded");

// Chopping trees can find the Wuthering Logs and Alias Moss skill books; with them it finds firewood and
// mossberries. Meadow 1.21.1 renamed fire_log to firewood.
BlockEvents.broken("treechop:chopped_log", (e) => {
  const { player, block, level } = e;
  if (!player) return;
  if (Math.random() <= 0.005 && !player.stages.has("wuthering_logs")) block.popItem("society:wuthering_logs");
  if (Math.random() <= 0.15 && player.stages.has("wuthering_logs")) block.popItem("meadow:firewood");

  const season = global.getSeasonFromLevel(level);
  if (Math.random() <= 0.005 && season === "autumn" && !player.stages.has("alias_moss")) {
    block.popItem("society:alias_moss");
  }
  if (Math.random() <= 0.08 && (player.stages.has("alias_moss") || season === "autumn")) {
    block.popItem("society:mossberry");
  }
});
