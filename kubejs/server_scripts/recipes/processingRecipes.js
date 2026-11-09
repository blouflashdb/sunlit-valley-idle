// Create, Farmer's Delight and Farm & Charm processing recipes of the pack (crushing, milling, cutting, pressing,
// compacting), ported from addCrushingRecipes.js, addMillingRecipes.js and addPressingRecipes.js (1.20.1).
// Each recipe gets an id under society:processing/ and is skipped when one of its items is not registered;
// processingRecipeIds and processingRecipeSkipped list them for the CI test (tools/port/kubejs_tests).
console.info("[SOCIETY] processingRecipes.js loaded");

const $ProcessingRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $ProcessingRL = Java.loadClass("net.minecraft.resources.ResourceLocation");

const processingRecipeIds = {};
const processingRecipeSkipped = {};

const processingHasItem = (id) => $ProcessingRegistries.ITEM.containsKey($ProcessingRL.parse(id));
const processingHasFluid = (id) => $ProcessingRegistries.FLUID.containsKey($ProcessingRL.parse(id));

// "minecraft:egg" or "#c:foods/berry" -> ingredient JSON
const processingIngredient = (s) => (s.startsWith("#") ? { tag: s.substring(1) } : { item: s });

// Adds a recipe with the id society:processing/<kind>/<name> unless an item or fluid of it is missing. json is the
// recipe JSON, or a function that adds the recipe and returns it.
const addProcessingRecipe = (e, kind, name, items, fluids, json) => {
  let id = `society:processing/${kind}/${name}`;
  let missing = items
    .map((s) => s.replace(/^\d+x /, ""))
    .filter((s) => !s.startsWith("#") && !processingHasItem(s))
    .concat((fluids || []).filter((f) => !processingHasFluid(f)));
  if (missing.length > 0) {
    processingRecipeSkipped[id] = missing;
    return;
  }
  delete processingRecipeSkipped[id];
  (typeof json === "function" ? json() : e.custom(json)).id(id);
  processingRecipeIds[id] = true;
};

const processingPath = (id) => id.split(":")[1].replace(/\//g, "_");

// Create recipes: ingredients are item/tag strings or { fluid, amount }; results are [id, count] or { fluid, amount }.
const addCreateRecipe = (e, type, ingredients, results, extra) => {
  let items = [];
  let fluids = [];
  let json = Object.assign({ type: `create:${type}` }, extra || {});
  json.ingredients = ingredients.map((i) => {
    if (typeof i === "string") {
      items.push(i);
      return processingIngredient(i);
    }
    fluids.push(i.fluid);
    return { type: "fluid_stack", fluid: i.fluid, amount: i.amount };
  });
  json.results = results.map((r) => {
    if (Array.isArray(r)) {
      items.push(r[0]);
      return { id: r[0], count: r[1] || 1 };
    }
    fluids.push(r.fluid);
    return { id: r.fluid, amount: r.amount };
  });
  let first = results[0];
  let name = `${processingPath(typeof ingredients[0] === "string" ? ingredients[0].replace("#", "") : ingredients[0].fluid)}_to_${processingPath(Array.isArray(first) ? first[0] : first.fluid)}`;
  addProcessingRecipe(e, type, name, items, fluids, json);
};

// forge tags of the 1.20.1 recipes that have another c tag name; every other forge:x is c:x.
const processingForgeTags = {
  "forge:cheeses": "c:foods/cheese",
  "forge:vegetables/cabbage": "c:crops/cabbage",
  "forge:milk": "c:milk",
};
const processingTag = (tag) => processingForgeTags[tag] || tag.replace(/^forge:/, "c:");

// Adds a Create recipe written in the 1.20.1 JSON format (item/tag/fluid/fluidTag ingredients, item/fluid results,
// camelCase keys) in the Create 6 format; the id is society:processing/<type>/<first input>_to_<first output>_<hash>,
// the hash of the recipe keeping ids of recipes with the same first input and output apart.
const processingHash = (text) => {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  return hash.toString(36);
};
const addLegacyCreateRecipe = (e, json) => {
  let items = [];
  let fluids = [];
  let ingredient = (i) => {
    if (Array.isArray(i)) return i.map(ingredient);
    if (i.fluid) {
      fluids.push(i.fluid);
      return { type: "fluid_stack", fluid: i.fluid, amount: i.amount };
    }
    if (i.fluidTag) return { type: "fluid_tag", fluid_tag: processingTag(i.fluidTag), amount: i.amount };
    if (i.tag) return { tag: processingTag(i.tag) };
    items.push(i.item);
    return { item: i.item };
  };
  let result = (r) => {
    if (r.fluid) {
      fluids.push(r.fluid);
      return { id: r.fluid, amount: r.amount };
    }
    items.push(r.item);
    let out = { id: r.item, count: r.count || 1 };
    if (r.chance !== undefined) out.chance = r.chance;
    return out;
  };
  let out = { type: json.type, ingredients: json.ingredients.map(ingredient), results: json.results.map(result) };
  if (json.heatRequirement) out.heat_requirement = json.heatRequirement;
  if (json.processingTime) out.processing_time = json.processingTime;
  let first = (i) => {
    let one = Array.isArray(i) ? i[0] : i;
    return processingPath(one.item || one.fluid || one.fluidTag || one.tag);
  };
  let type = json.type.split(":")[1];
  let name = `${first(json.ingredients[0])}_to_${first(json.results[0])}_${processingHash(JSON.stringify(out))}`;
  addProcessingRecipe(e, type, name, items, fluids, out);
};

const addCuttingRecipe = (e, input, tool, output, count) => {
  addProcessingRecipe(e, "cutting", `${processingPath(input.replace("#", ""))}_to_${processingPath(output)}`, [input, output], [], {
    type: "farmersdelight:cutting",
    ingredients: [processingIngredient(input)],
    result: [{ item: { count: count || 1, id: output } }],
    tool: { tag: tool },
  });
};

// Farm & Charm mincer; recipeType is MEAT or STONE (the mincer's sound and particles).
const addMincerRecipe = (e, input, output, count, recipeType) => {
  addProcessingRecipe(e, "mincer", `${processingPath(input)}_to_${processingPath(output)}`, [input, output], [], {
    type: "farm_and_charm:mincer",
    ingredient: { item: input },
    recipe_type: recipeType,
    result: { count: count, id: output },
  });
};

ServerEvents.recipes((e) => {
  // Crushing: Create millstone and the mincer
  let crushed = (input, output, count, noMincer) => {
    if (!noMincer) addMincerRecipe(e, input, output, count, "MEAT");
    addCreateRecipe(e, "milling", [input], [[output, count]], { processing_time: 40 });
  };
  crushed("society:neptuna", "aquaculture:neptunium_nugget", 2);
  crushed("aquaculture:worm", "crabbersdelight:crab_trap_bait", 2);
  crushed("aquaculture:minnow", "crabbersdelight:crab_trap_bait", 16);
  crushed("aquaculture:leech", "crabbersdelight:crab_trap_bait", 32);
  crushed("pamhc2trees:cinnamonitem", "society:ground_cinnamon", 4);
  crushed("herbalbrews:coffee_beans", "herbalbrews:ground_coffee", 1);
  crushed("minecraft:beef", "farm_and_charm:minced_beef", 1, true);
  crushed("minecraft:mutton", "farm_and_charm:lamb_ham", 1, true);
  crushed("minecraft:baked_potato", "brewery:mashed_potatoes", 2, true);
  crushed("society:sparkpod", "society:sparkstone", 3);

  // Cutting board
  addCuttingRecipe(e, "#c:foods/dough", "c:tools/knife", "farm_and_charm:raw_pasta", 1);
  addCuttingRecipe(e, "minecraft:cooked_chicken", "c:tools/knife", "brewery:half_chicken", 1);
  addCuttingRecipe(e, "minecraft:flint", "c:tools/mining_tool", "twigs:pebble", 2);
  [
    ["farm_and_charm:barley", 2],
    ["farm_and_charm:corn", 4],
    ["farm_and_charm:oat", 6],
    ["minecraft:wheat", 8],
  ].forEach((pair) => addCuttingRecipe(e, pair[0], "c:tools/knife", "society:animal_feed", pair[1]));

  // Milling: Create millstone and the mincer
  let milled = (input, output, count) => {
    addCreateRecipe(e, "milling", [input], [[output, count]], { processing_time: 400 });
    addMincerRecipe(e, input, output, count, "STONE");
  };
  milled("farm_and_charm:barley_ball", "society:animal_feed_sack", 2);
  milled("farm_and_charm:corn_bag", "society:animal_feed_sack", 4);
  milled("farm_and_charm:oat_ball", "society:animal_feed_sack", 6);
  milled("minecraft:hay_block", "society:animal_feed_sack", 8);
  milled("society:animal_feed_sack", "society:animal_feed", 9);
  milled("farm_and_charm:barley", "farm_and_charm:flour", 1);
  milled("farm_and_charm:corn", "farm_and_charm:flour", 3);
  milled("farm_and_charm:oat", "farm_and_charm:flour", 6);
  milled("minecraft:wheat", "farm_and_charm:flour", 9);
  milled("society:sparkstone", "society:sparkstone_dust", 1);
  milled("minecraft:flint", "twigs:pebble", 2);

  // Pressing and compacting
  addCreateRecipe(e, "pressing", ["oreganized:lead_ingot"], [["oreganized:lead_sheet", 1]]);
  addCreateRecipe(e, "pressing", ["oreganized:silver_ingot"], [["oreganized:silver_sheet", 1]]);
  addCreateRecipe(e, "compacting", [{ fluid: "create_central_kitchen:sap", amount: 250 }], [["society:sap", 1]]);
  addCreateRecipe(
    e,
    "compacting",
    ["netherdepthsupgrade:lava_pufferfish"],
    [["netherdepthsupgrade:lava_pufferfish", 1], { fluid: "minecraft:lava", amount: 10 }]
  );
});
