// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Checks the items ported in #18 B: every drink is food whose effects exist, the Prismatic weapons have the
// prismatic tier, and the Snow Melter melts ice and snow around it (boot 1) unless powered. Prints
// "[PORT-TEST] PHASE1 societyitems", "[PORT-TEST] PASS societyitems" or "[PORT-TEST] FAIL societyitems: ...".
const $SocietyItemsComponents = Java.loadClass("net.minecraft.core.component.DataComponents");

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  try {
    global.packDrinks.forEach((id) => {
      check(Item.exists(id), `${id} is not registered`);
      let food = Item.of(id).get($SocietyItemsComponents.FOOD);
      check(food, `${id} is not food`);
      check(food.effects().size() > 0, `${id} has no effect`);
      food.effects().forEach((possible) => {
        let holder = possible.effect().getEffect();
        check(holder.isBound(), `${id} has an unknown effect ${holder}`);
      });
    });
    ["society:galaxy_sword", "society:dragontooth_axe", "society:princess_hairbrush", "society:meowmageddon"].forEach((id) => {
      check(Item.exists(id), `${id} is not registered`);
      let stack = Item.of(id);
      // The prismatic tier has 1000 uses; registration/modifyItems.js triples the durability of every item.
      check(Number(stack.getMaxDamage()) === 3000, `${id} has ${stack.getMaxDamage()} uses`);
      check(stack.getItem().isValidRepairItem(stack, Item.of("society:prismatic_shard")), `${id} is not repaired with a prismatic shard`);
    });

    if (!server.persistentData.contains("societyItemsTest")) {
      let spawn = level.getSharedSpawnPos();
      let x = spawn.x + 40;
      let z = spawn.z - 40;
      let y = 300;
      level.getBlock(x, y, z).set("society:snow_melter", { facing: "north" });
      level.getBlock(x + 3, y, z).set("minecraft:ice");
      level.getBlock(x - 2, y + 1, z + 4).set("minecraft:snow");
      global.runSnowMelter({ block: level.getBlock(x, y, z), level: level });
      check(level.getBlock(x + 3, y, z).id === "minecraft:water", `ice next to the melter is ${level.getBlock(x + 3, y, z).id}`);
      check(level.getBlock(x - 2, y + 1, z + 4).id === "minecraft:air", `snow next to the melter is ${level.getBlock(x - 2, y + 1, z + 4).id}`);
      // powered by redstone it does nothing
      level.getBlock(x + 3, y, z).set("minecraft:ice");
      level.getBlock(x, y + 1, z).set("minecraft:redstone_block");
      global.runSnowMelter({ block: level.getBlock(x, y, z), level: level });
      check(level.getBlock(x + 3, y, z).id === "minecraft:ice", "a powered snow melter melted ice");
      server.persistentData.putBoolean("societyItemsTest", true);
      console.info("[PORT-TEST] PHASE1 societyitems");
      return;
    }
    console.info("[PORT-TEST] PASS societyitems");
  } catch (e) {
    console.error(`[PORT-TEST] FAIL societyitems: ${e}`);
  }
});
