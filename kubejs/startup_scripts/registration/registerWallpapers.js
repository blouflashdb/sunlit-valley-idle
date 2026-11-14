console.info("[SOCIETY] registerWallpapers.js loaded");

// Wallpapers and baseboards (Carpenter shop). Right-clicking a baseboard with planks stores the wood type in
// the "type" property; sneak-clicking resets it. The 1.20.1 models per wood type came from Society Tweaks (ARR),
// so every type looks the same for now: society:block/wallpaper/* are placeholders in
// kubejs/assets/minecraft/atlases/blocks.json.

const baseboardTypes = [
  "minecraft:birch_planks",
  "minecraft:dark_oak_planks",
  "minecraft:jungle_planks",
  "minecraft:oak_planks",
  "minecraft:spruce_planks",
];
const baseboardTypeProperty = integerProperty.create("type", 0, baseboardTypes.length);

const wallpaperAllSides = (builder, texture) => {
  ["up", "down", "north", "east", "south", "west", "particle"].forEach((side) => builder.texture(side, texture));
  return builder;
};

StartupEvents.registry("block", (e) => {
  ["bee", "hive", "bunny", "cloud", "pink_flower"].forEach((wallpaperType) => {
    wallpaperAllSides(e.create(`society:${wallpaperType}_wallpaper`), `society:block/wallpaper/${wallpaperType}_wallpaper`)
      .soundType("wool")
      .hardness(1.0)
      .resistance(1.0)
      .tagBlock("minecraft:mineable/axe")
      .requiresTool(true);
    if (wallpaperType === "bee") return;
    wallpaperAllSides(e.create(`society:${wallpaperType}_baseboard`), `society:block/wallpaper/${wallpaperType}_baseboard`)
      .item((item) => {
        item.tooltip(Text.translatable("society.wallpaper.description").gray());
        item.tooltip(Text.translatable("society.wallpaper.description.tip").green());
      })
      .soundType("wood")
      .hardness(1.0)
      .resistance(1.0)
      .tagBlock("minecraft:mineable/axe")
      .requiresTool(true)
      .property(baseboardTypeProperty)
      .defaultState((state) => state.set(baseboardTypeProperty, 0))
      .placementState((state) => state.set(baseboardTypeProperty, 0))
      .rightClick((click) => {
        const { block, item, hand, player, level } = click;
        if (level.isClientSide() || String(hand) !== "MAIN_HAND") return;
        const index = baseboardTypes.indexOf(String(item.id));
        if (index !== -1) {
          level.getServer().runCommandSilent(
            `execute in ${String(level.dimension)} run playsound minecraft:block.wood.place block @a ${block.x} ${block.y} ${block.z}`
          );
          block.set(block.id, { type: String(index + 1) });
        } else if (player.isCrouching()) {
          block.set(block.id, { type: "0" });
        }
      });
  });
});
