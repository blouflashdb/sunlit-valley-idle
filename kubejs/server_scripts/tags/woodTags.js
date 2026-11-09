console.info("[SOCIETY] woodTags.js loaded");

// society:raw_logs (ported from the 1.20.1 handleItemBlockFluidTags.js): the logs and stems that bounty boards,
// fermenting jars, plushies and villager gifts take. Logs from mods that are not in the 1.21.1 pack are left out.
const $WoodRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $WoodResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");

const woodRawLogs = [
  "minecraft:oak_log",
  "minecraft:dark_oak_log",
  "minecraft:mangrove_log",
  "minecraft:spruce_log",
  "minecraft:acacia_log",
  "minecraft:birch_log",
  "minecraft:jungle_log",
  "minecraft:cherry_log",
  "windswept:chestnut_log",
  "windswept:holly_log",
  "windswept:pine_log",
  "windswept:weathered_pine_log",
  "quark:blossom_log",
  "quark:ancient_log",
  "quark:azalea_log",
  "meadow:pine_log",
  "betterarcheology:rotten_log",
  "vinery:dark_cherry_log",
  "beachparty:palm_log",
  "vinery:apple_log",
  "autumnity:maple_log",
  "autumnity:sappy_maple_log",
  "atmospheric:rosewood_log",
  "atmospheric:morado_log",
  "atmospheric:yucca_log",
  "atmospheric:laurel_log",
  "atmospheric:aspen_log",
  "atmospheric:watchful_aspen_log",
  "atmospheric:kousa_log",
  "atmospheric:crustose_log",
  "atmospheric:grimwood_log",
  "vintagedelight:magic_vine",
  "minecraft:pale_oak_log",
  "cluttered:willow_log",
  "cluttered:flowering_willow_log",
  "cluttered:poplar_log",
  "cluttered:flowering_poplar_log",
  "cluttered:crabapple_log",
  "cluttered:flowering_crabapple_log",
  "cluttered:sycamore_log",
  "cluttered:fluorescent_maple_log",
  "cluttered:blue_mushroom_log",
  "cluttered:red_mushroom_log",
  "rainbowoaks:rainbow_log",
  "minecraft:warped_stem",
  "minecraft:crimson_stem"
];

const woodExisting = (registry) => woodRawLogs.filter((id) => registry.containsKey($WoodResourceLocation.parse(id)));

ServerEvents.tags("block", (e) => {
  woodExisting($WoodRegistries.BLOCK).forEach((log) => e.add("society:raw_logs", log));
});

ServerEvents.tags("item", (e) => {
  woodExisting($WoodRegistries.ITEM).forEach((log) => e.add("society:raw_logs", log));
});
