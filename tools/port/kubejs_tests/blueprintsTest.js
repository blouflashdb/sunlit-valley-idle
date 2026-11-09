// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Checks that every block of the worn blueprints (blueprintBlocksData.js) is registered, so a blueprint places
// its building without holes. Prints "[PORT-TEST] PHASE1 blueprints", "[PORT-TEST] PASS blueprints" or
// "[PORT-TEST] FAIL blueprints: ...".
const $BlueprintTestRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $BlueprintTestRL = Java.loadClass("net.minecraft.resources.ResourceLocation");

ServerEvents.loaded((event) => {
  let server = event.server;
  try {
    let missing = blueprintBlockIds.filter((id) => !$BlueprintTestRegistries.BLOCK.containsKey($BlueprintTestRL.parse(id)));
    if (missing.length > 0) throw new Error(`${missing.length} blueprint blocks are not registered: ${missing.join(" ")}`);
    if (!server.persistentData.contains("blueprintsTest")) {
      server.persistentData.putBoolean("blueprintsTest", true);
      console.info("[PORT-TEST] PHASE1 blueprints");
    } else {
      console.info("[PORT-TEST] PASS blueprints");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL blueprints: ${e}`);
  }
});
