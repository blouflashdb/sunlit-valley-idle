console.info("[SOCIETY] modifyGolems.js loaded");

// Golem Overhaul golems help on the farm:
// - Hay Golem: now and then upgrades farmland in a 4 block radius to low, then high quality fertilized farmland.
// - Kelp Golem: waters the garden pots in a 4 block radius.
// - Terracotta Golem: turns coarse dirt in a 4 block radius into clay.
// The 1.20.1 Slime Golem raised the happiness of Splendid Slimes, which is not in the 1.21.1 pack.

const $GolemBlockPos = Java.loadClass("net.minecraft.core.BlockPos");

/** Calls fn with each loaded LevelBlock in the radius until it returns true. */
const scanAroundGolem = (entity, radius, fn) => {
  const { level } = entity;
  const x = Math.floor(entity.x);
  const y = Math.floor(entity.y);
  const z = Math.floor(entity.z);
  for (let pos of $GolemBlockPos.betweenClosed(x - radius, y - radius, z - radius, x + radius, y + radius, z + radius)) {
    if (!level.isLoaded(pos)) continue;
    if (fn(level.getBlock(pos))) return;
  }
};

const playGolemSound = (entity, sound, x, y, z) => {
  entity.level.getServer().runCommandSilent(
    `execute in ${String(entity.level.dimension)} run playsound ${sound} block @a ${x} ${y} ${z}`
  );
};

const hayGolemUpgrades = {
  "minecraft:farmland": "dew_drop_farmland_growth:low_quality_fertilized_farmland",
  "dew_drop_farmland_growth:low_quality_fertilized_farmland": "dew_drop_farmland_growth:high_quality_fertilized_farmland",
};

global.handleHayGolem = (entity) => {
  const golems = entity.level
    .getEntitiesWithin(entity.boundingBox.inflate(8))
    .filter((other) => String(other.type) === "golemoverhaul:hay_golem");
  if (golems.length > 1) return;
  scanAroundGolem(entity, 4, (block) => {
    if (!rnd10() || !block.hasTag("society:hay_golem_improvable")) return false;
    const upgrade = hayGolemUpgrades[String(block.id)];
    if (upgrade) block.set(upgrade, { moisture: String(block.getProperties().get("moisture")) });
    playGolemSound(entity, "ribbits:entity.ribbit.magic", block.x, block.y, block.z);
    return true;
  });
};

global.handleKelpGolem = (entity) => {
  scanAroundGolem(entity, 4, (block) => {
    if (String(block.id) === "dew_drop_farmland_growth:garden_pot") {
      block.set(block.id, { moisture: "7", deluxe: String(block.getProperties().get("deluxe")) });
    }
    return false;
  });
  playGolemSound(entity, "minecraft:block.water.ambient", entity.x, entity.y, entity.z);
};

global.handleTerracottaGolem = (entity) => {
  scanAroundGolem(entity, 4, (block) => {
    if (String(block.id) !== "minecraft:coarse_dirt") return false;
    block.set("minecraft:clay");
    playGolemSound(entity, "twigs:block.silt.break", block.x, block.y, block.z);
    return true;
  });
};

const golemTick = (interval, handler) => (entity) => {
  if (entity.level.isClientSide() || entity.level.time % interval !== 0) return;
  handler(entity);
};

EntityJSEvents.modifyEntity((event) => {
  event.modify("golemoverhaul:hay_golem", (builder) => builder.tick(golemTick(3600, global.handleHayGolem)));
  event.modify("golemoverhaul:kelp_golem", (builder) => builder.tick(golemTick(1200, global.handleKelpGolem)));
  event.modify("golemoverhaul:terracotta_golem", (builder) =>
    builder.tick(golemTick(200, global.handleTerracottaGolem))
  );
});
