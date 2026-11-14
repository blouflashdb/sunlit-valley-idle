console.info("[SOCIETY] gnome.js loaded");

// Garden gnomes. Right-clicking cycles the pose ("type" 0-3); a gnome right-clicked with a lantern becomes a
// Lantern Gnome. The 1.20.1 pose models came from Society Tweaks (ARR), so every pose uses one placeholder model
// (tools/port/assets/make_machine_placeholder.py --single) for now.

const gnomeTypeProperty = integerProperty.create("type", 0, 3);

const nextGnomeType = (block) => {
  const type = Number(global.getBlockProperty(block, "type"));
  return String(type === 3 ? 0 : type + 1);
};

const createGnome = (e, id, model) =>
  e
    .create(id, "cardinal")
    .property(gnomeTypeProperty)
    .defaultCutout()
    .soundType("stone")
    .hardness(1.0)
    .tagBlock("minecraft:mineable/pickaxe")
    .parentModel(model)
    .defaultState((state) => state.set(gnomeTypeProperty, 0))
    .placementState((state) => state.set(gnomeTypeProperty, 0));

StartupEvents.registry("block", (e) => {
  createGnome(e, "society:gnome", "society:block/kubejs/gnome/gnome")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.gnome.description").gray());
      item.parentModel("society:block/kubejs/gnome/gnome");
    })
    .rightClick((click) => {
      const { block, item, hand, level } = click;
      if (level.isClientSide() || String(hand) !== "MAIN_HAND") return;
      const facing = global.getBlockProperty(block, "facing");
      if (String(item.id) === "minecraft:lantern") {
        block.set("society:lantern_gnome", { facing: facing });
      } else {
        block.set(block.id, { facing: facing, type: nextGnomeType(block) });
      }
    });

  createGnome(e, "society:lantern_gnome", "society:block/kubejs/lantern_gnome/lantern_gnome")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.lantern_gnome.description").gray());
      item.parentModel("society:block/kubejs/lantern_gnome/lantern_gnome");
    })
    .lightLevel(0.8)
    .rightClick((click) => {
      const { block, hand, level } = click;
      if (level.isClientSide() || String(hand) !== "MAIN_HAND") return;
      block.set(block.id, { facing: global.getBlockProperty(block, "facing"), type: nextGnomeType(block) });
    });
});
