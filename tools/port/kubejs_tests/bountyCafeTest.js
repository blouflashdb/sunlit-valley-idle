// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 checks the Bountiful pools and decrees, the Cozy Cafe menus, the society:raw_logs tag and the bounty board
// recipe, then places a bounty board with an out-of-season decree and moves it to the current season.
// Boot 2 checks the board kept the seasonal decree and removes it.
// Prints "[PORT-TEST] PHASE1 bountycafe", "[PORT-TEST] PASS bountycafe" or "[PORT-TEST] FAIL bountycafe: ...".
const $TestBountifulContent = Java.loadClass("io.ejekta.bountiful.content.BountifulContent");
const $TestCafeMenu = Java.loadClass("io.github.chakyl.cozycafe.data.CafeMenuItemRegistry");
const $TestTagParser = Java.loadClass("net.minecraft.nbt.TagParser");
const $TestCafeRL = Java.loadClass("net.minecraft.resources.ResourceLocation");

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let board = () => level.getBlock(spawn.x + 16, 300, spawn.z - 16);
  let decreeIds = () => {
    let items = board().getEntityData().getCompound("decree_inv").getList("Items", 10);
    let ids = [];
    for (let i = 0; i < items.size(); i++) {
      let list = items.getCompound(i).getCompound("components").getCompound("bountiful:decree_data").getList("ids", 8);
      for (let j = 0; j < list.size(); j++) ids.push(String(list.getString(j)));
    }
    return ids;
  };

  try {
    if (String(board().id) !== "bountiful:bountyboard") {
      let decrees = [];
      $TestBountifulContent.INSTANCE.getDecrees().forEach((decree) => decrees.push(String(decree.getId())));
      ["spring", "summer", "autumn", "winter", "fishing", "cooking", "farming", "artisan", "geologist"].forEach((id) =>
        check(decrees.some((d) => d === id || d.endsWith(`/${id}`) || d.endsWith(`:${id}`)), `no ${id} decree in ${decrees}`)
      );
      check(!decrees.some((d) => d.indexOf("bountiful") !== -1), `the mod's own decrees are not excluded: ${decrees}`);
      let entries = $TestBountifulContent.INSTANCE.getPoolEntryMap();
      check(entries.size() > 600, `only ${entries.size()} bounty pool entries`);

      let menu = $TestCafeMenu.INSTANCE.getValue($TestCafeRL.parse("cozycafe:farmersdelight/apple_cider"));
      check(menu != null, "no Cozy Cafe menu for the apple cider");
      check(menu.price() === 537, `apple cider price ${menu.price()}`);
      check(String(menu.multAttribute()) === "shippingbin:crop_sell_multiplier", `apple cider attribute ${menu.multAttribute()}`);
      let menus = $TestCafeMenu.INSTANCE.getKeys().size();
      check(menus > 540, `only ${menus} Cozy Cafe menus`);

      check(Item.of("minecraft:oak_log").hasTag("society:raw_logs"), "oak logs are not raw logs");
      let recipe = server.getRecipeManager().byKey($TestCafeRL.parse("bountiful:bountyboard"));
      check(recipe.isPresent() && String(recipe.get().value().getIngredients()).indexOf("numismatics:cog") !== -1,
        "the bounty board recipe does not take a cog");

      let season = global.getSeasonFromLevel(level);
      let other = global.seasonalDecrees.filter((s) => s !== season)[0];
      board().set("bountiful:bountyboard");
      let nbt = board().getEntityData();
      nbt.put("decree_inv", $TestTagParser.parseTag(
        `{Items:[{Slot:0b,id:"bountiful:decree",count:1,components:{"bountiful:decree_data":{ids:["${other}"],rank:1}}}]}`
      ));
      board().setEntityData(nbt);
      check(decreeIds().join() === other, `the board did not take the decree: ${decreeIds()}`);
      check(global.updateSeasonalDecrees(board(), level), "the seasonal decree did not change");
      check(decreeIds().join() === season, `the decree is ${decreeIds()} instead of ${season}`);
      check(!global.updateSeasonalDecrees(board(), level), "an up-to-date decree changed");
      console.info("[PORT-TEST] PHASE1 bountycafe");
    } else {
      check(decreeIds().join() === global.getSeasonFromLevel(level), `the decree is ${decreeIds()} after the restart`);
      board().set("minecraft:air");
      console.info("[PORT-TEST] PASS bountycafe");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL bountycafe: ${e}`);
  }
});
