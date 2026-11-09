console.info("[SOCIETY] skullCavernEvents.js loaded");

// Skull Cavern events (ported from the 1.20.1 skullCavernPlace.js, skullCavernBroken.js, skullTeleporter.js,
// skullCavernTick.js, checkSkullCavernLogin.js, magicRope.js and frozenGeode.js; #16).
// The blocks, the regeneration and the chunk parity live in startup_scripts/skullCavern/skullCavern.js.
// Messages go to the action bar (KubeJS 7 has no Paint UI).
const skullRandom = (min, max) => min + Math.random() * (max - min);
const skullError = (player, key) => player.setStatusMessage(Text.translatable(key).red());

const skullCrashableHammers = [
  "botania:terra_pick",
  "justhammers:diamond_impact_hammer",
  "justhammers:gold_impact_hammer",
  "justhammers:iron_impact_hammer",
  "justhammers:stone_impact_hammer",
  "justhammers:netherite_hammer",
  "justhammers:diamond_hammer",
  "justhammers:gold_hammer",
  "justhammers:iron_hammer",
  "justhammers:stone_hammer",
  "justhammers:netherite_impact_hammer",
];

const skullRockType = (block) => {
  let type = global.skullCavernRockTypes[String(block.biomeId)];
  return type === undefined ? 0 : type;
};

const scheduleSkullAir = (server, level, pos, rockType) => {
  server.scheduleInTicks(5, () => global.placeSkullCavernAir(level, pos, rockType));
};

const skullGlow = (level, x, y, z) => {
  level.spawnParticles("minecraft:glow", true, x, y + 0.5, z, 0.2 * skullRandom(1, 4), 0.2 * skullRandom(1, 4), 0.2 * skullRandom(1, 4), 5, 2);
};

BlockEvents.placed((e) => {
  const { player, block, level, server } = e;
  if (!global.isSkullCavern(level) || !player) return;
  if (block.hasTag("society:skull_cavern_unplacable") && !player.isCreative()) {
    skullError(player, "society.skull_cavern.prevent_block_place");
    player.inventoryMenu.broadcastFullState();
    e.cancel();
  } else if (global.skullCavernHardmode) {
    let pos = block.getPos().immutable();
    let torch = String(block.id) === "minecraft:torch";
    server.scheduleInTicks(torch ? 1200 : 200, () => {
      level.destroyBlock(pos, true);
      skullGlow(level, pos.x, pos.y, pos.z);
    });
  }
});

// Mined rocks, ores, nodes and crates leave cavern air that regrows on a later day.
BlockEvents.broken((e) => {
  const { level, block, player, server } = e;
  if (!global.isSkullCavern(level)) return;
  if (String(block.id) === "society:skull_cavern_teleporter") {
    e.cancel();
    return;
  }
  if (!block.hasTag("society:skull_cavern_regens")) return;
  let held = player ? String(player.getHeldItem("main_hand").id) : "";
  if (global.disableHammersSkullCavern && skullCrashableHammers.indexOf(held) !== -1) {
    let dialog = held === "botania:terra_pick" ? "goddess_unique_skull_cavern_shatterer" : "goddess_unique_skull_cavern_hammer";
    global.showTownDialog(server, player, dialog);
    e.cancel();
    return;
  }
  scheduleSkullAir(server, level, block.getPos().immutable(), skullRockType(block));
  if (String(block.id).endsWith("_boulder") && player && player.stages.has("moon_rope_reveal") && Math.random() < 0.15) {
    revealRopes(level, server, block);
  }
});

// The Moon Rope perk: ropes nearby ring out when a boulder breaks.
const revealRopes = (level, server, block) => {
  let radius = 8;
  for (let x = block.x - radius; x <= block.x + radius; x++) {
    for (let y = block.y - radius; y <= block.y + radius; y++) {
      for (let z = block.z - radius; z <= block.z + radius; z++) {
        let scan = level.getBlock(x, y, z);
        if (String(scan.id) === "farmersdelight:rope" && String(level.getBlock(x, y + 1, z).id) !== "farmersdelight:rope") {
          level.spawnParticles("minecraft:end_rod", true, x, y + 1.5, z, 0.1, 0.1, 0.1, 5, 0.01);
          server.runCommandSilent(`playsound create:peculiar_bell_use block @a ${x} ${y + 1} ${z}`);
        }
      }
    }
  }
};

// Unplaceable blocks (sand, ice, moss ...) grow back after five seconds.
BlockEvents.broken((e) => {
  const { level, block, server } = e;
  if (!global.isSkullCavern(level) || !block.hasTag("society:skull_cavern_unplacable")) return;
  let pos = block.getPos().immutable();
  let id = String(block.id);
  server.scheduleInTicks(100, () => {
    if (!level.isLoaded(pos) || String(level.getBlock(pos).id) !== "minecraft:air") return;
    level.getBlock(pos).set(id);
    skullGlow(level, pos.x, pos.y, pos.z);
  });
});

// Bombs leave the cavern walls standing and regrow the rocks they break.
LevelEvents.beforeExplosion((e) => {
  const { x, y, z, size, level, server } = e;
  if (!global.isSkullCavern(level)) return;
  let range = Math.round(Math.floor((size * 1.3) / 0.225) * 0.5);
  let denied = [];
  for (let xi = Math.floor(x - range); xi <= Math.ceil(x + range); xi++) {
    for (let zi = Math.floor(z - range); zi <= Math.ceil(z + range); zi++) {
      for (let yi = Math.floor(y - range); yi <= Math.ceil(y + range); yi++) {
        let dist = Math.hypot(x - xi, y - yi, z - zi);
        if (dist > range) continue;
        let block = level.getBlock(xi, yi, zi);
        if (block.hasTag("society:skull_cavern_bomb_denied")) {
          denied.push({ xi: xi, yi: yi, zi: zi, dist: dist, id: String(block.id) });
        } else if (block.hasTag("society:skull_cavern_regens")) {
          scheduleSkullAir(server, level, block.getPos().immutable(), skullRockType(block));
        }
      }
    }
  }
  denied.sort((a, b) => a.dist - b.dist);
  denied.forEach((entry, i) => {
    server.scheduleInTicks(i + 1, () => level.getBlock(entry.xi, entry.yi, entry.zi).set(entry.id));
  });
});

BlockEvents.leftClicked("society:skull_cavern_teleporter", (e) => {
  if (global.isSkullCavern(e.level)) e.cancel();
});

BlockEvents.rightClicked("society:skull_cavern_teleporter", (e) => {
  const { block, player, level, item, hand, server } = e;
  if (String(hand) === "OFF_HAND") return;
  if (String(item.id) === "society:magic_rope") e.cancel();
  if (!player.stages.has("entered_skull_cavern")) player.stages.add("entered_skull_cavern");
  if (global.isSkullCavern(level)) {
    player.persistentData.putInt("skullCavernEnterDay", -1);
    global.teleportHome(player, server, level);
    return;
  }
  if (level.dayTime() % 24000 > 18000) {
    skullError(player, "society.skull_cavern.too_late");
    return;
  }
  if (!player.stages.has("skull_cavern_intro")) {
    player.stages.add("skull_cavern_intro");
    player.tell(Text.translatable("society.skull_cavern.intro").gold());
    player.tell(Text.translatable("society.new_villager.message").green());
    player.give(Item.of("gag:escape_rope"));
    let noteTitle = global.translatableWithFallback("society.skull_cavern.intro.note.title", "A Warning").getString();
    let noteAuthor = global.translatableWithFallback("society.skull_cavern.intro.note.author", "someone...").getString();
    player.give(global.getNotePaperItem(noteAuthor, Text.translatable("society.skull_cavern.intro.note"), noteTitle));
  }
  enterSkullCavern(player, server, block.x, block.z);
});

/** Sends a player into the cavern above x/z and puts the way back under their feet. */
function enterSkullCavern(player, server, x, z) {
  let cavern = server.getLevel(global.skullCavernDimension);
  player.teleportTo(cavern, x + 0.5, 512, z + 0.5, [], 0.0, 0.0);
  player.persistentData.putInt("skullCavernEnterDay", global.getDay(cavern));
  cavern.getBlock(x, 511, z).set("society:skull_cavern_teleporter");
}

const skullFaint = (player, server, offsetY) => {
  player.persistentData.putInt("skullCavernEnterDay", -1);
  global.teleportHome(player, server, player.level);
  server.runCommandSilent(
    global.getEmbersTextAPICommand(
      player.username,
      `{anchor:"BOTTOM_CENTER",background:1,align:"BOTTOM_CENTER",color:"#AAAAAA",offsetY:${offsetY}}`,
      200,
      Text.translatable("society.skull_cavern.fainted").toJson()
    )
  );
  player.potionEffects.add("minecraft:slowness", 310, 3, true, false);
  player.potionEffects.add("minecraft:darkness", 310, 0, true, false);
};

// The night in the cavern: slowness from 11 PM, a heartbeat from 2 AM, fainting at 6 AM (with the hospital fee).
PlayerEvents.tick((e) => {
  const player = e.player;
  if (player.age % 200 !== 0 || !global.isSkullCavern(player.level)) return;
  const time = player.level.dayTime() % 24000;
  const server = player.getServer();
  const text = (style, key) =>
    server.runCommandSilent(global.getEmbersTextAPICommand(player.username, style, 200, Text.translatable(key).toJson()));
  if (time >= 17000) {
    if (time <= 17200) {
      server.runCommandSilent(`playsound minecraft:ambient.cave block @a ${player.x} ${player.y} ${player.z}`);
      text(`{anchor:"BOTTOM_CENTER",background:1,align:"BOTTOM_CENTER",color:"#AAAAAA",offsetY:-40}`, "society.skull_cavern.late");
    }
    player.potionEffects.add("minecraft:slowness", 210, 0, true, false);
  }
  if (time >= 20000) {
    if (time <= 20200) {
      text(`{anchor:"BOTTOM_CENTER",charShakeRandom:0.2,background:1,align:"BOTTOM_CENTER",color:"#AAAAAA",offsetY:-40}`, "society.skull_cavern.concern");
    }
    server.runCommandSilent(`playsound minecraft:entity.warden.heartbeat block @a ${player.x} ${player.y} ${player.z}`);
  }
  if (time >= 23800) {
    skullFaint(player, server, -40);
    if (global.enableDeathDebt && !player.stages.has("debt_caverns")) {
      global.handleFee(server, player, "skull_cavern");
      if (Math.random() <= 0.02) player.give("society:debt_caverns");
    }
  }
});

// A player who logs back in after the cavern reset faints.
PlayerEvents.loggedIn((e) => {
  const { player, level, server } = e;
  if (!global.isSkullCavern(level)) return;
  let parity = global.getSkullChunkParity(level, player.blockPosition());
  if (parity && parity.getInt("day") > player.persistentData.getInt("skullCavernEnterDay")) skullFaint(player, server, -60);
});

// Magic Rope: down to the next cave below. Magic Tunnel: through the wall ahead.
const ropeAirBlocks = ["minecraft:air", "minecraft:cave_air", "minecraft:cave_vines_plant", "society:cavern_air"];
const isRopeAir = (block) => ropeAirBlocks.indexOf(String(block.id)) !== -1;

const ropeDown = (level, player, pos) => {
  let airAbove = false;
  let found = 0;
  for (let i = 5; i < 15; i++) {
    if (isRopeAir(level.getBlock(pos.offset(0, -i, 0)))) {
      if (airAbove) found = i;
      else airAbove = true;
    } else airAbove = false;
  }
  if (found === 0) return false;
  player.teleportTo(level, pos.x + 0.5, pos.y - found, pos.z + 0.5, [], player.yRot, player.xRot);
  return true;
};

const tunnelSide = (level, player, pos) => {
  let facing = String(player.facing);
  let dx = facing === "east" ? 1 : facing === "west" ? -1 : 0;
  let dz = facing === "south" ? 1 : facing === "north" ? -1 : 0;
  let target = null;
  for (let i = 5; i < 40 && !target; i++) {
    let scan = level.getBlock(pos.offset(i * dx, 0, i * dz));
    if (isRopeAir(level.getBlock(scan.getPos().above()))) target = scan.getPos();
  }
  if (!target) return false;
  player.teleportTo(level, target.x + 0.5, target.y, target.z + 0.5, [], player.yRot, player.xRot);
  return true;
};

const useRope = (e, item, move, failKey) => {
  const { level, server, player } = e;
  if (!global.isSkullCavern(level)) {
    skullError(player, "item.society.magic_rope.invalid_dimension");
    global.addItemCooldown(player, item, 2);
  } else if (move()) {
    item.count--;
    server.runCommandSilent(`playsound minecraft:entity.enderman.teleport block @a ${player.x} ${player.y} ${player.z}`);
    global.addItemCooldown(player, item, 150);
  } else {
    skullError(player, failKey);
    global.addItemCooldown(player, item, 2);
  }
};

ItemEvents.rightClicked("society:magic_rope", (e) => {
  useRope(e, e.item, () => ropeDown(e.level, e.player, e.player.blockPosition().below()), "item.society.magic_rope.no_room_below");
});

BlockEvents.rightClicked((e) => {
  if (String(e.item.id) !== "society:magic_tunnel") return;
  useRope(e, e.item, () => tunnelSide(e.level, e.player, e.block.getPos()), "item.society.magic_rope.no_room_side");
});

// Tools that move or copy blocks do not work in the cavern.
const skullDeniedTools = [
    "buildinggadgets2:gadget_copy_paste",
    "buildinggadgets2:gadget_exchanging",
    "buildinggadgets2:gadget_cut_paste",
    "buildinggadgets2:gadget_destruction",
    "botania:smelt_rod",
    "supplementaries:wrench",
    "society:red_wrench",
    "portable_blueprints:blueprint",
    "portable_blueprints:worn_blueprint",
    "portable_blueprints:server_blueprint",
    "portable_blueprints:scanner",
    "portable_blueprints:tablet",
].filter((id) => global.itemExists(id));
if (skullDeniedTools.length > 0) {
  ItemEvents.rightClicked(skullDeniedTools, (e) => {
    if (!global.isSkullCavern(e.player.level)) return;
    skullError(e.player, "society.skull_cavern.prevent_tool");
    e.cancel();
  });
}

// A winter geode node can hold a frozen geode.
BlockEvents.broken(["society:geode_node", "society:omni_geode_node"], (e) => {
  const { level, player, block, server } = e;
  if (global.getSeasonFromLevel(level) !== "winter" || Math.random() > 0.1) return;
  block.popItem(Item.of("society:frozen_geode"));
  if (player) server.runCommandSilent(`playsound stardew_fishing:complete block @a ${player.x} ${player.y} ${player.z}`);
});
