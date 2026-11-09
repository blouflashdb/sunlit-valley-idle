// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 checks the overworld structures (registries, templates, the stables loot table), checks that the template
// blocks are all registered and checks the chest loot. Boot 2 checks the chest loot again.
// Prints "[PORT-TEST] PHASE1 structures", "[PORT-TEST] PASS structures" or "[PORT-TEST] FAIL structures: ...".
const $StructTestKeys = Java.loadClass("net.minecraft.core.registries.Registries");
const $StructTestRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $StructTestRL = Java.loadClass("net.minecraft.resources.ResourceLocation");
const $StructTestResourceKey = Java.loadClass("net.minecraft.resources.ResourceKey");
const $StructTestNbtIo = Java.loadClass("net.minecraft.nbt.NbtIo");
const $StructTestNbtAccounter = Java.loadClass("net.minecraft.nbt.NbtAccounter");
const $StructTestLootParams = Java.loadClass("net.minecraft.world.level.storage.loot.LootParams$Builder");
const $StructTestParams = Java.loadClass("net.minecraft.world.level.storage.loot.parameters.LootContextParams");
const $StructTestParamSets = Java.loadClass("net.minecraft.world.level.storage.loot.parameters.LootContextParamSets");
const $StructTestLootTable = Java.loadClass("net.minecraft.world.level.storage.loot.LootTable");
const $StructTestVec3 = Java.loadClass("net.minecraft.world.phys.Vec3");

const testStructures = [
  "bench_stop",
  "blacksmith",
  "mini_quarry",
  "rotten_coop",
  "rotten_farmhouse",
  "rotten_garden",
  "rotten_shed",
  "stables",
  "woodcutter",
];

ServerEvents.loaded((event) => {
  let server = event.server;
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  try {
    let level = server.overworld();
    let lootTable = (id) =>
      server.reloadableRegistries().getLootTable($StructTestResourceKey.create($StructTestKeys.LOOT_TABLE, $StructTestRL.parse(id)));
    let rollChest = (id) => {
      let params = new $StructTestLootParams(level)
        .withParameter($StructTestParams.ORIGIN, new $StructTestVec3(0, 64, 0))
        .create($StructTestParamSets.CHEST);
      let ids = [];
      lootTable(id)
        .getRandomItems(params)
        .forEach((stack) => ids.push(String(stack.getItem().builtInRegistryHolder().key().location())));
      return ids;
    };
    // Buried treasure always gets one or two crowns.
    let treasure = rollChest("minecraft:chests/buried_treasure");
    check(treasure.indexOf("numismatics:crown") !== -1, `buried treasure without a crown: ${treasure}`);

    if (!server.persistentData.contains("structuresTest")) {
      let access = level.registryAccess();
      let structures = access.registryOrThrow($StructTestKeys.STRUCTURE);
      let sets = access.registryOrThrow($StructTestKeys.STRUCTURE_SET);
      let missing = [];
      testStructures.forEach((name) => {
        let id = $StructTestRL.parse(`society:${name}`);
        check(structures.containsKey(id), `no structure ${id}`);
        check(sets.containsKey(id), `no structure set ${id}`);
        let template = server.getStructureManager().get(id);
        check(template.isPresent() && template.get().getSize().getX() > 0, `no template ${id}`);
        let resource = server.getResourceManager().getResource($StructTestRL.parse(`society:structure/${name}.nbt`));
        let stream = resource.get().open();
        let nbt = $StructTestNbtIo["readCompressed(java.io.InputStream,net.minecraft.nbt.NbtAccounter)"](stream, $StructTestNbtAccounter.unlimitedHeap());
        stream.close();
        let palette = nbt.getList("palette", 10);
        for (let i = 0; i < palette.size(); i++) {
          let block = palette.getCompound(i).getString("Name");
          if (!$StructTestRegistries.BLOCK.containsKey($StructTestRL.parse(block)) && missing.indexOf(String(block)) === -1)
            missing.push(String(block));
        }
      });
      check(missing.length === 0, `template blocks are not registered: ${missing.sort().join(" ")}`);
      check(lootTable("society:chests/stables") !== $StructTestLootTable.EMPTY, "the stables loot table did not load");
      check(rollChest("society:chests/stables").length > 0, "the stables chest is empty");

      server.persistentData.putBoolean("structuresTest", true);
      console.info("[PORT-TEST] PHASE1 structures");
    } else {
      console.info("[PORT-TEST] PASS structures");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL structures: ${e}`);
  }
});
