// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Checks the FTB Quests book (config/ftbquests/quests): every task, reward and icon item must exist (FTB Quests
// shows unknown ids as a "missing item"). Prints "[PORT-TEST] PHASE1 quests", "[PORT-TEST] PASS quests" or
// "[PORT-TEST] FAIL quests: ...".
const $QuestsTestFile = Java.loadClass("dev.ftb.mods.ftbquests.quest.ServerQuestFile");
const $QuestsTestComponents = Java.loadClass("dev.ftb.mods.ftbquests.registry.ModDataComponents");

ServerEvents.loaded((event) => {
  let server = event.server;
  try {
    let file = $QuestsTestFile.INSTANCE;
    if (!file) throw new Error("no quest file loaded");
    let missingDesc = $QuestsTestComponents.MISSING_ITEM_DESC.get();
    let missing = {};
    let checked = 0;
    let note = (stack, where) => {
      if (!stack || stack.isEmpty()) return;
      checked++;
      let desc = stack.get(missingDesc);
      if (desc !== null && desc !== undefined) {
        let id = String(desc).replace(/^\d+x /, "");
        missing[id] = (missing[id] || []).concat([where]);
      }
    };
    let chapters = 0;
    let quests = 0;
    file.forAllChapters((chapter) => {
      chapters++;
      note(chapter.getRawIcon ? chapter.getRawIcon() : null, `chapter ${chapter.getFilename()}`);
    });
    file.forAllQuests((quest) => {
      quests++;
      let where = `${quest.getChapter().getFilename()}/${quest.getCodeString()}`;
      if (quest.getRawIcon) note(quest.getRawIcon(), where);
      quest.getTasks().forEach((task) => {
        if (task.getItemStack) note(task.getItemStack(), where);
        if (task.getRawIcon) note(task.getRawIcon(), where);
      });
      quest.getRewards().forEach((reward) => {
        if (reward.getItem) note(reward.getItem(), where);
      });
    });
    // probe (removed once the quest port knows the formats)
    try {
      let reg = server.registryAccess();
      [global.withItemQuality(Item.of("society:ancient_fruit"), 2), Item.of("vinery:red_wine"), Item.of("trofers:large_pillar"),
        Item.of("bountiful:decree"), Item.of("relics:arrow_quiver")].forEach((s) => {
        console.info(`[PORT-TEST] INFO quests item ${s.id} ${s.save(reg)}`);
      });
    } catch (probeError) {
      console.info(`[PORT-TEST] INFO quests probe failed ${probeError}`);
    }
    let ids = Object.keys(missing).sort();
    console.info(`[PORT-TEST] quests: ${chapters} chapters, ${quests} quests, ${checked} items, ${ids.length} missing ids`);
    if (ids.length > 0) {
      ids.forEach((id) => console.info(`[PORT-TEST] INFO quests missing ${id} ${missing[id].length}x (${missing[id].slice(0, 3).join(" ")})`));
      throw new Error(`${ids.length} missing item ids: ${ids.join(" ")}`);
    }
    if (!server.persistentData.contains("questsTest")) {
      server.persistentData.putBoolean("questsTest", true);
      console.info("[PORT-TEST] PHASE1 quests");
    } else {
      console.info("[PORT-TEST] PASS quests");
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL quests: ${e}`);
  }
});
