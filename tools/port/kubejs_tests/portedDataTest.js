// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Checks the data that the Slice 14 port scripts (tools/port/port_<scope>_data.py) wrote: every listed recipe,
// loot table and advancement loaded, every listed item tag has entries and every listed item is registered. A file
// that fails to load (for example because of a missing item) is only logged by Minecraft, so this test catches it.
// Each scope writes tools/port/kubejs_tests/<scope>PortData.js with
// const <scope>PortData = {recipes, lootTables, advancements, itemTags, items, worldgen} (all lists optional);
// worldgen entries are "<registry>|<id>" with registry one of biome, configured_feature, placed_feature,
// structure, structure_set, template_pool, processor_list, biome_modifier.
// Prints "[PORT-TEST] PHASE1 porteddata", "[PORT-TEST] PASS porteddata" or "[PORT-TEST] FAIL porteddata: ...".
const $PortedDataRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $PortedDataKeys = Java.loadClass("net.minecraft.core.registries.Registries");
const $PortedDataNeoKeys = Java.loadClass("net.neoforged.neoforge.registries.NeoForgeRegistries$Keys");
const $PortedDataRL = Java.loadClass("net.minecraft.resources.ResourceLocation");
const $PortedDataTagKey = Java.loadClass("net.minecraft.tags.TagKey");

// Read when the server has loaded, after every script defined its const.
const portedDataByScope = () => ({
  food: typeof foodPortData === "undefined" ? {} : foodPortData,
  mods: typeof modsPortData === "undefined" ? {} : modsPortData,
  worldgen: typeof worldgenPortData === "undefined" ? {} : worldgenPortData,
  society: typeof societyPortData === "undefined" ? {} : societyPortData,
});

ServerEvents.loaded((event) => {
  let server = event.server;
  try {
    let problems = [];
    let byScope = portedDataByScope();
    let list = (scope, kind) => byScope[scope][kind] || [];
    let report = (scope, what, missing) => {
      if (missing.length > 0) problems.push(`${scope}: ${missing.length} ${what}: ${missing.slice(0, 40).join(" ")}`);
    };
    let recipes = server.getRecipeManager();
    let lootKeys = {};
    server.reloadableRegistries().getKeys($PortedDataKeys.LOOT_TABLE).forEach((id) => (lootKeys[String(id)] = true));
    let advancements = server.getAdvancements();
    let worldgenKeys = {
      biome: $PortedDataKeys.BIOME,
      configured_feature: $PortedDataKeys.CONFIGURED_FEATURE,
      placed_feature: $PortedDataKeys.PLACED_FEATURE,
      structure: $PortedDataKeys.STRUCTURE,
      structure_set: $PortedDataKeys.STRUCTURE_SET,
      template_pool: $PortedDataKeys.TEMPLATE_POOL,
      processor_list: $PortedDataKeys.PROCESSOR_LIST,
      biome_modifier: $PortedDataNeoKeys.BIOME_MODIFIERS,
    };
    Object.keys(byScope).forEach((scope) => {
      report(scope, "items are not registered", list(scope, "items").filter((id) => !$PortedDataRegistries.ITEM.containsKey($PortedDataRL.parse(id))));
      report(scope, "recipes did not load", list(scope, "recipes").filter((id) => !recipes.byKey($PortedDataRL.parse(id)).isPresent()));
      report(scope, "loot tables did not load", list(scope, "lootTables").filter((id) => !lootKeys[id]));
      report(scope, "advancements did not load", list(scope, "advancements").filter((id) => advancements.get($PortedDataRL.parse(id)) == null));
      report(
        scope,
        "item tags are empty",
        list(scope, "itemTags").filter((id) => {
          let tag = $PortedDataRegistries.ITEM.getTag($PortedDataTagKey.create($PortedDataKeys.ITEM, $PortedDataRL.parse(id)));
          return !tag.isPresent() || tag.get().size() == 0;
        })
      );
      report(
        scope,
        "worldgen entries did not load",
        list(scope, "worldgen").filter((entry) => {
          let parts = entry.split("|");
          let registry = server.registryAccess().registry(worldgenKeys[parts[0]]);
          return !registry.isPresent() || !registry.get().containsKey($PortedDataRL.parse(parts[1]));
        })
      );
    });
    if (problems.length > 0) throw new Error(problems.join("; "));
    if (!server.persistentData.contains("portedDataTest")) {
      server.persistentData.putBoolean("portedDataTest", true);
      console.info("[PORT-TEST] PHASE1 porteddata");
    } else {
      console.info("[PORT-TEST] PASS porteddata");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL porteddata: ${e}`);
  }
});
