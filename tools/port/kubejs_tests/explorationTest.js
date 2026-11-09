// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 checks that every Mining, Digging and Archaeology idle action is available and rolls loot, and checks the
// Better Archeology temple, the bomb recipe and the Lootr elytra chest. Boot 2 checks the idle actions again.
// Prints "[PORT-TEST] PHASE1 exploration", "[PORT-TEST] PASS exploration" or "[PORT-TEST] FAIL exploration: ...".
const $ExplorationCatalog = Java.loadClass("dev.sunlitidle.idle.IdleCatalog");
const $ExplorationDropKind = Java.loadClass("dev.sunlitidle.idle.IdleDrop$Kind");
const $ExplorationFakePlayers = Java.loadClass("net.neoforged.neoforge.common.util.FakePlayerFactory");
const $ExplorationRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $ExplorationKeys = Java.loadClass("net.minecraft.core.registries.Registries");
const $ExplorationRL = Java.loadClass("net.minecraft.resources.ResourceLocation");
const $ExplorationResourceKey = Java.loadClass("net.minecraft.resources.ResourceKey");
const $ExplorationBlock = Java.loadClass("net.minecraft.world.level.block.Block");
const $ExplorationBlockPos = Java.loadClass("net.minecraft.core.BlockPos");
const $ExplorationLootParams = Java.loadClass("net.minecraft.world.level.storage.loot.LootParams$Builder");
const $ExplorationParams = Java.loadClass("net.minecraft.world.level.storage.loot.parameters.LootContextParams");
const $ExplorationParamSets = Java.loadClass("net.minecraft.world.level.storage.loot.parameters.LootContextParamSets");
const $ExplorationLootTable = Java.loadClass("net.minecraft.world.level.storage.loot.LootTable");
const $ExplorationVec3 = Java.loadClass("net.minecraft.world.phys.Vec3");

ServerEvents.loaded((event) => {
  let server = event.server;
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  try {
    let level = server.overworld();
    let pos = new $ExplorationBlockPos(0, 64, 0);
    let miner = $ExplorationFakePlayers.getMinecraft(level);
    let lootTable = (id) =>
      server.reloadableRegistries().getLootTable($ExplorationResourceKey.create($ExplorationKeys.LOOT_TABLE, $ExplorationRL.parse(id)));
    let rollChest = (id) => {
      let params = new $ExplorationLootParams(level).withParameter($ExplorationParams.ORIGIN, new $ExplorationVec3(0, 64, 0)).create($ExplorationParamSets.CHEST);
      let ids = [];
      lootTable(id).getRandomItems(params).forEach((stack) => ids.push(String(stack.getItem().builtInRegistryHolder().key().location())));
      return ids;
    };
    let pickaxe = Item.of("minecraft:diamond_pickaxe");

    let problems = [];
    ["mining", "digging", "archaeology"].forEach((skillId) => {
      let skill = $ExplorationCatalog.skill(skillId);
      check(skill !== null, `no idle skill ${skillId}`);
      let available = $ExplorationCatalog.availableActions(skill).size();
      if (available !== skill.actions().size()) {
        skill.actions().forEach((action) => {
          if (!$ExplorationCatalog.isAvailable(action)) problems.push(`${action.key()} is not available`);
        });
      }
      skill.actions().forEach((action) => {
        let drop = action.drops().get(0);
        let id = String(drop.id());
        if (drop.kind() === $ExplorationDropKind.BLOCK) {
          let block = $ExplorationRegistries.BLOCK.get(drop.id());
          if ($ExplorationBlock.getDrops(block.defaultBlockState(), level, pos, null, miner, pickaxe).isEmpty())
            problems.push(`${action.key()}: ${id} drops nothing`);
        } else if (drop.kind() === $ExplorationDropKind.LOOT_TABLE) {
          if (lootTable(id) === $ExplorationLootTable.EMPTY) problems.push(`${action.key()}: no loot table ${id}`);
        }
      });
    });
    check(problems.length === 0, problems.join(", "));

    if (!server.persistentData.contains("explorationTest")) {
      let temple = server.getStructureManager().get($ExplorationRL.parse("betterarcheology:temple_jungle"));
      check(temple.isPresent() && temple.get().getSize().getX() > 0, "no Better Archeology jungle temple");
      check(server.getRecipeManager().byKey($ExplorationRL.parse("betterarcheology:bomb")).isPresent(), "no bomb recipe");
      let elytra = rollChest("lootr:chests/elytra");
      check(elytra.indexOf("minecraft:dragon_egg") !== -1, `the Lootr elytra chest gives ${elytra}`);

      server.persistentData.putBoolean("explorationTest", true);
      console.info("[PORT-TEST] PHASE1 exploration");
    } else {
      console.info("[PORT-TEST] PASS exploration");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL exploration: ${e}`);
  }
});
