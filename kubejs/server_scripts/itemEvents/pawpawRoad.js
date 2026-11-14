console.info("[SOCIETY] pawpawRoad.js loaded");

// Now and then a pawpaw tells a story (at most every 50 seconds).
const pawpawThrottle = societyThrottle();

ItemEvents.rightClicked("pamhc2trees:pawpawitem", (e) => {
  const { player, server } = e;
  if (pawpawThrottle(player, 1000, "pawpaw") || Math.random() >= 0.05) return;
  for (let line = 1; line <= 6; line++) {
    let text = Text.translatable(`society.pawpaw_road.${line}`).gold();
    if (line >= 5) text = text.bold();
    server.scheduleInTicks((line - 1) * 60, () => player.tell(text));
  }
});
