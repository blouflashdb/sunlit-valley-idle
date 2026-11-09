console.info("[SOCIETY] autoTapper.js loaded");

// Auto-Tapper and Juice Inserter, ported from kubejs/_unported/startup_scripts/powerfulMachines (1.20.1). Both keep
// their fluid in a KubeJS fluid tank attachment ("tank", 10 000 mB) that pipes and pumps reach from every side.
// Ticks: server_scripts/blockEvents/machineTicks.js. Placeholder models: tools/port/assets/make_machine_placeholder.py.
const $AutoTapperRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $AutoTapperRL = Java.loadClass("net.minecraft.resources.ResourceLocation");
const $AutoTapperFluidStack = Java.loadClass("net.neoforged.neoforge.fluids.FluidStack");
const $AutoTapperFluidAction = Java.loadClass("net.neoforged.neoforge.fluids.capability.IFluidHandler$FluidAction");
const autoTapperSides = ["down", "up", "north", "south", "west", "east"];

global.machineFluidTank = (block) => {
  const entity = block.getEntity();
  return entity && entity.attachments ? entity.attachments.get("tank") : null;
};

/** Fills amount mB of fluid into the tank; returns the amount filled. Unknown fluids fill nothing. */
global.fillMachineTank = (block, fluid, amount) => {
  const tank = global.machineFluidTank(block);
  const id = $AutoTapperRL.parse(fluid);
  if (!tank || !$AutoTapperRegistries.FLUID.containsKey(id)) return 0;
  return tank.fill(new $AutoTapperFluidStack($AutoTapperRegistries.FLUID.get(id), amount), $AutoTapperFluidAction.EXECUTE);
};

/** Every 10 seconds: the tapped log's fluid, 10 mB divided by the tapper recipe's time in days. */
global.runAutoTapper = (entity) => {
  const { block, level } = entity;
  const fluidData = global.handleTapperRandomTick({ block: block, level: level, server: level.server }, true);
  if (!fluidData || global.isBlockPropertyTrue(level.getBlock(block.getPos()), "error")) return;
  global.fillMachineTank(block, fluidData.fluid, Math.max(1, Math.round(10 / fluidData.time)));
};

StartupEvents.registry("block", (event) => {
  event
    .create("society:auto_tapper", "cardinal")
    .displayName("Auto-Tapper")
    .property(errorProperty)
    .defaultState((state) => state.set(errorProperty, false))
    .placementState((state) => state.set(errorProperty, false))
    .soundType("copper")
    .tagBlock("minecraft:mineable/pickaxe")
    .tagBlock("minecraft:needs_stone_tool")
    .box(0, 0, 0, 16, 16, 16)
    .defaultCutout()
    .parentModel("society:block/kubejs/auto_tapper/auto_tapper")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.auto_tapper.description").gray());
      item.parentModel("society:block/kubejs/auto_tapper/auto_tapper");
    })
    .blockEntity((blockInfo) => {
      blockInfo.fluidTank("tank", autoTapperSides, 10000);
      blockInfo.serverTicking();
      blockInfo.tickFrequency(200);
    });

  event
    .create("society:juice_inserter", "cardinal")
    .displayName("Juice Inserter")
    .soundType("wood")
    .tagBlock("minecraft:mineable/axe")
    .box(1, 0, 1, 15, 16, 15)
    .defaultCutout()
    .parentModel("society:block/kubejs/juice_inserter/juice_inserter")
    .item((item) => {
      item.tooltip(Text.translatable("block.society.juice_inserter.description").gray());
      item.parentModel("society:block/kubejs/juice_inserter/juice_inserter");
    })
    .blockEntity((blockInfo) => {
      blockInfo.fluidTank("tank", autoTapperSides, 10000);
      blockInfo.rightClickFillsTank("tank");
      blockInfo.serverTicking();
      blockInfo.tickFrequency(10);
    });
});

// Juice fluids and the fermentation barrel's juice types. The Nether Vinery juices are gone on 1.21.1; the savanna,
// taiga and jungle juices have no fluid in the pack (their grapes go into the barrel by hand).
const juiceInserterJuices = {
  "vinery:white_grape_juice": "white_general",
  "vinery:red_grape_juice": "red_general",
  "vinery:apple_juice": "apple",
};

/**
 * Moves 250 mB of juice from the tank into the Vinery fermentation barrel it faces, which takes 25 juice levels per
 * fill up to 100 and only one juice type at a time.
 */
global.runJuiceInserter = (entity) => {
  const { block, level } = entity;
  const tank = global.machineFluidTank(block);
  if (!tank) return;
  const stack = tank.getFluid();
  if (stack.isEmpty() || stack.getAmount() < 250) return;
  const juiceType = juiceInserterJuices[String(stack.getFluid().builtInRegistryHolder().key().location())];
  if (!juiceType) return;
  const barrelBlock = level.getBlock(global.getFacing(global.getBlockProperty(block, "facing"), block.getPos()));
  if (String(barrelBlock.id) !== "vinery:fermentation_barrel") return;
  const barrel = barrelBlock.getEntity();
  if (!barrel || Number(barrel.getFluidLevel()) + 25 > 100) return;
  if (Number(barrel.getFluidLevel()) === 0) barrel.setJuiceType(juiceType);
  else if (String(barrel.getJuiceType()) !== juiceType) return;
  tank.drain(250, $AutoTapperFluidAction.EXECUTE);
  barrel.setFluidLevel(Number(barrel.getFluidLevel()) + 25);
  barrel.setChanged();
  level.sendBlockUpdated(barrelBlock.getPos(), barrelBlock.blockState, barrelBlock.blockState, 3);
  level.server.runCommandSilent(`playsound create:spout block @a ${block.x} ${block.y} ${block.z}`);
};
