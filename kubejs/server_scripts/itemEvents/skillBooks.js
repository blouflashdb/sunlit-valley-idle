console.info("[SOCIETY] skillBooks.js loaded");

// Skill books unlock their skill in the Pufferfish's Skills category society:books; the skill gives the stage
// named like the book.
[
  ["alias_moss", "b2zbjhxyrcwlwb9e"],
  ["animal_fancy", "dk83vl5zi9fw3ovi"],
  ["banana_karenina", "76yv8nz8x47d80oe"],
  ["brine_and_punishment", "p5dklukq9ggwgfa4"],
  ["bluegill_meridian", "9ax835fydbyuvjkx"],
  ["bullfish_jobs", "pirgo25ykt4bsbdo"],
  ["canadian_and_famous", "x52wa6t39ywp17zu"],
  ["first_aid_guide", "12wl5sjx8vy7q0xl"],
  ["hitting_hard_and_soft", "t07mtr3euiz40jb0"],
  ["no_name_for_the_sheep", "uzxujhppzlyg5d03"],
  ["intro_to_algorithms", "gv808dy0r2fo6ire"],
  ["paradise_crop", "3grtavzaxp3xbp67"],
  ["slouching_towards_artistry", "pitrguemps2735n3"],
  ["debt_caverns", "bh5306iiysq2692k"],
  ["frogs_bounty_bazaar", "3fgcne477ni1rjxx"],
  ["phenomenology_of_treasure", "z68vn1cf2lucfbos"],
  ["slime_contain_protect", "uj8tnf4jgm0xyp13"],
  ["the_spark_also_rises", "n3wgu1edjjl2t511"],
  ["universal_methods_of_farming", "dm3efjm3y57v34ir"],
  ["wuthering_logs", "y1xltbgkupmcoe0i"],
  ["pond_house_five", "ajxn495vvckv1pow"],
  ["the_quality_of_the_earth", "y99a5jkv7tmu7vmc"],
  ["the_red_and_the_black", "ysthrzir822oedus"],
  ["women_who_run_with_the_plushies", "2vo8noqvq4aj1egy"],
  ["the_metamorphosize", "gjvl3ej2fhc4cwzb"],
].forEach(([book, skillId]) => {
  ItemEvents.rightClicked(`society:${book}`, (e) => {
    const { player, item, server } = e;
    global.addItemCooldown(player, item, 20);
    if (player.stages.has(book)) {
      player.tell(Text.translatable("society.skill_book.already_learn").red());
      return;
    }
    server.runCommandSilent(`puffish_skills skills unlock ${player.username} society:books ${skillId}`);
    player.tell(Text.translatable("society.skill_book.learn").green());
    societyPlaySound(server, "minecraft:block.enchantment_table.use", player);
    item.shrink(1);
  });
});
