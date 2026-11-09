console.info("[SOCIETY] townNpcs.js loaded");

// Town villagers (#15): Easy NPC villagers that move in through an Invitation and a Villager Home, talk through
// SVDialog dialogs (kubejs/data/dialog/dialogs, tools/port/port_dialog_data.py) and open the Society Trading
// shops. Friendship (0-500, a heart per 100) grows by chatting once a day and by gifts every 4 days; at five hearts
// a villager gives a unique gift once. Ported from the 1.20.1 globalNPCHandlers.js, npcInteraction.js,
// npcInvite.js and villagerHomeMechanics.js. Events: server_scripts/npcs/townNpcEvents.js.
// The 1.20.1 society:villager and society:invitation items came from Society Tweaks; they are registered here.

const $TownDataComponents = Java.loadClass("net.minecraft.core.component.DataComponents");
const $TownCustomData = Java.loadClass("net.minecraft.world.item.component.CustomData");
const $TownCompoundTag = Java.loadClass("net.minecraft.nbt.CompoundTag");
const $TownItemLore = Java.loadClass("net.minecraft.world.item.component.ItemLore");
const $TownAABB = Java.loadClass("net.minecraft.world.phys.AABB");

global.townNpcIds = ["easy_npc:humanoid", "easy_npc:humanoid_slim"];

// The Easy NPC preset (config/easy_npc/preset/...) each villager moves in with.
global.townNpcPresets = {
  carpenter: "humanoid/carpenter",
  market: "humanoid/market",
  blacksmith: "humanoid/blacksmith",
  shepherd: "humanoid_slim/shepherd",
  fisher: "humanoid_slim/fisher",
  banker: "humanoid_slim/banker",
  librarian: "humanoid_slim/librarian",
  witch: "humanoid_slim/witch",
  trader: "humanoid/trader",
};

// How many dialogs of each kind exist (<npc>_chatter_friendship<hearts>_<n>, <npc>_gift_<result>_<n>).
global.townDialogLengths = {
  banker: { chatter: [15, 20, 13, 9, 11, 18], gift: { loved: 9, liked: 8, neutral: 8, disliked: 12, hated: 16 } },
  blacksmith: { chatter: [16, 10, 13, 12, 11, 14], gift: { loved: 8, liked: 9, neutral: 8, disliked: 8, hated: 10 } },
  carpenter: { chatter: [11, 10, 13, 9, 9, 15], gift: { loved: 6, liked: 7, neutral: 8, disliked: 10, hated: 10 } },
  fisher: { chatter: [11, 9, 10, 10, 10, 11], gift: { loved: 7, liked: 6, neutral: 9, disliked: 7, hated: 7 } },
  librarian: { chatter: [5, 5, 5, 5, 5, 6], gift: { loved: 5, liked: 5, neutral: 5, disliked: 5, hated: 5 } },
  market: { chatter: [18, 14, 9, 16, 14, 14], gift: { loved: 10, liked: 8, neutral: 17, disliked: 12, hated: 13 } },
  shepherd: { chatter: [15, 14, 13, 12, 14, 17], gift: { loved: 9, liked: 10, neutral: 8, disliked: 8, hated: 11 } },
  trader: { chatter: [7, 5, 5, 7, 7, 6], gift: { loved: 5, liked: 5, neutral: 5, disliked: 5, hated: 5 } },
  wise_oak: { chatter: [7, 5, 5, 5, 5, 8], gift: { loved: 0, liked: 0, neutral: 0, disliked: 0, hated: 0 } },
  witch: { chatter: [7, 5, 6, 8, 6, 5], gift: { loved: 5, liked: 5, neutral: 5, disliked: 5, hated: 6 } },
};

// Gift tastes. The 1.20.1 forge: tags are c: tags; ids of mods that are gone just never match.
const TOWN_UNIVERSAL_GIFTS = {
  hated: [
    "crabbersdelight:jar_of_pickles", "windswept:holly_berries", "crabbersdelight:sea_pickle_juice",
    "netherdepthsupgrade:lava_pufferfish", "netherdepthsupgrade:eyeball_fish", "minecraft:pufferfish",
    "autumnity:foul_berries", "society:supreme_mayonnaise", "society:wraptor_mayonnaise",
    "society:large_duck_mayonnaise", "society:turtle_mayonnaise", "society:large_mayonnaise", "society:mayonnaise",
    "society:penguin_mayonnaise", "society:birt_mayonnaise", "society:cruncher_mayonnaise",
    "society:parrot_mayonnaise", "society:turkey_mayonnaise", "minecraft:warped_fungus", "society:coconut_oil",
    "farmersdelight:rotten_tomato", "minecraft:poisonous_potato", "aquaculture:tin_can",
    "society:dried_tubabacco_leaf", "minecraft:nether_star", "society:tubabacco_leaf",
    "society:large_turkey_mayonnaise", "society:petrified_mayonnaise", "society:flamingo_mayonnaise",
    "society:duck_mayonnaise", "society:goose_mayonnaise", "society:large_goose_mayonnaise",
    "society:golden_mayonnaise", "society:dragon_mayonnaise", "society:sniffer_mayonnaise",
    "society:springling_mayonnaise", "farmersdelight:straw", "minecraft:ominous_bottle", "minecraft:echo_shard",
    "society:living_flesh", "minecraft:popped_chorus_fruit", "society:large_galliraptor_mayonnaise",
    "society:galliraptor_mayonnaise", "minecraft:dragon_head", "minecraft:dragon_egg", "vinery:rotten_cherry",
    "minecraft:crimson_fungus", "quark:dragon_scale", "society:mini_oni_eye", "society:rubber", "society:sap",
  ],
  disliked: [
    "#society:raw_logs", "create:experience_block", "create:experience_nugget", "snowpig:frozen_ham", "society:oil",
    "snowpig:frozen_porkchop", "twigs:bamboo_thatch", "netherdepthsupgrade:bonefish",
    "netherdepthsupgrade:wither_bonefish", "society:magma_geode", "society:omni_geode", "society:frozen_geode",
    "society:battery", "society:oak_resin", "society:pine_tar", "beachparty:palm_log", "atmospheric:carmine_husk",
    "untitledduckmod:goose_foot", "society:geode", "aquaculture:box", "vintagedelight:ghost_charcoal",
    "minecraft:ominous_trial_key", "minecraft:trial_key", "farmersdelight:nether_salad",
    "vintagedelight:century_egg", "crabbersdelight:kelp_shake", "society:sturdy_bamboo_block",
  ],
  liked: [
    "#etcetera:sweaters", "#etcetera:hats", "#society:mineral", "#c:gems", "#society:pristine_mineral",
    "minecraft:totem_of_undying", "atmospheric:candied_orange_slices", "quark:diamond_heart", "society:mossberry",
    "society:mossberry_stew", "crabbersdelight:pearl", "society:furniture_box", "society:ancient_cookie",
  ],
  loved: [
    "society:prismatic_shard", "minecraft:rabbit_foot", "herbalbrews:oolong_tea", "society:sunlit_pearl",
    "vinery:jellie_wine", "society:gnome", "society:bowl_of_soul", "crabbersdelight:pearl_block",
  ],
};

const TOWN_NPC_GIFTS = {
  shepherd: {
    loved: ["society:mossberry", "society:spider_silk", "society:mocha", "society:dirty_chai", "society:merino_wool"],
    liked: ["herbalbrews:cinnamon_coffee", "society:cranberry", "society:boysenberry", "society:crystalberry", "society:salmonberry"],
    neutral: [],
    disliked: ["#society:mineral"],
    hated: ["#minecraft:flowers", "#c:foods/raw_meat", "minecraft:rabbit_foot", "#minecraft:fishes"],
  },
  banker: {
    loved: ["society:legendary_ink", "wildernature:bison_horn", "candlelight:beef_wellington", "society:aged_goat_cheese_block", "meadow:goat_cheese_block"],
    liked: ["society:truffle_oil", "meadow:piece_of_goat_cheese", "society:mystic_syrup", "windswept:goat_stew", "society:ancient_vespertine"],
    neutral: ["#society:dish"],
    disliked: ["#society:farmer_product"],
    hated: ["society:energy_drink", "supplementaries:candy"],
  },
  blacksmith: {
    loved: ["society:ember_crystal_cluster", "crittersandcompanions:dragonfly_wing", "windswept:lavender", "herbalbrews:hazelnut_coffee", "bakery:hazelnut_ella"],
    liked: ["#minecraft:flowers", "#c:raw_materials", "pamhc2trees:hazelnutitem", "pamhc2trees:roastedhazelnutitem"],
    neutral: [],
    disliked: [],
    hated: [],
  },
  carpenter: {
    loved: ["#gamediscs:game_discs", "society:steamy_gadget", "society:mossberry_stew", "minecraft:heavy_core", "vintagedelight:deluxe_granola_bar"],
    liked: ["vintagedelight:chocolate_nut_granola_bar", "vintagedelight:fruity_granola_bar", "vinery:straw_hat", "society:mossberry", "create:honeyed_apple"],
    neutral: ["#society:raw_logs"],
    disliked: [],
    hated: [],
  },
  fisher: {
    loved: ["unusualfishmod:cooked_aero_mono_stick", "society:princess_hairbrush", "vintagedelight:century_egg", "society:aquamagical_dust", "society:heart_of_neptunium", "minecraft:heart_of_the_sea"],
    liked: ["#minecraft:fishes", "minecraft:nautilus_shell", "minecraft:echo_shard", "crittersandcompanions:clam", "botania:black_lotus", "#minecraft:decorated_pot_sherds"],
    neutral: [],
    disliked: ["crabbersdelight:pearl_block"],
    hated: [],
  },
  market: {
    loved: ["#vinery:red_wine", "society:glitched_vhs", "windswept:elder_feather", "society:latte", "society:tubasmoke_carton", "society:ancient_vespertine"],
    liked: ["society:tubasmoke_stick", "society:energy_drink", "supplementaries:antique_ink", "herbalbrews:coffee", "untitledduckmod:duck_feather"],
    neutral: [],
    disliked: [],
    hated: ["herbalbrews:milk_coffee", "society:death_liquid"],
  },
  librarian: {
    loved: ["#society:clothing"],
    liked: ["supplementaries:antique_ink", "#society:dish", "society:prismatic_shard", "herbalbrews:oolong_tea", "society:sunlit_pearl", "vinery:jellie_wine", "society:bowl_of_soul"],
    neutral: ["minecraft:rabbit_foot", "crabbersdelight:pearl_block"],
    disliked: ["#vinery:red_wine", "#vinery:white_wine"],
    hated: ["society:tubasmoke_stick", "society:tubasmoke_carton"],
  },
  witch: {
    loved: ["#society:eldritch", "society:energy_drink", "society:pink_energy_drink", "society:white_energy_drink", "society:mana_energy_drink", "society:latte", "society:mocha", "society:bowl_of_soul", "herbalbrews:milk_coffee", "herbalbrews:hazelnut_coffee"],
    liked: ["#society:mineral", "#minecraft:flowers", "herbalbrews:coffee", "society:espresso", "society:dirty_chai", "society:death_liquid"],
    neutral: ["#society:farmer_product"],
    disliked: ["society:truffle_tea"],
    hated: ["#minecraft:fishes", "herbalbrews:witch_hat"],
  },
  trader: {
    loved: ["society:star_coquito", "society:starcardi", "society:truffle_tea", "veggiesdelight:rice_and_vegetables", "society:chicken_tortilla_soup"],
    liked: ["snuffles:frosty_fluff", "#society:mineral", "#society:dish", "society:prismatic_shard", "minecraft:rabbit_foot", "society:sunlit_pearl", "crabbersdelight:pearl_block"],
    neutral: [],
    disliked: ["#society:clothing"],
    hated: ["society:gnome", "society:spider_silk"],
  },
};

const TOWN_GIFT_FRIENDSHIP = { hated: -30, disliked: -15, neutral: 10, liked: 25, loved: 40 };

const townGiftMatches = (list, stack) =>
  list.some((entry) => (entry.startsWith("#") ? stack.hasTag(entry.substring(1)) : String(stack.id) === entry));

/** "loved", "liked", "neutral", "disliked" or "hated": how a villager takes a gift (an ItemStack). */
global.getVillagerGiftResult = (npcId, stack) => {
  const own = TOWN_NPC_GIFTS[npcId];
  let result = "";
  if (own) {
    ["loved", "liked", "neutral", "disliked", "hated"].forEach((taste) => {
      if (!result && townGiftMatches(own[taste], stack)) result = taste;
    });
  }
  if (result) return result;
  ["hated", "disliked", "liked", "loved"].forEach((taste) => {
    if (!result && townGiftMatches(TOWN_UNIVERSAL_GIFTS[taste], stack)) result = taste;
  });
  return result || "neutral";
};

/**
 * Whether a villager takes an item as a gift. The 1.20.1 society:villager_gift tag came with Society Tweaks; any item
 * that is not a tool or armor counts now, plus the society:villager_gift tag for exceptions.
 */
global.isVillagerGift = (stack) => !stack.isEmpty() && (!stack.isDamageableItem() || stack.hasTag("society:villager_gift"));

/** The villager key of an Easy NPC ("banker" from the dialog.npc.banker.name custom name), or "". */
global.getTownNpcKey = (entity) => {
  if (!entity || !entity.hasCustomName()) return "";
  const name = String(entity.getCustomName().getContents());
  const match = name.match(/dialog\.npc\.([a-z_]+)\.name/);
  return match ? match[1] : "";
};

/** A player's friendship data with a villager, or null before the first meeting. */
global.getTownNpcData = (player, npcId) => {
  const all = player.persistentData.getCompound("npcData");
  if (!all.contains(npcId)) return null;
  const tag = all.getCompound(npcId);
  return {
    friendship: Number(tag.getInt("friendship")),
    dayLastChatted: Number(tag.getInt("dayLastChatted")),
    dayLastGifted: Number(tag.getInt("dayLastGifted")),
    dayLastPlaced: tag.contains("dayLastPlaced") ? Number(tag.getInt("dayLastPlaced")) : -10,
    maxGifted: tag.getBoolean("maxGifted"),
  };
};

global.setTownNpcData = (player, npcId, data) => {
  const all = player.persistentData.getCompound("npcData");
  const tag = new $TownCompoundTag();
  ["friendship", "dayLastChatted", "dayLastGifted", "dayLastPlaced"].forEach((key) =>
    tag.putInt(key, Math.round(Number(data[key])))
  );
  tag.putBoolean("maxGifted", !!data.maxGifted);
  all.put(npcId, tag);
  player.persistentData.put("npcData", all);
};

global.newTownNpcData = () => ({ friendship: -1, dayLastChatted: -1, dayLastGifted: -4, dayLastPlaced: -10, maxGifted: false });

/** Shows an SVDialog dialog to a player. */
global.showTownDialog = (server, player, dialogId) => {
  server.runCommandSilent(`dialog ${player.username} show ${player.username} ${dialogId}`);
};

const townSound = (server, sound, pos) => server.runCommandSilent(`playsound ${sound} block @a ${pos.x} ${pos.y} ${pos.z}`);

const townParticles = (level, particle, pos) =>
  level.spawnParticles(particle, true, pos.x, pos.y + 1.5, pos.z, 0.3, 0.3, 0.3, 25, 0.001);

// The unique gift a villager gives at five hearts, built when it is given (it needs registered items).
const TOWN_MAX_GIFTS = {
  banker: () => Item.of("society:slouching_towards_artistry"),
  blacksmith: () => {
    // Just Hammers is gone on 1.21.1: Aiden's tool is a pickaxe now.
    let stack = Item.of(
      "minecraft:diamond_pickaxe[minecraft:custom_name='{\"translate\":\"item.justhammers.aidens_hammer\",\"italic\":false}',minecraft:enchantments={levels:{\"minecraft:efficiency\":5,\"minecraft:fortune\":3}}]"
    );
    return stack;
  },
  carpenter: () => global.wornBlueprint("blockapedia"),
  fisher: () => Item.of("society:heart_of_neptunium"),
  market: () => Item.of("society:universal_methods_of_farming"),
  shepherd: () => Item.of("wildernature:penguin_spawn_egg", 2),
  librarian: () => Item.of("society:debt_caverns"),
  witch: () => Item.of("society:auto_petter"),
};

/** A Portable Blueprints worn blueprint of a building, as the building shops sell them. */
global.wornBlueprint = (name) => {
  const yellow = (key) => Text.translatable(`portable_blueprints.worn_blueprint.${key}`).color(0xffff00).italic(false);
  let stack = Item.of("portable_blueprints:worn_blueprint");
  let tag = new $TownCompoundTag();
  [["allow_nbt", 1], ["altezza", 0], ["free_build", 1], ["lunghezzaX", 0], ["lunghezzaZ", 0], ["remaining_uses", 1],
    ["rotateValue", 0], ["buildAnyway", 0], ["mirrowX", 0], ["mirrowY", 0], ["mirrowZ", 0],
    ["skipObstructionBlock", 0], ["visualizeBuild", 1], ["wasHolding", 1], ["worn_set", 1]].forEach(([key, value]) =>
    tag.putInt(key, value)
  );
  [["blueprint_name", name], ["nome", name], ["inventari_blocco_selezionati", ""], ["owner", "worn"],
    ["owner_name", "Ace"]].forEach(([key, value]) => tag.putString(key, value));
  stack.set($TownDataComponents.CUSTOM_DATA, $TownCustomData.of(tag));
  stack.set($TownDataComponents.CUSTOM_NAME, yellow(name));
  stack.set($TownDataComponents.LORE, new $TownItemLore([yellow(`${name}.author`)]));
  return stack;
};

/** An Invitation for a villager ("market"), with the villager's name as lore. */
global.townInvitation = (npcId) => {
  let stack = Item.of("society:invitation");
  let tag = new $TownCompoundTag();
  let type = new $TownCompoundTag();
  type.putString("id", `society:${npcId}`);
  tag.put("type", type);
  stack.set($TownDataComponents.CUSTOM_DATA, $TownCustomData.of(tag));
  stack.set($TownDataComponents.LORE, new $TownItemLore([Text.translatable(`dialog.npc.${npcId}.name`).gold()]));
  return stack;
};

/** The villager an Invitation (custom data {type:{id:"society:market"}}) is for, or "". */
global.getInvitationNpc = (stack) => {
  const data = stack.get($TownDataComponents.CUSTOM_DATA);
  if (!data) return "";
  const tag = data.copyTag();
  const id = String(tag.getCompound("type").getString("id"));
  return id.startsWith("society:") ? id.substring(8) : "";
};

/** A Villager Home item for a villager (custom data {type:"market"}). */
global.villagerHomeItem = (npcId) => {
  let stack = Item.of("society:villager_home");
  let tag = new $TownCompoundTag();
  tag.putString("type", npcId);
  stack.set($TownDataComponents.CUSTOM_DATA, $TownCustomData.of(tag));
  stack.set(
    $TownDataComponents.LORE,
    new $TownItemLore([Text.translatable("block.society.villager_home.type", Text.translatable(`dialog.npc.${npcId}.name`)).gold()])
  );
  return stack;
};

global.getVillagerHomeItemNpc = (stack) => {
  const data = stack.get($TownDataComponents.CUSTOM_DATA);
  return data ? String(data.copyTag().getString("type")) : "";
};

/** Uses an Invitation: the player gets the villager's home and unlocks the villager. */
global.useInvitation = (player, stack, server) => {
  const npcId = global.getInvitationNpc(stack);
  if (!npcId || !global.townNpcPresets[npcId]) {
    player.tell(Text.translatable("society.villager_home.error").red());
    return false;
  }
  player.give(global.villagerHomeItem(npcId));
  if (!player.stages.has(`invited_${npcId}`)) {
    player.stages.add(`invited_${npcId}`);
    player.tell(Text.translatable("society.invitation.place_home").green());
    if (npcId === "market") player.tell(Text.translatable("society.new_villager.message").green());
  }
  if (!player.isCreative()) stack.shrink(1);
  townSound(server, "stardew_fishing:complete", player);
  return true;
};

const townNpcsNear = (level, pos, radius) => {
  const found = [];
  const box = new $TownAABB(pos.x, pos.y, pos.z, pos.x + 1, pos.y + 1, pos.z + 1).inflate(radius);
  level.getEntitiesWithin(box).forEach((entity) => {
    if (global.townNpcIds.indexOf(String(entity.type)) !== -1) found.push(entity);
  });
  return found;
};

/** Spawns a villager (its Easy NPC preset) with its home at x, y, z. Returns the NPC or null. */
global.spawnTownNpc = (level, npcId, x, y, z) => {
  const server = level.server;
  server.runCommandSilent(
    `execute in ${level.dimension} run easy_npc preset import_new custom easy_npc:preset/${global.townNpcPresets[npcId]}.npc.nbt ${x} ${y} ${z}`
  );
  const npc = townNpcsNear(level, { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) }, 2).filter(
    (entity) => global.getTownNpcKey(entity) === npcId
  )[0];
  if (!npc) return null;
  server.runCommandSilent(`easy_npc navigation set home ${npc.getStringUuid()} ${x} ${y} ${z}`);
  return npc;
};

/**
 * Places a villager's home: the villager (an Easy NPC from its preset) appears on it and stays nearby.
 * Returns "" or the translation key of why the home cannot go here.
 */
global.placeVillagerHome = (player, block, npcId) => {
  const level = block.level;
  const server = level.server;
  if (!global.townNpcPresets[npcId]) return "society.villager_home.error";
  const day = global.getDay(level);
  let data = global.getTownNpcData(player, npcId) || global.newTownNpcData();
  if (!(day > data.dayLastPlaced + 10 || data.dayLastPlaced - day > 1)) return "society.villager_home.recently_moved_in";
  if (townNpcsNear(level, block, 4).length > 0) return "society.villager_home.too_close";
  const npc = global.spawnTownNpc(level, npcId, block.x + 0.5, block.y + 0.25, block.z + 0.5);
  if (!npc) return "society.villager_home.error";
  townParticles(level, "minecraft:happy_villager", npc);
  townSound(server, "botania:starcaller", player);
  global.setMachineData(block, { type: npcId, boundNpc: String(npc.getStringUuid()), placer: String(player.getStringUuid()) });
  data.dayLastPlaced = day;
  global.setTownNpcData(player, npcId, data);
  player.tell(Text.translatable("society.villager_home.moved_in", Text.translatable(`dialog.npc.${npcId}.name`).gold()));
  return "";
};

/** The Easy NPC a Villager Home is bound to, or null. */
global.getVillagerHomeBoundNpc = (block) => {
  const uuid = global.getMachineString(block, "boundNpc");
  if (!uuid) return null;
  let found = null;
  block.level.getAllEntities().forEach((entity) => {
    if (!found && String(entity.getStringUuid()) === uuid) found = entity;
  });
  return found;
};

/**
 * Breaks a Villager Home: the villager leaves and the home drops as an item. Returns false when the player may not
 * break it (someone else invited the villager).
 */
global.breakVillagerHome = (player, block) => {
  const level = block.level;
  const server = level.server;
  const npcId = global.getMachineString(block, "type");
  const placer = global.getMachineString(block, "placer");
  if (!npcId) return true;
  if (placer && placer !== "-1" && placer !== String(player.getStringUuid()) && !player.isCreative()) {
    player.tell(Text.translatable("society.villager_home.not_invited_by_you", Text.translatable(`dialog.npc.${npcId}.name`).gold()).red());
    return false;
  }
  const npc = global.getVillagerHomeBoundNpc(block);
  if (npc) {
    townParticles(level, "minecraft:cloud", npc);
    npc.discard();
    player.tell(Text.translatable("society.villager_home.moved_out", Text.translatable(`dialog.npc.${npcId}.name`).gold()));
  }
  townSound(server, "minecraft:block.note_block.chime", player);
  block.popItem(global.villagerHomeItem(npcId));
  let data = global.getTownNpcData(player, npcId);
  if (data) {
    data.dayLastPlaced = -10;
    global.setTownNpcData(player, npcId, data);
  }
  return true;
};

const townGiveMaxGift = (player, npcId) => {
  const make = TOWN_MAX_GIFTS[npcId];
  if (!make) return;
  try {
    player.give(make());
  } catch (e) {
    console.warn(`[SOCIETY] no five heart gift for ${npcId}: ${e}`);
  }
};

/**
 * A right click on a town villager (an Easy NPC or the Wise Oak). target has x, y, z. Returns true when the click
 * is handled (the event is cancelled).
 */
global.handleTownNpc = (player, npcId, target, item) => {
  const level = player.level;
  const server = level.server;
  const lengths = global.townDialogLengths[npcId];
  if (!lengths) return false;
  const day = global.getDay(level);
  let data = global.getTownNpcData(player, npcId);
  if (!data) {
    if (!player.stages.has(`invited_${npcId}`)) player.stages.add(`invited_${npcId}`);
    global.setTownNpcData(player, npcId, global.newTownNpcData());
    data = global.getTownNpcData(player, npcId);
  }
  if (data.friendship === -1) {
    // The first talk: the villager introduces itself.
    data.friendship = 5;
    global.setTownNpcData(player, npcId, data);
    global.showTownDialog(server, player, `${npcId}_intro`);
    return npcId !== "wise_oak";
  }
  if (!data.maxGifted && data.friendship >= 500 && npcId !== "wise_oak") {
    if (npcId === "banker" && player.stages.has("slouching_towards_artistry")) {
      player.give(Item.of("waystones:waystone", 2));
      global.showTownDialog(server, player, "banker_unique_five_gift_read");
    } else if (npcId === "market" && player.stages.has("universal_methods_of_farming")) {
      player.give(Item.of("society:sparkpod_seeds", 16));
      global.showTownDialog(server, player, "market_unique_five_gift_read");
    } else if (npcId === "librarian" && player.stages.has("debt_caverns")) {
      player.give(Item.of("botania:diva_charm"));
      player.give(Item.of("botania:mana_ring"));
      global.showTownDialog(server, player, "librarian_unique_five_gift_read");
    } else if (npcId === "trader") {
      player.stages.add("trader_clothing");
      global.showTownDialog(server, player, "trader_unique_five_gift");
    } else {
      townGiveMaxGift(player, npcId);
      global.showTownDialog(server, player, `${npcId}_unique_five_gift`);
    }
    data.maxGifted = true;
    global.setTownNpcData(player, npcId, data);
    return true;
  }
  if (player.isCrouching() && global.isVillagerGift(item)) {
    if (npcId === "wise_oak") {
      global.showTownDialog(server, player, "wise_oak_unique_no_gifting");
      townSound(server, "stardew_fishing:fish_escape", target);
      townParticles(level, "mysticaloaktree:wind", target);
      return false;
    }
    if (!(day > data.dayLastGifted + 3 || data.dayLastGifted - day > 1)) {
      player.tell(Text.translatable("society.npc.gifted_too_soon").gold());
      return true;
    }
    const taste = global.getVillagerGiftResult(npcId, item);
    data.friendship = Math.max(0, Math.min(500, data.friendship + TOWN_GIFT_FRIENDSHIP[taste]));
    data.dayLastGifted = day;
    global.setTownNpcData(player, npcId, data);
    townSound(server, "stardew_fishing:complete", target);
    townParticles(level, "supplementaries:confetti", target);
    const delay = item.getFoodProperties(player) ? 20 : 1;
    if (!player.isCreative()) item.shrink(1);
    const dialog = `${npcId}_gift_${taste}_${Math.floor(Math.random() * lengths.gift[taste])}`;
    server.scheduleInTicks(delay, () => global.showTownDialog(server, player, dialog));
    if (Math.random() < 0.01) {
      let golem = level.createEntity(Math.random() < 0.5 ? "golemoverhaul:barrel_golem" : "golemoverhaul:hay_golem");
      golem.setPos(target.x + 8, target.y + 2, target.z - 8);
      golem.spawn();
    }
    return true;
  }
  if (global.compareDay(day, data.dayLastChatted, 1)) {
    // Once a day the villager chats; that gives 5 friendship (the Wise Oak 20).
    const hearts = Math.min(5, Math.floor(data.friendship / 100));
    global.showTownDialog(server, player, `${npcId}_chatter_friendship${hearts}_${Math.floor(Math.random() * lengths.chatter[hearts])}`);
    data.dayLastChatted = day;
    data.friendship = Math.min(500, data.friendship + (npcId === "wise_oak" ? 20 : 5));
    global.setTownNpcData(player, npcId, data);
  } else if (npcId === "carpenter") {
    // The Carpenter has several shops, so a dialog lets the player pick one.
    global.showTownDialog(server, player, "carpenter_choice_dialog_need_to_buy");
  } else if (npcId === "librarian" && global.isLateSeason(level)) {
    global.showTownDialog(server, player, "librarian_choice_dialog_book_fair");
  } else if (npcId === "wise_oak") {
    if (data.friendship >= 500) server.runCommandSilent(`openshop ${player.username} wise_oak`);
  } else {
    server.runCommandSilent(`openshop ${player.username} ${npcId}`);
  }
  if (npcId === "wise_oak") {
    // Tapping the Wise Oak hurts it.
    if (["society:tapper", "society:auto_tapper"].indexOf(String(item.id)) !== -1) {
      data = global.getTownNpcData(player, npcId);
      data.friendship = 0;
      global.setTownNpcData(player, npcId, data);
    }
    return false;
  }
  return true;
};

/** Silver given to a plain (vanilla) villager turns into fairy dust; otherwise the gnome in it chats. */
global.handleGnomeVillager = (player, target, item) => {
  const server = player.level.server;
  if (String(item.id) === "oreganized:silver_ingot") {
    townSound(server, "minecraft:entity.breeze.idle_ground", target);
    player.give(Item.of("society:fairy_dust", 2));
    if (!player.isCreative()) item.shrink(1);
  } else {
    global.showTownDialog(server, player, `gnome_unique_chatter_${Math.floor(Math.random() * 3)}`);
  }
};

StartupEvents.registry("item", (e) => {
  e.create("society:invitation")
    .texture("society:item/invitation")
    .tooltip(Text.translatable("tooltip.society.invitation").green())
    .displayName("Invitation");
  // Only the JEI catalyst of the villager shops.
  e.create("society:villager").texture("society:item/villager").displayName("Villager");
});

StartupEvents.registry("block", (e) => {
  e.create("society:villager_home")
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:mineable/axe")
    .box(1, 0, 1, 15, 2, 15)
    .defaultCutout()
    .hardness(1.5)
    .requiresTool(false)
    // A broken home drops itself with its villager (global.breakVillagerHome).
    .noDrops()
    .displayName("Villager Home")
    .parentModel("society:block/kubejs/villager_home")
    .item((item) => {
      item.parentModel("society:block/kubejs/villager_home");
      item.tooltip(Text.translatable("block.society.villager_home.description").gray());
    })
    .blockEntity((blockInfo) => {
      blockInfo.initialData({ placer: "-1", type: "", boundNpc: "" });
    });

  // Catalogs open the furniture shops (the society:opens_*_catalog block tags of the shops).
  [
    ["tanuki_catalog", "♤ §aTanuki Catalog"],
    ["modern_catalog", "♧ Modern Catalog"],
  ].forEach(([name, displayName]) => {
    e.create(`society:${name}`, "cardinal")
      .box(2, 0, 3, 14, 1.025, 13)
      .defaultCutout()
      .resistance(1.0)
      .hardness(0.5)
      .requiresTool(false)
      .tagBlock("minecraft:mineable/axe")
      .tagBlock(`society:opens_${name}`)
      .parentModel(`society:block/kubejs/${name}`)
      .item((item) => {
        item.parentModel(`society:block/kubejs/${name}`);
        item.tooltip(Text.translatable(`tooltip.society.${name}`).gray());
      })
      .displayName(displayName);
  });
});
