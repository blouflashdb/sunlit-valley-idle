// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// The static item tooltips are server scripts (kubejs/server_scripts/tooltips) that KubeJS sends to the clients.
// This collects them like a joining client gets them and checks a plain one, a shift-only one and a season one.
// Items the tooltips name that are not registered are skipped (global.tooltipSkippedIds); a skipped id whose mod is
// in the pack is likely renamed and fails the test. Prints "[PORT-TEST] PHASE1 tooltips", "[PORT-TEST] PASS
// tooltips" or "[PORT-TEST] FAIL tooltips: ...".
const $TooltipsTestServerData = Java.loadClass("dev.latvian.mods.kubejs.net.KubeServerData");
const $TooltipsTestRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");

ServerEvents.loaded((event) => {
  let server = event.server;
  try {
    let problems = [];
    global.tooltipSkippedIds.length = 0;
    let data = $TooltipsTestServerData.collect().itemTooltipData();
    let matching = (id, shift) => {
      let stack = Item.of(id);
      let found = 0;
      data.forEach((entry) => {
        if (!entry.filter().isPresent() || !entry.filter().get().test(stack)) return;
        let requirements = entry.requirements();
        let entryShift = requirements.isPresent() ? String(requirements.get().shift()) : "DEFAULT";
        if (shift === undefined || entryShift === shift) found++;
      });
      return found;
    };
    if (data.size() < 100) problems.push(`only ${data.size()} tooltip entries`);
    if (matching("society:froggy_helm") < 2) problems.push("society:froggy_helm has no artifact tooltip");
    if (matching("society:kinetic_blueprint", "TRUE") < 1) problems.push("society:kinetic_blueprint has no shift tooltip");
    if (matching("society:kinetic_blueprint", "FALSE") < 1) problems.push("society:kinetic_blueprint has no tooltip without shift");
    if (matching("aquaculture:minnow") < 1) problems.push("aquaculture:minnow has no season tooltip");

    let namespaces = new Set();
    $TooltipsTestRegistries.ITEM.keySet().forEach((key) => namespaces.add(String(key.getNamespace())));
    let skipped = Array.from(new Set(global.tooltipSkippedIds)).sort();
    skipped.forEach((id) => {
      if (namespaces.has(id.split(":")[0]) && !global.removedItems.includes(id)) problems.push(`unknown item ${id}`);
      else console.info(`[PORT-TEST] INFO tooltips skipped ${id}`);
    });

    if (problems.length > 0) {
      problems.forEach((p) => console.info(`[PORT-TEST] INFO tooltips problem ${p}`));
      throw new Error(`${problems.length} problems: ${problems.join(", ")}`);
    }
    if (!server.persistentData.contains("tooltipsTest")) {
      server.persistentData.putBoolean("tooltipsTest", true);
      console.info(`[PORT-TEST] PHASE1 tooltips (${data.size()} entries, ${skipped.length} skipped ids)`);
    } else {
      console.info("[PORT-TEST] PASS tooltips");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL tooltips: ${e}`);
  }
});
