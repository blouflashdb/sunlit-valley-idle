console.info("[SOCIETY] plushies.js loaded");

// Plushies (#14). Each decorative plushie of the pack is registered again as <mod>:adv_<name>, a block with a block
// entity that remembers a trait (type), an affection level (0-4), a gift quest (quest_id) and a quality. The
// original plushies are removed items (globalRemovedItems.js); the adv_ ones come from Plushie Capsules.
// Right-click a placed plushie with the item it asks for to raise its affection. The item form keeps the data in
// custom data (1.20.1: item NBT), the rarity (quality) too, since Quality Food only takes food items. Events:
// server_scripts/blockEvents/plushieEvents.js. Storing an animal in a plushie (Sunlit Crystal) is not ported yet.

const $PlushieDataComponents = Java.loadClass("net.minecraft.core.component.DataComponents");
const $PlushieCustomData = Java.loadClass("net.minecraft.world.item.component.CustomData");
const $PlushieCompoundTag = Java.loadClass("net.minecraft.nbt.CompoundTag");

// Kata (Kata's dolls) has no 1.21.1 build, so its dolls are not in the list.
global.originalPlushies = [
  "whimsy_deco:fufu_plushie",
  "whimsy_deco:flower_pig_plushie",
  "whimsy_deco:golden_pig_plushie",
  "whimsy_deco:big_panda_plushie",
  "whimsy_deco:singing_frog_plushie",
  "whimsy_deco:vocal_doll",
  "whimsy_deco:red_vocal_doll",
  "tanukidecor:mayoral_mini_figure",
  "tanukidecor:developer_mini_figure",
  "perfectplushies:red_fox_plushie",
  "perfectplushies:snow_fox_plushie",
  "perfectplushies:fennec_fox_plushie",
  "perfectplushies:red_ruffed_lemur_plushie",
  "perfectplushies:red_panda_plushie",
  "perfectplushies:raccoon_plushie",
  "perfectplushies:capybara_plushie",
  "perfectplushies:dog_plushie",
  "perfectplushies:cat_plushie",
  "perfectplushies:dolphin_plushie",
  "perfectplushies:brown_rabbit_plushie",
  "perfectplushies:white_rabbit_plushie",
  "perfectplushies:frog_plushie",
  "perfectplushies:goose_plushie",
  "perfectplushies:duck_plushie",
  "perfectplushies:rubber_duck_plushie",
  "perfectplushies:robin_plushie",
  "perfectplushies:hummingbird_plushie",
  "perfectplushies:hippo_plushie",
  "perfectplushies:mouse_plushie",
  "perfectplushies:turtle_plushie",
  "perfectplushies:doe_plushie",
  "perfectplushies:reindeer_plushie",
  "perfectplushies:bear_plushie",
  "perfectplushies:koala_plushie",
  "perfectplushies:panda_plushie",
  "perfectplushies:lion_cub_plushie",
  "perfectplushies:elephant_plushie",
  "perfectplushies:monkey_plushie",
  "perfectplushies:seal_plushie",
  "perfectplushies:hedgehog_plushie",
  "perfectplushies:aye_aye_plushie",
  "perfectplushies:quokka_plushie",
  "cluttered:pastel_bunny_plushie",
  "cluttered:sand_seal_plush_blue",
  "cluttered:sand_seal_plush_green",
  "cluttered:sand_seal_plush_red",
  "cluttered:teddy_bear",
];

global.plushies = global.originalPlushies.map((plushie) => {
  const parts = plushie.split(":");
  return `${parts[0]}:adv_${parts[1]}`;
});

// Traits in order of their type number. A plushie asks for items of its trait's tag; tags that are still empty
// (the society tags are not all ported yet) fall back to PLUSHIE_FALLBACK_TAG.
global.plushieTraits = [
  { trait: "aquatic", color: "1", tag: "#minecraft:fishes" },
  { trait: "woodsy", color: "2", tag: "#society:raw_logs" },
  { trait: "eldritch", color: "3", tag: "#society:eldritch" },
  { trait: "wrathful", color: "4", tag: "#minecraft:swords" },
  { trait: "sommelier", color: "5", tag: "#candlelight:all_effects" },
  { trait: "sunlit", color: "6", tag: "#society:omni_geode_treasure" },
  { trait: "hungry", color: "8", tag: "#society:dish" },
  { trait: "anxious", color: "8", tag: "#c:crops" },
  { trait: "shy", color: "9", tag: "#society:curtains" },
  { trait: "cheerful", color: "a", tag: "#c:foods/fruit" },
  { trait: "chill", color: "b", tag: "#society:chill" },
  { trait: "machiavellian", color: "c", tag: "#numismatics:coins" },
  { trait: "cutesy", color: "d", tag: "#society:bouquet_bag_flowers" },
  { trait: "fashionista", color: "e", tag: "#society:clothing" },
  { trait: "neutral", color: "f", tag: "#c:foods/vegetable" },
];
const PLUSHIE_FALLBACK_TAG = "#c:crops";
const PLUSHIE_MAX_AFFECTION = 4;

/** The item ids of a tag as a sorted JS array, so a quest names the same item after a restart. */
const plushieTagItems = (tag) => {
  const ids = [];
  Ingredient.of(tag).itemIds.forEach((id) => ids.push(String(id)));
  return ids.sort();
};

/** The items a plushie of this type can ask for. */
global.getPlushieQuestItems = (type) => {
  const trait = global.plushieTraits[type] || global.plushieTraits[global.plushieTraits.length - 1];
  let items = plushieTagItems(trait.tag);
  if (items.length === 0) items = plushieTagItems(PLUSHIE_FALLBACK_TAG);
  return items;
};

/** The item a plushie wants for its current quest, or "" when it wants nothing (no quest or full affection). */
global.getPlushieQuestItem = (type, affection, questId) => {
  if (questId <= 0 || affection >= PLUSHIE_MAX_AFFECTION) return "";
  const items = global.getPlushieQuestItems(type);
  if (items.length === 0) return "";
  let offset = 3;
  if (items.length < 12) offset = 2;
  if (items.length > 36) offset = 6;
  return String(items[(affection * offset + questId - 1) % items.length]);
};

/** The plushie data of a placed plushie. */
global.getPlushieBlockData = (block) => ({
  type: global.getMachineInt(block, "type"),
  quest_id: global.getMachineInt(block, "quest_id"),
  affection: global.getMachineInt(block, "affection"),
  quality: global.getMachineInt(block, "quality"),
});

/** The plushie data of a plushie item, or null when it has none (a plain plushie from a recipe or creative). */
global.getPlushieItemData = (stack) => {
  const data = stack.get($PlushieDataComponents.CUSTOM_DATA);
  if (!data) return null;
  const tag = data.copyTag();
  if (!tag.contains("type")) return null;
  return {
    type: Number(tag.getInt("type")),
    quest_id: Number(tag.getInt("quest_id")),
    affection: Number(tag.getInt("affection")),
    quality: tag.contains("quality") ? Number(tag.getInt("quality")) : global.getItemQuality(stack),
  };
};

/** A plushie item that carries plushie data. */
global.plushieItem = (id, values, count) => {
  let stack = Item.of(id, count || 1);
  let tag = new $PlushieCompoundTag();
  ["type", "quest_id", "affection", "quality"].forEach((key) => tag.putInt(key, Math.floor(Number(values[key]) || 0)));
  stack.set($PlushieDataComponents.CUSTOM_DATA, $PlushieCustomData.of(tag));
  return stack;
};

/** A random new plushie as a Plushie Capsule gives it. */
global.rollPlushie = (luckyCapsule, moreAffection) => {
  const id = global.plushies[Math.floor(Math.random() * global.plushies.length)];
  const rarity = moreAffection ? [0.25, 0.6, 0.3, 0.1] : [0.5, 0.3, 0.15, 0.05];
  const roll = Math.random();
  let quality = 0;
  rarity.forEach((chance, index) => {
    if (roll < chance) quality = index;
  });
  return global.plushieItem(
    id,
    {
      type: Math.floor(Math.random() * global.plushieTraits.length),
      quest_id: 1 + Math.floor(Math.random() * 3),
      affection: moreAffection ? 2 : 0,
      quality: quality,
    },
    luckyCapsule ? 2 : 1
  );
};

const PLUSHIE_HEART_PARTICLES = (level, block) => {
  level.spawnParticles("minecraft:heart", true, block.x + 0.5, block.y + 0.5, block.z + 0.5, 0.2, 0.2, 0.2, 10, 0.1);
};

/** Pops a placed plushie as an item that keeps its data. */
global.popPlushie = (block) => {
  block.popItem(global.plushieItem(String(block.id), global.getPlushieBlockData(block)));
};

/**
 * A gift for a placed plushie from someone with these stages. `player` (optional) gets the messages.
 * Returns true when the plushie took the item.
 */
global.giftPlushie = (block, item, stages, player) => {
  const level = block.level;
  const data = global.getPlushieBlockData(block);
  if (stages.has("women_who_run_with_the_plushies") && data.affection < 2) {
    data.affection = 2;
    global.setMachineData(block, { affection: 2 });
    PLUSHIE_HEART_PARTICLES(level, block);
  }
  const questItem = global.getPlushieQuestItem(data.type, data.affection, data.quest_id);
  if (!questItem) return false;
  if (String(item.id) !== questItem) {
    if (player) {
      player.tell(Text.translatable("society.plushie.want_gift").gray());
      player.tell(Item.of(questItem).getHoverName());
    }
    return false;
  }
  if (!player || !player.isCreative()) item.count--;
  PLUSHIE_HEART_PARTICLES(level, block);
  global.setMachineData(block, {
    quest_id: data.affection === 3 ? 0 : 1 + Math.floor(Math.random() * 3),
    affection: data.affection + 1,
  });
  if (
    stages.has("husbandry_mastery") &&
    !stages.has("women_who_run_with_the_plushies") &&
    data.affection > 2 &&
    Math.random() <= 0.05
  ) {
    block.popItemFromFace("society:women_who_run_with_the_plushies", global.getBlockProperty(block, "facing"));
  }
  if (player) player.tell(Text.translatable("society.plushie.thank").gray());
  return true;
};

StartupEvents.registry("block", (event) => {
  global.originalPlushies.forEach((plushie) => {
    const parts = plushie.split(":");
    const modelPath =
      parts[0] === "tanukidecor" ? `tanukidecor:block/mini_figure/${parts[1]}` : `${parts[0]}:block/${parts[1]}`;
    event
      .create(`${parts[0]}:adv_${parts[1]}`, "cardinal")
      .defaultCutout()
      .box(2, 0, 2, 14, 14, 14)
      .tagBlock("minecraft:mineable/axe")
      .tagItem("society:plushies")
      .soundType("wool")
      .hardness(1.0)
      .requiresTool(false)
      // A broken plushie drops itself with its data (server_scripts/blockEvents/plushieEvents.js).
      .noDrops()
      .parentModel(modelPath)
      .item((item) => item.parentModel(modelPath))
      .blockEntity((blockInfo) => {
        blockInfo.initialData({ type: 0, quest_id: 0, quality: 0, affection: 0 });
      });
  });
});
