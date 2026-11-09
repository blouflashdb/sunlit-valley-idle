// The pack's fluids (tapper products, milk, juices, relic experience), ported from
// kubejs/_unported/startup_scripts/registration/registerFluids.js (1.20.1). Nether Vinery is gone on 1.21.1, so its
// crimson and warped grape juices are not registered. The milk is tagged c:milk instead of forge:milk.
console.info("[SOCIETY] registerFluids.js loaded");

// [id, display name, color, thick]
const packFluids = [
  ["society:oak_resin", "Oak Resin", 0xfffefc, true],
  ["society:pine_tar", "Pine Tar", 0x6e4117, true],
  ["society:maple_syrup", "Maple Syrup", 0x8a3727, true],
  ["society:mystic_syrup", "Mystic Syrup", 0xcf8cf6, true],
  ["society:vinegar", "Vinegar", 0x680000, true],
  ["society:alchemical_varnish", "Alchemical Varnish", 0xa2b7bd, true],
  ["society:mystic_jelly", "Mystic Jelly", 0x9cd8e0, true],
  ["society:milk", "Milk", 0xffffff, false, "c:milk"],
  ["vinery:apple_juice", "Apple Juice", 0xfff1a3, false],
  ["vinery:white_grape_juice", "White Grape Juice", 0xbdd9b2, false],
  ["vinery:red_grape_juice", "Red Grape Juice", 0x6c3c74, false],
  ["society:ancient_fruit_juice", "Ancient Fruit Juice", 0x5be3e4, false],
  ["society:starfruit_juice", "Starfruit Juice", 0xffa31c, false],
  ["society:sparkpod_juice", "Sparkpod Juice", 0xdf31f2, false],
  ["society:mana_fruit_juice", "Mana Fruit Juice", 0x00dedf, false],
  ["relics:relic_experience", "Relic Experience", 0xf7b23f, true],
];

StartupEvents.registry("fluid", (e) => {
  packFluids.forEach((fluid) => {
    let builder = e.create(fluid[0]);
    let texture = fluid[3] ? builder.thickTexture : builder.thinTexture;
    if (texture) texture.call(builder, fluid[2]);
    else if (builder.tint) builder.tint(fluid[2]);
    if (builder.bucketColor) builder.bucketColor(fluid[2]);
    builder.displayName(fluid[1]);
    builder.tag(fluid[4] || fluid[0]);
  });
});
