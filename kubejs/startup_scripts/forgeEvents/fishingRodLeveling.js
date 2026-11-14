console.info("[SOCIETY] fishingRodLeveling.js loaded");

// Fishing with an upgraded rod sometimes raises its Lure (up to IV) or Luck of the Sea (up to VI) by one level.

const $RodRegistries = Java.loadClass("net.minecraft.core.registries.Registries");
const $RodResourceKey = Java.loadClass("net.minecraft.resources.ResourceKey");
const $RodResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");

const rodMaxLureLevel = 4;
const rodMaxLuckOfTheSeaLevel = 6;
const levelingRods = [
  "aquaculture:iron_fishing_rod",
  "aquaculture:gold_fishing_rod",
  "aquaculture:diamond_fishing_rod",
  "aquaculture:neptunium_fishing_rod",
  "netherdepthsupgrade:lava_fishing_rod",
];

const getRodEnchantmentLevel = (rod, id) => {
  let found = 0;
  rod.getEnchantments().entrySet().forEach((entry) => {
    if (String(entry.getKey().getRegisteredName()) === id) found = entry.getIntValue();
  });
  return found;
};

/** Sets the enchantment to `level` (ItemStack.enchant keeps the higher of the old and the new level). */
const raiseRodEnchantment = (level, rod, id, newLevel) => {
  const holder = level
    .registryAccess()
    .registryOrThrow($RodRegistries.ENCHANTMENT)
    .getHolderOrThrow($RodResourceKey.create($RodRegistries.ENCHANTMENT, $RodResourceLocation.parse(id)));
  rod.enchant(holder, newLevel);
};

NativeEvents.onEvent(Java.loadClass("net.neoforged.neoforge.event.entity.player.ItemFishedEvent"), (event) => {
  const player = event.getEntity();
  const level = player.level;
  const rod = player.getMainHandItem();
  const rodId = String(rod.id);
  if (!levelingRods.includes(rodId)) return;

  let randCap = 40;
  if (level.isRaining()) randCap -= 10;
  if (rodId === "aquaculture:gold_fishing_rod") randCap -= 5;
  if (rodId === "aquaculture:diamond_fishing_rod") randCap -= 10;
  if (rodId === "aquaculture:neptunium_fishing_rod") randCap -= 20;
  if (Math.floor(Math.random() * randCap) !== 0) return;

  const lureLevel = getRodEnchantmentLevel(rod, "minecraft:lure");
  const luckOfTheSeaLevel = getRodEnchantmentLevel(rod, "minecraft:luck_of_the_sea");
  if (lureLevel < rodMaxLureLevel && Math.random() < 0.5) {
    raiseRodEnchantment(level, rod, "minecraft:lure", lureLevel + 1);
    player.tell(Text.translatable("society.fishing_rod.level_up.lure").gold());
  } else if (luckOfTheSeaLevel < rodMaxLuckOfTheSeaLevel) {
    raiseRodEnchantment(level, rod, "minecraft:luck_of_the_sea", luckOfTheSeaLevel + 1);
    player.tell(Text.translatable("society.fishing_rod.level_up.lots").gold());
  }
});
