console.info("[SOCIETY] fishPondTags.js loaded");

// Blocks that count as pond water behind a Fish Pond (startup_scripts/fishPonds/globalFishPond.js). The tag came
// from Society Tweaks on 1.20.1; the Nether Depths Upgrade kelps are not in the 1.21.1 pack.
ServerEvents.tags("block", (e) => {
  e.add("society:fish_pond_water", ["minecraft:kelp", "minecraft:kelp_plant", "minecraft:seagrass", "minecraft:tall_seagrass"]);
});
