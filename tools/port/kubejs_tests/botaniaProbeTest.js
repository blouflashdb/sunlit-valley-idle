// Temporary probe (removed before merge): lists which item ids the old Botania data uses and which Botania
// recipes exist, so the data can be rewritten for Botania Revived.
const probeIds = ["aquaculture:neptunium_nugget","aquaculture:synodontis","betterarcheology:artifact_shards","botania:agricarnation","botania:alchemy_catalyst","botania:conjuration_catalyst","botania:dragonstone","botania:ender_air_bottle","botania:endoflame","botania:entropinnyum","botania:flight_tiara","botania:gaia_ingot","botania:infused_seeds","botania:jaded_amaranthus","botania:life_essence","botania:lime_shiny_flower","botania:livingrock","botania:mana_cookie","botania:mana_diamond","botania:mana_pearl","botania:mana_string","botania:manasteel_block","botania:manasteel_ingot","botania:manaweave_cloth","botania:overgrowth_seed","botania:pixie_dust","botania:quartz_blaze","botania:quartz_dark","botania:quartz_lavender","botania:quartz_mana","botania:quartz_red","botania:quartz_sunny","botania:redstone_root","botania:rune_air","botania:rune_autumn","botania:rune_earth","botania:rune_envy","botania:rune_fire","botania:rune_gluttony","botania:rune_greed","botania:rune_lust","botania:rune_mana","botania:rune_pride","botania:rune_sloth","botania:rune_spring","botania:rune_summer","botania:rune_water","botania:rune_winter","botania:rune_wrath","botania:runic_altar","botania:terrasteel_ingot","botania:teru_teru_bozu","buzzier_bees:buttercup","cluttered:fluorescent_maple_sapling","crabbersdelight:deluxe_crab_trap_bait","crabbersdelight:mana_crab_trap_bait","crabbersdelight:pearl","etcetera:bismuth_block","etcetera:bismuth_ingot","etcetera:nether_bismuth_ore","farm_and_charm:strawberry","farmersdelight:honey_cookie","farmlife:domestic_tribull_spawn_egg","farmlife:galliraptor_spawn_egg","minecraft:blaze_powder","minecraft:bone_block","minecraft:deepslate","minecraft:diamond_block","minecraft:feather","minecraft:golden_apple","minecraft:name_tag","minecraft:nether_gold_ore","minecraft:nether_quartz_ore","minecraft:netherite_upgrade_smithing_template","minecraft:netherrack","minecraft:player_head","minecraft:prismarine_crystals","minecraft:quartz","minecraft:skeleton_skull","minecraft:stone","minecraft:sunflower","numismatics:ancient_coin","numismatics:neptunium_coin","numismatics:prismatic_coin","oreganized:deepslate_lead_ore","oreganized:deepslate_silver_ore","oreganized:electrum_block","oreganized:electrum_ingot","oreganized:electrum_upgrade_smithing_template","oreganized:lead_ore","oreganized:silver_block","oreganized:silver_ingot","oreganized:silver_ore","pamhc2trees:bananaitem","pamhc2trees:cinnamonitem","pamhc2trees:dragonfruit_sapling","pamhc2trees:lemon_sapling","pamhc2trees:lycheeitem","pamhc2trees:plumitem","quark:diamond_heart","quark:soul_bead","rainbowoaks:rainbow_sapling","snowyspirit:ginger","society:aged_amethyst_cheese_block","society:aged_buffalo_cheese_block","society:aged_cheese_block","society:aged_goat_cheese_block","society:aged_grain_cheese_block","society:aged_sheep_cheese_block","society:aged_warped_cheese_block","society:amethyst_chunk","society:ancient_fruit","society:ancient_fruit_seed","society:animal_feed","society:animal_feed_sack","society:aquamarine","society:blueberry","society:blueberry_preserves","society:botanical_tribute","society:butterfly_amber","society:earth_crystal","society:fine_wool","society:fire_quartz","society:flamingo_mayonnaise","society:jade","society:large_duck_mayonnaise","society:large_goose_mayonnaise","society:large_mayonnaise","society:large_turkey_mayonnaise","society:mana_feed","society:mana_fruit","society:mana_fruit_crop","society:moth_pollen","society:penguin_mayonnaise","society:prismatic_shard_block","society:ruby","society:sparkpod","society:sparkstone","society:spinel","society:supreme_mayonnaise","society:topaz","trials:breeze_rod","unusualfishmod:clement_shell","unusualfishmod:fluvial_shell","unusualfishmod:raw_drooping_gourami","unusualfishmod:raw_forkfish","unusualfishmod:raw_snowflake","unusualfishmod:thunderous_shell","vinery:cherry","vintagedelight:gearo_berry","vintagedelight:ghost_charcoal","vintagedelight:peanut","windswept:lavender",];
const probeCandidates = (id) => {
  const ns = id.split(":")[0];
  const path = id.split(":")[1];
  const out = [];
  let m = path.match(/^rune_(.*)$/);
  if (m) out.push(`${ns}:rune_of_${m[1]}`);
  m = path.match(/^(.*)_petal$/);
  if (m) out.push(`${ns}:${m[1]}_mystical_petal`);
  return out;
};
let probeRecipes = [];
ServerEvents.recipes((e) => {
  e.forEachRecipe({ mod: "botania" }, (r) => {
    probeRecipes.push(`${r.getId()}=${r.getType()}`);
  });
});
ServerEvents.loaded((event) => {
  const data = event.server.persistentData;
  if (data.getBoolean("botaniaprobe")) {
    console.info("[PORT-TEST] PASS botaniaprobe");
    return;
  }
  data.putBoolean("botaniaprobe", true);
  const reg = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
  const rl = Java.loadClass("net.minecraft.resources.ResourceLocation");
  const has = (id) => reg.ITEM.containsKey(rl.parse(id)) || reg.BLOCK.containsKey(rl.parse(id));
  probeIds.forEach((id) => {
    if (has(id)) return;
    const alt = probeCandidates(id).filter(has);
    console.info(`[PROBE] missing ${id} -> ${alt.join(",") || "?"}`);
  });
  ["red_petal", "red_mystical_petal", "rune_fire", "rune_of_fire", "quartz_red", "red_quartz", "flight_tiara", "flugel_tiara"].forEach((p) =>
    console.info(`[PROBE] has botania:${p} = ${has("botania:" + p)}`)
  );
  for (let i = 0; i < probeRecipes.length; i += 40) console.info(`[PROBE] recipes ${probeRecipes.slice(i, i + 40).join(" ")}`);
  console.info("[PORT-TEST] PHASE1 botaniaprobe");
});
