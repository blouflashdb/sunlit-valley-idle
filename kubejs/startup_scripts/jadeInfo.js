console.info("[SOCIETY] jadeInfo.js loaded");

// Jade lines for Sunlit Valley block entities (ported from the 1.20.1 jadeClient.js and registerJadeData.js, #18).
// Jade for 1.21.1 has no KubeJS events: when a player looks at a block entity, the sunlitidle mod posts
// dev.sunlitidle.compat.BlockInfoEvent on the server and shows the lines added here under the block name.
// The crop growth line is computed in the mod itself (dev.sunlitidle.compat.jade.CropGrowthProvider).

const jadeStars = (quality) => `§6${"★".repeat(quality + 1)}§8${"☆".repeat(Math.max(0, 3 - quality))}`;

const jadeHearts = (affection) => `§c${"❤".repeat(affection)}§8${"❤".repeat(Math.max(0, 4 - affection))}`;

const jadeFishPondLines = (block) => {
  const fish = global.getMachineString(block, "type");
  if (fish === "" || !global.itemExists(fish)) return [];
  const population = global.getMachineInt(block, "population");
  const maxPopulation = global.getMachineInt(block, "max_population");
  let icons = "";
  for (let i = 0; i < maxPopulation; i++) icons += i < population ? "§3⏳" : "§7⏳";
  const upgraded = global.isBlockPropertyTrue(block, "upgraded") ? " §a🡅" : "";
  return [
    Text.empty()
      .append(Item.of(fish).getHoverName().copy().aqua())
      .append(Text.of(` §7${population}/${maxPopulation} ${icons}${upgraded}`)),
  ];
};

const jadePlushieLines = (block) => {
  const data = global.getPlushieBlockData(block);
  const trait = global.plushieTraits[data.type];
  const lines = [Text.of(jadeStars(data.quality))];
  if (trait) lines.push(global.getTranslatedTextWithColorCode(trait.color, `society.item.plushie.${trait.trait}`));
  let animalType = "";
  if (data.animal !== "") {
    try {
      animalType = String(JSON.parse(data.animal).type || "");
    } catch (err) {
      console.warn(`[SOCIETY] plushie animal data is not JSON: ${err}`);
    }
  }
  if (animalType.includes(":")) {
    const parts = animalType.split(":");
    lines.push(Text.translatable(`entity.${parts[0]}.${parts[1]}`).gray());
  } else {
    lines.push(Text.of(jadeHearts(data.affection)));
  }
  return lines;
};

/** The lines Jade shows for a block, as an array of text components (empty when it has nothing to show). */
global.getJadeInfoLines = (block) => {
  const id = String(block.id);
  if (global.artisanMachineIds.includes(id)) {
    const progress = global.getArtisanProgressText(block);
    return progress ? [progress] : [];
  }
  if (id === "society:fish_pond") return jadeFishPondLines(block);
  if (global.plushies.includes(id)) return jadePlushieLines(block);
  return [];
};

NativeEvents.onEvent(Java.loadClass("dev.sunlitidle.compat.BlockInfoEvent"), (event) => {
  let lines;
  try {
    lines = global.getJadeInfoLines(event.getLevel().getBlock(event.getPos()));
  } catch (err) {
    console.error(`[SOCIETY] Jade info failed at ${event.getPos()}: ${err}`);
    return;
  }
  lines.forEach((line) => event.add(line));
});
