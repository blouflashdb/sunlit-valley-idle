// Create recipes with the pack's fluids: mixing, draining milk, bottling and pressing juices, ported from
// addMixerRecipes.js, addMilkRecipes.js, addBottleRecipes.js and addGrapeJuiceRecipes.js (1.20.1). The recipes keep
// their 1.20.1 JSON; addLegacyCreateRecipe (processingRecipes.js) writes them in the Create 6 format and skips the
// ones whose items or fluids are missing.
console.info("[SOCIETY] fluidRecipes.js loaded");

ServerEvents.recipes((e) => {
  // Mixing

  const createMixerRecipe = (inputs, output, count) => {
    addLegacyCreateRecipe(e, {
      type: "create:mixing",
      results: [{ item: output, count: count }],
      ingredients: inputs,
    });
  };

  const recipes = [
    {
      output: "candlelight:mozzarella",
      inputs: [
        {
          amount: 250,
          fluid: "minecraft:water",
        },
        {
          amount: 250,
          fluid: "society:milk",
        },
      ],
    },
    {
      output: "farm_and_charm:butter",
      inputs: [
        {
          amount: 250,
          fluid: "society:milk",
        },
      ],
    },
    {
      output: "candlelight:tomato_mozzarella_salad",
      inputs: [
        {
          item: "minecraft:bowl",
        },
        {
          tag: "forge:cheeses",
        },
        {
          item: "farmersdelight:tomato",
        },
      ],
    },
    {
      output: "candlelight:salad",
      count: 4,
      inputs: [
        {
          item: "minecraft:bowl",
        },
        {
          tag: "forge:vegetables/cabbage",
        },
        {
          tag: "forge:cheeses",
        },
        {
          item: "farmersdelight:tomato",
        },
      ],
    },
    {
      output: "candlelight:fresh_garden_salad",
      inputs: [
        {
          item: "minecraft:bowl",
        },
        {
          tag: "forge:vegetables/cabbage",
        },
        {
          item: "minecraft:carrot",
        },
        {
          item: "farmersdelight:tomato",
        },
      ],
    },
    {
      output: "candlelight:beef_tartare",
      count: 2,
      inputs: [
        {
          item: "minecraft:bowl",
        },
        {
          item: "farm_and_charm:onion",
        },
        {
          item: "farm_and_charm:minced_beef",
        },
      ],
    },
    {
      output: "candlelight:harvest_plate",
      count: 3,
      inputs: [
        {
          item: "minecraft:bowl",
        },
        {
          item: "farmersdelight:tomato",
        },
        {
          item: "minecraft:carrot",
        },
        {
          item: "minecraft:potato",
        },
      ],
    },
    {
      output: "candlelight:beetroot_salad",
      count: 2,
      inputs: [
        {
          item: "minecraft:bowl",
        },
        {
          tag: "forge:cheeses",
        },
        {
          item: "minecraft:beetroot",
        },
      ],
    },
    {
      output: "farm_and_charm:farmer_salad",
      count: 2,
      inputs: [
        {
          tag: "forge:vegetables/cabbage",
        },
        {
          item: "farmersdelight:tomato",
        },
        {
          item: "farm_and_charm:strawberry",
        },
        {
          item: "farm_and_charm:onion",
        },
      ],
    },
    {
      output: "brewery:potato_salad",
      count: 2,
      inputs: [
        {
          item: "minecraft:beetroot",
        },
        {
          tag: "forge:vegetables/cabbage",
        },
        {
          item: "farmersdelight:tomato",
        },
        {
          item: "minecraft:baked_potato",
        },
      ],
    },
    {
      output: "farm_and_charm:oatmeal_with_strawberries",
      count: 2,
      inputs: [
        {
          amount: 1000,
          fluid: "society:milk",
        },
        {
          item: "farm_and_charm:oat",
        },
        {
          item: "farm_and_charm:strawberry",
        },
      ],
    },
  ];
  recipes.forEach((recipe) => {
    createMixerRecipe(recipe.inputs, recipe.output, recipe.count || 1);
  });
  // Additional recipes that don't fit the simple format
  addLegacyCreateRecipe(e, {
    type: "create:mixing",
    ingredients: [
      {
        item: "minecraft:lapis_lazuli",
      },
      {
        fluid: "society:ancient_fruit_juice",
        amount: 100,
      },
      {
        fluid: "create_enchantment_industry:experience",
        amount: 100,
      },
    ],
    results: [
      {
        fluid: "create_enchantment_industry:hyper_experience",
        amount: 20,
      },
    ],
    heatRequirement: "superheated",
  });
  addLegacyCreateRecipe(e, {
    type: "create:mixing",
    ingredients: [
      {
        item: "society:pristine_star_shards",
      },
      {
        fluid: "society:starfruit_juice",
        amount: 100,
      },
    ],
    results: [
      {
        fluid: "create_enchantment_industry:experience",
        amount: 20,
      },
      {
        item: "society:pristine_star_shards",
      },
    ],
    heatRequirement: "heated",
  });
  addLegacyCreateRecipe(e, {
    type: "create:mixing",
    ingredients: [
      {
        item: "society:prismatic_shard",
      },
      {
        fluid: "create_enchantment_industry:hyper_experience",
        amount: 20,
      },
    ],
    results: [
      {
        fluid: "relics:relic_experience",
        amount: 20,
      },
      {
        item: "society:prismatic_shard",
      },
    ],
    heatRequirement: "superheated",
  });
  addLegacyCreateRecipe(e, {
    type: "create:mixing",
    ingredients: [
      {
        item: "minecraft:glowstone_dust",
      },
      {
        fluid: "society:ancient_fruit_juice",
        amount: 250,
      },
    ],
    results: [
      {
        fluid: "supplementaries:lumisene",
        amount: 250,
      },
    ],
    heatRequirement: "heated",
  });

  addLegacyCreateRecipe(e, {
    type: "create:mixing",
    ingredients: [
      {
        item: "society:ancient_fruit",
      },
      {
        fluid: "society:oak_resin",
        amount: 50,
      },
      {
        fluid: "society:vinegar",
        amount: 500,
      },
    ],
    results: [
      {
        fluid: "society:alchemical_varnish",
        amount: 500,
      },
    ],
    heatRequirement: "heated",
  });
  addLegacyCreateRecipe(e, {
    type: "create:mixing",
    ingredients: [
      {
        item: "oreganized:lead_ingot",
      },
      {
        item: "create:powdered_obsidian",
      },
    ],
    results: [
      {
        fluid: "oreganized:molten_lead",
        amount: 200,
      },
    ],
    heatRequirement: "superheated",
  });
  addLegacyCreateRecipe(e, {
    type: "create:mixing",
    ingredients: [
      {
        item: "minecraft:netherite_upgrade_smithing_template",
      },
      {
        item: "create:powdered_obsidian",
      },
    ],
    results: [
      {
        item: "oreganized:electrum_upgrade_smithing_template",
      },
    ],
    heatRequirement: "superheated",
  });
  addLegacyCreateRecipe(e, {
    type: "create:mixing",
    ingredients: [
      {
        item: "society:sun_candy",
      },
      {
        fluid: "create_central_kitchen:aloe_gel",
        amount: 50,
      },
      {
        fluid: "society:mystic_syrup",
        amount: 250,
      }
    ],
    results: [
      {
        fluid: "society:mystic_jelly",
        amount: 250,
      },
    ],
    heatRequirement: "superheated",
  });
  addLegacyCreateRecipe(e, {
    type: "create:mixing",
    ingredients: [
      {
        item: "minecraft:turtle_egg"
      },
      {
        item: "society:ocean_stone",
      },
      {
        item: "gag:sacred_salt",
      },
      {
        item: "minecraft:tube_coral_block",
      },
      {
        fluid: "minecraft:water",
        amount: 500,
      },
      {
        fluid: "society:mystic_jelly",
        amount: 500,
      }
    ],
    results: [
      {
        item: "society:ocean_jelly",
      },
    ],
    heatRequirement: "superheated",
  });
  addLegacyCreateRecipe(e, {
    type: "create:mixing",
    ingredients: [
      {
        item: "species:cracked_wraptor_egg",
      },
      {
        item: "society:dried_crimson_fungus",
      },
      {
        item: "society:dried_warped_fungus",
      },
      {
        item: "netherdepthsupgrade:eyeball"
      },
      {
        fluid: "minecraft:lava",
        amount: 500,
      },
      {
        fluid: "society:mystic_jelly",
        amount: 500,
      }
    ],
    results: [
      {
        item: "society:nether_jelly",
      },
    ],
    heatRequirement: "superheated",
  });

  // Draining milk
  const addDrainRecipe = (item, amount) => {
    addLegacyCreateRecipe(e, {
      type: "create:emptying",
      ingredients: [
        {
          item: item,
        },
      ],
      results: [
        {
          amount: amount,
          fluid: "society:milk",
        },
      ],
    });
  };
  [
    "society:large_milk",
    "society:large_goat_milk",
    "society:large_buffalo_milk",
    "society:large_sheep_milk",
    "society:large_warped_milk",
    "society:large_grain_milk",
    "society:large_amethyst_milk"
  ].forEach((milk) => {
    addDrainRecipe(milk, 1000);
  });
  [
    "society:goat_milk",
    "society:milk",
    "society:buffalo_milk",
    "society:warped_milk",
    "society:sheep_milk",
    "society:grain_milk",
    "society:amethyst_milk"

  ].forEach((milk) => {
    addDrainRecipe(milk, 250);
  });

  // Bottles
  const bottleRecipes = (item, fluid, amount, container) => {
    addLegacyCreateRecipe(e, {
      type: "create:filling",
      ingredients: [
        {
          item: container,
        },
        {
          amount: amount,
          fluid: fluid,
        },
      ],
      results: [
        {
          item: item,
        },
      ],
    });
    addLegacyCreateRecipe(e, {
      type: "create:emptying",
      ingredients: [
        {
          item: item,
        },
      ],
      results: [
        {
          item: container,
        },
        {
          amount: amount,
          fluid: fluid,
        },
      ],
    });
  };

  const bottles = [
    {
      item: "vinery:apple_juice",
      fluid: "vinery:apple_juice",
      amount: 250,
      container: "vinery:wine_bottle",
    },
    {
      item: "society:ancient_juice",
      fluid: "society:ancient_fruit_juice",
      amount: 250,
      container: "vinery:wine_bottle",
    },
    {
      item: "society:starfruit_juice",
      fluid: "society:starfruit_juice",
      amount: 250,
      container: "vinery:wine_bottle",
    },
    {
      item: "society:mana_fruit_juice",
      fluid: "society:mana_fruit_juice",
      amount: 250,
      container: "vinery:wine_bottle",
    },
    {
      item: "society:sparkpod_juice",
      fluid: "society:sparkpod_juice",
      amount: 250,
      container: "vinery:wine_bottle",
    },
    {
      item: "relics:relic_experience_bottle",
      fluid: "relics:relic_experience",
      amount: 50,
      container: "minecraft:glass_bottle",
    },
    {
      item: "society:pine_tar",
      fluid: "society:pine_tar",
      amount: 250,
      container: "minecraft:glass_bottle",
    },
    {
      item: "society:oak_resin",
      fluid: "society:oak_resin",
      amount: 250,
      container: "minecraft:glass_bottle",
    },
    {
      item: "society:mystic_syrup",
      fluid: "society:mystic_syrup",
      amount: 250,
      container: "minecraft:glass_bottle",
    },
    {
      item: "society:maple_syrup",
      fluid: "society:maple_syrup",
      amount: 250,
      container: "minecraft:glass_bottle",
    },
    {
      item: "society:aloe_preserves",
      fluid: "create_central_kitchen:aloe_gel",
      amount: 250,
      container: "minecraft:glass_bottle",
    },
    {
      item: "vintagedelight:vinegar_bottle",
      fluid: "society:vinegar",
      amount: 250,
      container: "minecraft:glass_bottle",
    },
    {
      item: "vintagedelight:vinegar_mason_jar",
      fluid: "society:vinegar",
      amount: 750,
      container: "bakery:jar",
    },
  ];
  bottles.forEach((recipe) => {
    bottleRecipes(recipe.item, recipe.fluid, recipe.amount, recipe.container);
  });
  addLegacyCreateRecipe(e, {
    type: "create:filling",
    ingredients: [
      {
        tag: "society:raw_logs",
      },
      {
        amount: 50,
        fluid: "society:oak_resin",
      },
    ],
    results: [
      {
        item: "society:treated_log",
      },
    ],
  });

  // Juices
  // Bottling Vinery grape juice (the 1.20.1 savanna, jungle and taiga juice tags never existed)
  ["red", "white"].forEach((color) => {
    addLegacyCreateRecipe(e, {
      type: "create:filling",
      ingredients: [{ item: "vinery:wine_bottle" }, { amount: 250, fluid: `vinery:${color}_grape_juice` }],
      results: [{ item: `vinery:${color}_grapejuice` }],
    });
  });
  addLegacyCreateRecipe(e, {
    type: "create:emptying",
    ingredients: [
      {
        item: `vinery:white_grapejuice`,
      },
    ],
    results: [
      {
        item: "vinery:wine_bottle",
      },
      {
        amount: 250,
        fluid: `vinery:white_grape_juice`,
      },
    ],
  });

  addLegacyCreateRecipe(e, {
    type: "create:emptying",
    ingredients: [
      {
        item: `vinery:red_grapejuice`,
      },
    ],
    results: [
      {
        item: "vinery:wine_bottle",
      },
      {
        amount: 250,
        fluid: `vinery:red_grape_juice`,
      },
    ],
  });
  addLegacyCreateRecipe(e, {
    type: "create:compacting",
    ingredients: [
      [
        { item: "vinery:red_grape" },
        { item: "vinery:savanna_grapes_red" },
        { item: "vinery:jungle_grapes_red" },
        { item: "vinery:taiga_grapes_red" },
      ],
    ],
    results: [
      {
        amount: 50,
        fluid: `vinery:red_grape_juice`,
      },
    ],
  });
  addLegacyCreateRecipe(e, {
    type: "create:compacting",
    ingredients: [
      [
        { item: "vinery:white_grape" },
        { item: "vinery:savanna_grapes_white" },
        { item: "vinery:jungle_grapes_white" },
        { item: "vinery:taiga_grapes_white" },
      ],
    ],
    results: [
      {
        amount: 50,
        fluid: `vinery:white_grape_juice`,
      },
    ],
  });
  addLegacyCreateRecipe(e, {
    type: "create:compacting",
    ingredients: [
      {
        item: "minecraft:apple",
      },
    ],
    results: [
      {
        item: "vinery:apple_mash",
      },
    ],
  });
  addLegacyCreateRecipe(e, {
    type: "create:compacting",
    ingredients: [
      {
        item: "vinery:apple_mash",
      },
    ],
    results: [
      {
        amount: 250,
        fluid: "vinery:apple_juice",
      },
    ],
  });
  addLegacyCreateRecipe(e, {
    type: "create:compacting",
    ingredients: [
      {
        item: "society:ancient_fruit",
      },
    ],
    results: [
      {
        amount: 250,
        fluid: "society:ancient_fruit_juice",
      },
    ],
  });
  addLegacyCreateRecipe(e, {
    type: "create:compacting",
    ingredients: [
      {
        item: "pamhc2trees:starfruititem",
      },
    ],
    results: [
      {
        amount: 250,
        fluid: "society:starfruit_juice",
      },
    ],
  });
  addLegacyCreateRecipe(e, {
    type: "create:compacting",
    ingredients: [
      {
        item: "society:sparkpod",
      },
    ],
    results: [
      {
        amount: 250,
        fluid: "society:sparkpod_juice",
      },
    ],
  });
  addLegacyCreateRecipe(e, {
    type: "create:compacting",
    ingredients: [
      {
        item: "society:mana_fruit",
      },
    ],
    results: [
      {
        amount: 250,
        fluid: "society:mana_fruit_juice",
      },
    ],
  });
});
