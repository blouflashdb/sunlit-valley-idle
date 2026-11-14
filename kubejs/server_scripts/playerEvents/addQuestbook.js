console.info("[SOCIETY] addQuestbook.js loaded");

// Starting items: the quest book, and with global.multiplayerSharestones a sharestone and a welcome note.
// Players of the 4.0 starting kit got the Let's Do furniture blueprints once.
PlayerEvents.loggedIn((e) => {
  const { player } = e;
  if (player.stages.has("starting_items_4_0")) {
    player.tell(Text.translatable("society.login_update.title").gray());
    player.tell(Text.translatable("society.login_update.desc_0").white());
    player.tell(Text.translatable("society.login_update.desc_1").white());
    player.give("furniture:blueprints");
    player.stages.add("starting_items_4_1");
    player.stages.remove("starting_items_4_0");
  }
  if (player.stages.has("starting_items_4_1")) return;
  player.stages.add("starting_items_4_1");
  player.give("ftbquests:book");
  if (global.multiplayerSharestones) {
    player.give("waystones:sharestone");
    player.give(
      global.getNotePaperItem(
        global.translatableWithFallback("society.starting_item_sharestone.author", "Society").getString(),
        Text.translatable("society.starting_item_sharestone.text"),
        global.translatableWithFallback("society.starting_item_sharestone.title", "Server Welcome").getString()
      )
    );
  }
});
