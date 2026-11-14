console.info("[SOCIETY] smokeTubasmokeStick.js loaded");

// Tubasmoke sticks: slowness, rare lightning and wither. One in a hundred starts the "Endless Entrana"
// edition chain, which counts up with every stick smoked (the edition is the stick's custom data).
const entranaStyle = '{anchor:"BOTTOM_CENTER",background:1,wrap:220,align:"BOTTOM_CENTER",color:"#00AAAA",offsetY:-60}';
const entranaWarningStyle =
  '{anchor:"BOTTOM_CENTER",charShakeRandom:0.2,background:1,wrap:220,align:"BOTTOM_CENTER",color:"#FF5555",offsetY:-60}';

const entranaMessage = (server, player, line, style, duration) =>
  server.runCommandSilent(
    global.getEmbersTextAPICommand(
      player.username,
      style || entranaStyle,
      duration || 120,
      Text.translatable(`society.endless_entrana.text.${line}`).toJson()
    )
  );

const entranaStick = (edition) => {
  const stick = Item.of("society:tubasmoke_stick");
  const data = NBT.compoundTag();
  data.putInt("edition", edition);
  stick.setCustomData(data);
  stick.setCustomName(
    Text.translatable("society.endless_entrana", Text.of(`${edition}`).bold()).bold().italic(false)
  );
  return stick;
};

const entranaEdition = (stack) => {
  const data = stack.getCustomData();
  return data && data.contains("edition") ? Number(data.getInt("edition")) : 0;
};

ItemEvents.rightClicked("society:tubasmoke_stick", (e) => {
  const { server, player, item, level } = e;
  const edition = entranaEdition(item);
  global.addItemCooldown(player, item, 10);
  item.shrink(1);
  societyPlaySound(server, "minecraft:item.flintandsteel.use", player);
  level.spawnParticles(
    "farmersdelight:steam",
    true,
    player.x,
    player.y + 1,
    player.z,
    0.1 * societyRnd(1, 6),
    0.1 * societyRnd(1, 4),
    0.1 * societyRnd(1, 4),
    22,
    0.001
  );
  societyPlaySound(server, "supplementaries:block.cannon.ignite", player);
  server.runCommandSilent(`effect give ${player.username} minecraft:slowness 20 1`);
  if (Math.random() < 0.02) {
    server.runCommandSilent(
      `execute in ${String(level.dimension)} run summon lightning_bolt ${player.x} ${player.y} ${player.z}`
    );
    entranaMessage(server, player, 0, entranaWarningStyle, 60);
  }
  if (edition === 0 && Math.random() < 0.01) {
    societyPlaySound(server, "tanukidecor:block.cash_register.ring", player);
    entranaMessage(server, player, 1);
    server.scheduleInTicks(1, () => player.give(entranaStick(1)));
  }
  if (edition > 0) {
    let giveNext = true;
    if (edition === 500) entranaMessage(server, player, 2);
    if (edition === 650) entranaMessage(server, player, 3);
    if (edition === 666) {
      entranaMessage(server, player, 4);
      server.scheduleInTicks(100, () => server.runCommandSilent(`kill ${player.username}`));
    }
    if (edition === 999) {
      entranaMessage(server, player, 5, null, 1200);
      server.scheduleInTicks(648000, () => server.runCommandSilent(`kill ${player.username}`));
    }
    if (edition === 2000) entranaMessage(server, player, 6);
    if (edition === 2100) entranaMessage(server, player, 7);
    if (edition === 5000) {
      player.give("numismatics:spur");
      entranaMessage(server, player, 8);
    }
    if (edition > 10000 && Math.random() < 0.001) {
      player.give("numismatics:bevel");
      entranaMessage(server, player, 9);
    }
    if (edition > 10000 && Math.random() < 0.001) {
      player.give("numismatics:sprocket");
      entranaMessage(server, player, 9);
    }
    if (edition > 1000000000 && Math.random() < 0.0001) {
      if (String(player.offHandItem.id) === "numismatics:prismatic_coin") {
        player.give("create:creative_blaze_cake");
        player.offHandItem.shrink(1);
        entranaMessage(server, player, 11);
        giveNext = false;
      } else {
        entranaMessage(server, player, 10);
      }
    }
    if (giveNext) server.scheduleInTicks(1, () => player.give(entranaStick(edition + 1)));
  }
  if (Math.random() < 0.01) {
    server.scheduleInTicks(800, () => {
      server.runCommandSilent(`effect give ${player.username} minecraft:wither 40 3`);
      entranaMessage(server, player, 0, entranaWarningStyle, 60);
    });
  }
});
