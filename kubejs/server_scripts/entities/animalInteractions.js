console.info("[SOCIETY] animalInteractions.js loaded");

// Farm animals and pets: breeding with the Miracle Potion, naming, Mood Scanner, pet gifts and the husbandry
// actions (pet, feed, milk, drops, Magic Shears, upgrades). The logic is in startup_scripts/husbandry/.
ItemEvents.entityInteracted((e) => {
  if (String(e.item.id) === "moblassos:diamond_lasso") return;
  if (String(e.item.id) === "society:sunlit_crystal") {
    if (String(e.hand) === "MAIN_HAND" && !e.player.isFake()) global.useSunlitCrystal(e.player, e.item, e.target);
    e.cancel();
  }
  const event = { hand: e.hand, player: e.player, item: e.item, target: e.target, level: e.level, server: e.server };
  if (global.handleAnimalBreeding(event)) {
    e.cancel();
    return;
  }
  global.handleAnimalNaming(event);
  global.handleMoodScanner(event);
  global.handlePetGift(event);
  global.handleHusbandryBase(event);
});
