console.info("[SOCIETY] farmingLoot.js loaded");

const cropCollectorDenied = [
  "pamhc2trees:pamapple",
  "pamhc2trees:pamcherry",
  "pamhc2trees:pamorange",
  "pamhc2trees:pampeach",
  "pamhc2trees:pamplum",
  "pamhc2trees:pamhazelnut",
  "pamhc2trees:pampawpaw",
  "pamhc2trees:pambanana",
  "pamhc2trees:pamcinnamon",
  "pamhc2trees:pamdragonfruit",
  "pamhc2trees:pammango",
  "pamhc2trees:pamstarfruit",
  "pamhc2trees:pamlychee",
  "pamhc2trees:pamlemon",
  "pamhc2trees:pampassionfruit",
];
const $LootContextParams = Java.loadClass("net.minecraft.world.level.storage.loot.parameters.LootContextParams");
const $BlockPos = Java.loadClass("net.minecraft.core.BlockPos");
const $BuiltInRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $ResourceLocationLoot = Java.loadClass("net.minecraft.resources.ResourceLocation");

// Crops of mods that are not in the 1.21.1 pack are skipped.
const lootCrops = global.cropList.filter((id) => $BuiltInRegistries.BLOCK.containsKey($ResourceLocationLoot.parse(id)));

// The broken crop of a block loot context: its state, level and position.
const destroyedCrop = (context) => {
  let state = context.getParamOrNull($LootContextParams.BLOCK_STATE);
  let origin = context.getParamOrNull($LootContextParams.ORIGIN);
  if (!state || !origin) return null;
  return { state: state, level: context.getLevel(), pos: $BlockPos.containing(origin) };
};

const checkMaxGrown = (crop) => {
  if (!crop) return false;
  let block = crop.state.block;
  return typeof block.isMaxAge === "function" ? block.isMaxAge(crop.state) : true;
};

const checkMaxGrownWithChance = (context, chance) => chance > Math.random() && checkMaxGrown(destroyedCrop(context));

const addCropChanceLoot = (stage, chance, item) => {
  return (e) =>
    e
      .addBlockModifier(lootCrops)
      .hasAnyStage(stage)
      .customAction((context, loot) => {
        if (checkMaxGrownWithChance(context, chance)) loot.addItem(Item.of(item));
      });
};

LootJS.modifiers((e) => {
  // Quality from the seed and the quality fertilizers.
  e.addBlockModifier(lootCrops).customAction((context, loot) => {
    let crop = destroyedCrop(context);
    if (!crop) return;
    let blockId = String(crop.state.block.id);
    loot.modifyItems((item) => {
      let quality = global.getCropQualityAt(crop.level, crop.pos, blockId);
      return quality > 0 ? global.withItemQuality(item, quality) : item;
    });
  });
  addCropChanceLoot("sticky_crops", 0.02, "society:pine_tar")(e);
  addCropChanceLoot("soil_inspector", 0.05, "farm_and_charm:fertilizer")(e);
  // Bountiful Fertilizer: 25% chance of one more crop.
  e.addBlockModifier(lootCrops).customAction((context, loot) => {
    let crop = destroyedCrop(context);
    if (!crop || Math.random() >= 0.25) return;
    if (!crop.level.getBlock(crop.pos.below()).hasTag("dew_drop_farmland_growth:bountiful_fertilized_farmland")) return;
    loot.modifyItems((item) => {
      item.setCount(item.getCount() + 1);
      return item;
    });
  });
  e.addBlockModifier(lootCrops)
    .hasAnyStage("paradise_crop")
    .customAction((context, loot) => {
      loot.modifyItems((item) => {
        if (!cropCollectorDenied.includes(String(item.id))) item.setCount(item.getCount() + 1);
        return item;
      });
    });
  e.addBlockModifier(lootCrops)
    .hasAnyStage("crop_collector")
    .customAction((context, loot) => {
      loot.modifyItems((item) => {
        if (!cropCollectorDenied.includes(String(item.id))) item.setCount(item.getCount() * 2);
        return item;
      });
    });

  // Brine and Punishment skill book: 1 in 500 from a grown cucumber, as the 1.20.1 Vintage Delight loot table had it.
  if ($BuiltInRegistries.BLOCK.containsKey($ResourceLocationLoot.parse("vintagedelight:cucumber"))) {
    e.addBlockModifier("vintagedelight:cucumber").customAction((context, loot) => {
      if (checkMaxGrownWithChance(context, 0.002)) loot.addItem(Item.of("society:brine_and_punishment"));
    });
  }

  // Mastery
  addCropChanceLoot("husbandry_mastery", 0.005, "society:plushie_capsule")(e);
  addCropChanceLoot("husbandry_mastery", 0.003, "society:animal_cracker")(e);
  addCropChanceLoot("farming_mastery", 0.005, "atmospheric:grimwood_sapling")(e);
});
