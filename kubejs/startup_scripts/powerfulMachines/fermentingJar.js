// priority: 1
// Fermenting Jar (vintagedelight:fermenting_jar). Vintage Delight's fermenting recipes, rebuilt as a KubeJS
// machine: put the ingredients into its 18 slots; every 100 ticks it looks for a recipe whose ingredients are
// all there, takes them and puts the result back into its slots once the time is up. Extra items stay, so a
// full stack of cucumbers and salt keeps pickling. Recipes whose result is not in the pack are skipped.
// The tick is in server_scripts/blockEvents/machineTicks.js.
console.info("[SOCIETY] fermentingJar.js loaded");

const fermentingJarTickRate = 100;
// Filled by server_scripts/recipes/vintageDelightRecipes.js with the recipes it skipped (read by the CI test).
global.vintageDelightSkippedRecipes = [];
const $FermentingRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $FermentingResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation");

/** Whether an item id ("5x mod:item" or "mod:item") is registered, without the error Item.of logs for unknown ids. */
global.itemExists = (id) =>
  $FermentingRegistries.ITEM.containsKey($FermentingResourceLocation.parse(String(id).replace(/^\d+x /, "")));

// [id, ticks, ingredients ("3x id" or "#tag"), outputs]. The 1.20.1 forge: tags are c: tags here.
global.fermentingRecipes = [
  ["century_egg", 108000, ["minecraft:sniffer_egg", "minecraft:coal", "#c:salt"], ["vintagedelight:century_egg"]],
  ["fermented_spider_eye", 10000, ["5x minecraft:spider_eye", "minecraft:sugar"], ["5x minecraft:fermented_spider_eye"]],
  ["kimchi", 10000, ["4x farmersdelight:cabbage_leaf", "#c:salt", "#c:crops/pepper"],
    ["4x vintagedelight:kimchi", "vintagedelight:pickled_pepper"]],
  ["ochre_froglight", 12000,
    ["2x minecraft:slime_block", "minecraft:blaze_powder", "minecraft:magma_cream", "vintagedelight:salt_block", "vintagedelight:vinegar_bottle"],
    ["3x minecraft:ochre_froglight", "minecraft:glass_bottle"]],
  ["pearlescent_froglight", 12000,
    ["2x minecraft:slime_block", "minecraft:prismarine_crystals", "minecraft:sea_pickle", "vintagedelight:salt_block", "vintagedelight:vinegar_bottle"],
    ["3x minecraft:pearlescent_froglight", "minecraft:glass_bottle"]],
  ["verdant_froglight", 12000,
    ["2x minecraft:slime_block", "minecraft:glowstone_dust", "minecraft:glow_berries", "vintagedelight:salt_block", "vintagedelight:vinegar_bottle"],
    ["3x minecraft:verdant_froglight", "minecraft:glass_bottle"]],
  ["overnight_oats", 4800,
    ["farm_and_charm:oat", "2x #c:foods/berry", "farmersdelight:pumpkin_slice", "minecraft:melon_slice", "minecraft:apple", "minecraft:bowl"],
    ["vintagedelight:overnight_oats"]],
  ["pickle", 10000, ["5x #c:crops/cucumber", "#c:salt"], ["5x vintagedelight:pickle"]],
  ["pickled_beetroot", 10000, ["5x minecraft:beetroot", "#c:salt"], ["5x vintagedelight:pickled_beetroot"]],
  ["pickled_egg", 18000, ["5x #c:eggs", "#c:salt"], ["5x vintagedelight:pickled_egg"]],
  ["pickled_pepper", 10000, ["5x #c:crops/pepper", "#c:salt"], ["5x vintagedelight:pickled_pepper"]],
  ["pickled_onion", 10000, ["5x farm_and_charm:onion", "#c:salt"], ["5x vintagedelight:pickled_onion"]],
  ["pickled_pitcher_pod", 10000, ["5x minecraft:pitcher_pod", "minecraft:sugar"], ["5x vintagedelight:pickled_pitcher_pod"]],
  ["river_jelly", 12000,
    ["supplementaries:antique_ink", "crabbersdelight:raw_squid_tentacles", "aquaculture:smallmouth_bass", "3x #society:seashells"],
    ["society:river_jelly"]],
  ["rotten_log", 6000, ["5x #society:raw_logs", "#c:mushrooms"], ["5x betterarcheology:rotten_log"]],
  ["slime_block", 10000, ["5x #minecraft:leaves", "#c:salt"], ["minecraft:slime_block"]],
  ["surstromming", 10000, ["5x #vintagedelight:raw_fish", "#c:salt"], ["5x vintagedelight:surstromming"]],
  ["truffle_oil", 10000, ["4x society:truffle", "vintagedelight:vinegar_bottle", "#c:salt"], ["4x society:truffle_oil"]],
  ["vinegar_from_jam", 10000, ["#society:preserves", "#c:mushrooms"],
    ["vintagedelight:vinegar_mason_jar", "3x vintagedelight:organic_mash"]],
  ["apple_brew", 12000, ["4x society:maple_syrup", "vinery:apple_bag", "supplementaries:sugar_cube"],
    ["9x longwings:apple_butterfly_brew_block"]],
  ["berry_brew", 12000, ["4x society:maple_syrup", "farm_and_charm:strawberry_bag", "supplementaries:sugar_cube"],
    ["9x longwings:berry_butterfly_brew_block"]],
  ["melon_brew", 12000, ["4x society:maple_syrup", "minecraft:melon", "supplementaries:sugar_cube"],
    ["9x longwings:melon_butterfly_brew_block"]],
].map((entry) => ({
  id: entry[0],
  time: entry[1],
  inputs: entry[2].map((s) => {
    let match = s.match(/^(\d+)x (.+)$/);
    return match ? { key: match[2], count: Number(match[1]) } : { key: s, count: 1 };
  }),
  outputs: entry[3],
}));

const fermentingMatches = (stack, key) =>
  key.startsWith("#") ? stack.hasTag(key.substring(1)) : String(stack.id) === key;

/**
 * Which slots and counts a recipe would take from the inventory, or null when something is missing.
 * Exact items are taken first so that a tag does not use up an item another ingredient needs.
 */
global.planFermentingRecipe = (inventory, recipe) => {
  let left = [];
  for (let i = 0; i < inventory.getSlots(); i++) left.push(inventory.getStackInSlot(i).count);
  let take = {};
  let inputs = recipe.inputs.filter((i) => !i.key.startsWith("#")).concat(recipe.inputs.filter((i) => i.key.startsWith("#")));
  for (let input of inputs) {
    let needed = input.count;
    for (let i = 0; i < left.length && needed > 0; i++) {
      if (left[i] <= 0) continue;
      let stack = inventory.getStackInSlot(i);
      if (!fermentingMatches(stack, input.key)) continue;
      let used = Math.min(left[i], needed);
      left[i] -= used;
      needed -= used;
      take[i] = (take[i] || 0) + used;
    }
    if (needed > 0) return null;
  }
  return take;
};

global.getFermentingJarInventory = (block) => {
  let entity = block.getEntity();
  return entity && entity.attachments ? entity.attachments.get("inventory") : null;
};

/** One tick of the jar (every fermentingJarTickRate ticks). Returns the recipe id it started or finished. */
global.handleFermentingJar = (level, block) => {
  let inventory = global.getFermentingJarInventory(block);
  if (!inventory) return null;
  let current = global.getMachineString(block, "recipe");
  if (current !== "") {
    let remaining = global.getMachineInt(block, "remaining") - fermentingJarTickRate;
    if (remaining > 0) {
      global.setMachineData(block, { remaining: remaining });
      return null;
    }
    let recipe = global.fermentingRecipes.find((r) => r.id === current);
    if (recipe) {
      recipe.outputs.forEach((output) => {
        let rest = global.insertIntoHandler(inventory, Item.of(output), false);
        if (!rest.isEmpty()) block.popItem(rest);
      });
      level.server.runCommandSilent(`playsound minecraft:block.brewing_stand.brew block @a ${block.x} ${block.y} ${block.z} 0.5`);
    }
    global.setMachineData(block, { recipe: "", remaining: 0 });
    return current;
  }
  for (let recipe of global.fermentingRecipes) {
    if (!recipe.outputs.every(global.itemExists)) continue;
    let take = global.planFermentingRecipe(inventory, recipe);
    if (!take) continue;
    Object.keys(take).forEach((slot) => inventory.extractItem(Number(slot), take[slot], false));
    global.setMachineData(block, { recipe: recipe.id, remaining: recipe.time });
    return recipe.id;
  }
  return null;
};

StartupEvents.registry("block", (event) => {
  event
    .create("vintagedelight:fermenting_jar")
    .soundType("glass")
    .hardness(1)
    .box(3, 0, 3, 13, 14, 13)
    .defaultCutout()
    .tagBlock("minecraft:mineable/pickaxe")
    .item((item) => {
      item.tooltip(Text.translatable("society.working_block_entity.can_use_hopper").green());
    })
    .blockEntity((blockInfo) => {
      blockInfo.initialData({ recipe: "", remaining: 0 });
      blockInfo.inventory("inventory", [], 9, 2);
      blockInfo.rightClickOpensInventory("inventory");
      blockInfo.serverTicking();
      blockInfo.tickFrequency(fermentingJarTickRate);
    });
});
