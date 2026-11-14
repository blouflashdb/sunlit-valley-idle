// priority: 100
console.info("[SOCIETY] serverEventUtils.js loaded");

// Helpers of the server event scripts (ported from the 1.20.1 globalServer.js and enrichedBonemeal.js, #19).
// KubeJS 7 only lets startup scripts assign globals, and server scripts share one scope, so these are plain
// server script constants with names that do not clash with other server scripts.
// Dropped from globalServer.js: the player.paint UI helpers (KubeJS 7 has no paint; messages use the action
// bar), getPigColoredName and calculateCoinValue moved to pigRacing.js, and the plushie NBT helpers, which the
// plushie port (#14) replaced with data components.
const $ServerEventsCuriosApi = Java.loadClass("top.theillusivec4.curios.api.CuriosApi");

/** The fruit blocks of Pam's HarvestCraft 2 Trees (fruitInstaBreak.js, pamsTreeLoot.js). */
const pamFruitBlocks = [
  "cinnamon", "dragonfruit", "starfruit", "lychee", "passionfruit", "mango", "banana", "pawpaw",
  "hazelnut", "orange", "plum", "peach", "lemon", "cherry", "apple",
].map((fruit) => `pamhc2trees:pam${fruit}`);

/** A random integer from min to max, both included. */
const societyRnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Returns a function (entity, ticks, key) that is true while the entity is throttled for that key. */
const societyThrottle = () => {
  const lastUse = {};
  return (entity, ticks, key) => {
    const id = `${entity.getUuid()}${key}`;
    const age = Number(entity.age);
    const last = lastUse[id];
    if (last === undefined || age - last >= ticks || age < last) {
      lastUse[id] = age;
      return false;
    }
    return true;
  };
};

/** True when the player wears the item in a Curios slot. */
const societyIsCurioEquipped = (player, id) => {
  if (!Item.exists(id)) return false;
  const inventory = $ServerEventsCuriosApi.getCuriosInventory(player);
  return inventory.isPresent() && inventory.get().isEquipped(Item.of(id).getItem());
};

const societyPlaySound = (server, sound, entity, extra) =>
  server.runCommandSilent(`playsound ${sound} block @a ${entity.x} ${entity.y} ${entity.z}${extra ? ` ${extra}` : ""}`);

/**
 * Pufferfish's Skills cannot reward the shipping bin attributes, so the skill stages set them by command
 * (on login and on respawn, see playerEvents/addCommandAttributes.js).
 */
const societyAddAttributesFromStages = (player, server) => {
  const stages = player.stages;
  const attributeCommand = (type, mult) =>
    `attribute ${player.username} shippingbin:${type}_sell_multiplier base set ${mult}`;
  if (stages.has("tiller")) server.runCommandSilent(attributeCommand("crop", 1.15));
  if (stages.has("artisan")) server.runCommandSilent(attributeCommand("wood", 1.2));
  if (stages.has("artful_tycoon")) server.runCommandSilent(attributeCommand("wood", 1.8));
  if (stages.has("gem_seller")) server.runCommandSilent(attributeCommand("gem", 1.25));
  if (stages.has("gem_tycoon")) server.runCommandSilent(attributeCommand("gem", 1.5));
  if (stages.has("fence")) server.runCommandSilent(attributeCommand("meat", 1.5));
  if (stages.has("looting_tycoon")) server.runCommandSilent(attributeCommand("meat", 2));
};

// Fish radar: the fish that bite here and now, from the season fish lists of globalFish.js.
const societyRadarEntryBites = (entry, isDay, level) => {
  if (entry.requiresRain && !level.raining) return false;
  if (entry.requiresClear && (level.raining || level.thundering)) return false;
  if (isDay && entry.night) return false;
  if (!isDay && entry.night === undefined) return false;
  return true;
};

const societyRadarSeasonList = (season, water) => global[`${season}${water}`] || [];

/** Prints the place, weather and time line and returns the fish ids that bite in the overworld. */
const societyOverworldRadar = (level, player, print) => {
  const season = global.getSeasonFromLevel(level);
  const pos = player.blockPosition();
  const biomeTags = level.getBiome(pos).tags().toList().toString();
  const isDay = level.getDayTime() % 24000 < 12999;
  const weather = level.raining
    ? Text.of("🌧 ").append(Text.translatable("society.fish_radar.rain").blue())
    : Text.of("☂ ").append(Text.translatable("society.fish_radar.clear").yellow());
  const time = isDay
    ? Text.of("☀ ").append(Text.translatable("society.fish_radar.day").gold())
    : Text.of("⛈ ").append(Text.translatable("society.fish_radar.night").darkGray());
  let water = "Fresh";
  let place = Text.of("   ☄ ").append(Text.translatable("society.fish_radar.fresh").aqua());
  if (biomeTags.includes("minecraft:is_ocean") || biomeTags.includes("minecraft:is_beach")) {
    water = "Ocean";
    place = Text.of("   🌊 ").append(Text.translatable("society.fish_radar.ocean").darkAqua());
  } else if (biomeTags.includes("minecraft:is_river")) {
    water = "River";
    place = Text.of("   ☔ ").append(Text.translatable("society.fish_radar.river").blue());
  }
  print(place.append(" ").append(weather).append(" ").append(time));
  const fish = [];
  societyRadarSeasonList(season, water).forEach((entry) => {
    if (societyRadarEntryBites(entry, isDay, level) && !fish.includes(entry.fish)) fish.push(entry.fish);
  });
  return fish;
};

const societyNetherBiomeFish = [
  ["minecraft:nether_wastes", ["netherdepthsupgrade:bonefish"]],
  ["minecraft:soul_sand_valley", ["netherdepthsupgrade:wither_bonefish", "netherdepthsupgrade:soulsucker"]],
  ["minecraft:basalt_deltas", ["netherdepthsupgrade:magmacubefish", "netherdepthsupgrade:obsidianfish"]],
  ["minecraft:crimson_forest", ["netherdepthsupgrade:eyeball_fish"]],
  ["minecraft:warped_forest", ["netherdepthsupgrade:glowdine"]],
];

/** Prints the biome line and returns the fish ids that bite in the Nether. */
const societyNetherRadar = (level, player, print) => {
  const fish = [
    "netherdepthsupgrade:searing_cod",
    "netherdepthsupgrade:lava_pufferfish",
    "netherdepthsupgrade:blazefish",
    "netherdepthsupgrade:fortress_grouper",
  ];
  const biome = String(level.getBiome(player.blockPosition()).getRegisteredName());
  const match = societyNetherBiomeFish.find((entry) => entry[0] === biome);
  const name = match
    ? Text.translatable(`biome.${match[0].replace(":", ".")}`)
    : Text.translatable("society.fish_radar.nether");
  print(Text.of("            ").append(name).darkRed());
  if (match) match[1].forEach((id) => fish.push(id));
  return fish;
};
