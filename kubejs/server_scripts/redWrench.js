console.info("[SOCIETY] redWrench.js loaded");

// A one percent chance to find the Red Wrench artifact on respawn.
PlayerEvents.respawned((e) => {
  if (Math.random() <= 0.01) e.player.give("society:red_wrench");
});
