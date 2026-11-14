console.info("[SOCIETY] seasonFish.js loaded");

// Seasonal fishing loot (ported from the 1.20.1 seasonfish.js, LootJS 2 table modifiers) as one LootJS 3 custom
// action on minecraft:gameplay/fishing: the vanilla fish are removed and one fish is picked from the season lists of
// startup_scripts/globalFish.js by water (ocean/beach, river, other), weather (clear or rain), time of day and the
// Mystical Ocean stage (adds Neptuna). Then the fishing skills and the Needle Bobber add to the fish count.
// fishingLootPlayer is defined in fishingLoot.js, holderHasTag in miningLoot.js (server scripts share one scope);
// global.hasBobber comes from startup_scripts/globalFish.js.
const $SeasonFishParams = Java.loadClass("net.minecraft.world.level.storage.loot.parameters.LootContextParams");
const $SeasonFishBlockPos = Java.loadClass("net.minecraft.core.BlockPos");

const seasonFishRemoved = ["minecraft:cod", "minecraft:salmon", "minecraft:tropical_fish", "minecraft:pufferfish"];

// Fish of mods that are not in the 1.21.1 pack are left out.
const seasonFishLists = () => ({
  spring: { ocean: global.springOcean, river: global.springRiver, fresh: global.springFresh },
  summer: { ocean: global.summerOcean, river: global.summerRiver, fresh: global.summerFresh },
  autumn: { ocean: global.autumnOcean, river: global.autumnRiver, fresh: global.autumnFresh },
  winter: { ocean: global.winterOcean, river: global.winterRiver, fresh: global.winterFresh },
});

/** The fish that can bite: night fish at night, day fish by day; rain fish only in rain, clear fish only when clear. */
const seasonFishPool = (entries, raining, night) =>
  (entries || []).filter((fish) => {
    if ((fish.night === true) !== night) return false;
    if (fish.requiresRain) return raining;
    if (fish.requiresClear) return !raining;
    return true;
  }).filter((fish) => global.itemExists(fish.fish));

/** One weighted pick; Neptuna gets 9% of the total weight with the Mystical Ocean stage. */
const seasonFishPick = (pool, mysticalOcean) => {
  let entries = pool.map((fish) => ({ item: fish.fish, weight: fish.weight }));
  let total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (mysticalOcean && global.itemExists("society:neptuna")) {
    let neptunaWeight = Math.floor(total * 0.09);
    entries.push({ item: "society:neptuna", weight: neptunaWeight });
    total += neptunaWeight;
  }
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (let i = 0; i < entries.length; i++) {
    roll -= entries[i].weight;
    if (roll < 0) return entries[i].item;
  }
  return entries[entries.length - 1].item;
};

const seasonFishId = (stack) => String(stack.getItem().builtInRegistryHolder().key().location());

/** Adds to the count of every stackable fish. */
const seasonFishBonus = (loot, bonus) => {
  loot.modifyItems((stack) => {
    if (stack.getMaxStackSize() === 1) return stack;
    if (!holderHasTag(stack.getItem().builtInRegistryHolder(), "minecraft:fishes")) return stack;
    stack.setCount(stack.getCount() + bonus);
    return stack;
  });
};

LootJS.modifiers((e) => {
  const lists = seasonFishLists();
  e.addTableModifier("minecraft:gameplay/fishing").customAction((context, loot) => {
    loot.modifyItems((stack) => (seasonFishRemoved.indexOf(seasonFishId(stack)) !== -1 ? null : stack));

    // The 1.20.1 modifiers matched only fishing players (Crab Traps get no fish from here).
    let player = fishingLootPlayer(context);
    let origin = context.getParamOrNull($SeasonFishParams.ORIGIN);
    if (!player || !origin) return;
    let level = context.getLevel();
    let seasonLists = lists[global.getSeasonFromLevel(level)];
    if (seasonLists) {
      let biome = level.getBiome($SeasonFishBlockPos.containing(origin));
      let water = "fresh";
      if (holderHasTag(biome, "minecraft:is_ocean") || holderHasTag(biome, "minecraft:is_beach")) water = "ocean";
      else if (holderHasTag(biome, "minecraft:is_river")) water = "river";
      let night = level.getDayTime() % 24000 >= 13000;
      let pool = seasonFishPool(seasonLists[water], level.isRaining(), night);
      let fish = seasonFishPick(pool, player.stages.has("mystical_ocean"));
      if (fish) loot.addItem(Item.of(fish));
    }

    // Fishing skills: Fly Fisher +1, with School Fisher +3 more; the Needle Bobber +5.
    if (player.stages.has("fly_fisher")) {
      seasonFishBonus(loot, 1);
      if (player.stages.has("school_fisher")) seasonFishBonus(loot, 3);
    }
    let rod = context.getParamOrNull($SeasonFishParams.TOOL);
    if (rod && !rod.isEmpty() && global.hasBobber(rod, "society:needle_bobber")) {
      seasonFishBonus(loot, 5);
    }
  });
});
