console.info("[SOCIETY] pigRacing.js loaded");

// Pig races. Left click a ticket to pick a pig, right click it with a coin in the offhand to bet.
// - Pig race ticket: a race for one player; the winning pig pays the bet twice.
// - Multiplayer ticket: opens two minutes of betting (/pigrace <pig>, at least the opening bet); the first,
//   second and third pigs pay 2x, 1x and 0.5x of the bet out of the pool.
// 1.21.1: KubeJS 7 has no player.paint, so the race shows as four boss bars in the pig colors. The race is
// computed once and shown to every player of a race. The open multiplayer race lives in memory only.
const pigColors = ["Red", "Blue", "Yellow", "Green"];
const pigRaceBetCoins = [
  "numismatics:crown",
  "numismatics:sun",
  "numismatics:neptunium_coin",
  "numismatics:ancient_coin",
  "numismatics:prismatic_coin",
];
const pigRaceFinish = 214;
const pigRaceFrames = 220;
const pigRaceStartDelay = 25;
const pigRaceBettingTicks = 20 * 60 * 2;
const pigRaceMessageStyle = '{anchor:"BOTTOM_CENTER",background:1,align:"BOTTOM_CENTER",color:"#FFFFFF",offsetY:-60}';
const pigRaceState = { multiplayer: null };

const pigColoredName = (pig) => {
  const name = Text.translatable(`society.pig_race.${pig.toLowerCase()}_pig`);
  switch (pig) {
    case "Red":
      return name.red();
    case "Blue":
      return name.blue();
    case "Yellow":
      return name.yellow();
    default:
      return name.green();
  }
};

const pigRaceCoinValue = (stack) => {
  const entry = global.coinMap.find((coin) => coin.coin === String(stack.id));
  return entry ? entry.value * stack.count : 0;
};

const pigRaceGiveValue = (player, value) => {
  global.calculateCoinsFromValue(value, global.coinMap).forEach((entry) => {
    for (let left = entry.count; left > 0; left -= 64) player.give(Item.of(entry.coin, Math.min(64, left)));
  });
};

const pigRaceMessage = (server, player, key) =>
  server.runCommandSilent(
    global.getEmbersTextAPICommand(player.username, pigRaceMessageStyle, 80, Text.translatable(key).toJson())
  );

// The pigs' sprint speeds depend on the world seed and the season, so regulars can learn them.
const pigRaceHash = (input) => {
  let hash = 5;
  for (let i = 0; i < input.length; i++) hash = (hash * 9) ^ input.codePointAt(i);
  return Math.abs(Math.round(hash / 512));
};

const pigRaceSpeeds = (server, level) => {
  const seed = Number(server.worldData.worldGenOptions().seed());
  const season = global.getSeasonFromLevel(level);
  const adjust = (enabled) => (enabled ? 0.05 : 0);
  return pigColors.map((pig) => {
    let hash = Math.abs(pigRaceHash(season + pig) + seed);
    return [
      Math.random() * (1.2 + adjust(hash % 3 === 0) - (0.7 - adjust(hash % 4 === 0))) + 1,
      Math.random() * (1.2 + adjust(hash % 5 === 0) - (0.7 - adjust(hash % 6 === 0))) + 1,
    ];
  });
};

/** Simulates the race: frames[k][pig] positions, the pig that changes speed at its half way point, ranking. */
const simulatePigRace = (speeds) => {
  const halfwayPoint = societyRnd(40, 120);
  const frames = [];
  const changes = [];
  const ranking = [];
  for (let k = 0; k < pigRaceFrames; k++) {
    let positions = [];
    speeds.forEach((speed, index) => {
      let first = speed[0];
      let second = speed[1];
      let halfWay = first * halfwayPoint;
      let secondWind = halfWay + second * (k - halfwayPoint) + 1;
      let finished = k >= halfwayPoint && secondWind >= pigRaceFinish;
      let position = k < halfwayPoint ? first * k : finished ? pigRaceFinish : secondWind;
      if (k === halfwayPoint && Math.abs(second - first) >= 0.1) {
        changes.push({ frame: k, pig: index, boost: second > first });
      }
      if (finished && !ranking.includes(pigColors[index])) ranking.push(pigColors[index]);
      positions.push(Math.min(pigRaceFinish, Math.max(0, position)));
    });
    frames.push(positions);
  }
  pigColors.forEach((pig) => !ranking.includes(pig) && ranking.push(pig));
  return { frames: frames, changes: changes, ranking: ranking };
};

const pigRaceBar = (player, pig) => `society:pig_race_${String(player.getUuid()).substring(0, 8)}_${pig.toLowerCase()}`;

const pigRaceBarName = (pig, mark) => {
  const name = pigColoredName(pig);
  return (mark ? name.append(Text.of(` ${mark}`).white()) : name).toJson();
};

/** Shows the computed race to a player with boss bars and calls onFinish when the result is in. */
const showPigRace = (player, server, race, betPig, onFinish) => {
  const name = player.username;
  server.runCommandSilent(`stopsound ${name}`);
  server.runCommandSilent(`playsound society:blazing_drift_fever_ex music ${name} ${player.x} ${player.y} ${player.z}`);
  pigColors.forEach((pig) => {
    let bar = pigRaceBar(player, pig);
    server.runCommandSilent(`bossbar remove ${bar}`);
    server.runCommandSilent(`bossbar add ${bar} ${pigRaceBarName(pig, pig === betPig ? "★" : null)}`);
    server.runCommandSilent(`bossbar set ${bar} color ${pig.toLowerCase()}`);
    server.runCommandSilent(`bossbar set ${bar} max ${pigRaceFinish}`);
    server.runCommandSilent(`bossbar set ${bar} value 0`);
    server.runCommandSilent(`bossbar set ${bar} players ${name}`);
  });
  ["3", "2", "1", "GO!"].forEach((count, index) => {
    server.scheduleInTicks(index * 7, () =>
      server.runCommandSilent(`title ${name} title {"text":"${count}","color":"gold"}`)
    );
  });
  for (let k = 0; k < pigRaceFrames; k += 2) {
    let frame = k;
    server.scheduleInTicks(pigRaceStartDelay + frame, () => {
      race.frames[frame].forEach((position, index) => {
        server.runCommandSilent(`bossbar set ${pigRaceBar(player, pigColors[index])} value ${Math.round(position)}`);
      });
    });
  }
  race.changes.forEach((change) => {
    let frame = change.frame;
    let pig = change.pig;
    let boost = change.boost;
    server.scheduleInTicks(pigRaceStartDelay + frame, () => {
      server.runCommandSilent(
        `bossbar set ${pigRaceBar(player, pigColors[pig])} name ${pigRaceBarName(pigColors[pig], boost ? "▲" : "▼")}`
      );
      server.runCommandSilent(
        `playsound ${boost ? "minecraft:entity.breeze.idle_ground" : "minecraft:entity.fox.sleep"} player ${name} ${player.x} ${player.y} ${player.z}`
      );
    });
  });
  server.scheduleInTicks(pigRaceStartDelay + pigRaceFrames, () => {
    race.ranking.forEach((pig, place) => {
      server.runCommandSilent(`bossbar set ${pigRaceBar(player, pig)} name ${pigRaceBarName(pig, `#${place + 1}`)}`);
    });
    onFinish();
  });
  server.scheduleInTicks(pigRaceStartDelay + pigRaceFrames + 100, () => {
    server.runCommandSilent(`stopsound ${name} music`);
    pigColors.forEach((pig) => server.runCommandSilent(`bossbar remove ${pigRaceBar(player, pig)}`));
  });
};

const pigRaceResultTitle = (server, player, won) => {
  const text = won
    ? global.translatableWithFallback("society.pig_race.win", "You win!").gold()
    : global.translatableWithFallback("society.pig_race.lost", "You lost!").gray();
  server.runCommandSilent(`title ${player.username} title ${text.toJson()}`);
  if (won) societyPlaySound(server, "minecraft:ui.toast.challenge_complete", player);
  else societyPlaySound(server, "stardew_fishing:fish_escape", player);
};

const getTicketPig = (item) => {
  const data = item.getCustomData();
  const pig = data && data.contains("bet") ? String(data.getString("bet")) : "";
  return pigColors.includes(pig) ? pig : null;
};

/** The offhand bet and the ticket's pig, or null after telling the player what is missing. */
const validPigRaceTicket = (e) => {
  const { player, server, item } = e;
  if (!pigRaceBetCoins.includes(String(player.offHandItem.id))) {
    pigRaceMessage(server, player, "society.pig_race.need_coin");
    return null;
  }
  const pig = getTicketPig(item);
  if (!pig) {
    pigRaceMessage(server, player, "society.pig_race.need_to_select_pig");
    return null;
  }
  return pig;
};

ItemEvents.rightClicked("society:pig_race_ticket", (e) => {
  const { player, server, item, level } = e;
  if (global.isItemOnCooldown(player, item)) return;
  const betPig = validPigRaceTicket(e);
  if (!betPig) return;
  const bet = player.offHandItem.copy();
  global.addItemCooldown(player, item, 350);
  item.shrink(1);
  player.offHandItem = "minecraft:air";
  const race = simulatePigRace(pigRaceSpeeds(server, level));
  showPigRace(player, server, race, betPig, () => {
    const won = race.ranking[0] === betPig;
    if (won) player.give(bet.copyWithCount(bet.count * 2));
    pigRaceResultTitle(server, player, won);
  });
});

const pigRaceMedals = [":first_place_medal:", ":second_place_medal:", ":third_place_medal:"];
const pigRacePayout = [2, 1, 0.5];

const runMultiplayerPigRace = (server, level) => {
  const state = pigRaceState.multiplayer;
  pigRaceState.multiplayer = null;
  const pool = state.bets.reduce((sum, bet) => sum + bet.value, 0);
  if (state.bets.length < 2) {
    state.bets.forEach((bet) => {
      let player = server.playerList.getPlayerByName(bet.player);
      if (player) {
        pigRaceGiveValue(player, bet.value);
        player.give("society:multiplayer_pig_race_ticket");
      }
    });
    server.tell(Text.translatable("society.pig_race.multiplay.cancelled").gray());
    return;
  }
  server.tell(Text.translatable("society.pig_race.multiplay.started", `${global.formatPrice(pool)}`).gray());
  const race = simulatePigRace(pigRaceSpeeds(server, level));
  let poolLeft = pool;
  let resultsShown = false;
  state.bets.forEach((bet) => {
    let player = server.playerList.getPlayerByName(bet.player);
    if (!player) return;
    showPigRace(player, server, race, bet.pig, () => {
      pigRaceResultTitle(server, player, race.ranking[0] === bet.pig);
      if (resultsShown) return;
      resultsShown = true;
      // Pay out once, in betting order, while the pool lasts.
      state.bets.forEach((winner) => {
        let place = race.ranking.indexOf(winner.pig);
        if (place > 2) return;
        let prize = Math.min(poolLeft, Math.floor(winner.value * pigRacePayout[place]));
        let winnerPlayer = server.playerList.getPlayerByName(winner.player);
        if (prize <= 0 || !winnerPlayer) return;
        poolLeft -= prize;
        pigRaceGiveValue(winnerPlayer, prize);
        server.tell(
          Text.translatable(
            "society.pig_race.multiplay.result",
            pigRaceMedals[place],
            Text.gold(winner.player),
            Text.gold(global.formatPrice(prize)),
            pigColoredName(winner.pig)
          ).gray()
        );
      });
    });
  });
};

ItemEvents.rightClicked("society:multiplayer_pig_race_ticket", (e) => {
  const { player, server, item, level } = e;
  if (pigRaceState.multiplayer) {
    pigRaceMessage(server, player, "society.pig_race.multiplay.in_progress");
    return;
  }
  const betPig = validPigRaceTicket(e);
  if (!betPig) return;
  const value = pigRaceCoinValue(player.offHandItem);
  item.shrink(1);
  player.offHandItem = "minecraft:air";
  pigRaceState.multiplayer = { minimum: value, bets: [{ player: String(player.username), value: value, pig: betPig }] };
  server.tell(
    Text.translatable(
      "society.pig_race.multiplay.start",
      Text.gold(player.username),
      Text.gold(global.formatPrice(value)),
      pigColoredName(betPig)
    )
  );
  server.scheduleInTicks(pigRaceBettingTicks / 2, () =>
    server.tell(
      Text.translatable("society.pig_race.multiplay.start_in_minute", `${pigRaceBettingTicks / (2 * 20 * 60)}`).gray()
    )
  );
  server.scheduleInTicks(pigRaceBettingTicks - 200, () =>
    server.tell(Text.translatable("society.pig_race.multiplay.start_in_10").gray())
  );
  server.scheduleInTicks(pigRaceBettingTicks, () => runMultiplayerPigRace(server, level));
});

// Left click a ticket to pick the next pig.
ItemEvents.firstLeftClicked(["society:pig_race_ticket", "society:multiplayer_pig_race_ticket"], (e) => {
  const { item, server, player } = e;
  if (global.isItemOnCooldown(player, item)) return;
  societyPlaySound(server, "minecraft:ui.button.click", player);
  const current = pigColors.indexOf(getTicketPig(item));
  const pig = pigColors[(current + 1) % pigColors.length];
  const data = item.getCustomData() || NBT.compoundTag();
  data.putString("bet", pig);
  item.setCustomData(data);
  player.setStatusMessage(Text.translatable("society.pig_race.pig_selected", pigColoredName(pig)).gray());
  global.addItemCooldown(player, item, 10);
});

// /pigrace <pig>: join the open multiplayer race with the coins in the offhand.
ServerEvents.commandRegistry((event) => {
  const { commands: Commands, arguments: Arguments } = event;
  const joinPigRace = (player, pigArgument) => {
    const state = pigRaceState.multiplayer;
    const fail = (key, arg) => {
      player.tell((arg ? Text.translatable(key, arg) : Text.translatable(key)).red());
      return 0;
    };
    if (!state) return fail("command.society.pig_race.no_active");
    const pig = global.formatName(String(pigArgument).toLowerCase());
    if (!pigColors.includes(pig)) return fail("command.society.pig_race.invalid_pig");
    const bet = player.offHandItem;
    if (!pigRaceBetCoins.includes(String(bet.id))) return fail("command.society.pig_race.no_bet");
    const value = pigRaceCoinValue(bet);
    if (value < state.minimum) {
      return fail("command.society.pig_race.insufficient_bet", `${global.formatPrice(state.minimum)}`);
    }
    if (state.bets.some((entry) => entry.player === String(player.username))) {
      return fail("command.society.pig_race.already_bet");
    }
    player.offHandItem = "minecraft:air";
    state.bets.push({ player: String(player.username), value: value, pig: pig });
    player.server.tell(
      Text.translatable(
        "command.society.pig_race.success",
        Text.gold(`${player.username}`),
        Text.gold(`${global.formatPrice(value)}`),
        pigColoredName(pig)
      ).gray()
    );
    return 1;
  };
  event.register(
    Commands.literal("pigrace").then(
      Commands.argument("pig", Arguments.WORD.create(event)).executes((c) =>
        joinPigRace(c.source.getPlayerOrException(), Arguments.WORD.getResult(c, "pig"))
      )
    )
  );
});
