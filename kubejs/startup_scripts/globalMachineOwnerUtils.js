// priority: 900
// Machines that apply their owner's skills (Artisan Hopper, Auto-Grabber, Fish Pond Basket) store the owner's
// UUID in their block entity data ("owner", set when placed) and cache the owner's stages there ("stages").
console.info("[SOCIETY] globalMachineOwnerUtils.js loaded");

/** Wraps a list of stage names so it can be read with has(), like player.stages. */
function SocietyStages(stages) {
  return {
    value: stages,
    has: function (x) {
      return this.value.indexOf(String(x)) !== -1;
    },
  };
}

global.NO_STAGES = SocietyStages([]);

/** The owner's stages cached by global.cacheOwner. Takes a block entity event or a block. */
global.getBlockEntityStages = (entityOrBlock) => {
  const block = entityOrBlock.block || entityOrBlock;
  const raw = global.getMachineString(block, "stages");
  if (raw === "") return global.NO_STAGES;
  try {
    return SocietyStages(JSON.parse(raw));
  } catch (e) {
    return global.NO_STAGES;
  }
};

/**
 * Caches which of stagesToFind the owner has. Returns the owner when online, else null (the cached stages
 * stay as they were). On 1.20.1 this also cached attributes; no ported machine reads them yet.
 */
global.cacheOwner = (entity, stagesToFind) => {
  const { level, block } = entity;
  const owner = global.getMachineString(block, "owner");
  let ownerPlayer = null;
  level.getServer().players.forEach((p) => {
    if (String(p.getUuid()) === owner) ownerPlayer = p;
  });
  if (ownerPlayer && stagesToFind) {
    global.setMachineData(block, { stages: stagesToFind.filter((stage) => ownerPlayer.stages.has(stage)) });
  }
  return ownerPlayer;
};
