console.info("[SOCIETY] miningLoot.js loaded");

// Extra drops of ores, geode nodes and stone, from the 1.20.1 miningLoot.js. Each rule is one customAction:
// LootJS 3 dropped the pool conditions, so the silk touch, stage, biome, dimension and season checks are JS.
const $MiningLootParams = Java.loadClass("net.minecraft.world.level.storage.loot.parameters.LootContextParams");
const $MiningLootRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $MiningLootKeys = Java.loadClass("net.minecraft.core.registries.Registries");
const $MiningLootRL = Java.loadClass("net.minecraft.resources.ResourceLocation");
const $MiningLootTagKey = Java.loadClass("net.minecraft.tags.TagKey");
const $MiningLootBlockPos = Java.loadClass("net.minecraft.core.BlockPos");
const $MiningLootComponents = Java.loadClass("net.minecraft.core.component.DataComponents");
const $MiningLootEnchantments = Java.loadClass("net.minecraft.world.item.enchantment.ItemEnchantments");

const miningBlocks = (ids) => ids.filter((id) => $MiningLootRegistries.BLOCK.containsKey($MiningLootRL.parse(id)));
const miningBiomeTag = (id) => $MiningLootTagKey.create($MiningLootKeys.BIOME, $MiningLootRL.parse(id));
const rawMaterialsTag = $MiningLootTagKey.create($MiningLootKeys.ITEM, $MiningLootRL.parse("c:raw_materials"));
const silkTouchId = $MiningLootRL.parse("minecraft:silk_touch");

const overworldOres = miningBlocks([
  "meadow:alpine_diamond_ore",
  "meadow:alpine_salt_ore",
  "meadow:alpine_redstone_ore",
  "meadow:alpine_coal_ore",
  "meadow:alpine_lapis_ore",
  "meadow:alpine_gold_ore",
  "meadow:alpine_iron_ore",
  "meadow:alpine_copper_ore",
  "minecraft:deepslate_gold_ore",
  "minecraft:gold_ore",
  "minecraft:deepslate_copper_ore",
  "minecraft:copper_ore",
  "minecraft:deepslate_iron_ore",
  "minecraft:iron_ore",
  "minecraft:deepslate_coal_ore",
  "minecraft:coal_ore",
  "minecraft:redstone_ore",
  "minecraft:deepslate_diamond_ore",
  "minecraft:diamond_ore",
  "minecraft:deepslate_lapis_ore",
  "minecraft:lapis_ore",
  "create:deepslate_zinc_ore",
  "create:zinc_ore",
  "minecraft:deepslate_redstone_ore",
  "minecraft:deepslate_emerald_ore",
  "minecraft:emerald_ore",
]);
const netherOres = miningBlocks(["minecraft:nether_gold_ore", "minecraft:nether_quartz_ore", "etcetera:nether_bismuth_ore"]);
const skullCavernOres = miningBlocks([
  "oreganized:lead_ore",
  "oreganized:deepslate_lead_ore",
  "oreganized:silver_ore",
  "oreganized:deepslate_silver_ore",
  "society:iridium_ore",
  "society:deepslate_iridium_ore",
  "society:sparkstone_ore",
  "society:deepslate_sparkstone_ore",
]);
const allOres = overworldOres.concat(netherOres, skullCavernOres);
const supplyCrates = miningBlocks([
  "society:oak_supply_crate",
  "society:spruce_supply_crate",
  "society:palm_supply_crate",
  "society:grimwood_supply_crate",
]);
const moonRemains = [
  "betterarcheology:creeper_fossil_body",
  "betterarcheology:creeper_fossil_head",
  "betterarcheology:villager_fossil_body",
  "betterarcheology:villager_fossil_head",
  "betterarcheology:chicken_fossil_body",
  "betterarcheology:chicken_fossil_head",
  "betterarcheology:ocelot_fossil_body",
  "betterarcheology:ocelot_fossil_head",
  "betterarcheology:wolf_fossil_body",
  "betterarcheology:wolf_fossil_head",
  "betterarcheology:sheep_fossil_body",
  "betterarcheology:sheep_fossil_head",
  "betterarcheology:guardian_fossil_head",
  "betterarcheology:guardian_fossil_body",
  "crittersandcompanions:clam",
  "species:petrified_egg",
  "society:petrified_slime",
  "twigs:petrified_lichen",
  "atmospheric:petrified_armor_trim_smithing_template",
  "betterarcheology:fossiliferous_dirt",
  "minecraft:bone",
  "aquaculture:fish_bones",
  "netherdepthsupgrade:bonefish",
  "society:fantasy_box_bone",
  "betterarcheology:artifact_shards",
  "society:artifact_trove",
].filter((id) => global.itemExists(id));

const hasSilkTouchTool = (tool) => {
  if (!tool || tool.isEmpty()) return false;
  let found = false;
  tool.getOrDefault($MiningLootComponents.ENCHANTMENTS, $MiningLootEnchantments.EMPTY).keySet().forEach((holder) => {
    if (holder.is(silkTouchId)) found = true;
  });
  return found;
};

// What a rule checks about one broken block.
const miningLootState = (context) => {
  let origin = context.getParamOrNull($MiningLootParams.ORIGIN);
  if (!origin) return null;
  let entity = context.getParamOrNull($MiningLootParams.THIS_ENTITY);
  let level = context.getLevel();
  return {
    level: level,
    pos: $MiningLootBlockPos.containing(origin),
    player: entity && entity.isPlayer() ? entity : null,
    silk: hasSilkTouchTool(context.getParamOrNull($MiningLootParams.TOOL)),
    dimension: String(level.dimension),
  };
};

// A rule drops its item when every given condition holds:
//   stage: a stage of the breaking player; player: a player broke it (implied by stage);
//   silk: false means not with a silk touch tool; biome: a biome tag; dimension; winter;
//   chance: the drop chance (1 when left out).
const miningRuleHolds = (rule, state) => {
  if (rule.silk === false && state.silk) return false;
  if ((rule.player || rule.stage) && !state.player) return false;
  if (rule.stage && !state.player.stages.has(rule.stage)) return false;
  if (rule.dimension && state.dimension !== rule.dimension) return false;
  if (rule.biome && !state.level.getBiome(state.pos).is(rule.biomeKey)) return false;
  if (rule.winter && global.getSeasonFromLevel(state.level) !== "winter") return false;
  return rule.chance === undefined || Math.random() < rule.chance;
};

// The rules, for the CI test.
const miningLootRules = [];

const addMiningRule = (e, blocks, rule) => {
  if (blocks.length === 0) return;
  if (rule.item && !global.itemExists(rule.item)) return;
  if (rule.biome) rule.biomeKey = miningBiomeTag(rule.biome);
  rule.blocks = blocks;
  miningLootRules.push(rule);
  e.addBlockModifier(blocks).customAction((context, loot) => {
    let state = miningLootState(context);
    if (!state || !miningRuleHolds(rule, state)) return;
    if (rule.item) loot.addItem(Item.of(rule.item, rule.count || 1));
    if (rule.pick && rule.pick.length > 0) loot.addItem(Item.of(rule.pick[Math.floor(Math.random() * rule.pick.length)]));
    if (rule.modify) loot.modifyItems(rule.modify);
  });
};

// One more geode roll, for the excavator and moon geode stages.
const addGeodeRoll = (e, stage) => {
  addMiningRule(e, overworldOres, { stage: stage, silk: false, chance: 0.1, item: "society:geode" });
  addMiningRule(e, overworldOres, { stage: stage, silk: false, chance: 0.1, biome: "c:is_cold", item: "society:frozen_geode" });
  addMiningRule(e, overworldOres, { stage: stage, silk: false, chance: 0.1, winter: true, item: "society:frozen_geode" });
  addMiningRule(e, overworldOres, {
    stage: stage,
    silk: false,
    chance: 0.04,
    biome: "society:is_skull_cavern",
    item: "society:omni_geode",
  });
  addMiningRule(e, netherOres, { stage: stage, silk: false, chance: 0.1, item: "society:magma_geode" });
};

LootJS.modifiers((e) => {
  miningLootRules.length = 0;
  // Overworld and Skull Cavern ores share the frozen and omni geodes, jade and the crowns.
  [overworldOres, skullCavernOres].forEach((ores) => {
    addMiningRule(e, ores, { player: true, silk: false, chance: 0.1, biome: "c:is_cold", item: "society:frozen_geode" });
    addMiningRule(e, ores, { player: true, silk: false, chance: 0.1, winter: true, item: "society:frozen_geode" });
    addMiningRule(e, ores, { stage: "mineralogist", silk: false, chance: 0.1, biome: "c:is_cold", item: "society:frozen_tear" });
    addMiningRule(e, ores, {
      player: true,
      silk: false,
      chance: 0.04,
      biome: "society:is_skull_cavern",
      item: "society:omni_geode",
    });
    addMiningRule(e, ores, {
      stage: "mineralogist",
      silk: false,
      chance: 0.02,
      biome: "society:is_skull_cavern",
      item: "society:jade",
    });
    addMiningRule(e, ores, { stage: "blockchain", silk: false, chance: 0.03, item: "numismatics:crown" });
    addMiningRule(e, ores, { stage: "furniture_archaeologist", silk: false, chance: 0.03, item: "society:furniture_box" });
    addMiningRule(e, ores, {
      stage: "star_blessing",
      silk: false,
      chance: 0.06,
      dimension: "society:skull_cavern",
      item: "society:pristine_star_shards",
    });
  });
  addMiningRule(e, overworldOres, { player: true, silk: false, chance: 0.1, item: "society:geode" });
  addMiningRule(e, overworldOres, { stage: "mineralogist", silk: false, chance: 0.1, item: "society:earth_crystal" });
  addMiningRule(e, overworldOres, {
    stage: "star_blessing",
    silk: false,
    chance: 0.02,
    dimension: "minecraft:overworld",
    item: "society:pristine_star_shards",
  });

  addMiningRule(e, netherOres, { player: true, silk: false, chance: 0.1, item: "society:magma_geode" });
  addMiningRule(e, netherOres, { stage: "mineralogist", silk: false, chance: 0.1, item: "society:fire_quartz" });
  addMiningRule(e, netherOres, { stage: "blockchain", silk: false, chance: 0.06, item: "numismatics:crown" });
  addMiningRule(e, netherOres, { stage: "furniture_archaeologist", silk: false, chance: 0.01, item: "society:furniture_box" });
  addMiningRule(e, netherOres, {
    stage: "star_blessing",
    silk: false,
    chance: 0.04,
    dimension: "minecraft:the_nether",
    item: "society:pristine_star_shards",
  });
  addMiningRule(e, netherOres, {
    stage: "star_blessing",
    silk: false,
    chance: 0.06,
    dimension: "society:skull_cavern",
    item: "society:pristine_star_shards",
  });

  // Geode nodes
  let geodeNode = miningBlocks(["society:geode_node"]);
  let magmaNode = miningBlocks(["society:magma_geode_node"]);
  let omniNode = miningBlocks(["society:omni_geode_node"]);
  addMiningRule(e, geodeNode, { chance: 0.1, biome: "c:is_cold", item: "society:frozen_geode" });
  addMiningRule(e, geodeNode, { chance: 0.05, item: "society:mining_monthly" });
  addMiningRule(e, geodeNode, {
    stage: "prismatic_prospector",
    chance: 0.05,
    dimension: "minecraft:overworld",
    item: "society:prismatic_shard",
  });
  addMiningRule(e, magmaNode, { chance: 0.1, item: "society:mining_monthly" });
  addMiningRule(e, magmaNode, {
    stage: "prismatic_prospector",
    chance: 0.2,
    dimension: "minecraft:the_nether",
    item: "society:prismatic_shard",
  });
  addMiningRule(e, omniNode, { chance: 0.1, item: "society:mining_monthly" });
  addMiningRule(e, omniNode, { stage: "prismatic_prospector", chance: 0.3, item: "society:prismatic_shard" });

  addMiningRule(e, miningBlocks(["minecraft:deepslate"]), { stage: "filthy_excavator", chance: 0.02, item: "society:geode" });
  addMiningRule(e, miningBlocks(["minecraft:netherrack"]), {
    stage: "filthy_excavator",
    chance: 0.01,
    item: "society:magma_geode",
  });

  addMiningRule(e, miningBlocks(["minecraft:deepslate_gold_ore", "meadow:alpine_gold_ore", "minecraft:gold_ore"]), {
    stage: "gold_rush",
    silk: false,
    item: "minecraft:raw_gold_block",
    count: 4,
  });
  addMiningRule(e, allOres, { stage: "the_spark_also_rises", silk: false, item: "society:sparkstone" });
  addMiningRule(e, allOres.concat(supplyCrates), {
    stage: "husbandry_mastery",
    silk: false,
    chance: 0.01,
    item: "society:animal_cracker",
  });
  addMiningRule(e, miningBlocks(["society:sparkstone_ore", "society:deepslate_sparkstone_ore"]), {
    stage: "mining_mastery",
    silk: false,
    chance: 0.001,
    item: "society:the_spark_also_rises",
  });

  addGeodeRoll(e, "excavator");

  // Mastery Moon Statue
  addMiningRule(e, allOres, { stage: "moon_remains", silk: false, chance: 0.05, pick: moonRemains });
  addGeodeRoll(e, "moon_geode_roll");
  addMiningRule(e, overworldOres, {
    stage: "moon_extra_ore",
    modify: (stack) => {
      if (stack.is(rawMaterialsTag)) stack.setCount(stack.getCount() + 1);
      return stack;
    },
  });
});
