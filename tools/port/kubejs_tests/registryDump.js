// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/. Writes the ids of the item, block and
// entity registries, the item tags, the biomes, the dimensions, the loaded mod ids and the FTB Quests task and
// reward types to kubejs/registry_dump.json, which tools/port/check_quest_refs.py --registry reads to check the quest book against the real registries (#18)
// and tools/port/check_config_ids.py reads to check the mod configs.
const $RegistryDumpBuiltIn = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $RegistryDumpKeys = Java.loadClass("net.minecraft.core.registries.Registries");

ServerEvents.loaded((event) => {
  try {
    let ids = (keys) => {
      let out = [];
      keys.forEach((key) => out.push(String(key)));
      return out.sort();
    };
    let tags = (registry) => {
      let out = [];
      registry.getTagNames().forEach((tag) => out.push(String(tag.location())));
      return out.sort();
    };
    let biomes = event.server.registryAccess().registryOrThrow($RegistryDumpKeys.BIOME);
    let dimensions = [];
    event.server.levelKeys().forEach((key) => dimensions.push(String(key.location())));
    let mods = [];
    Platform.getMods().keySet().forEach((id) => mods.push(String(id)));
    // FTB Quests task and reward types; a quest task of a type no mod registers cannot load
    let questTypes = (className) => {
      let out = [];
      Java.loadClass(className).TYPES.keySet().forEach((id) => out.push(String(id)));
      return out.sort();
    };
    let structures = event.server.registryAccess().registryOrThrow($RegistryDumpKeys.STRUCTURE);
    JsonIO.write("kubejs/registry_dump.json", {
      items: ids($RegistryDumpBuiltIn.ITEM.keySet()),
      blocks: ids($RegistryDumpBuiltIn.BLOCK.keySet()),
      entities: ids($RegistryDumpBuiltIn.ENTITY_TYPE.keySet()),
      item_tags: tags($RegistryDumpBuiltIn.ITEM),
      biomes: ids(biomes.keySet()),
      biome_tags: tags(biomes),
      dimensions: dimensions.sort(),
      structures: ids(structures.keySet()),
      mods: mods.sort(),
      quest_task_types: questTypes("dev.ftb.mods.ftbquests.quest.task.TaskTypes"),
      quest_reward_types: questTypes("dev.ftb.mods.ftbquests.quest.reward.RewardTypes"),
    });
    console.info("registry dump written to kubejs/registry_dump.json");
  } catch (e) {
    console.error(`registry dump failed: ${e}`);
  }
});
