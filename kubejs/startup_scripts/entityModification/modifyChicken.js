console.info("[SOCIETY] modifyChicken.js loaded");

// Egg layers only lay when they were fed yesterday or today, and low affection slows them down.

/** Reads an int from the entity's saved data, changes it and writes it back. */
const updateLayTime = (entity, key, update) => {
  const current = entity.nbt.getInt(key);
  const next = update(current);
  if (next !== current) entity.mergeNbt({ [key]: NBT.i(next) });
};

const starvationPrevention = (entity, affectionPenaltyMult) => {
  const data = entity.persistentData;
  const day = global.getDay(entity.level);
  updateLayTime(entity, "EggLayTime", (time) => {
    if (day - data.getInt("ageLastFed") > 1) return 20400;
    if (Math.random() > data.getInt("affection") / 1000) return time + 1000 * affectionPenaltyMult;
    if (time > 12000) return 10240;
    return time;
  });
};

const everyThousandTicks = (fn) => (entity) => {
  if (entity.level.isClientSide() || entity.level.time % 1000 !== 0) return;
  fn(entity);
};

EntityJSEvents.modifyEntity((event) => {
  ["minecraft:chicken", "untitledduckmod:duck", "untitledduckmod:goose"].forEach((type) => {
    event.modify(type, (builder) => builder.tick(everyThousandTicks((entity) => starvationPrevention(entity, 1))));
  });
  event.modify("autumnity:turkey", (builder) =>
    builder.tick(everyThousandTicks((entity) => starvationPrevention(entity, 2)))
  );
  event.modify("etcetera:chapple", (builder) =>
    builder.tick(
      everyThousandTicks((entity) => {
        const day = global.getDay(entity.level);
        updateLayTime(entity, "AppleLayTime", (time) => {
          if (day - entity.persistentData.getInt("ageLastFed") > 1) return 20400;
          if (time > 12000) return 10240;
          return time;
        });
      })
    )
  );
});
