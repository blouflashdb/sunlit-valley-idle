// priority: 100
const SeasonHelper = Java.loadClass("sereneseasons.api.season.SeasonHelper")

// Season is a Java enum; compare by name (see docs/porting-1.21.1.md).
const seasonName = (seasonObj) => {
  let name = String(seasonObj);
  if (name === "SPRING") return "spring";
  if (name === "SUMMER") return "summer";
  if (name === "AUTUMN") return "autumn";
  return "winter";
};

global.getSeasonFromLevel = (level) => {
  return seasonName(SeasonHelper.getSeasonState(level).getSeason())
}

global.getSeasonFromBiome = (level, pos) => {
  const biome = level.getBiome(pos);
  const biomeTags = biome.tags().map((tagkey) => tagkey.location()).toList();
  if (
    biomeTags.toString().includes("sereneseasons:tropical_biomes")
  ) {
    return "summer"
  }
  if (
    Number(biome.value().getTemperature(pos)) < 0.15
  ) {
    return "winter"
  }
  return global.getSeasonFromLevel(level);
}

global.isLateSeason = (level) => {
  return SeasonHelper.getSeasonState(level).getSubSeason().toString().includes("LATE");
}