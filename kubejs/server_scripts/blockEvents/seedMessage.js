console.info("[SOCIETY] seedMessage.js loaded");

// Warns once a minute when a seed is planted where it cannot grow (tropical, cold or infertile biome).
const seedMessageThrottle = ((temp) => (entity, tick, identifier) => {
  const { age, uuid } = entity;
  const key = `${uuid}${identifier}`;
  const now = temp[key];
  if (!now || age - now >= tick) {
    temp[key] = age;
    return false;
  }
  return true;
})({});

BlockEvents.rightClicked(
  [
    "minecraft:farmland",
    "dew_drop_farmland_growth:weak_fertilized_farmland",
    "dew_drop_farmland_growth:strong_fertilized_farmland",
    "dew_drop_farmland_growth:hyper_fertilized_farmland",
    "dew_drop_farmland_growth:hydrating_farmland",
    "dew_drop_farmland_growth:deluxe_hydrating_farmland",
    "dew_drop_farmland_growth:bountiful_fertilized_farmland",
    "dew_drop_farmland_growth:low_quality_fertilized_farmland",
    "dew_drop_farmland_growth:high_quality_fertilized_farmland",
    "dew_drop_farmland_growth:pristine_quality_fertilized_farmland",
  ],
  (e) => {
    const { player, level, block } = e;
    let seed = player.getHeldItem("main_hand");
    if (!seed.hasTag("c:seeds")) return;
    let errorKey;
    const biome = level.getBiome(block.pos);
    const biomeTags = biome.tags().map((tagkey) => tagkey.location()).toList().toString();
    if (biomeTags.includes("sereneseasons:tropical_biomes") && !seed.hasTag("sereneseasons:summer_crops")) {
      errorKey = "society.planting_crop.eternal_summer";
    }
    if (Number(biome.value().getTemperature(block.pos)) < 0.15 && !seed.hasTag("sereneseasons:winter_crops")) {
      errorKey = "society.planting_crop.eternal_winter";
    }
    if (biomeTags.includes("sereneseasons:infertile_biomes")) {
      errorKey = "society.planting_crop.infertile_biome";
    }
    if (errorKey && !seedMessageThrottle(player, 1200, "seed_message_throttle")) {
      player.setStatusMessage(Text.translatable(errorKey).red());
    }
  }
);
