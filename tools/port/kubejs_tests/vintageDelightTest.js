// CI only: checks the Vintage Delight content rebuilt in KubeJS (issue #10).
// Boot 1: the items exist, the dishes have recipes, a cucumber crop can be planted on farmland.
// Boot 2: the crop survived the restart.
// Prints "[PORT-TEST] PHASE1 vintagedelight", "[PORT-TEST] PASS vintagedelight" or "[PORT-TEST] FAIL vintagedelight: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let soil = level.getBlock(spawn.x + 4, 300, spawn.z);
  let crop = level.getBlock(spawn.x + 4, 301, spawn.z);
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };

  try {
    if (String(crop.id) !== "vintagedelight:cucumber") {
      [
        "vintagedelight:peanut",
        "vintagedelight:pickle",
        "vintagedelight:pad_thai",
        "vintagedelight:cucumber_seeds",
        "vintagedelight:ghost_pepper_seeds",
        "vintagedelight:gearo_berry",
        "vintagedelight:salt",
        "vintagedelight:salt_lamp_pink",
        "vintagedelight:magic_vine",
        "vintagedelight:nut_mash_mason_jar",
      ].forEach((id) => check(!Item.of(id).isEmpty(), `${id} is not registered`));

      let results = new Set();
      server.getRecipeManager().getRecipes().forEach((holder) => {
        results.add(String(holder.value().getResultItem(server.registryAccess()).id));
      });
      ["vintagedelight:pad_thai", "vintagedelight:roasted_peanut", "vintagedelight:salt_block", "vintagedelight:cucumber_noodles"].forEach(
        (id) => check(results.has(id), `no recipe makes ${id}`)
      );

      soil.set("minecraft:farmland");
      crop.set("vintagedelight:cucumber", { age: "2" });
      check(String(crop.id) === "vintagedelight:cucumber", `planting failed, found ${crop.id}`);
      console.info("[PORT-TEST] PHASE1 vintagedelight");
    } else {
      check(Number(crop.properties.get("age")) >= 2, `crop age went back to ${crop.properties.get("age")}`);
      crop.set("minecraft:air");
      soil.set("minecraft:air");
      console.info("[PORT-TEST] PASS vintagedelight");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL vintagedelight: ${e}`);
  }
});
