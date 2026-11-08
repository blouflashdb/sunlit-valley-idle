console.info("[SOCIETY] slimeTicket.js loaded");

// Slime Ticket (#13): on 1.20.1 it showed a slime's favorite food. Without slime entities it is redeemed for
// 8 plorts of a random breed; the cheaper breeds come up more often.
ItemEvents.rightClicked("splendid_slimes:slime_ticket", (e) => {
  const { server, player, item, hand } = e;
  if (player.isFake() || String(hand) !== "MAIN_HAND") return;
  const breeds = global.plorts.slice().sort((a, b) => a.value - b.value);
  const weights = breeds.map((plort, index) => breeds.length - index);
  let roll = Math.random() * weights.reduce((sum, w) => sum + w, 0);
  let breed = breeds[0].type;
  for (let i = 0; i < breeds.length; i++) {
    roll -= weights[i];
    if (roll < 0) {
      breed = breeds[i].type;
      break;
    }
  }
  item.shrink(1);
  player.give(Item.of(`splendid_slimes:plort_${breed}`, 8));
  server.runCommandSilent(`playsound minecraft:entity.slime.squish player @a ${player.x} ${player.y} ${player.z}`);
});
