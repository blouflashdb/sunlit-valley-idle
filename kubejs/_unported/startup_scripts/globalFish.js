// The season fish lists are ported: kubejs/startup_scripts/globalFish.js
// The fish pond functions (getRoe, getFishFromRoe, handleFishHarvest, handleFishExtraction, validatePond,
// handleFishPondTick) are ported: kubejs/startup_scripts/fishPonds/globalFishPond.js

global.hasBobber = (rod, bobberId) => {
  let stringNbt = rod.nbt.toString();
  if (
    rod.id == "minecraft:fishing_rod" ||
    rod.id == "netherdepthsupgrade:lava_fishing_rod"
  ) {
    return stringNbt.includes(`{bobber:{Count:1b,id:"${bobberId}"}}`);
  } else {
    return stringNbt.includes(`{Count:1b,Slot:3,id:"${bobberId}"}`);
  }
};
