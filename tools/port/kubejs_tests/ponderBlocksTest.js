// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// The Ponder scenes (kubejs/client_scripts/ponders) run on the client only; this checks that every block, block state
// value and item they use exists on 1.21.1 (ponderBlocksData.js, written by tools/port/port_ponders.py).
// Prints "[PORT-TEST] PHASE1 ponderblocks", "[PORT-TEST] PASS ponderblocks" or "[PORT-TEST] FAIL ponderblocks: ...".
const $PonderTestRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $PonderTestRL = Java.loadClass("net.minecraft.resources.ResourceLocation");

ServerEvents.loaded((event) => {
  let server = event.server;
  try {
    let problems = [];
    ponderBlocks.forEach((id) => {
      if (!$PonderTestRegistries.BLOCK.containsKey($PonderTestRL.parse(id))) problems.push(`block ${id}`);
    });
    ponderItems.forEach((id) => {
      if (!$PonderTestRegistries.ITEM.containsKey($PonderTestRL.parse(id))) problems.push(`item ${id}`);
    });
    ponderStates.forEach((s) => {
      let rl = $PonderTestRL.parse(s[0]);
      if (!$PonderTestRegistries.BLOCK.containsKey(rl)) return;
      let property = $PonderTestRegistries.BLOCK.get(rl).getStateDefinition().getProperty(s[1]);
      if (property === null || property === undefined) problems.push(`${s[0]} has no ${s[1]}`);
      else if (!property.getValue(s[2]).isPresent()) problems.push(`${s[0]} ${s[1]} has no value ${s[2]} (${property.getPossibleValues()})`);
    });
    if (problems.length > 0) throw new Error(problems.join(", "));
    if (!server.persistentData.contains("ponderBlocksTest")) {
      server.persistentData.putBoolean("ponderBlocksTest", true);
      console.info("[PORT-TEST] PHASE1 ponderblocks");
    } else {
      console.info("[PORT-TEST] PASS ponderblocks");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL ponderblocks: ${e}`);
  }
});
