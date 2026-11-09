console.info("[SOCIETY] townEconomy.js loaded");

// Town economy (#15): hospital fees and debt after a death, the Coin Leaderboard and Overflow Tokens.
// Debts are global.getDebt/setDebt/addDebt (globalShippingBinHandlers.js); a shipping bin pays them off first.
// Events: server_scripts/townEconomyEvents.js. The Skull Cavern fee ("skull_cavern") comes with #16.

const $EconomyHashMap = Java.loadClass("java.util.HashMap");
const $EconomyCompoundTag = Java.loadClass("net.minecraft.nbt.CompoundTag");

/** The fee for a hospital visit ("death" or "skull_cavern"), from the player's bank balance. */
global.getHospitalFee = (balance, reason, stages) => {
  let minimumFee = 512;
  let maxFee = 0;
  let fee = 0;
  if (reason === "death") {
    maxFee = stages.has("first_aid_guide") ? 2048 : 4096;
    fee = Math.min(Math.round(balance * 0.1), maxFee);
  }
  if (reason === "skull_cavern") {
    minimumFee = 1024;
    maxFee = 8192;
    fee = Math.min(Math.round(balance * 0.15), maxFee);
  }
  if (fee < minimumFee) fee = minimumFee;
  if (balance < maxFee && stages.has("entered_skull_cavern")) fee = maxFee;
  return fee;
};

const hospitalNote = (titleKey, titleFallback, text) =>
  global.getNotePaperItem(
    global.translatableWithFallback("society.hospital_receipt.author", "Sunlit Valley Hospital").getString(),
    text,
    global.translatableWithFallback(titleKey, titleFallback).getString()
  );

/** The note a player gets after the first death, which is free. */
global.firstDeathNote = () =>
  hospitalNote("society.hospital_receipt.first_death.title", "Hospital Note", Text.translatable("society.hospital_receipt.first_death"));

/**
 * Charges a hospital fee: from the player's bank account (or bank card), or as a debt that the next sales pay off
 * when the balance is too low. The player gets a receipt. Returns the fee.
 */
global.handleFee = (server, player, reason) => {
  const account = global.getPersonalOrCurioAccount(player.level, player);
  const balance = account ? Number(account.getBalance()) || 0 : 0;
  const fee = global.getHospitalFee(balance, reason, player.stages);
  const uuid = String(player.getStringUuid());
  let text;
  if (!account || balance < fee) {
    global.addDebt(server, uuid, fee);
    text = Text.translatable("society.hospital_receipt.debt", global.formatPrice(fee), global.formatPrice(global.getDebt(server, uuid)));
  } else {
    account.setBalance(balance - fee);
    text = Text.translatable("society.hospital_receipt.fee_taked", global.formatPrice(fee));
  }
  player.give(hospitalNote("society.hospital_receipt.title", "Hospital Receipt", text));
  return fee;
};

// The Coin Leaderboard shows the ten richest players (bank balance plus Overflow Tokens) above itself.
// Ranking: [[name, balance], ...], refreshed every 30 s by townEconomyEvents.js.
global.coinLeaderboard = { ranking: [] };
const OVERFLOW_TOKEN_VALUE = 1006632960;

/** Remembers a player's name for the leaderboard (server.persistentData.playerList = {uuid: name}). */
global.recordLeaderboardPlayer = (server, player) => {
  const players = server.persistentData.getCompound("playerList");
  players.putString(String(player.getStringUuid()), String(player.username));
  server.persistentData.put("playerList", players);
};

global.addOverflowToken = (server, uuid) => {
  const tokens = server.persistentData.getCompound("overflowList");
  tokens.putInt(String(uuid), tokens.getInt(String(uuid)) + 1);
  server.persistentData.put("overflowList", tokens);
};

global.getLeaderboardRanking = (server) => {
  const players = server.persistentData.getCompound("playerList");
  const tokens = server.persistentData.getCompound("overflowList");
  const ranking = [];
  // Accounts of blocks (Blaze Bankers) have no player name and are left out.
  new $EconomyHashMap(global.GLOBAL_BANK.accounts).entrySet().forEach((entry) => {
    const uuid = String(entry.getKey());
    if (!players.contains(uuid)) return;
    const balance = Number(entry.getValue().getBalance()) + tokens.getInt(uuid) * OVERFLOW_TOKEN_VALUE;
    ranking.push([String(players.getString(uuid)), balance]);
  });
  ranking.sort((a, b) => b[1] - a[1]);
  return ranking.slice(0, 10);
};

/** "1.2M" style balances. */
global.formatPriceTruncated = (number) => {
  const value = Math.round(Number(number));
  const units = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (let i = 0; i < units.length; i++) {
    const [size, unit] = units[i];
    if (value >= size) {
      const shown = Math.floor((value / size) * 10) / 10;
      return `${shown % 1 === 0 ? shown.toFixed(0) : shown.toFixed(1)}${unit}`;
    }
  }
  return String(value);
};

const leaderboardTag = (block) => `leaderboard-${block.x}-${block.y}-${block.z}`;

global.clearLeaderboard = (block, level) => {
  level.getServer().runCommandSilent(
    `execute in ${String(level.dimension)} run kill @e[type=minecraft:text_display,tag=${leaderboardTag(block)}]`
  );
};

global.updateLeaderboard = (block, level) => {
  const server = level.getServer();
  const dimension = String(level.dimension);
  const yaw = global.rotationFromFacing(global.getBlockProperty(block, "facing"));
  const lines = [{ translate: "block.society.coin_leaderboard.title" }];
  global.coinLeaderboard.ranking.forEach(([name, balance]) => {
    lines.push({ text: `§6${name} §7- §f● §6${global.formatPriceTruncated(balance)}` });
  });
  global.clearLeaderboard(block, level);
  let y = block.y + 3.25;
  lines.forEach((line) => {
    server.runCommandSilent(
      `execute in ${dimension} run summon minecraft:text_display ${block.x + 0.5} ${y} ${block.z + 0.5} ` +
        `{Tags:["${leaderboardTag(block)}"],background:0,Rotation:[${yaw}f,0f],text:'${JSON.stringify(line).replace(/'/g, "\\'")}'}`
    );
    y -= 0.3;
  });
};

StartupEvents.registry("block", (e) => {
  e.create("society:coin_leaderboard", "cardinal")
    .box(2, 0, 2, 14, 2, 14)
    .defaultCutout()
    .hardness(1.5)
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .parentModel("society:block/kubejs/coin_leaderboard")
    .item((item) => {
      item.parentModel("society:block/kubejs/coin_leaderboard");
      item.tooltip(Text.translatable("block.society.coin_leaderboard.description").gray());
    })
    .blockEntity((blockInfo) => {
      blockInfo.serverTicking();
      blockInfo.tickFrequency(600);
    });
});
