console.info("[SOCIETY] checkArtisanMachines.js loaded");

// Right-clicking a machine with an empty hand shows what it is making and how far it is, in the action bar.
// On 1.20.1 this was a Paint UI overlay; KubeJS 7 has no Paint, so the action bar shows the same line.

// global.getArtisanProgressText: startup_scripts/artisanProgressText.js (server scripts cannot assign global).

BlockEvents.rightClicked(
  [
    "society:bait_maker",
    "society:aging_cask",
    "society:ancient_cask",
    "society:charging_rod",
    "society:crystalarium",
    "society:wine_keg",
    "society:deluxe_worm_farm",
    "society:dehydrator",
    "society:espresso_machine",
    "society:fish_smoker",
    "society:loom",
    "society:mayonnaise_machine",
    "society:preserves_jar",
    "society:seed_maker",
    "society:tapper",
    "society:recycling_machine",
    "society:cheese_press",
    "society:oil_maker",
    "society:mushroom_log",
  ],
  (e) => {
    const { block, hand, item, player } = e;
    if (String(hand) !== "MAIN_HAND" || !item.isEmpty()) return;
    const text = global.getArtisanProgressText(block);
    if (text) player.displayClientMessage(text, true);
  }
);
