console.info("[SOCIETY] plushieEvents.js loaded");

// Plushies (#14): placing, breaking and gifting the adv_ plushies of startup_scripts/plushies/plushies.js, the
// Plushie Wand pickup and the Gatcha Machine. The 1.20.1 singing frog (an animated block) and storing animals
// with a Sunlit Crystal are not ported yet, so the wand has no animal to take out.

const PLUSHIE_HEART_PARTICLES = (level, block) => {
  level.spawnParticles("minecraft:heart", true, block.x + 0.5, block.y + 0.5, block.z + 0.5, 0.2, 0.2, 0.2, 10, 0.1);
};

const PLUSHIE_GLOW_PARTICLES = (level, block) => {
  level.spawnParticles("minecraft:end_rod", true, block.x + 0.5, block.y + 0.5, block.z + 0.5, 0.4, 0.4, 0.4, 20, 0.05);
};

/** Pops a placed plushie as an item that keeps its data. */
global.popPlushie = (block) => {
  block.popItem(global.plushieItem(String(block.id), global.getPlushieBlockData(block)));
};

/**
 * A gift for a placed plushie from someone with these stages. `player` (optional) gets the messages.
 * Returns true when the plushie took the item.
 */
global.giftPlushie = (block, item, stages, player) => {
  const level = block.level;
  const data = global.getPlushieBlockData(block);
  if (stages.has("women_who_run_with_the_plushies") && data.affection < 2) {
    data.affection = 2;
    global.setMachineData(block, { affection: 2 });
    PLUSHIE_HEART_PARTICLES(level, block);
  }
  const questItem = global.getPlushieQuestItem(data.type, data.affection, data.quest_id);
  if (!questItem) return false;
  if (String(item.id) !== questItem) {
    if (player) {
      player.tell(Text.translatable("society.plushie.want_gift").gray());
      player.tell(Item.of(questItem).getHoverName());
    }
    return false;
  }
  if (!player || !player.isCreative()) item.count--;
  PLUSHIE_HEART_PARTICLES(level, block);
  global.setMachineData(block, {
    quest_id: data.affection === 3 ? 0 : 1 + Math.floor(Math.random() * 3),
    affection: data.affection + 1,
  });
  if (
    stages.has("husbandry_mastery") &&
    !stages.has("women_who_run_with_the_plushies") &&
    data.affection > 2 &&
    Math.random() <= 0.05
  ) {
    block.popItemFromFace("society:women_who_run_with_the_plushies", global.getBlockProperty(block, "facing"));
  }
  if (player) player.tell(Text.translatable("society.plushie.thank").gray());
  return true;
};

BlockEvents.placed(global.plushies, (e) => {
  if (!e.player) return;
  let item = e.player.getMainHandItem();
  if (String(item.id) !== String(e.block.id)) item = e.player.getOffHandItem();
  if (String(item.id) !== String(e.block.id)) return;
  const data = global.getPlushieItemData(item);
  if (data) global.setMachineData(e.block, data);
});

BlockEvents.broken(global.plushies, (e) => {
  global.popPlushie(e.block);
});

BlockEvents.rightClicked(global.plushies, (e) => {
  const { item, player, block, hand, server } = e;
  if (String(hand) !== "MAIN_HAND" || player.isFake()) return;
  if (String(item.id) === "society:plushie_wand") {
    player.tell(Text.translatable("item.society.plushie_wand.no_animal").red());
    global.addItemCooldown(player, item, 5);
    e.cancel();
  }
  const gifted = global.giftPlushie(block, item, player.stages, player);
  server.runCommandSilent(`playsound tanukidecor:block.mini_figure.squeak block @a ${block.x} ${block.y} ${block.z}`);
  if (gifted) e.cancel();
});

// Left click with the Plushie Wand picks a plushie up at once.
BlockEvents.leftClicked(global.plushies, (e) => {
  const { player, block, level, server } = e;
  const wand = player.getMainHandItem();
  if (String(wand.id) !== "society:plushie_wand" || global.isItemOnCooldown(player, wand)) return;
  global.popPlushie(block);
  block.set("minecraft:air");
  server.runCommandSilent(`playsound botania:babylon_attack block @a ${block.x} ${block.y} ${block.z}`);
  PLUSHIE_GLOW_PARTICLES(level, block);
  global.addItemCooldown(player, wand, 5);
  e.cancel();
});

// The Gatcha Machine sells a Plushie Capsule for a sun.
BlockEvents.rightClicked("whimsy_deco:gatcha_machine", (e) => {
  const { item, player, block, hand, server } = e;
  if (String(hand) !== "MAIN_HAND") return;
  if (String(item.id) === "numismatics:sun") {
    if (global.isItemOnCooldown(player, item)) return;
    item.count--;
    block.popItemFromFace("society:plushie_capsule", global.getBlockProperty(block, "facing"));
    server.runCommandSilent(`playsound tanukidecor:block.cash_register.ring block @a ${player.x} ${player.y} ${player.z}`);
    global.addItemCooldown(player, "numismatics:sun", 1);
  } else {
    player.tell(Text.translatable("tooltip.society.gatcha_machine", Text.translatable("item.numismatics.sun").gold()));
  }
  e.cancel();
});
