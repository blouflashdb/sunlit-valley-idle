// priority: 5
console.info("[SOCIETY] skullCavern.js loaded");

// The Skull Cavern (ported from the 1.20.1 registerBlocks.js, globalBlockEntityHandlers.js,
// skullCavernChunkManager.js, skullCavernSleep.js and globalServer.js; #16).
// - The dimension and its worldgen are data: kubejs/data/society/{dimension,dimension_type,worldgen}.
// - Mined rocks and ores leave society:cavern_air behind. Each chunk of the cavern has a toggle bit that flips
//   on the first load of a new day (global.skullCavernChunkLoaded); cavern air from the other parity rolls a
//   new rock, ore, geode node or crate on a random tick (global.handleSkullCavernRegen).
// - Events: server_scripts/skullCavern/skullCavernEvents.js. Textures are placeholders from the atlas (#22).
const $SkullChunkLoad = Java.loadClass("net.neoforged.neoforge.event.level.ChunkEvent$Load");
const $SkullSleep = Java.loadClass("net.neoforged.neoforge.event.entity.player.CanPlayerSleepEvent");
const $SkullBedProblem = Java.loadClass("net.minecraft.world.entity.player.Player$BedSleepingProblem");

global.skullCavernDimension = "society:skull_cavern";
global.isSkullCavern = (level) => String(level.dimension) === global.skullCavernDimension;

const skullAirType = integerProperty.create("type", 0, 4);
const skullAirChunkbit = integerProperty.create("chunkbit", 0, 1);

// Biome -> rock type of the cavern air (0 stone, 1 ice, 2 sandstone, 3 blackstone, 4 end stone).
global.skullCavernRockTypes = {
  "society:cavern_top": 0,
  "society:skull_caves": 0,
  "society:lush_caverns": 0,
  "society:frozen_caves": 1,
  "society:frozen_maelstrom": 1,
  "society:desert_caves": 2,
  "society:desert_fault": 2,
  "society:blackstone_caves": 3,
  "society:umbra_barrens": 4,
};

// What cavern air turns into, by rock type. "sturdy" entries are not rolled above a rope.
global.skullCavernRockTables = [
  [
    { block: "society:stone_boulder", weight: 163 },
    { block: "minecraft:coal_ore", weight: 25 },
    { block: "minecraft:copper_ore", weight: 20 },
    { block: "minecraft:iron_ore", weight: 15 },
    { block: "create:zinc_ore", weight: 13 },
    { block: "minecraft:lapis_ore", weight: 2 },
    { block: "society:geode_node", weight: 2, sturdy: true },
    { block: "society:earth_crystal", weight: 2, sturdy: true },
    { block: "society:oak_supply_crate", weight: 2 },
  ],
  [
    { block: "society:ice_boulder", weight: 164 },
    { block: "minecraft:iron_ore", weight: 25 },
    { block: "create:zinc_ore", weight: 15 },
    { block: "oreganized:lead_ore", weight: 10 },
    { block: "minecraft:diamond_ore", weight: 4 },
    { block: "society:earth_crystal", weight: 2, sturdy: true },
    { block: "society:omni_geode_node", weight: 1, sturdy: true },
    { block: "society:sparkstone_ore", weight: 2 },
    { block: "society:spruce_supply_crate", weight: 2 },
  ],
  [
    { block: "society:sandstone_boulder", weight: 163 },
    { block: "minecraft:gold_ore", weight: 20 },
    { block: "oreganized:lead_ore", weight: 10 },
    { block: "minecraft:redstone_ore", weight: 6 },
    { block: "minecraft:diamond_ore", weight: 4 },
    { block: "society:sparkstone_ore", weight: 4 },
    { block: "society:fire_quartz", weight: 2, sturdy: true },
    { block: "society:magma_geode_node", weight: 2, sturdy: true },
    { block: "society:omni_geode_node", weight: 2, sturdy: true },
    { block: "society:palm_supply_crate", weight: 2 },
    { block: "oreganized:silver_ore", weight: 2 },
    { block: "society:iridium_ore", weight: 1 },
  ],
  [
    { block: "society:blackstone_boulder", weight: 148 },
    { block: "minecraft:deepslate_gold_ore", weight: 20 },
    { block: "oreganized:deepslate_lead_ore", weight: 10 },
    { block: "minecraft:deepslate_redstone_ore", weight: 15 },
    { block: "minecraft:deepslate_diamond_ore", weight: 4 },
    { block: "society:deepslate_sparkstone_ore", weight: 10 },
    { block: "society:fire_quartz", weight: 2, sturdy: true },
    { block: "society:magma_geode_node", weight: 2, sturdy: true },
    { block: "society:omni_geode_node", weight: 4, sturdy: true },
    { block: "oreganized:deepslate_silver_ore", weight: 4 },
    { block: "society:grimwood_supply_crate", weight: 2 },
    { block: "society:deepslate_iridium_ore", weight: 2 },
  ],
  [
    { block: "society:end_stone_boulder", weight: 194 },
    { block: "society:deepslate_sparkstone_ore", weight: 14 },
    { block: "society:omni_geode_node", weight: 4, sturdy: true },
    { block: "society:deepslate_iridium_ore", weight: 3 },
  ],
];

/** Rolls a block from a rock table. With a rope below, sturdy entries (geode nodes, crystals) are left out. */
global.rollSkullCavernRock = (type, hasRope) => {
  let table = global.skullCavernRockTables[type] || global.skullCavernRockTables[0];
  let entries = table.filter((entry) => !(hasRope && entry.sturdy));
  let total = 0;
  entries.forEach((entry) => (total += entry.weight));
  let roll = Math.random() * total;
  for (let i = 0; i < entries.length; i++) {
    roll -= entries[i].weight;
    if (roll < 0) return entries[i].block;
  }
  return entries[entries.length - 1].block;
};

/** The chunk parity data ({day, toggleBit}) of the chunk at pos, or null before its first load. */
global.getSkullChunkParity = (level, pos) => {
  let map = level.persistentData.getCompound("chunkParityMap");
  let key = String(level.getChunkAt(pos).getPos());
  return map.contains(key) ? map.getCompound(key) : null;
};

/** Flips the toggle bit of a cavern chunk on its first load of a new day. */
global.skullCavernChunkLoaded = (level, chunkPos) => {
  if (level.isClientSide() || !global.isSkullCavern(level)) return;
  let day = global.getDay(level);
  let data = level.persistentData;
  if (!data.contains("chunkParityMap")) data.put("chunkParityMap", NBT.compoundTag());
  let map = data.getCompound("chunkParityMap");
  let key = String(chunkPos);
  if (!map.contains(key)) {
    let entry = NBT.compoundTag();
    entry.putInt("day", day);
    entry.putInt("toggleBit", 0);
    map.put(key, entry);
  } else if (map.getCompound(key).getInt("day") !== day) {
    let entry = map.getCompound(key);
    entry.putInt("day", day);
    entry.putInt("toggleBit", entry.getInt("toggleBit") === 0 ? 1 : 0);
  }
  data.put("chunkParityMap", map);
};

/** Turns mined rock back into cavern air of the biome's rock type, tagged with the chunk's current parity. */
global.placeSkullCavernAir = (level, pos, rockType) => {
  let parity = global.getSkullChunkParity(level, pos);
  if (!parity || !level.isLoaded(pos)) return false;
  let block = level.getBlock(pos);
  if (["minecraft:air", "minecraft:void_air", "minecraft:cave_air"].indexOf(String(block.id)) === -1) return false;
  block.set("society:cavern_air", { type: String(rockType), chunkbit: String(parity.getInt("toggleBit")) });
  return true;
};

/** Rolls a new rock in cavern air left on an earlier day. Returns the new block id, or null. */
global.handleSkullCavernRegen = (level, block) => {
  if (String(block.id) !== "society:cavern_air") return null;
  let parity = global.getSkullChunkParity(level, block.getPos());
  if (!parity) return null;
  if (String(parity.getInt("toggleBit")) === global.getBlockProperty(block, "chunkbit")) return null;
  let below = block.getPos().below(2);
  let hasRope = String(level.getBlock(below).id) === "farmersdelight:rope";
  let newBlock = global.rollSkullCavernRock(Number(global.getBlockProperty(block, "type")), hasRope);
  block.set(newBlock);
  return newBlock;
};

global.teleportHome = (player, server, level) => {
  let respawnPosition = player.getRespawnPosition();
  let dimension = player.getRespawnDimension();
  if (respawnPosition == null) {
    respawnPosition = server.overworld().getSharedSpawnPos();
    dimension = server.overworld().dimension();
  }
  player.teleportTo(server.getLevel(dimension), respawnPosition.x + 0.5, respawnPosition.y, respawnPosition.z + 0.5, [], 0.0, 0.0);
  server.runCommandSilent(`experience add ${player.username} 1`);
};

NativeEvents.onEvent($SkullChunkLoad, (event) => {
  let level = event.getLevel();
  if (level.isClientSide() || !global.isSkullCavern(level)) return;
  global.skullCavernChunkLoaded(level, event.getChunk().getPos());
});

// Nobody sleeps the night away while someone is in the cavern.
NativeEvents.onEvent($SkullSleep, (event) => {
  let player = event.getEntity();
  let inCavern = null;
  player.getServer().getPlayerList().getPlayers().forEach((p) => {
    if (global.isSkullCavern(p.level)) inCavern = p;
  });
  if (inCavern) {
    player.tell(Text.translatable("society.skull_cavern.cannot_sleep", inCavern.username).red());
    event.setProblem($SkullBedProblem.OTHER_PROBLEM);
  }
});

// Sets one texture on every side and the particle (KubeJS 7 block builders have no textureAll).
const skullAllSides = (builder, texture) => {
  ["up", "down", "north", "east", "south", "west", "particle"].forEach((side) => builder.texture(side, texture));
  return builder;
};

StartupEvents.registry("block", (e) => {
  e.create("society:skull_cavern_teleporter")
    .texture("up", "society:block/teleporter_top")
    .texture("down", "society:block/teleporter_bottom")
    .texture("north", "society:block/teleporter_side")
    .texture("east", "society:block/teleporter_side")
    .texture("south", "society:block/teleporter_side")
    .texture("west", "society:block/teleporter_side")
    .texture("particle", "society:block/teleporter_side")
    .mapColor("stone")
    .soundType("stone")
    .hardness(1.0)
    .resistance(3600000.0)
    .lightLevel(1)
    .requiresTool(false);

  ["stone", "ice", "sandstone", "blackstone", "end_stone"].forEach((type) => {
    e.create(`society:${type}_boulder`)
      .texture("up", `society:block/${type}_boulder_top`)
      .texture("down", `society:block/${type}_boulder`)
      .texture("north", `society:block/${type}_boulder`)
      .texture("east", `society:block/${type}_boulder`)
      .texture("south", `society:block/${type}_boulder`)
      .texture("west", `society:block/${type}_boulder`)
      .texture("particle", `society:block/${type}_boulder`)
      .soundType("stone")
      .hardness(2)
      .resistance(1.0)
      .tagBlock("minecraft:mineable/pickaxe")
      .tagBlock("minecraft:needs_iron_tool")
      .tagBlock("society:skull_cavern_regens");
  });

  [
    ["stone", "minecraft:block/stone"],
    ["permafrost", "quark:block/permafrost"],
    ["sandstone", "minecraft:block/sandstone_top"],
    ["arid_sandstone", "atmospheric:block/arid_sandstone_top"],
    ["blackstone", "minecraft:block/blackstone"],
    ["end_stone", "minecraft:block/end_stone"],
  ].forEach(([type, path]) => {
    skullAllSides(e.create(`society:skull_${type}`), path)
      .soundType("stone")
      .resistance(3600000)
      .texture("particle", path)
      .unbreakable()
      .tagBlock("society:skull_block");
  });

  ["oak", "spruce", "palm", "grimwood"].forEach((type) => {
    e.create(`society:${type}_supply_crate`)
      .soundType("wood")
      .hardness(1.0)
      .texture("up", `society:block/${type}_supply_crate_top`)
      .texture("down", `society:block/${type}_supply_crate_top`)
      .texture("north", `society:block/${type}_supply_crate`)
      .texture("east", `society:block/${type}_supply_crate`)
      .texture("south", `society:block/${type}_supply_crate`)
      .texture("west", `society:block/${type}_supply_crate`)
      .texture("particle", `society:block/${type}_supply_crate`)
      .tagBlock("minecraft:mineable/axe")
      .tagBlock("society:supply_crate")
      .tagBlock("society:skull_cavern_regens");
  });

  e.create("society:cavern_air")
    .box(0, 0, 0, 0, 0, 0)
    .property(skullAirType)
    .property(skullAirChunkbit)
    .parentModel("minecraft:block/air")
    .noCollision()
    .notSolid()
    .noDrops()
    .hardness(-1)
    .resistance(3600000)
    .randomTick((tick) => {
      global.handleSkullCavernRegen(tick.level, tick.block);
    })
    .defaultState((state) => {
      state.set(skullAirType, 0);
      state.set(skullAirChunkbit, 0);
    })
    .placementState((state) => {
      state.set(skullAirType, 0);
      state.set(skullAirChunkbit, 0);
    })
    .noItem();

  // Ores. Iridium and sparkstone drop through their loot tables (data/society/loot_table/blocks).
  [
    ["iridium_ore", "minecraft:needs_diamond_tool"],
    ["deepslate_iridium_ore", "minecraft:needs_diamond_tool"],
    ["sparkstone_ore", "minecraft:needs_diamond_tool"],
    ["deepslate_sparkstone_ore", "minecraft:needs_diamond_tool"],
  ].forEach(([ore, tool]) => {
    skullAllSides(e.create(`society:${ore}`), `society:block/${ore}`)
      .soundType(ore.startsWith("deepslate") ? "deepslate" : "stone")
      .hardness(2.5)
      .resistance(1.0)
      .requiresTool(true)
      .tagBlock("minecraft:mineable/pickaxe")
      .tagBlock(tool)
      .tagBlock("society:skull_cavern_regens");
  });

  // Geode nodes: small rocks that drop geodes (loot tables in data/society/loot_table/blocks).
  [
    ["geode_node", 4.5, "minecraft:needs_stone_tool"],
    ["magma_geode_node", 22.5, "minecraft:needs_iron_tool"],
    ["omni_geode_node", 30.0, "minecraft:needs_diamond_tool"],
  ].forEach(([node, hardness, tool]) => {
    skullAllSides(e.create(`society:${node}`), `society:block/${node}`)
      .box(4, 0, 4, 12, 9, 12)
      .defaultCutout()
      .soundType("stone")
      .hardness(hardness)
      .resistance(9.0)
      .requiresTool(true)
      .tagBlock("minecraft:mineable/pickaxe")
      .tagBlock(tool)
      .tagBlock("society:skull_cavern_regens");
  });

  // Earth crystals and fire quartz are crystals on the cave floor (cross models in
  // assets/society/models/block/kubejs/); their items keep the gem textures.
  [
    ["earth_crystal", "stone", 0.5, "minecraft:needs_stone_tool", "society:item/geode/earth_crystal"],
    ["fire_quartz", "amethyst", 0.8, "minecraft:needs_iron_tool", "society:item/magma_geode/fire_quartz"],
  ].forEach(([crystal, sound, light, tool, texture]) => {
    e.create(`society:${crystal}`)
      .box(2, 0, 2, 14, 8, 14)
      .defaultCutout()
      .noCollision()
      .parentModel(`society:block/kubejs/${crystal}`)
      .soundType(sound)
      .hardness(2.5)
      .resistance(1.0)
      .requiresTool(true)
      .lightLevel(light)
      .tagBlock("minecraft:mineable/pickaxe")
      .tagBlock(tool)
      .tagBlock("society:skull_cavern_regens")
      .item((item) => item.texture(texture));
  });
});
