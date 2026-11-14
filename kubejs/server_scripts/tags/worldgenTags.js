console.info("[SOCIETY] worldgenTags.js loaded");

// Biome tags (ported from the 1.20.1 handleWorldgenTags.js; #16). The Skull Cavern biome modifiers
// (data/society/neoforge/biome_modifier) place geode nodes and crystals in #supplementaries:has_cave_urns and
// #society:spawns_magma_geodes. forge:is_snowy is c:is_snowy on 1.21.1.
ServerEvents.tags("worldgen/biome", (e) => {
  e.add("society:mining_biomes", "#minecraft:is_overworld");
  e.add("minecraft:without_zombie_sieges", "#minecraft:is_overworld");
  e.add("society:spawns_magma_geodes", "#minecraft:is_nether");
  e.add("c:is_snowy", ["society:frozen_caves", "society:frozen_maelstrom"]);
  e.add("minecraft:is_end", "society:umbra_barrens");
  ["society:blackstone_caves", "society:desert_caves", "society:desert_fault"].forEach((biome) =>
    e.add("society:spawns_magma_geodes", biome)
  );
  [
    "society:skull_caves",
    "society:lush_caverns",
    "society:frozen_caves",
    "society:frozen_maelstrom",
    "society:desert_caves",
    "society:desert_fault",
    "society:blackstone_caves",
    "society:umbra_barrens",
    "society:cavern_top",
  ].forEach((biome) => {
    e.add("society:is_skull_cavern", biome);
    e.add("supplementaries:has_cave_urns", biome);
    e.add("society:mining_biomes", biome);
  });
  e.add("sereneseasons:infertile_biomes", "#minecraft:is_nether");
  e.add("sereneseasons:infertile_biomes", "#society:is_skull_cavern");
});
