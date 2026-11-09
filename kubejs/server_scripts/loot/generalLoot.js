console.info("[SOCIETY] generalLoot.js loaded");

// Mob drops, chest loot and grass seeds from the 1.20.1 generalLoot.js and adventurerLoot.js, as LootJS 3 custom
// actions. Items of mods that are not in the pack (Splendid Slimes hearts, ...) are left out.
const $GeneralLootParams = Java.loadClass("net.minecraft.world.level.storage.loot.parameters.LootContextParams");


// Extra loot of single tables: { table, chance, item, count: [min, max] }.
const generalTableLoot = [
  { table: "rottencreatures:entities/zap", chance: 0.03, item: "society:glitched_vhs" },
  { table: "minecraft:entities/witch", chance: 0.1, item: "society:holy_symbol" },
  { table: "minecraft:entities/shulker", chance: 0.1, item: "society:production_science_pack" },
  { table: "minecraft:entities/blaze", chance: 0.05, item: "society:ember_crystal_cluster" },
  { table: "minecraft:entities/spider", chance: 0.05, item: "society:spider_silk" },
  { table: "minecraft:entities/creeper", chance: 0.05, item: "society:green_tea_honeycomb" },
  { table: "legendarycreatures:entities/corpse_eater", chance: 0.05, item: "society:wheel_of_adaptation" },
  { table: "minecraft:entities/wither", chance: 0.8, item: "society:amulet_of_light" },
  { table: "minecraft:entities/enderman", chance: 0.05, item: "minecraft:eye_armor_trim_smithing_template" },
  { table: "minecraft:entities/pig", chance: 0.05, item: "society:living_flesh" },
  { table: "minecraft:chests/simple_dungeon", chance: 0.3, item: "numismatics:bevel", count: [1, 4] },
  { table: "minecraft:chests/simple_dungeon", chance: 0.1, item: "society:source_gem" },
  { table: "minecraft:chests/abandoned_mineshaft", chance: 0.2, item: "numismatics:bevel", count: [1, 4] },
  { table: "minecraft:chests/buried_treasure", chance: 0.9, item: "numismatics:cog", count: [1, 4] },
  { table: "minecraft:chests/buried_treasure", chance: 1, item: "numismatics:crown", count: [1, 2] },
  { table: "minecraft:chests/underwater_ruin_small", chance: 0.5, item: "numismatics:cog", count: [1, 4] },
  { table: "minecraft:chests/underwater_ruin_small", chance: 0.2, item: "numismatics:cog", count: [1, 2] },
  { table: "minecraft:chests/underwater_ruin_big", chance: 0.6, item: "numismatics:cog", count: [1, 4] },
  { table: "minecraft:chests/underwater_ruin_big", chance: 0.3, item: "numismatics:cog", count: [1, 2] },
  { table: "minecraft:chests/shipwreck_supply", chance: 0.5, item: "numismatics:bevel", count: [1, 4] },
  { table: "minecraft:chests/shipwreck_supply", chance: 0.1, item: "numismatics:sprocket", count: [1, 2] },
  { table: "minecraft:chests/shipwreck_treasure", chance: 0.9, item: "numismatics:bevel", count: [1, 4] },
  { table: "minecraft:chests/shipwreck_treasure", chance: 0.4, item: "numismatics:cog", count: [1, 2] },
  { table: "minecraft:chests/woodland_mansion", chance: 0.2, item: "numismatics:crown", count: [1, 2] },
  { table: "minecraft:chests/jungle_temple", chance: 0.3, item: "numismatics:crown", count: [1, 4] },
  { table: "minecraft:chests/jungle_temple", chance: 0.1, item: "numismatics:crown", count: [1, 2] },
  { table: "minecraft:chests/desert_pyramid", chance: 0.3, item: "numismatics:crown", count: [1, 4] },
  { table: "minecraft:chests/desert_pyramid", chance: 0.1, item: "numismatics:crown", count: [1, 2] },
  { table: "minecraft:chests/pillager_outpost", chance: 0.3, item: "numismatics:cog", count: [1, 4] },
  { table: "minecraft:chests/ancient_city", chance: 0.6, item: "numismatics:cog", count: [1, 4] },
  { table: "minecraft:chests/ancient_city", chance: 0.3, item: "numismatics:crown", count: [1, 2] },
  { table: "minecraft:chests/ancient_city", chance: 0.2, item: "numismatics:sun" },
  { table: "minecraft:chests/ruined_portal", chance: 0.7, item: "numismatics:sprocket", count: [1, 2] },
  { table: "minecraft:chests/nether_bridge", chance: 0.3, item: "numismatics:sprocket", count: [1, 4] },
  { table: "minecraft:chests/bastion_bridge", chance: 0.9, item: "numismatics:sprocket", count: [1, 4] },
  { table: "minecraft:chests/bastion_hoglin_stable", chance: 0.3, item: "numismatics:sprocket", count: [1, 4] },
  { table: "minecraft:chests/bastion_other", chance: 0.5, item: "numismatics:sprocket", count: [1, 4] },
  { table: "minecraft:chests/bastion_treasure", chance: 0.6, item: "numismatics:sprocket", count: [1, 4] },
  { table: "minecraft:chests/stronghold_corridor", chance: 0.9, item: "numismatics:bevel", count: [1, 4] },
  { table: "minecraft:chests/stronghold_corridor", chance: 0.4, item: "numismatics:sprocket", count: [1, 2] },
  { table: "minecraft:chests/stronghold_crossing", chance: 0.9, item: "numismatics:bevel", count: [1, 4] },
  { table: "minecraft:chests/stronghold_crossing", chance: 0.4, item: "numismatics:sprocket", count: [1, 2] },
  { table: "minecraft:chests/end_city_treasure", chance: 0.7, item: "numismatics:sprocket", count: [1, 4] },
  { table: "minecraft:chests/end_city_treasure", chance: 0.4, item: "numismatics:cog" },
  { table: "minecraft:chests/end_city_treasure", chance: 0.2, item: "numismatics:cog" },
].filter((entry) => global.itemExists(entry.item));

// The player a loot context belongs to: the one who opened the chest or killed the mob.
const generalLootPlayer = (context) => {
  let entity = context.getParamOrNull($GeneralLootParams.THIS_ENTITY);
  if (entity && entity.isPlayer()) return entity;
  let killer = context.getParamOrNull($GeneralLootParams.LAST_DAMAGE_PLAYER);
  return killer || null;
};

const generalLootId = (stack) => String(stack.getItem().builtInRegistryHolder().key().location());
const rollGeneralCount = (count) => (count ? count[0] + Math.floor(Math.random() * (count[1] - count[0] + 1)) : 1);

// Chest loot of every chest: { chance, item, stage }.
const generalChestLoot = [
  { chance: 0.05, item: "society:recall_potion" },
  { chance: 0.1, item: "society:relic_trove", stage: "relic_hunter" },
  { chance: 0.1, item: "society:artifact_trove", stage: "artifact_hunter" },
  { chance: 0.05, item: "society:prismatic_shard", stage: "prismatic_realm" },
  { chance: 0.1, item: "society:plushie_capsule", stage: "husbandry_mastery" },
  { chance: 0.05, item: "society:animal_cracker", stage: "husbandry_mastery" },
].filter((entry) => global.itemExists(entry.item));

// Items that chests give instead of others: { tables, from, to, chance }.
const generalReplacedLoot = [
  { tables: ["minecraft:chests/pillager_outpost"], from: "etcetera:eggple", to: "numismatics:cog", chance: 0.65 },
  { tables: ["minecraft:chests/village/village_plains_house"], from: "etcetera:eggple", to: "numismatics:cog", chance: 0.85 },
  { tables: ["minecraft:chests/bastion_treasure"], from: "etcetera:golden_eggple", to: "numismatics:crown", chance: 0.85 },
  { tables: ["minecraft:chests/ruined_portal"], from: "minecraft:flint_and_steel", to: "numismatics:cog", chance: 1 },
  {
    tables: [
      "minecraft:chests/simple_dungeon",
      "minecraft:chests/spawn_bonus_chest",
      "minecraft:chests/abandoned_mineshaft",
      "minecraft:chests/shipwreck_supply",
      "minecraft:chests/village/village_plains_house",
      "minecraft:chests/village/village_taiga_house",
      "minecraft:chests/village/village_desert_house",
      "minecraft:chests/village/village_snowy_house",
    ],
    from: "cluttered:willow_sapling",
    to: "numismatics:cog",
    chance: 1,
  },
].filter((entry) => global.itemExists(entry.to));

const generalRemovedLoot = [
  { table: "atmospheric:chests/arid_garden", items: ["atmospheric:golden_dragon_fruit"] },
  {
    table: "minecraft:chests/bastion_treasure",
    items: ["minecraft:diamond_sword", "minecraft:diamond_helmet", "minecraft:diamond_chestplate", "minecraft:diamond_leggings"],
  },
];

LootJS.modifiers((e) => {
  generalTableLoot.forEach((entry) => {
    e.addTableModifier(entry.table).customAction((context, loot) => {
      if (Math.random() < entry.chance) loot.addItem(Item.of(entry.item, rollGeneralCount(entry.count)));
    });
  });
  generalRemovedLoot.forEach((entry) => {
    e.addTableModifier(entry.table).customAction((context, loot) => {
      loot.modifyItems((stack) => (entry.items.indexOf(generalLootId(stack)) !== -1 ? null : stack));
    });
  });
  generalReplacedLoot.forEach((entry) => {
    entry.tables.forEach((table) => {
      e.addTableModifier(table).customAction((context, loot) => {
        if (Math.random() >= entry.chance) return;
        loot.modifyItems((stack) => (generalLootId(stack) === entry.from ? Item.of(entry.to, stack.getCount()) : stack));
      });
    });
  });
  // Hoglins drop rotten flesh instead of pork.
  e.addTableModifier("minecraft:entities/hoglin").customAction((context, loot) => {
    loot.modifyItems((stack) => Item.of("minecraft:rotten_flesh", stack.getCount()));
  });

  // Seeds come from the seed maker and shops, not from grass.
  e.addBlockModifier(["minecraft:short_grass", "minecraft:tall_grass", "minecraft:fern", "minecraft:large_fern"]).customAction(
    (context, loot) => {
      loot.modifyItems((stack) => (holderHasTag(stack.getItem().builtInRegistryHolder(), "c:seeds") ? null : stack));
    }
  );

  e.addTypeModifier(LootType.CHEST).customAction((context, loot) => {
    // Unstackable items in stacks would be voided.
    loot.modifyItems((stack) => {
      if (stack.getMaxStackSize() === 1 && stack.getCount() > 1) stack.setCount(1);
      return stack;
    });
    let player = generalLootPlayer(context);
    generalChestLoot.forEach((entry) => {
      if (entry.stage && (!player || !player.stages.has(entry.stage))) return;
      if (Math.random() < entry.chance) loot.addItem(Item.of(entry.item));
    });
  });
});
