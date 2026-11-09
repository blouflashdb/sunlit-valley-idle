// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 builds an Auto-Tapper on an oak log and a Juice Inserter on a Vinery fermentation barrel above spawn and
// runs them; boot 2 checks that the tank and the barrel kept their contents. Prints "[PORT-TEST] PHASE1 autotapper",
// "[PORT-TEST] PASS autotapper" or "[PORT-TEST] FAIL autotapper: ...".
ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let bx = spawn.x - 30;
  let bz = spawn.z - 30;
  let y = 300;
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let tapper = level.getBlock(bx, y, bz);
  let tankOf = (block) => global.machineFluidTank(level.getBlock(block.getPos()));
  let fluidIn = (block) => {
    let stack = tankOf(block).getFluid();
    return stack.isEmpty() ? "empty" : `${stack.getAmount()} ${stack.getFluid().builtInRegistryHolder().key().location()}`;
  };
  try {
    if (!server.persistentData.contains("autoTapperTest")) {
      level.getBlock(bx, y, bz + 1).set("minecraft:oak_log");
      tapper.set("society:auto_tapper", { facing: "north" });
      tapper = level.getBlock(bx, y, bz);
      check(tankOf(tapper) !== null, "the auto tapper has no tank");
      global.runAutoTapper({ block: tapper, level: level });
      check(fluidIn(tapper) === "2 society:oak_resin", `auto tapper tank after one run: ${fluidIn(tapper)}`);
      check(!global.isBlockPropertyTrue(level.getBlock(bx, y, bz), "error"), "the auto tapper shows an error on an oak log");

      // Juice Inserter facing north into a fermentation barrel
      let barrelPos = [bx + 3, y, bz - 1];
      level.getBlock(barrelPos[0], barrelPos[1], barrelPos[2]).set("vinery:fermentation_barrel");
      let inserter = level.getBlock(bx + 3, y, bz);
      inserter.set("society:juice_inserter", { facing: "north" });
      inserter = level.getBlock(bx + 3, y, bz);
      check(global.fillMachineTank(inserter, "vinery:red_grape_juice", 1000) === 1000, "the juice inserter took no juice");
      global.runJuiceInserter({ block: inserter, level: level });
      global.runJuiceInserter({ block: inserter, level: level });
      let barrel = level.getBlock(barrelPos[0], barrelPos[1], barrelPos[2]).getEntity();
      check(
        Number(barrel.getFluidLevel()) === 50 && String(barrel.getJuiceType()) === "red_general",
        `barrel after two inserts: ${barrel.saveWithoutMetadata(level.registryAccess())}`
      );
      check(fluidIn(inserter) === "500 vinery:red_grape_juice", `juice inserter tank after two inserts: ${fluidIn(inserter)}`);
      tankOf(inserter).drain(tankOf(inserter).getFluid().copy(), Java.loadClass("net.neoforged.neoforge.fluids.capability.IFluidHandler$FluidAction").EXECUTE);
      global.fillMachineTank(inserter, "vinery:apple_juice", 250);
      global.runJuiceInserter({ block: inserter, level: level });
      check(Number(barrel.getFluidLevel()) === 50, "the barrel took apple juice into red grape juice");

      server.persistentData.putBoolean("autoTapperTest", true);
      console.info("[PORT-TEST] PHASE1 autotapper");
    } else {
      // The tank keeps its fluid and the ticking tapper keeps filling it.
      let stack = tankOf(tapper).getFluid();
      check(
        !stack.isEmpty() && stack.getAmount() >= 2 && / society:oak_resin$/.test(fluidIn(tapper)),
        `auto tapper tank after the restart: ${fluidIn(tapper)}`
      );
      let savedBarrel = level.getBlock(bx + 3, y, bz - 1).getEntity();
      check(Number(savedBarrel.getFluidLevel()) === 50, `barrel after the restart: ${savedBarrel.getFluidLevel()}`);
      console.info("[PORT-TEST] PASS autotapper");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL autotapper: ${e}`);
  }
});
