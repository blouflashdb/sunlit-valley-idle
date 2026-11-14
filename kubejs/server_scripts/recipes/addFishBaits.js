// Crab trap loot of the fish baits (society:<fish>_bait from the Bait Maker): a crab trap baited with one catches
// that fish. On 1.21.1 Crabber's Delight reads crabbersdelight:gameplay/crab_trap_loot/<bait item path>, without the
// namespace folder of 1.20.1. Fish that are not registered get no table (a loot table naming a missing item fails).
console.info("[SOCIETY] addFishBaits.js loaded");

ServerEvents.generateData("before_mods", (e) => {
  global.fish.forEach((fish) => {
    const fishId = String(fish.item).split(":")[1];
    if (["barrel", "roe", "meat"].some((denied) => fishId.includes(denied))) return;
    let baitId = fishId;
    if (baitId.includes("raw_")) {
      if (baitId === "raw_snowflake") baitId = "frosty_fin";
      else baitId = baitId.substring(4, baitId.length);
    }
    if (!global.itemExists(fish.item) || !global.itemExists(`society:${baitId}_bait`)) return;
    e.json(`crabbersdelight:loot_table/gameplay/crab_trap_loot/${baitId}_bait`, {
      type: "minecraft:fishing",
      pools: [
        {
          rolls: 1,
          bonus_rolls: 0,
          entries: [
            {
              type: "minecraft:item",
              weight: 1,
              name: fish.item,
            },
          ],
        },
      ],
    });
  });
});
