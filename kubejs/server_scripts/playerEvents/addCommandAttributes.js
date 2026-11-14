console.info("[SOCIETY] addCommandAttributes.js loaded");

// Sets the shipping bin sell multipliers of the player's skill stages (societyAddAttributesFromStages in
// serverEventUtils.js). Respawning resets attribute base values, so this also runs on respawn.
PlayerEvents.loggedIn((e) => {
  const { server, player } = e;
  server.scheduleInTicks(80, () => societyAddAttributesFromStages(player, server));
});

PlayerEvents.respawned((e) => societyAddAttributesFromStages(e.player, e.server));
