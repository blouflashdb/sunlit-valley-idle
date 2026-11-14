console.info("[SOCIETY] cancelTrophy.js loaded");

// Deployers and other fake players cannot take trophies off a large pillar.
BlockEvents.rightClicked("trofers:large_pillar", (e) => {
  if (e.player.isFake()) e.cancel();
});
