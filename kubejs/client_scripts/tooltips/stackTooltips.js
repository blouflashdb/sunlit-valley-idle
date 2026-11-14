// Tooltips that read the stack (ported from the 1.20.1 tooltips/addAdvancedTooltips.js and addPriceTooltips.js, #18).
// KubeJS 7 runs them as dynamic tooltips; the static tooltips are server scripts (server_scripts/tooltips). Item data
// is custom data since 1.20.5 (plushies.js, globalFishPond.js, longwings.js). Villager homes and invitations show
// their NPC as lore, so they need no tooltip here. Pig race tickets and car keys are not ported.
const $StackTooltipComponents = Java.loadClass("net.minecraft.core.component.DataComponents");

const holdShift = () => Text.translatable("tooltip.society.hold_key", Text.translatable("key.keyboard.shift").gray()).darkGray();
const tooltipJoin = (parts) => {
  let line = Text.of("");
  parts.forEach((part) => line.append(typeof part === "string" ? Text.of(part) : part));
  return line;
};
const customDataTag = (stack) => {
  let data = stack.get($StackTooltipComponents.CUSTOM_DATA);
  return data ? data.copyTag() : null;
};
const entityName = (id) => {
  let [namespace, path] = String(id).split(":");
  return Text.translatable(`entity.${namespace}.${path}`);
};

const coinValues = [
  { coin: "numismatics:spur", value: 1 },
  { coin: "numismatics:bevel", value: 8 },
  { coin: "numismatics:sprocket", value: 16 },
  { coin: "numismatics:cog", value: 64 },
  { coin: "numismatics:crown", value: 512 },
  { coin: "numismatics:sun", value: 4096 },
  { coin: "numismatics:neptunium_coin", value: 32768 },
  { coin: "numismatics:ancient_coin", value: 262144 },
  { coin: "numismatics:prismatic_coin", value: 16777216 },
];

ItemEvents.modifyTooltips((e) => {
  e.modify(global.plushies.filter((id) => global.itemExists(id)), (t) => t.dynamic("society_plushie"));
  e.modify("society:fish_pond", (t) => t.dynamic("society_fish_pond"));
  e.modify("society:caterpillar_eggs", (t) => t.dynamic("society_caterpillar_eggs"));
  e.modify(Array.from(global.trades.keys()).filter((id) => global.itemExists(id)), (t) => t.dynamic("society_price"));
  e.modify(coinValues.map((coin) => coin.coin).filter((id) => global.itemExists(id)), (t) => t.dynamic("society_coin"));
});

ItemEvents.dynamicTooltips("society_plushie", (e) => {
  let data = global.getPlushieItemData(e.item);
  if (!data) {
    e.add([Text.translatable("tooltip.society.plushies")]);
    return;
  }
  let type = global.plushieTraits[data.type] || global.plushieTraits[0];
  let trait = global.getTranslatedTextWithColorCode(type.color, `society.item.plushie.${type.trait}`);
  if (e.shift) {
    let description = Text.translate(`society.item.plushie.${type.trait}.description`).getString().split("\n");
    e.add([
      tooltipJoin([Text.translatable("tooltip.society.plushies.trait"), trait]),
      Text.translate("society.item.plushie.trait.description").darkGray(),
      Text.gray(description[0]),
      Text.of(description[1] || ""),
    ]);
    return;
  }
  let quality = Math.max(0, Math.min(3, data.quality));
  let affection = Math.max(0, Math.min(4, data.affection));
  let lines = [
    tooltipJoin([Text.translatable("tooltip.society.plushies.rarity"), Text.gold("★".repeat(quality + 1)), Text.gray("☆".repeat(3 - quality))]),
    tooltipJoin([Text.translatable("tooltip.society.plushies.affection"), `§c${"❤".repeat(affection)}§7${"❤".repeat(4 - affection)}`]),
    tooltipJoin([Text.translatable("tooltip.society.plushies.trait"), trait, Text.of(" "), holdShift()]),
  ];
  let animal = global.parsePlushieAnimal(data.animal);
  if (animal) {
    lines.push(tooltipJoin([Text.translatable("tooltip.society.plushies.animal_type"), entityName(animal.type).gold()]));
    if (animal.name) lines.push(tooltipJoin([Text.translatable("tooltip.society.plushies.animal_name"), `§6${animal.name}`]));
  } else {
    lines.push(Text.translatable("tooltip.society.plushies"));
  }
  e.add(lines);
});

ItemEvents.dynamicTooltips("society_fish_pond", (e) => {
  let tag = customDataTag(e.item);
  if (!tag || !tag.contains("type")) return;
  e.add([
    Text.translatable("block.society.fish_pond.fish.type", Item.of(String(tag.getString("type"))).getHoverName()).aqua(),
    Text.translatable("block.society.fish_pond.fish.population", `${tag.getInt("population")}`, `${tag.getInt("max_population")}`).aqua(),
  ]);
});

ItemEvents.dynamicTooltips("society_caterpillar_eggs", (e) => {
  let tag = customDataTag(e.item);
  if (!tag || !tag.contains("child")) {
    e.add([Text.translatable("item.society.caterpillar_eggs.description").gray()]);
    return;
  }
  let longwing = (key) => Text.translatable(`item.longwings.${tag.getString(key)}`).gray();
  e.add([
    Text.translatable("item.society.caterpillar_eggs.description").darkGray(),
    Text.translatable("item.society.caterpillar_eggs.longwing.type", longwing("child")).green(),
    Text.translatable("item.society.caterpillar_eggs.longwing.parents", longwing("parent"), longwing("coparent")).lightPurple(),
    Text.translatable("item.society.caterpillar_eggs.longwing.size", `${tag.getFloat("size")}`).darkGray(),
  ]);
});

// Shipping bin prices, computed like the bins do (globalShippingBinHandlers.js) with the player's stages and sell
// multipliers.
const productTypes = {
  "shippingbin:crop_sell_multiplier": "tooltip.society.farmer_product",
  "shippingbin:wood_sell_multiplier": "tooltip.society.artisan_product",
  "shippingbin:gem_sell_multiplier": "tooltip.society.geologist_product",
  "shippingbin:meat_sell_multiplier": "tooltip.society.adventurer_product",
};
const stageBonuses = [
  { stage: "bluegill_meridian", applies: (stack) => String(stack.id) === "aquaculture:bluegill" },
  { stage: "phenomenology_of_treasure", applies: (stack) => stack.hasTag("society:artifacts") || stack.hasTag("society:relics") },
  { stage: "brine_and_punishment", applies: (stack) => stack.hasTag("society:brine_and_punishment") },
  {
    stage: "the_quality_of_the_earth",
    applies: (stack, trade) =>
      global.getItemQuality(stack) > 0 && String(trade.multiplier) === "shippingbin:crop_sell_multiplier" && !stack.hasTag("minecraft:fishes"),
  },
];

ItemEvents.dynamicTooltips("society_price", (e) => {
  let trade = global.trades.get(String(e.item.id));
  if (!trade || !Client.player) return;
  if (!e.shift) {
    let single = global.calculateQualityValue(trade.value, global.getItemQuality(e.item), false);
    e.add([tooltipJoin([Text.translatable("tooltip.society.coins", global.formatPrice(single)).white(), Text.of(" "), holdShift()])]);
    return;
  }
  let profile = global.getSellProfile(Client.player);
  let bonuses = stageBonuses.filter((bonus) => profile.stages.includes(bonus.stage) && bonus.applies(e.item, trade));
  let multiplier = Number(profile.attributes[trade.multiplier]) || 1;
  let lines = [
    tooltipJoin([
      Text.translatable("tooltip.society.coins", global.formatPrice(global.getStackSellValue(e.item, profile))).white(),
      Text.of(" "),
      Text.translatable("tooltip.society.stack_value")
        .gray()
        .append(bonuses.length > 0 || multiplier > 1 ? Text.translatable("tooltip.society.multipliers") : Text.of("")),
    ]),
  ];
  bonuses.forEach((bonus) => lines.push(Text.translatable(`item.society.${bonus.stage}.price_modifier`).aqua()));
  let type = Text.translatable(productTypes[trade.multiplier] || "tooltip.society.farmer_product").gold();
  lines.push(multiplier > 1 ? tooltipJoin([type, Text.green(` +${Math.round((multiplier - 1) * 100)}%`)]) : type);
  e.add(lines);
});


ItemEvents.dynamicTooltips("society_coin", (e) => {
  let coin = coinValues.find((entry) => entry.coin === String(e.item.id));
  if (!coin) return;
  e.add([
    e.shift
      ? tooltipJoin([Text.of(global.formatPrice(coin.value * e.item.count)).white(), Text.of(" "), Text.translatable("tooltip.society.stack_value").gray()])
      : tooltipJoin([Text.of(global.formatPrice(coin.value)).white(), Text.of(" "), holdShift()]),
  ]);
});
