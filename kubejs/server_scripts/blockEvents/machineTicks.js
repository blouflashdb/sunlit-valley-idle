// Morning ticks of the artisan machines. The block entities tick every artMachineTickRate (200) ticks;
// global.handleBETick only advances a machine inside the morning window. BlockEvents.blockEntityTick
// can only be registered from server (or client) scripts in KubeJS 7.
console.info("[SOCIETY] machineTicks.js loaded");

BlockEvents.blockEntityTick("society:crystalarium", (event) => {
  global.handleBETick(event, global.crystalariumCrystals, 5);
});

// Basic Shipping Bin: ticks every 10 ticks, sells once in the morning window.
BlockEvents.blockEntityTick("shippingbin:basic_shipping_bin", (event) => {
  const { level, block } = event;
  const morning = Number(level.dayTime()) % 24000;
  if (morning >= 5 && morning < 15) global.runShippingBin(block, level.getServer(), false);
  else if (Math.random() < 0.05) global.cacheShippingBin(block, level.getServer());
});

// Smart Shipping Bin: ticks every 4000 ticks.
BlockEvents.blockEntityTick("shippingbin:smart_shipping_bin", (event) => {
  global.runShippingBin(event.block, event.level.getServer(), true);
});

BlockEvents.blockEntityTick("society:shipping_bin_monitor", (event) => {
  global.runShippingBinMonitor(event.block, event.level);
});

BlockEvents.blockEntityTick("society:preserves_jar", (event) => {
  global.handleBETick(event, global.preservesJarRecipes, 3);
});

// Pickling Can: every 600 ticks, one pickle into the inventory below.
BlockEvents.blockEntityTick("society:pickling_can", (event) => {
  global.handlePicklingCan(event.level, event.block);
});

// Fermenting Jar: every 100 ticks.
BlockEvents.blockEntityTick("vintagedelight:fermenting_jar", (event) => {
  global.handleFermentingJar(event.level, event.block);
});

// Evaporator: ticks every 200 ticks, makes salt once in the morning window.
BlockEvents.blockEntityTick("vintagedelight:evaporator", (event) => {
  const morning = Number(event.level.dayTime()) % 24000;
  if (morning >= 20 && morning < 220) global.handleEvaporator(event.level, event.block);
});

// Artisan machines (#11): morning ticks every artMachineTickRate ticks.
BlockEvents.blockEntityTick("society:wine_keg", (entity) => {
  global.handleBETick(entity, global.wineKegRecipes, 6);
});

BlockEvents.blockEntityTick("society:aging_cask", (entity) => {
  global.handleBETick(entity, global.agingCaskRecipes, 10, true);
});

BlockEvents.blockEntityTick("society:ancient_cask", (entity) => {
  global.handleBETick(entity, global.ancientCaskRecipes, 20);
});

BlockEvents.blockEntityTick("society:bait_maker", (entity) => {
  global.handleBETick(entity, global.baitMakerRecipes, 1);
});

BlockEvents.blockEntityTick("society:cheese_press", (entity) => {
  global.handleBETick(entity, global.cheesePressRecipes, 2);
});

BlockEvents.blockEntityTick("society:dehydrator", (entity) => {
  global.handleBETick(entity, global.dehydratorRecipes, 1);
});

BlockEvents.blockEntityTick("society:fish_smoker", (entity) => {
  global.handleBETick(entity, global.fishSmokerRecipes, 2);
});

BlockEvents.blockEntityTick("society:loom", (entity) => {
  global.handleBETick(entity, global.loomRecipes, 1);
});

BlockEvents.blockEntityTick("society:mayonnaise_machine", (entity) => {
  global.handleBETick(entity, global.mayonnaiseMachineRecipes, 1);
});

BlockEvents.blockEntityTick("society:oil_maker", (entity) => {
  global.handleBETick(entity, global.oilMakerRecipes, 1);
});

BlockEvents.blockEntityTick("society:recycling_machine", (entity) => {
  global.handleBETick(entity, global.recyclingMachineRecipes, 1);
});

BlockEvents.blockEntityTick("society:seed_maker", (entity) => {
  global.handleBETick(entity, global.seedMakerRecipes, 1);
});

BlockEvents.blockEntityTick("society:tapper", (entity) => {
  if (!global.isBlockPropertyTrue(entity.block, "error")) global.handleBETick(entity, global.tapperRecipes, 7);
});

BlockEvents.blockEntityTick("society:mushroom_log", (entity) => {
  global.handleBETick(entity, global.mushroomLogRecipes, 4);
});

BlockEvents.blockEntityTick("society:charging_rod", (entity) => {
  global.handleBETick(entity, null, 5);
});

BlockEvents.blockEntityTick("society:golden_clock", (entity) => {
  global.runGoldenClock(entity);
});

BlockEvents.blockEntityTick("society:iridium_clock", (entity) => {
  global.runIridiumClock(entity);
});

BlockEvents.blockEntityTick("society:artisan_hopper", (entity) => {
  global.artisanHopperScan(entity, 3);
});

BlockEvents.blockEntityTick("society:mini_artisan_hopper", (entity) => {
  global.artisanHopperScan(entity, 1);
});

BlockEvents.blockEntityTick("society:quality_washer", (entity) => {
  global.handleQualityWasher(entity);
});

BlockEvents.blockEntityTick("society:auto_worm_farm", (entity) => {
  global.runAutoWormFarm(entity);
});

BlockEvents.blockEntityTick("society:growth_obelisk", (entity) => {
  global.runGrowthObelisk(entity);
});

BlockEvents.blockEntityTick("society:auto_petter", (entity) => {
  global.runAutoPetter(entity);
});

BlockEvents.blockEntityTick("society:auto_grabber", (entity) => {
  global.runAutoGrabber(entity);
});

BlockEvents.blockEntityTick("society:feeding_trough", (entity) => {
  global.runFeedingTrough(entity);
});

BlockEvents.blockEntityTick("society:drum_cornucopia", (entity) => {
  global.runDrumCornucopia(entity);
});

// Fish ponds (#12): startup_scripts/fishPonds/.
BlockEvents.blockEntityTick("society:fish_pond", (entity) => {
  global.handleFishPondTick(entity);
});

BlockEvents.blockEntityTick("society:fish_pond_basket", (entity) => {
  global.runFishPondBaskets(entity, 1);
});

BlockEvents.blockEntityTick("society:fish_pond_hatchery", (entity) => {
  global.runFishPondBaskets(entity, 3);
});

BlockEvents.blockEntityTick("society:fish_pond_manager", (entity) => {
  global.runFishPondManager(entity, false);
});

BlockEvents.blockEntityTick("society:roe_recycler", (entity) => {
  global.runRoeRecycler(entity, false);
});

// Ribbit Hut and Caterpillar Box (#12): startup_scripts/husbandry/.
BlockEvents.blockEntityTick("society:ribbit_hut", (entity) => {
  global.runRibbitHut(entity, false);
});

BlockEvents.blockEntityTick("society:caterpillar_box", (entity) => {
  global.runCaterpillarBox(entity);
});

// Plort Ripper and Plort Press (#13): startup_scripts/slimes/plortMachines.js.
BlockEvents.blockEntityTick("society:plort_ripper", (entity) => {
  global.runPlortRipper(entity);
});

BlockEvents.blockEntityTick("society:plort_press", (entity) => {
  global.runPlortPress(entity);
});

// Mana machines (#14): startup_scripts/mana/manaMachines.js. They take mana from a Botania pool next to them.
BlockEvents.blockEntityTick("society:mana_fruit_crop", (entity) => {
  global.runManaFruit(entity, false);
});

BlockEvents.blockEntityTick("society:mana_sprinkler", (entity) => {
  global.runManaSprinkler(entity);
});

BlockEvents.blockEntityTick("society:mana_milker", (entity) => {
  global.runManaMilker(entity);
});

BlockEvents.blockEntityTick("society:mana_clock", (entity) => {
  global.runManaClock(entity);
});

BlockEvents.blockEntityTick("society:sparkstone_recycler", (entity) => {
  global.runSparkstoneRecycler(entity);
});

// Cropnolia (#14): startup_scripts/mana/cropnolia.js. Turns grown crops around it into mana for a pool.
BlockEvents.blockEntityTick("croptania:cropnolia", (entity) => {
  global.runCropnolia(entity.level, entity.block);
});

// Auto-Tapper and Juice Inserter (#17): startup_scripts/powerfulMachines/autoTapper.js.
BlockEvents.blockEntityTick("society:auto_tapper", (entity) => {
  global.runAutoTapper(entity);
});

BlockEvents.blockEntityTick("society:juice_inserter", (entity) => {
  global.runJuiceInserter(entity);
});
