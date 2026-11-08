console.info("[SOCIETY] mysticalFlowerCrops.js loaded");

// Mystical flower crops (#14). Botania Seeds has no 1.21.1 build, so its 16 seeds are KubeJS crops under the
// same namespace: botania_seeds:<color>_mystical_flower grows on farmland like the pack's other crops (daily,
// tag dew_drop_farmland_growth:cancel_random_tick) and gives one Botania mystical flower. KubeJS names the
// seed botania_seeds:<color>_mystical_flower_seeds. Seeds come from the petal apothecary
// (server_scripts/recipes/botaniaRecipes.js) and the seed maker.
// Stage models: tools/port/assets/make_crop_placeholders.py.

// Minecraft's dye colors, used to tint the seed item.
global.mysticalFlowerColors = {
  white: 0xf9fffe,
  orange: 0xf9801d,
  magenta: 0xc74ebd,
  light_blue: 0x3ab3da,
  yellow: 0xfed83d,
  lime: 0x80c71f,
  pink: 0xf38baa,
  gray: 0x474f52,
  light_gray: 0x9d9d97,
  cyan: 0x169c9c,
  purple: 0x8932b8,
  blue: 0x3c44aa,
  brown: 0x835432,
  green: 0x5e7c16,
  red: 0xb02e26,
  black: 0x1d1d21,
};

StartupEvents.registry("block", (e) => {
  Object.keys(global.mysticalFlowerColors).forEach((color) => {
    const id = `botania_seeds:${color}_mystical_flower`;
    e.create(id, "crop")
      .age(3, (builder) => {
        builder
          .shape(0, 0, 0, 0, 16, 4, 16)
          .shape(1, 0, 0, 0, 16, 8, 16)
          .shape(2, 0, 0, 0, 16, 12, 16)
          .shape(3, 0, 0, 0, 16, 14, 16);
      })
      .survive((state, level, pos) => global.surviveCheck(level, pos))
      .noSeeds()
      .crop(`botania:${color}_mystical_flower`, 1)
      .tagBlock("minecraft:mineable/hoe")
      .tagBlock("minecraft:crops")
      .tagItem("society:botania_seeds")
      .item((seedItem) => {
        seedItem.texture("minecraft:item/pumpkin_seeds");
        seedItem.color(0, global.mysticalFlowerColors[color]);
      });
    const variants = {};
    for (let age = 0; age <= 3; age++) {
      variants[`age=${age}`] = { model: `botania_seeds:block/${color}_mystical_flower_stage${age}` };
    }
    global.cropBlockstates[id] = { variants: variants };
  });
});
