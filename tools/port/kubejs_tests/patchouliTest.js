// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// The Patchouli books (patchouli_books/) render on the client only; this checks that every item, entity, block,
// block state value and block tag they use exists on 1.21.1 (patchouliData.js, written by
// tools/port/port_patchouli.py). Prints "[PORT-TEST] PHASE1 patchouli", "[PORT-TEST] PASS patchouli" or
// "[PORT-TEST] FAIL patchouli: ...".
const $PatchouliTestRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $PatchouliTestRL = Java.loadClass("net.minecraft.resources.ResourceLocation");
const $PatchouliTestTagKey = Java.loadClass("net.minecraft.tags.TagKey");
const $PatchouliTestRegistryKeys = Java.loadClass("net.minecraft.core.registries.Registries");

ServerEvents.loaded((event) => {
  let server = event.server;
  try {
    let problems = [];
    let has = (registry, id) => registry.containsKey($PatchouliTestRL.parse(id));
    patchouliItems.forEach((id) => has($PatchouliTestRegistries.ITEM, id) || problems.push(`item ${id}`));
    patchouliEntities.forEach((id) => has($PatchouliTestRegistries.ENTITY_TYPE, id) || problems.push(`entity ${id}`));
    patchouliBlocks.forEach((id) => has($PatchouliTestRegistries.BLOCK, id) || problems.push(`block ${id}`));
    patchouliBlockTags.forEach((id) => {
      let key = $PatchouliTestTagKey.create($PatchouliTestRegistryKeys.BLOCK, $PatchouliTestRL.parse(id));
      if ($PatchouliTestRegistries.BLOCK.getTag(key).isEmpty()) problems.push(`block tag #${id}`);
    });
    patchouliStates.forEach((s) => {
      let rl = $PatchouliTestRL.parse(s[0]);
      if (!$PatchouliTestRegistries.BLOCK.containsKey(rl)) return;
      let definition = $PatchouliTestRegistries.BLOCK.get(rl).getStateDefinition();
      let property = definition.getProperty(s[1]);
      if (property === null || property === undefined) problems.push(`${s[0]} has no ${s[1]}`);
      else if (!property.getValue(s[2]).isPresent()) problems.push(`${s[0]} ${s[1]} has no value ${s[2]} (${property.getPossibleValues()})`);
    });
    if (problems.length > 0) {
      problems.forEach((p) => console.info(`[PORT-TEST] INFO patchouli missing ${p}`));
      throw new Error(`${problems.length} missing: ${problems.join(", ")}`);
    }
    if (!server.persistentData.contains("patchouliTest")) {
      server.persistentData.putBoolean("patchouliTest", true);
      console.info("[PORT-TEST] PHASE1 patchouli");
    } else {
      console.info("[PORT-TEST] PASS patchouli");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL patchouli: ${e}`);
  }
});
