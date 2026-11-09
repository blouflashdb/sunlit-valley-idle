// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Checks every shop of kubejs/data/society_trading loaded (one bad item drops a whole shop) and that a building
// shop sells a worn blueprint that keeps its data. Both boots run the same checks.
// Prints "[PORT-TEST] PHASE1 townshops", "[PORT-TEST] PASS townshops" or "[PORT-TEST] FAIL townshops: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  // The shops the port writes (tools/port/port_trading_data.py).
  let expected = ["banker", "barkeeper", "blacksmith", "book_fair", "bs_banker", "bs_barn", "bs_blacksmith",
    "bs_carpenter", "bs_coop", "bs_deluxe_barn", "bs_fisher", "bs_greenhouse", "bs_home", "bs_large_shed",
    "bs_librarian", "bs_market", "bs_shed", "bs_shepherd", "bs_trader", "bs_witch", "carpenter", "fisher", "guild",
    "invitations", "librarian", "market", "modern_catalog", "ribbit_fisher", "ribbit_merchant", "shepherd",
    "tanuki_catalog", "trader", "wanderer", "wandering_winemaker", "wise_oak", "witch"];

  try {
    let registry = Java.loadClass("io.github.chakyl.societytrading.data.ShopRegistry").INSTANCE;
    let shops = {};
    let trades = 0;
    registry.getValues().forEach((shop) => {
      shops[String(shop.shopID())] = shop;
      trades += shop.trades().size();
    });
    let lost = expected.filter((id) => !shops[id]);
    check(lost.length === 0, `shops did not load: ${lost.join(", ")}`);
    console.info(`[PORT-TEST] townshops: ${Object.keys(shops).length} shops, ${trades} fixed trades`);

    let home = shops["bs_home"];
    let blueprint = null;
    home.trades().forEach((trade) => {
      if (String(trade.getTradeId()) === "bs_home_basic") blueprint = trade.getResult();
    });
    check(blueprint !== null, "bs_home has no bs_home_basic trade");
    check(String(blueprint.getItem().toString()).indexOf("worn_blueprint") !== -1, `bs_home_basic sells ${blueprint}`);
    let data = String(blueprint.getComponents());
    check(data.indexOf("home_basic") !== -1, `the worn blueprint lost its data: ${data}`);
    let name = String(shops["banker"].name().getContents());
    check(name.indexOf("translation") !== -1, `the banker name is not a translation: ${name}`);

    if (server.persistentData.contains("townShops")) console.info("[PORT-TEST] PASS townshops");
    else {
      server.persistentData.putBoolean("townShops", true);
      console.info("[PORT-TEST] PHASE1 townshops");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL townshops: ${e}`);
  }
});
