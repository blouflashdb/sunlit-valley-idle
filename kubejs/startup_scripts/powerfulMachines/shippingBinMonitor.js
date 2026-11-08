// Shipping Bin Monitor: placed on top of a shipping bin, shows what the bin's contents would sell for.
// It shows the value in a text display above itself; the tick is in server_scripts/blockEvents/machineTicks.js.
console.info("[SOCIETY] shippingBinMonitor.js loaded");

global.runShippingBinMonitor = (block, level) => {
  const server = level.getServer();
  const below = level.getBlock(block.getPos().below());
  let value = -1;
  if (global.shippingBins.includes(String(below.id))) {
    let inventory = global.getShippingBinInventory(below);
    let cached = global.cacheShippingBin(below, server);
    if (inventory && cached.profile) {
      value = Math.round(
        global.processShippingBinInventory(inventory, inventory.getSlots(), cached.profile, false, true).calculatedValue
      );
    }
  }
  const shown = global.hasMachineValue(block, "value") ? global.getMachineInt(block, "value") : -2;
  if (shown === value) return;
  global.setMachineData(block, { value: value });
  const tag = `shipping_bin_monitor-${block.x}-${block.y}-${block.z}`;
  const text =
    value === -1
      ? { translate: "block.society.shipping_bin_monitor.offline" }
      : { text: `●${value < 100000000 ? " " : ""}${global.formatPrice(value)}` };
  const yaw = global.rotationFromFacing(global.getBlockProperty(block, "facing"));
  const dimension = String(level.dimension);
  server.runCommandSilent(`execute in ${dimension} run kill @e[type=minecraft:text_display,tag=${tag}]`);
  server.runCommandSilent(
    `execute in ${dimension} run summon minecraft:text_display ${block.x + 0.5} ${block.y + 0.25} ${block.z + 0.5} ` +
      `{Tags:["${tag}"],background:0,Rotation:[${yaw}f,0f],text:'${JSON.stringify(text).replace(/'/g, "\\'")}'}`
  );
};

global.rotationFromFacing = (facing) => {
  switch (String(facing)) {
    case "north":
      return 180;
    case "east":
      return 270;
    case "south":
      return 0;
    default:
      return 90;
  }
};

StartupEvents.registry("block", (event) => {
  event
    .create("society:shipping_bin_monitor", "cardinal")
    .soundType("metal")
    .tagBlock("minecraft:mineable/pickaxe")
    .defaultCutout()
    .box(0, 0, 0, 16, 3, 16)
    .parentModel("society:block/kubejs/shipping_bin_monitor")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.shipping_bin_monitor.description").gray());
      item.parentModel("society:block/kubejs/shipping_bin_monitor");
    })
    .blockEntity((blockInfo) => {
      blockInfo.initialData({ value: -2 });
      blockInfo.serverTicking();
      blockInfo.tickFrequency(200);
    })
    .rightClick((click) => {
      if (click.level.isClientSide()) return;
      global.runShippingBinMonitor(click.block, click.level);
    });
});
