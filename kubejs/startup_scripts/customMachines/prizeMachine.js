//priority: 100
console.info("[SOCIETY] prizeMachine.js loaded");

global.prizeMachineRewards = [
  {
    hint: "seedy",
    possibleOutputs: [
      "8x minecraft:torchflower_seeds",
      "8x minecraft:pitcher_pod",
      "8x herbalbrews:tea_blossom",
      "8x herbalbrews:coffee_beans",
      "8x etcetera:cotton_seeds",
    ],
  },
  {
    hint: "writhing and squirming",
    possibleOutputs: ["8x aquaculture:minnow", "8x aquaculture:worm"],
  },
  {
    hint: "upgradable",
    possibleOutputs: [
      "sophisticatedbackpacks:upgrade_base",
      "sophisticatedstorage:upgrade_base",
    ],
  },
  {
    hint: "bearing red fruits",
    possibleOutputs: [
      "pamhc2trees:cherry_sapling",
      "pamhc2trees:apple_sapling",
    ],
  },
  {
    hint: "crabs love to chow on",
    possibleOutputs: [
      "16x crabbersdelight:crab_trap_bait",
      "16x crabbersdelight:deluxe_crab_trap_bait",
    ],
  },
  {
    hint: "for decorating",
    possibleOutputs: ["2x society:furniture_box", "simplehats:hatbag_epic"],
  },
  {
    hint: "soothing and refreshing",
    possibleOutputs: ["2x herbalbrews:oolong_tea"],
  },
  {
    hint: "fancy to rest on",
    possibleOutputs: [
      "tanukidecor:antique_bed",
      "tanukidecor:regal_bed",
      "tanukidecor:sweets_bed",
      "tanukidecor:gorgeous_bed",
      "tanukidecor:cabana_bed",
      "tanukidecor:wooden_block_bed",
      "tanukidecor:green_bed",
      "tanukidecor:minimalist_bed",
      "tanukidecor:brown_mushroom_bed",
      "tanukidecor:red_mushroom_bed",
      "tanukidecor:egyptian_bed",
      "tanukidecor:blue_bed",
    ],
  },
  {
    hint: "useful for farm animals",
    possibleOutputs: [
      "2x society:mayonnaise_machine",
      "2x society:loom",
      "128x society:animal_feed",
    ],
  },
  {
    hint: "bearing juicy round fruits",
    possibleOutputs: ["pamhc2trees:plum_sapling", "pamhc2trees:peach_sapling"],
  },
  {
    hint: "that smells like sulfur",
    possibleOutputs: [
      "16x supplementaries:bomb",
      "16x supplementaries:bomb_blue",
      "16x betterarcheology:bomb",
      "16x minecraft:tnt",
      "society:fish_smoker",
    ],
  },
  {
    hint: "weirdly resembling an egg",
    possibleOutputs: ["etcetera:eggple", "etcetera:golden_eggple"],
  },
  {
    hint: "capable of handling liquids",
    possibleOutputs: [
      "2x vintagedelight:fermenting_jar",
      "2x society:tapper",
      "2x vinery:fermentation_barrel",
    ],
  },
  {
    hint: "rare and rocky",
    possibleOutputs: ["4x society:omni_geode"],
  },
  {
    hint: "large and wooden",
    possibleOutputs: ["2x brewery:barrel_main"],
  },
  {
    hint: "good for reading",
    possibleOutputs: [
      "society:intro_to_algorithms",
      "society:no_name_for_the_sheep",
      "society:paradise_crop",
      "society:slime_contain_protect",
      "society:slouching_towards_artistry",
      "society:debt_caverns",
      "society:phenomenology_of_treasure",
      "society:frogs_bounty_bazaar",
      "society:hitting_hard_and_soft",
      "society:paradise_crop",
      "society:intro_to_algorithms",
      "society:hitting_hard_and_soft",
      "society:first_aid_guide",
      "society:canadian_and_famous",
      "society:bluegill_meridian",
      "society:brine_and_punishment",
      "society:animal_fancy",
      "society:first_aid_guide",
      "society:canadian_and_famous",
      "society:bluegill_meridian",
      "society:brine_and_punishment",
      "society:banana_karenina",
      "society:animal_fancy",
    ],
  },
  {
    hint: "useful for mechanics",
    possibleOutputs: [
      "32x create:andesite_alloy",
      "8x create:brass_ingot",
      "4x create:sturdy_sheet",
      "create:precision_mechanism",
      "create:brass_hand",
      "society:battery",
    ],
  },
  {
    hint: "decorative",
    possibleOutputs: ["minecraft:painting", "simplehats:hatbag_epic"],
  },
  {
    hint: "with jaded fruit",
    possibleOutputs: ["pamhc2trees:pawpaw_sapling"],
  },
  {
    hint: "soothing and refreshing... Again",
    possibleOutputs: ["2x herbalbrews:oolong_tea"],
  },
  {
    hint: "rare, rocky, and plentiful",
    possibleOutputs: ["8x society:omni_geode"],
  },
  {
    hint: "advanced for the farm",
    possibleOutputs: ["society:preserves_jar", "society:crystalarium"],
  },
  {
    hint: "shiny",
    possibleOutputs: ["3x quark:diamond_heart"],
  },
  {
    hint: "seasonal to wear",
    possibleOutputs: [
      "simplehats:hatbag_halloween",
      "simplehats:hatbag_easter",
      "simplehats:hatbag_summer",
      "simplehats:hatbag_festive",
    ],
  },
  {
    hint: "ancient from the soil",
    possibleOutputs: [
      "society:ancient_fruit_seeds",
      "society:ancient_fruit",
      "society:ancient_fruit",
    ],
  },
  {
    hint: "extremely valuable",
    possibleOutputs: [
      "society:dragon_mayonnaise",
      "society:prismatic_shard",
      "society:golden_mayonnaise",
      "society:magic_rock_candy",
    ],
  },
  {
    hint: "only enjoyed by those of age",
    possibleOutputs: ["society:aging_cask", "tanukidecor:slot_machine"],
  },
  {
    hint: "with jaded fruit... Again",
    possibleOutputs: ["pamhc2trees:hazelnut_sapling"],
  },
  {
    hint: "tickety?",
    possibleOutputs: ["3x splendid_slimes:slime_ticket"],
  },
  {
    hint: "spicy",
    possibleOutputs: [
      "16x vintagedelight:stuffed_burrito",
      "16x vintagedelight:ghostly_chili",
      "32x vintagedelight:ghost_pepper",
      "16x vintagedelight:pickled_pepper",
      "8x vintagedelight:pepper_jam_mason_jar",
    ],
  },
  {
    hint: "about to hatch",
    possibleOutputs: [
      "species:cruncher_egg",
      "species:petrified_egg",
      "species:springling_egg",
      "species:wraptor_egg",
      "minecraft:sniffer_egg",
    ],
  },
  {
    hint: "filled with plushies",
    possibleOutputs: ["whimsy_deco:gatcha_machine"],
  },
  {
    hint: "beachy",
    possibleOutputs: [
      "beachparty:hammock",
      "beachparty:lounge_chair",
      "beachparty:tiki_chair",
      "beachparty:chair",
      "beachparty:table",
      "beachparty:beach_chair",
      "beachparty:deck_chair"
    ],
  },
  {
    hint: "passionate",
    possibleOutputs: ["pamhc2trees:passionfruit_sapling"],
  },
  {
    hint: "fish get excited for",
    possibleOutputs: [
      "society:deluxe_worm_farm",
      "society:fish_smoker",
      "society:fish_pond",
      "society:sea_biscut",
    ],
  },
  {
    hint: "sticky, from a tree",
    possibleOutputs: [
      "4x society:maple_syrup",
      "4x society:pine_tar",
      "4x society:oak_resin",
    ],
  },
  {
    hint: "wintery",
    possibleOutputs: [
      "64x snowyspirit:candy_cane",
      "pamhc2trees:cinnamon_sapling",
      "8x society:frozen_geode",
      "8x society:frozen_tear",
    ],
  },
  {
    hint: "relating to relics",
    possibleOutputs: [
      "society:relic_trove",
      "64x relics:relic_experience_bottle",
    ],
  },
  {
    hint: "fossilized",
    possibleOutputs: [
      "betterarcheology:creeper_fossil_head",
      "betterarcheology:creeper_fossil_body",
      "betterarcheology:villager_fossil_body",
      "betterarcheology:villager_fossil_head",
      "betterarcheology:chicken_fossil_body",
      "betterarcheology:chicken_fossil_head",
      "betterarcheology:ocelot_fossil_body",
      "betterarcheology:ocelot_fossil_head",
      "betterarcheology:wolf_fossil_body",
      "betterarcheology:wolf_fossil_head",
      "betterarcheology:sheep_fossil_body",
      "betterarcheology:sheep_fossil_head",
      "betterarcheology:guardian_fossil_head",
      "betterarcheology:guardian_fossil_body",
    ],
  },
  {
    hint: "something not of this world.",
    possibleOutputs: ["1x minecraft:eye_armor_trim_smithing_template"],
  },
  {
    hint: "soothing and refreshing... Again",
    possibleOutputs: ["2x herbalbrews:oolong_tea"],
  },
  {
    hint: "artly and factual",
    possibleOutputs: [
      "society:artifact_trove",
      "betterarcheology:unidentified_artifact",
    ],
  },
  {
    hint: "seedy that's hard to find",
    possibleOutputs: [
      "8x herbalbrews:tea_blossom",
      "8x herbalbrews:coffee_beans",
      "8x nethervinery:crimson_grape_seeds",
      "8x vinery:jungle_grape_seeds_red",
      "8x vinery:taiga_grape_seeds_red",
      "8x vinery:savanna_grape_seeds_red",
      "8x nethervinery:warped_grape_seeds",
      "8x vinery:jungle_grape_seeds_white",
      "8x vinery:taiga_grape_seeds_white",
      "8x vinery:savanna_grape_seeds_white",
    ],
  },
  {
    hint: "that upgrades machines",
    possibleOutputs: [
      "society:stone_hand",
      "society:frosted_tip",
      "society:tiny_gnome",
      "society:gray_anatomy",
      "society:broken_clock",
      "society:black_opal",
      "society:sea_biscut",
      "society:ancient_cog",
      "society:ancient_roe",
      "society:infinity_worm",
      "society:cordycep",
      "society:pink_matter",
      "society:enkephalin",
    ],
  },
  {
    hint: "good for reading... again?",
    possibleOutputs: [
      "society:intro_to_algorithms",
      "society:no_name_for_the_sheep",
      "society:paradise_crop",
      "society:slime_contain_protect",
      "society:slouching_towards_artistry",
      "society:debt_caverns",
      "society:phenomenology_of_treasure",
      "society:frogs_bounty_bazaar",
      "society:hitting_hard_and_soft",
      "society:paradise_crop",
      "society:intro_to_algorithms",
      "society:hitting_hard_and_soft",
      "society:first_aid_guide",
      "society:canadian_and_famous",
      "society:bluegill_meridian",
      "society:brine_and_punishment",
      "society:animal_fancy",
      "society:first_aid_guide",
      "society:canadian_and_famous",
      "society:bluegill_meridian",
      "society:brine_and_punishment",
      "society:banana_karenina",
      "society:animal_fancy",
    ],
  },
];

const $PrizeDataComponents = Java.loadClass("net.minecraft.core.component.DataComponents");
const $PrizeCustomData = Java.loadClass("net.minecraft.world.item.component.CustomData");
const $PrizeCompoundTag = Java.loadClass("net.minecraft.nbt.CompoundTag");

/** The prize index stored on a Prize Machine item (custom data "prize"), 0 when there is none. */
global.getPrizeMachineItemPrize = (stack) => {
  const data = stack.get($PrizeDataComponents.CUSTOM_DATA);
  return data ? Number(data.copyTag().getInt("prize")) : 0;
};

global.prizeMachineItem = (prize) => {
  let stack = Item.of("society:prize_machine");
  let tag = new $PrizeCompoundTag();
  tag.putInt("prize", Number(prize));
  stack.set($PrizeDataComponents.CUSTOM_DATA, $PrizeCustomData.of(tag));
  return stack;
};

/** Redeems a prize ticket for the machine's current prize and moves it to the next one. */
global.handlePrizeMachineClick = (click) => {
  let { item, block, hand, player, level } = click;
  const server = level.server;
  if (String(hand) !== "MAIN_HAND") return;
  const prizeNumber = global.getMachineInt(block, "prize");
  const reward = global.prizeMachineRewards[prizeNumber] || global.prizeMachineRewards[0];
  if (String(item.id) !== "society:prize_ticket") {
    player.tell(
      Text.translatable(
        "block.society.prize_machine.next",
        global.translatableWithFallback(`society.prize_machine.hint.${prizeNumber}`, `Something §6${reward.hint}§r...`)
      ).gray()
    );
    return;
  }
  if (!player.isCreative()) item.count--;
  successParticles(level, block);
  const outputs = reward.possibleOutputs.filter(global.itemExists);
  const prize = outputs.length > 0 ? outputs[rnd(0, outputs.length - 1)] : "society:prize_ticket";
  const facing = global.getBlockProperty(block, "facing");
  block.popItemFromFace(prize, facing);
  if (player.stages.has("frogs_bounty_bazaar")) block.popItemFromFace(prize, facing);
  // After the last prize the machine cycles through the prizes from index 8 on, as on 1.20.1.
  global.setMachineData(block, {
    prize: prizeNumber >= global.prizeMachineRewards.length - 1 ? 8 : prizeNumber + 1,
  });
  server.runCommandSilent(`playsound stardew_fishing:complete block @a ${player.x} ${player.y} ${player.z}`);
  ["farming", "husbandry", "mining", "adventuring", "fishing"].forEach((category) =>
    global.giveExperience(server, player, category, 100)
  );
};

StartupEvents.registry("block", (event) => {
  event
    .create("society:prize_machine", "cardinal")
    .box(0, 0, 6, 16, 28, 16)
    .defaultCutout()
    .soundType("copper")
    // The machine drops itself with its prize in server_scripts/blockEvents/prizeMachineEvents.js.
    .noDrops()
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    // Placeholder model: tools/port/assets/make_machine_placeholder.py --single.
    .modelGenerator((m) => m.parent("society:block/kubejs/prize_machine/prize_machine"))
    .item((item) => {
      item.tooltip(Text.translatable("block.society.prize_machine.description").gray());
      item.parentModel("society:block/kubejs/prize_machine/prize_machine");
    })
    .rightClick((click) => global.handlePrizeMachineClick(click))
    .blockEntity((blockInfo) => {
      blockInfo.initialData({ prize: 0 });
    });
});
