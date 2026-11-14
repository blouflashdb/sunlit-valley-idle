// priority: 1000
console.info("[SOCIETY] globalFish.js loaded");

// The fish of each season and water (ocean, river, fresh water), with weights. The fish tooltips
// (server_scripts/tooltips/fishTooltips.js) and the seasonal fishing loot (server_scripts/loot/seasonfish.js) read them.
// Spring Fish
global.springOcean = [
  { fish: "aquaculture:atlantic_herring", weight: 16 },
  { fish: "aquaculture:atlantic_herring", weight: 16, night: true },
  { fish: "minecraft:pufferfish", weight: 9, night: true, requiresClear: true },
  { fish: "aquaculture:jellyfish", weight: 9, night: true },
  { fish: "minecraft:tropical_fish", weight: 8 },
  { fish: "minecraft:tropical_fish", weight: 8, night: true },
  { fish: "unusualfishmod:raw_drooping_gourami", weight: 6 },
  { fish: "aquaculture:atlantic_halibut", weight: 4, requiresRain: true },
  { fish: "unusualfishmod:raw_spindlefish", weight: 3, night: true },
];
global.springRiver = [
  { fish: "aquaculture:minnow", weight: 11 },
  { fish: "aquaculture:bluegill", weight: 11, night: true },
  { fish: "aquaculture:smallmouth_bass", weight: 9 },
  { fish: "aquaculture:smallmouth_bass", weight: 9, night: true },
  { fish: "minecraft:cod", weight: 10 },
  { fish: "minecraft:cod", weight: 10, night: true },
  { fish: "aquaculture:pink_salmon", weight: 9, night: true },
  { fish: "aquaculture:catfish", weight: 8, night: true, requiresRain: true },
  { fish: "aquaculture:bayad", weight: 5, night: true, requiresRain: true },
  { fish: "unusualfishmod:raw_blind_sailfin", weight: 5 },
];
global.springFresh = [
  { fish: "aquaculture:minnow", weight: 11 },
  { fish: "aquaculture:bluegill", weight: 11, night: true },
  { fish: "aquaculture:perch", weight: 9 },
  { fish: "aquaculture:carp", weight: 9, requiresRain: true },
  { fish: "unusualfishmod:raw_beaked_herring", weight: 8 },
  { fish: "unusualfishmod:raw_hatchetfish", night: true, weight: 5 },
  {
    fish: "unusualfishmod:raw_eyelash",
    weight: 3,
    night: true,
    requiresClear: true,
  },
];

// Summer fish
global.summerOcean = [
  { fish: "unusualfishmod:raw_sneep_snorp", weight: 32 },
  {
    fish: "minecraft:pufferfish",
    weight: 30,
    night: true,
    requiresClear: true,
  },
  { fish: "aquaculture:jellyfish", weight: 24, night: true },
  { fish: "minecraft:tropical_fish", weight: 22 },
  { fish: "minecraft:tropical_fish", weight: 22, night: true },
  { fish: "aquaculture:red_grouper", weight: 19, night: true },
  { fish: "aquaculture:tuna", weight: 15 },
  { fish: "aquaculture:capitaine", weight: 10 },
  { fish: "aquaculture:goldfish", weight: 4, requiresClear: true },
];
global.summerRiver = [
  { fish: "aquaculture:minnow", weight: 28 },
  { fish: "aquaculture:bluegill", weight: 28, night: true },
  { fish: "minecraft:salmon", weight: 25 },
  { fish: "aquaculture:leech", weight: 23, night: true },
  { fish: "aquaculture:smallmouth_bass", weight: 22 },
  { fish: "aquaculture:smallmouth_bass", weight: 22, night: true },
  { fish: "aquaculture:synodontis", weight: 18, requiresClear: true },
  { fish: "aquaculture:tambaqui", weight: 18, night: true },
  {
    fish: "aquaculture:box_turtle",
    weight: 5,
    night: true,
    requiresRain: true,
  },
];
global.summerFresh = [
  { fish: "aquaculture:minnow", weight: 11 },
  { fish: "aquaculture:bluegill", weight: 11, night: true },
  { fish: "aquaculture:carp", weight: 9 },
  { fish: "aquaculture:leech", weight: 9, night: true },
  { fish: "aquaculture:piranha", weight: 9, night: true, requiresRain: true },
  { fish: "aquaculture:boulti", weight: 5, night: true },
  { fish: "crittersandcompanions:koi_fish", weight: 3, requiresClear: true },
  { fish: "aquaculture:arapaima", weight: 3, requiresRain: true },
  { fish: "unusualfishmod:raw_circus_fish", weight: 2 },
];

// Autumn Fish
global.autumnOcean = [
  { fish: "aquaculture:blackfish", weight: 22, night: true },
  { fish: "aquaculture:blackfish", weight: 22 },
  {
    fish: "minecraft:pufferfish",
    weight: 22,
    night: true,
    requiresClear: true,
  },
  {
    fish: "unusualfishmod:raw_picklefish",
    weight: 22,
    night: true,
    requiresRain: true,
  },
  { fish: "unusualfishmod:raw_forkfish", weight: 20 },
  { fish: "unusualfishmod:raw_forkfish", weight: 20, night: true },
  { fish: "unusualfishmod:raw_sailor_barb", weight: 18 },
  { fish: "unusualfishmod:raw_demon_herring", weight: 16, night: true },
  {
    fish: "unusualfishmod:raw_copperflame_anthias",
    weight: 11,
    night: true,
    requiresClear: true,
  },
  { fish: "aquaculture:red_shrooma", weight: 8, requiresRain: true },
];
global.autumnRiver = [
  { fish: "aquaculture:minnow", weight: 27 },
  { fish: "aquaculture:bluegill", weight: 27, night: true },
  { fish: "minecraft:salmon", weight: 26 },
  { fish: "aquaculture:brown_trout", weight: 26 },
  { fish: "aquaculture:smallmouth_bass", weight: 24 },
  { fish: "aquaculture:smallmouth_bass", weight: 24, night: true  },
  { fish: "aquaculture:muskellunge", weight: 18, night: true },
  {
    fish: "aquaculture:arrau_turtle",
    weight: 8,
    night: true,
    requiresRain: true,
  },
];
global.autumnFresh = [
  { fish: "aquaculture:minnow", weight: 11 },
  { fish: "aquaculture:bluegill", weight: 11, night: true },
  { fish: "aquaculture:perch", weight: 9 },
  { fish: "aquaculture:carp", weight: 10 },
  { fish: "aquaculture:gar", weight: 5, requiresRain: true },
  { fish: "unusualfishmod:raw_bark_angelfish", weight: 4 },
  {
    fish: "unusualfishmod:raw_amber_goby",
    weight: 1,
    night: true,
    requiresClear: true,
  },
];

// Winter Fish
global.winterOcean = [
  { fish: "aquaculture:atlantic_herring", weight: 27 },
  { fish: "aquaculture:atlantic_herring", weight: 27, night: true },
  { fish: "aquaculture:blackfish", night: true, weight: 26 },
  { fish: "aquaculture:blackfish", weight: 26 },
  { fish: "aquaculture:pollock", weight: 25, requiresRain: true },
  { fish: "aquaculture:atlantic_cod", weight: 22 },
  { fish: "unusualfishmod:raw_triple_twirl_pleco", night: true, weight: 20 },
  {
    fish: "unusualfishmod:raw_copperflame_anthias",
    weight: 15,
    night: true,
    requiresClear: true,
  },
  { fish: "aquaculture:pacific_halibut", weight: 10 },
  { fish: "aquaculture:brown_shrooma", weight: 8, requiresRain: true },
];
global.winterRiver = [
  { fish: "aquaculture:minnow", weight: 28 },
  { fish: "aquaculture:bluegill", weight: 28, night: true },
  { fish: "minecraft:cod", weight: 27 },
  { fish: "minecraft:cod", weight: 27, night: true },
  { fish: "aquaculture:brown_trout", weight: 25 },
  { fish: "aquaculture:pink_salmon", weight: 22 },
  {
    fish: "unusualfishmod:raw_duality_damselfish",
    weight: 16,
    night: true,
    requiresClear: true,
  },
  { fish: "aquaculture:rainbow_trout", weight: 10, requiresRain: true },
  {
    fish: "aquaculture:starshell_turtle",
    weight: 8,
    night: true,
    requiresRain: true,
  },
];
global.winterFresh = [
  { fish: "aquaculture:minnow", weight: 11 },
  { fish: "aquaculture:bluegill", weight: 11, night: true },
  { fish: "aquaculture:perch", weight: 9, night: true },
  { fish: "aquaculture:carp", weight: 8, night: true },
  { fish: "unusualfishmod:raw_snowflake", weight: 8, requiresRain: true },
  {
    fish: "unusualfishmod:raw_snowflake",
    weight: 8,
    night: true,
    requiresRain: true,
  },
  { fish: "unusualfishmod:raw_aero_mono", weight: 4 },
  { fish: "unusualfishmod:raw_hatchetfish", night: true, weight: 2 },
];

/**
 * True when the rod holds the bobber. On 1.21.1 the bobber of a Stardew Fishing rod and the bobber slot of an
 * Aquaculture rod are data components that hold an item stack, so the bobber id shows up in the component string.
 */
global.hasBobber = (rod, bobberId) => {
  if (!rod || rod.isEmpty()) return false;
  return String(rod.componentString).includes(`"${bobberId}"`);
};
