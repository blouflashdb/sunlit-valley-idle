console.info("[SOCIETY] addNetherStage.js loaded");

// Entering the Nether the first time unlocks the Nether villagers. KubeJS 7 has no dimension change event;
// KubeJS Additions provides it.
CommonAddedEvents.playerChangeDimension((e) => {
  if (String(e.newWorldKey.location()) !== "minecraft:the_nether") return;
  const player = e.entity;
  if (!player.isPlayer() || player.stages.has("entered_nether")) return;
  player.stages.add("entered_nether");
  player.tell(Text.translatable("society.new_villager.message").green());
});
