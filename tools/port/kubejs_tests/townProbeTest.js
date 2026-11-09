// TEMPORARY CI probe for #15 part B: SVDialog and Easy NPC command syntax, loaded dialogs, the selector fix.
ServerEvents.loaded((event) => {
  let server = event.server;
  try {
    let dispatcher = server.getCommands().getDispatcher();
    let source = server.createCommandSourceStack();
    ["dialog", "easy_npc"].forEach((name) => {
      let node = dispatcher.getRoot().getChild(name);
      if (!node) {
        console.info(`[PROBE] no command ${name}`);
        return;
      }
      dispatcher.getAllUsage(node, source, false).forEach((usage) => console.info(`[PROBE] usage ${name} ${usage}`));
    });
    let $ProbeHashMap = Java.loadClass("java.util.HashMap");
    let found = new $ProbeHashMap(server.getResourceManager().listResources("dialogs", (p) => String(p).endsWith(".json")));
    console.info(`[PROBE] dialogs on disk: ${found.size()}`);
    let shopData = Java.loadClass("io.github.chakyl.societytrading.util.ShopData");
    console.info(`[PROBE] building_shop selector shops: ${shopData.getCustomSelectorShops("building_shop").size()}`);
  } catch (e) {
    console.info(`[PROBE] error ${e}`);
  }
  if (server.persistentData.contains("townProbeB")) console.info("[PORT-TEST] PASS townprobe");
  else {
    server.persistentData.putBoolean("townProbeB", true);
    console.info("[PORT-TEST] PHASE1 townprobe");
  }
});
