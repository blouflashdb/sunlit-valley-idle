console.info("[SOCIETY] fishingLoot.js loaded");

// Extra fishing loot (jellies, hook and stage rewards) and the Neptune's Bounty prismatic shard, from the 1.20.1
// fishingLoot.js, as LootJS 3 custom actions. The fishing loot context holds the hook as THIS_ENTITY, so the player
// is its owner; Crab Traps roll fishing loot without a player and get none of the stage rewards.
// holderHasTag and hasSilkTouchTool are defined in miningLoot.js (server scripts share one scope).
const $FishingLootParams = Java.loadClass("net.minecraft.world.level.storage.loot.parameters.LootContextParams");
const $FishingLootHook = Java.loadClass("net.minecraft.world.entity.projectile.FishingHook");
const $FishingLootBlockPos = Java.loadClass("net.minecraft.core.BlockPos");

/** The player who fished: the owner of the hook, or the attacking entity NeoForge adds to fishing loot. */
const fishingLootPlayer = (context) => {
  let entity = context.getParamOrNull($FishingLootParams.THIS_ENTITY);
  if (entity && entity.isPlayer()) return entity;
  if (entity instanceof $FishingLootHook) {
    let owner = entity.getPlayerOwner();
    if (owner) return owner;
  }
  let attacker = context.getParamOrNull($FishingLootParams.ATTACKING_ENTITY);
  return attacker && attacker.isPlayer() ? attacker : null;
};

/** Whether the biome at the hook has one of the biome tags. */
const fishingLootBiomeIs = (context, tags) => {
  let origin = context.getParamOrNull($FishingLootParams.ORIGIN);
  if (!origin) return false;
  let biome = context.getLevel().getBiome($FishingLootBlockPos.containing(origin));
  return tags.some((tag) => holderHasTag(biome, tag));
};

/** Whether the rod holds an Aquaculture hook (the 1.20.1 script searched the rod NBT for its id the same way). */
const fishingRodHasHook = (context, hookId) => {
  let rod = context.getParamOrNull($FishingLootParams.TOOL);
  return !!rod && !rod.isEmpty() && String(rod.getComponentsPatch()).includes(hookId);
};

const fishingOceanBiomes = ["minecraft:is_ocean", "minecraft:is_beach"];
const fishingRiverBiomes = ["minecraft:is_river"];

// Rules: { chance, item, count, stage, biomes, hook, winter }; every given condition must hold.
const fishingLootRules = [
  { stage: "starting_items_4_1", biomes: fishingOceanBiomes, chance: 0.1, item: "society:ocean_jelly" },
  { stage: "wooden_pollution", biomes: fishingOceanBiomes, chance: 0.1, item: "society:ocean_jelly" },
  { stage: "starting_items_4_1", biomes: fishingRiverBiomes, chance: 0.1, item: "society:river_jelly" },
  { stage: "wooden_pollution", biomes: fishingRiverBiomes, chance: 0.1, item: "society:river_jelly" },
  { stage: "wooden_pollution", chance: 0.1, item: "society:furniture_box" },
  { stage: "frozen_treasure", winter: true, chance: 0.45, item: "aquaculture:treasure_chest" },
  // The 1.20.1 limitCount clamped the single item to these counts.
  { hook: "aquaculture:iron_hook", chance: 0.5, item: "crabbersdelight:crab_trap_bait", count: 4 },
  { hook: "aquaculture:diamond_hook", chance: 0.25, item: "crabbersdelight:deluxe_crab_trap_bait" },
  { hook: "aquaculture:redstone_hook", biomes: fishingOceanBiomes, chance: 0.1, item: "society:ocean_jelly" },
  { hook: "aquaculture:redstone_hook", biomes: fishingRiverBiomes, chance: 0.1, item: "society:river_jelly" },
  { hook: "aquaculture:nether_star_hook", chance: 0.04, item: "society:relic_trove" },
  // Mastery
  { stage: "husbandry_mastery", chance: 0.01, item: "society:animal_cracker" },
  { stage: "husbandry_mastery", chance: 0.05, item: "society:plushie_capsule" },
].filter((rule) => global.itemExists(rule.item));

const fishingLootRuleHolds = (rule, context, player) => {
  if (rule.stage && (!player || !player.stages.has(rule.stage))) return false;
  if (rule.hook && !fishingRodHasHook(context, rule.hook)) return false;
  if (rule.biomes && !fishingLootBiomeIs(context, rule.biomes)) return false;
  if (rule.winter && global.getSeasonFromLevel(context.getLevel()) !== "winter") return false;
  return Math.random() < rule.chance;
};

LootJS.modifiers((e) => {
  e.addTableModifier(LootType.FISHING).customAction((context, loot) => {
    let player = fishingLootPlayer(context);
    fishingLootRules.forEach((rule) => {
      if (fishingLootRuleHolds(rule, context, player)) loot.addItem(Item.of(rule.item, rule.count || 1));
    });
  });

  // Prismatic Bounty: Neptune's Bounty drops a Prismatic Shard instead of itself (not with silk touch).
  e.addBlockModifier(["aquaculture:neptunes_bounty"]).customAction((context, loot) => {
    let player = context.getParamOrNull($FishingLootParams.THIS_ENTITY);
    if (!player || !player.isPlayer() || !player.stages.has("prismatic_bounty")) return;
    if (hasSilkTouchTool(context.getParamOrNull($FishingLootParams.TOOL))) return;
    loot.modifyItems((stack) =>
      String(stack.getItem().builtInRegistryHolder().key().location()) === "aquaculture:neptunes_bounty"
        ? Item.of("society:prismatic_shard", stack.getCount())
        : stack
    );
  });
});
