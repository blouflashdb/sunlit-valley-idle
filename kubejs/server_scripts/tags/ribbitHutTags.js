console.info("[SOCIETY] ribbitHutTags.js loaded");

// Plants the Ribbit Hut harvests (startup_scripts/husbandry/ribbitHut.js). The tag came from Society Tweaks on
// 1.20.1; blocks from mods that are not in the 1.21.1 pack are left out.
const $RibbitTagRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $RibbitTagResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");

ServerEvents.tags("block", (e) => {
  const lattices = ["oak", "spruce", "birch", "jungle", "acacia", "dark_oak", "mangrove", "bamboo", "cherry", "dark_cherry"];
  const flowers = ["white", "light_gray", "gray", "black", "brown", "red", "orange", "yellow", "lime", "green", "cyan", "light_blue", "blue", "purple", "magenta", "pink"];
  const ids = [
    "vintagedelight:gearo_berry_bush",
    "windswept:wild_berry_bush",
    "minecraft:sweet_berry_bush",
    "autumnity:tall_foul_berry_bush",
    "vinery:grapevine_stem",
    "minecraft:pumpkin",
    "minecraft:melon",
    "minecraft:cocoa",
    "minecraft:nether_wart",
    "minecraft:torchflower",
    "minecraft:pitcher_crop",
    "society:mana_fruit_crop",
    "supplementaries:flax",
  ]
    .concat(lattices.map((wood) => `vinery:${wood}_lattice`))
    .concat(flowers.map((color) => `botania:${color}_mystical_flower`))
    .filter((id) => $RibbitTagRegistries.BLOCK.containsKey($RibbitTagResourceLocation.parse(id)));
  e.add("society:ribbit_hut_harvests", "#minecraft:crops");
  e.add("society:ribbit_hut_harvests", ids);
});
