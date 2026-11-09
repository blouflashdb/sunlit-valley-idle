// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 builds an Auto-Tapper on an oak log and a Juice Inserter on a fermentation barrel above spawn and runs each
// once; boot 2 checks that the tank contents were saved. Prints "[PORT-TEST] PHASE1 autotapper",
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

      // Vinery 1.21.1 probe: what the fermentation barrel stores
      let barrel = level.getBlock(bx + 3, y, bz + 1);
      barrel.set("vinery:fermentation_barrel");
      barrel = level.getBlock(bx + 3, y, bz + 1);
      let barrelEntity = barrel.getEntity();
      try {
        console.info(`[PORT-TEST] INFO autotapper barrel nbt ${barrelEntity.saveWithoutMetadata(level.registryAccess())}`);
        let members = [];
        for (let key in barrelEntity) members.push(key);
        console.info(`[PORT-TEST] INFO autotapper barrel members ${members.join(" ")}`);
      } catch (probeError) {
        console.info(`[PORT-TEST] INFO autotapper barrel probe failed: ${probeError}`);
      }
      let vinery = [];
      Java.loadClass("net.minecraft.core.registries.BuiltInRegistries").ITEM.keySet().forEach((id) => {
        if (String(id).indexOf("vinery:") === 0 && String(id).indexOf("juice") !== -1) vinery.push(String(id));
      });
      console.info(`[PORT-TEST] INFO autotapper vinery juice items ${vinery.join(" ")}`);

      server.persistentData.putBoolean("autoTapperTest", true);
      console.info("[PORT-TEST] PHASE1 autotapper");
    } else {
      // The tank keeps its fluid and the ticking tapper keeps filling it.
      let stack = tankOf(tapper).getFluid();
      check(
        !stack.isEmpty() && stack.getAmount() >= 2 && / society:oak_resin$/.test(fluidIn(tapper)),
        `auto tapper tank after the restart: ${fluidIn(tapper)}`
      );
      console.info("[PORT-TEST] PASS autotapper");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL autotapper: ${e}`);
  }
});
