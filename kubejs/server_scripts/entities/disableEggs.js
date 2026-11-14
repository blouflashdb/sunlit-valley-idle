console.info("[SOCIETY] disableEggs.js loaded");

// Thrown eggs never hatch; eggs are only thrown while crouching.
const disabledEggs = ["minecraft:egg", "autumnity:turkey_egg", "untitledduckmod:goose_egg", "untitledduckmod:duck_egg"];

EntityEvents.spawned((e) => {
  if (disabledEggs.includes(global.entityTypeId(e.entity))) e.cancel();
});

ItemEvents.rightClicked(disabledEggs, (e) => {
  if (!e.player.isCrouching()) e.cancel();
});
