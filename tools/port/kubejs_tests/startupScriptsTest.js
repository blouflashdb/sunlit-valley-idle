// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Checks the startup scripts ported last (#19): the item balance of registration/modifyItems.js, the blocks of
// registration/*.js and global.hasBobber. Prints "[PORT-TEST] PHASE1 startupscripts", "[PORT-TEST] PASS
// startupscripts" or "[PORT-TEST] FAIL startupscripts: ...".
const $StartupTestAttributes = Java.loadClass("net.minecraft.world.entity.ai.attributes.Attributes");

ServerEvents.loaded((event) => {
  let server = event.server;
  try {
    let problems = [];
    let expect = (ok, message) => {
      if (!ok) problems.push(message);
    };
    let modifierSum = (id, attribute) => {
      let sum = 0;
      Item.of(id)
        .getAttributeModifiers()
        .modifiers()
        .forEach((entry) => {
          if (entry.attribute().equals(attribute)) sum += Number(entry.modifier().amount());
        });
      return sum;
    };

    let hoe = Number(Item.of("minecraft:golden_hoe").getMaxDamage());
    expect(hoe === 32 * 3 * 16, `golden hoe durability ${hoe}`);
    let pickaxe = Number(Item.of("minecraft:iron_pickaxe").getMaxDamage());
    expect(pickaxe === 250 * 3, `iron pickaxe durability ${pickaxe}`);
    expect(Number(Item.of("minecraft:stick").getMaxDamage()) === 0, "a stick got durability");
    expect(Number(Item.of("minecraft:stick").getMaxStackSize()) === 64, "a stick does not stack");
    let helmet = modifierSum("minecraft:golden_helmet", $StartupTestAttributes.ARMOR);
    expect(helmet === 2.5, `golden helmet armor ${helmet}`);
    let sword = modifierSum("minecraft:netherite_sword", $StartupTestAttributes.ATTACK_DAMAGE);
    expect(sword === 10, `netherite sword attack damage ${sword}`);
    expect(String(Item.of("society:jade").getRarity()) === "EPIC", "society:jade is not epic");

    [
      "society:gnome",
      "society:lantern_gnome",
      "society:animal_feed_sack",
      "society:blueberry_crate",
      "society:sturdy_bamboo_block",
      "herbalbrews:coffee_beans_sack",
      "society:hive_wallpaper",
      "society:hive_baseboard",
      "whimsy_deco:statue_endless_fortune",
    ].forEach((id) => expect(Item.exists(id), `${id} is not registered`));

    expect(!global.hasBobber(Item.of("minecraft:fishing_rod"), "society:net_bobber"), "a plain rod has a bobber");
    let bundle = Item.of('minecraft:bundle[bundle_contents=[{id:"society:net_bobber",count:1}]]');
    expect(global.hasBobber(bundle, "society:net_bobber"), `no bobber found in ${bundle.componentString}`);

    if (problems.length > 0) throw new Error(problems.join(", "));
    if (!server.persistentData.contains("startupScriptsTest")) {
      server.persistentData.putBoolean("startupScriptsTest", true);
      console.info("[PORT-TEST] PHASE1 startupscripts");
    } else {
      console.info("[PORT-TEST] PASS startupscripts");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL startupscripts: ${e}`);
  }
});
