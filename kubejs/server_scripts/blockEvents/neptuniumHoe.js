console.info("[SOCIETY] neptuniumHoe.js loaded");

BlockEvents.rightClicked(
  [
    "minecraft:dirt",
    "minecraft:rooted_dirt",
    "minecraft:coarse_dirt",
    "minecraft:dirt_path",
    "minecraft:grass_block",
  ],
  (e) => {
    const { item, block } = e;
    let id = String(item.id);
    if (id === "aquaculture:neptunium_hoe" || id === "botania:elementium_hoe") {
      block.set("dew_drop_farmland_growth:hydrating_farmland");
      e.cancel();
    }
  }
);
