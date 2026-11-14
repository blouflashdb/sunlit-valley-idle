// Temporary: rolls chest loot without catching, so the stack trace of a failure is logged.
const $DbgKeys = Java.loadClass("net.minecraft.core.registries.Registries");
const $DbgRL = Java.loadClass("net.minecraft.resources.ResourceLocation");
const $DbgKey = Java.loadClass("net.minecraft.resources.ResourceKey");
const $DbgParams = Java.loadClass("net.minecraft.world.level.storage.loot.LootParams$Builder");
const $DbgLCP = Java.loadClass("net.minecraft.world.level.storage.loot.parameters.LootContextParams");
const $DbgSets = Java.loadClass("net.minecraft.world.level.storage.loot.parameters.LootContextParamSets");
const $DbgVec3 = Java.loadClass("net.minecraft.world.phys.Vec3");
ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  ["minecraft:chests/buried_treasure", "minecraft:chests/simple_dungeon", "society:chests/stables"].forEach((id) => {
    try {
      let params = new $DbgParams(level).withParameter($DbgLCP.ORIGIN, new $DbgVec3(0, 64, 0)).create($DbgSets.CHEST);
      server.reloadableRegistries().getLootTable($DbgKey.create($DbgKeys.LOOT_TABLE, $DbgRL.parse(id))).getRandomItems(params);
      console.info(`[DBG] ok ${id}`);
    } catch (e) {
      console.info(`[DBG] fail ${id}: ${e}`);
      let t = e.javaException || (e.rhinoException && e.rhinoException.getCause && e.rhinoException.getCause());
      if (t) t.getStackTrace().forEach((f) => console.info(`[DBG]   at ${f}`));
      else console.info(`[DBG] no java exception: ${Object.keys(e)}`);
    }
  });
});
