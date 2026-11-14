console.info("[SOCIETY] regretCrystals.js loaded");

// Crystals of Regret reset a skill tree after its first branch choice and give its experience back.
// [skill tree, stages of the branch choice, experience]
[
  ["farming", ["soil_inspector", "sticky_crops"], 15500],
  ["husbandry", ["animal_whisperer", "bribery"], 14500],
  ["mining", ["furniture_archaeologist", "blockchain"], 8750],
  ["fishing", ["mystical_ocean"], 14500],
  ["adventuring", ["fence", "dragonslayer"], 8750],
].forEach((entry) => {
  const tree = entry[0];
  const stages = entry[1];
  const experience = entry[2];
  ItemEvents.rightClicked(`society:crystal_of_regret_${tree}`, (e) => {
    const { player, item, server } = e;
    if (!stages.some((stage) => player.stages.has(stage))) {
      player.tell(Text.translatable("society.crystal_of_regret.fail").red());
      return;
    }
    societyPlaySound(server, "stardew_fishing:fish_escape", player);
    server.runCommandSilent(`puffish_skills category erase ${player.username} society:${tree}`);
    server.runCommandSilent(`puffish_skills points set ${player.username} society:${tree} 0`);
    global.giveExperience(server, player, tree, experience, true);
    player.tell(
      Text.translatable(
        "society.crystal_of_regret.success",
        global.translatableWithFallback(`society_skills.${tree}.category.title`, `${tree}`)
      ).gray()
    );
    item.shrink(1);
  });
});
