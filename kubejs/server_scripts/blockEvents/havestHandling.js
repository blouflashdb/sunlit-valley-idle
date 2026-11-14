console.info("[SOCIETY] harvestHandling.js loaded");
// Yeah this filename has a typo. Fixing it would be more annoying than leaving it.
// The mana fruit handlers are in manaFruitEvents.js (#14).
const $ExperienceOrb = Java.loadClass("net.minecraft.world.entity.ExperienceOrb");

const deniedCrops = [
  "farmersdelight:tomatoes",
  "farmersdelight:budding_tomatoes",
  "minecraft:melon_stem",
  "minecraft:pitcher_crop",
  "minecraft:torchflower_crop",
  "minecraft:pumpkin_stem",
  "minecraft:cocoa",
  "supplementaries:flax",
  "society:mana_fruit_crop"
];
const allowedBonemealCrops = [
  "minecraft:crimson_fungus",
  "minecraft:warped_fungus",
];
const reseedableCrops = [
  "minecraft:potato",
  "minecraft:carrot",
  "farm_and_charm:onion",
  "veggiesdelight:sweet_potato",
  "vintagedelight:peanut",
  "veggiesdelight:garlic_clove"
];
// Crops of other mods (e.g. Farmer's Delight) are not always CropBlocks; they count as mature here.
const isMatureCrop = (state) => (typeof state.block.isMaxAge === "function" ? state.block.isMaxAge(state) : false);
const maxCropAge = (state) => (typeof state.block.getMaxAge === "function" ? Number(state.block.getMaxAge()) : 0);

BlockEvents.rightClicked((e) => {
  const { block, player, server, hand, item, level } = e;
  if (reseedableCrops.includes(String(e.item.id))) {
    if (block.hasTag("dewdrop:waterable")) {
      e.player.inventoryMenu.broadcastFullState();
      e.cancel();
    }
  }
  if (!allowedBonemealCrops.includes(String(block.id))) {
    if (player.isHoldingInAnyHand("farm_and_charm:fertilizer")) e.cancel();
    if (
      player.isHoldingInAnyHand("minecraft:bone_meal") ||
      player.isHoldingInAnyHand("meadow:watering_can")
    ) {
      if (
        block.hasTag("minecraft:crops") ||
        block.hasTag("minecraft:saplings") ||
        block.hasTag("vinery:lattice") ||
        block.hasTag("farmersdelight:wild_crops") ||
        block.hasTag("farm_and_charm:wild_crops") ||
        block.hasTag("sereneseasons:summer_crops") ||
        block.hasTag("sereneseasons:autumn_crops") ||
        block.hasTag("sereneseasons:spring_crops") ||
        block.hasTag("sereneseasons:winter_crops") ||
        [
          "veggiesdelight:wild_bellpeppers",
          "veggiesdelight:wild_sweet_potatoes",
          "veggiesdelight:wild_garlic",
          "veggiesdelight:wild_cauliflowers",
          "atmospheric:dragon_roots",
          "atmospheric:aloe_vera",
          "atmospheric:aloe_kernels",
          "atmospheric:yucca_branch",
          "minecraft:kelp",
          "farmersdelight:tomatoes",
          "farm_and_charm:wild_nettle",
          "farm_and_charm:wild_ribwort",
          "minecraft:cocoa",
          "minecraft:cave_vines",
          "minecraft:cave_vines_plant",
          "minecraft:bamboo",
          "nethervinery:crimson_grape_bush",
          "nethervinery:warped_grape_bush",
          "vinery:savanna_grape_bush_white",
          "vinery:jungle_grape_bush_red",
          "vinery:savanna_grape_bush_red",
          "vinery:white_grape_bush",
          "vinery:red_grape_bush",
          "vinery:taiga_grape_bush_red",
          "vinery:taiga_grape_bush_white",
          "vinery:jungle_grape_bush_white",
          "vinery:grapevine_stem",
          "nethervinery:obsidian_stem",
          "farmersdelight:budding_tomatoes",
          "farmersdelight:rice",
          "farmersdelight:rice_panicles",
          "herbalbrews:lavender",
          "herbalbrews:hibiscus",
          "minecraft:torchflower",
          "atmospheric:passion_vine",
          "verdantvibes:bracket_mushroom",
          "vinery:apple_leaves",
          "vinery:dark_cherry_leaves",
          "cluttered:blue_roundhead",
          "cluttered:fly_agaric",
          "quark:glow_shroom",
          "farmersdelight:brown_mushroom_colony",
          "species:alphacene_mushroom",
          "farmersdelight:red_mushroom_colony"
        ].includes(String(block.id))
      ) {
        player.tell(Text.translatable("society.bone_meal.weak"));
        e.player.inventoryMenu.broadcastFullState();
        e.cancel();
      }
    }
  }
  if (String(hand) === "MAIN_HAND") {
    let initialBlock = level.getBlockState(block.pos);
    let checkBlocked;
    let blockState;
    if (
      block.hasTag("minecraft:crops") &&
      !deniedCrops.includes(String(block.id)) &&
      isMatureCrop(initialBlock)
    ) {
      let xpCount = 0;
      let radius = 0;
      if (item.hasTag("minecraft:hoes")) radius = 1;
      if (["minecraft:netherite_hoe", "minecraft:diamond_hoe", "botania:elementium_hoe"].includes(String(item.id)))
        radius = 2;
      for (let pos of BlockPos.betweenClosed(
        new BlockPos(block.x - radius, block.y, block.z - radius),
        [block.x + radius, block.y, block.z + radius],
      )) {
        checkBlocked = level.getBlock(pos);
        blockState = level.getBlockState(pos);
        if (
          checkBlocked.hasTag("minecraft:crops") &&
          !deniedCrops.includes(String(checkBlocked.id))
        ) {
          if (isMatureCrop(blockState)) {
            if (player.isFake()) {
              e.cancel();
            } else {
              xpCount += maxCropAge(blockState);
            }
          }
        }
      }
      server.scheduleInTicks(2, () => {
        initialBlock = level.getBlockState(block.pos);
        if (!isMatureCrop(initialBlock) && xpCount > 0) {
          level.addFreshEntity(new $ExperienceOrb(level, block.x + 0.5, block.y + 0.5, block.z + 0.5, xpCount));
          global.giveExperience(server, player, "farming", xpCount * 2);
        }
      });
    }
  }
});
// Vinery grapevine leaf mechanic
BlockEvents.rightClicked("vinery:grapevine_stem", (e) => {
  const { block } = e;
  let properties = block.getProperties();
  properties.leaves_pending = "false";
  properties.leaves_done = "true";
  block.set(block.id, properties);
});

