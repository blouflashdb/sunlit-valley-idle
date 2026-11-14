console.info("[SOCIETY] modifyRibbits.js loaded");

// Gardener ribbits trample farms, so they are replaced with fishermen.

global.handleRibbit = (entity) => {
  if (!String(entity.nbt).includes("gardener")) return;
  const fresh = entity.level.createEntity("ribbits:ribbit");
  fresh.setPos(entity.x, entity.y, entity.z);
  if (entity.customName) fresh.customName = entity.customName;
  fresh.mergeNbt({
    RibbitData: {
      umbrella: "ribbits:umbrella_3",
      instrument: "ribbits:none",
      profession: "ribbits:fisherman",
    },
  });
  fresh.spawn();
  entity.discard();
};

EntityJSEvents.modifyEntity((event) => {
  event.modify("ribbits:ribbit", (builder) => {
    builder.tick((entity) => {
      if (entity.level.isClientSide() || entity.level.time % 1200 !== 0) return;
      global.handleRibbit(entity);
    });
  });
});
