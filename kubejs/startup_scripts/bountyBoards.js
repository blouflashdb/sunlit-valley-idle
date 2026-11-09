console.info("[SOCIETY] bountyBoards.js loaded");

// Seasonal bounty decrees (ported from the 1.20.1 updateBountyBoard.js): a decree for a season on a bounty board
// follows the current season, so a board posts spring bounties in spring, summer bounties in summer and so on.
// The board keeps its decrees in decree_inv.Items; each decree stack has the bountiful:decree_data component
// {ids: [decree ids], rank}.
const $BountyStringTag = Java.loadClass("net.minecraft.nbt.StringTag");
const $BountyListTag = Java.loadClass("net.minecraft.nbt.ListTag");

global.seasonalDecrees = ["spring", "summer", "autumn", "winter"];

/** Moves the seasonal decrees of a bounty board to the current season. Returns whether a decree changed. */
global.updateSeasonalDecrees = (block, level) => {
  let season = global.getSeasonFromLevel(level);
  let nbt = block.getEntityData();
  if (!nbt || !nbt.contains("decree_inv")) return false;
  let items = nbt.getCompound("decree_inv").getList("Items", 10);
  let changed = false;
  for (let i = 0; i < items.size(); i++) {
    let data = items.getCompound(i).getCompound("components").getCompound("bountiful:decree_data");
    let ids = data.getList("ids", 8);
    let seasonal = false;
    let current = false;
    for (let j = 0; j < ids.size(); j++) {
      let id = String(ids.getString(j));
      if (global.seasonalDecrees.indexOf(id) !== -1) seasonal = true;
      if (id === season) current = true;
    }
    if (seasonal && !(current && ids.size() === 1)) {
      let list = new $BountyListTag();
      list.add($BountyStringTag.valueOf(season));
      data.put("ids", list);
      changed = true;
    }
  }
  if (changed) block.setEntityData(nbt);
  return changed;
};
