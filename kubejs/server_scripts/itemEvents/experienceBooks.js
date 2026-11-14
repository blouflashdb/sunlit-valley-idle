console.info("[SOCIETY] experienceBooks.js loaded");

// Experience books give 1000 experience in their skill; the Book of Stars gives 750 in every skill.
const experienceBookUse = (e, skills, xp) => {
  const { server, player, item } = e;
  skills.forEach((skill) => global.giveExperience(server, player, skill, xp));
  societyPlaySound(server, "minecraft:block.enchantment_table.use", player);
  global.addItemCooldown(player, item, 2);
  item.shrink(1);
};

[
  ["society:yard_work_yearly", "farming"],
  ["society:husbandry_hourly", "husbandry"],
  ["society:mining_monthly", "mining"],
  ["society:combat_quarterly", "adventuring"],
  ["society:wet_weekly", "fishing"],
].forEach(([book, skill]) => {
  ItemEvents.rightClicked(book, (e) => experienceBookUse(e, [skill], 1000));
});

ItemEvents.rightClicked("society:book_of_stars", (e) =>
  experienceBookUse(e, ["farming", "husbandry", "mining", "adventuring", "fishing"], 750)
);
