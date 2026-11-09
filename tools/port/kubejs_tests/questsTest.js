// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Checks the FTB Quests book (config/ftbquests/quests): every task, reward and icon item must exist (FTB Quests
// shows unknown ids as a "missing item"). Prints "[PORT-TEST] PHASE1 quests", "[PORT-TEST] PASS quests" or
// "[PORT-TEST] FAIL quests: ...".
const $QuestsTestFile = Java.loadClass("dev.ftb.mods.ftbquests.quest.ServerQuestFile");
const $QuestsTestItems = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $QuestsTestTrophies = Java.loadClass("trofers.registry.ModRegistries");
const $QuestsTestComponents = Java.loadClass("dev.ftb.mods.ftbquests.registry.ModDataComponents");

// FTB Quests loads the book after ServerEvents.loaded, so the check runs a few ticks later, on boot 2 only: a
// boot 1 that does not end right after the other tests breaks their restart checks.
ServerEvents.loaded((event) => {
  let server = event.server;
  if (!server.persistentData.contains("questsTest")) {
    server.persistentData.putBoolean("questsTest", true);
    console.info("[PORT-TEST] PHASE1 quests");
    return;
  }
  server.scheduleInTicks(40, () => checkQuestBook(server));
});

// society items the quests use that are still in kubejs/_unported (drinks, weapons, catalog, snow melter): #18 part B
// registers them and empties this list.
const questsTestPending = ["society:ancient_cider", "society:ancient_vespertine", "society:beer_attunecore",
  "society:beer_london", "society:bowl_of_soul", "society:dewy_star", "society:dirty_chai", "society:dragontooth_axe",
  "society:fantasy_catalog", "society:forks_of_blue", "society:galaxy_sword", "society:good_catawba",
  "society:laputa_franc", "society:latte", "society:mana_king", "society:meowmageddon", "society:mocha",
  "society:nutty_basil", "society:princess_hairbrush", "society:snow_melter", "society:sparkling_le_roy",
  "society:star_coquito", "society:starcardi", "society:truffle_tea", "society:violet_moon"];

const checkQuestBook = (server) => {
  console.info("[PORT-TEST] INFO quests check started");
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
      // trophy bases name a trophy of the trofers:trophies registry (kubejs/data/trofers/trofers/trophies)
      let trophy = /"trofers:trophy":"([^"]+)"/.exec(String(stack.save(server.registryAccess())));
      if (trophy && !$QuestsTestTrophies.get($QuestsTestTrophies.TROPHIES, trophy[1])) {
        missing[`trophy ${trophy[1]}`] = (missing[`trophy ${trophy[1]}`] || []).concat([where]);
      }
      // smart filters name their items in the filter expression: item(id) and item_tag(tag)
      if (String(stack.id) === "ftbfiltersystem:smart_filter") {
        let saved = String(stack.save(server.registryAccess()));
        let re = /item\(([a-z0-9_.\-]+:[a-z0-9_./\-]+)\)/g;
        let match;
        while ((match = re.exec(saved)) !== null) {
          if (!Item.exists(match[1])) missing[match[1]] = (missing[match[1]] || []).concat([`${where} (filter)`]);
        }
      }
    };
    let chapters = 0;
    let quests = 0;
    file.forAllChapters((chapter) => {
      chapters++;
      note(chapter.getRawIcon ? chapter.getRawIcon() : null, `chapter ${chapter}`);
    });
    file.forAllQuests((quest) => {
      quests++;
      let where = `${quest.getChapter()}/${quest}`;
      if (quest.getRawIcon) note(quest.getRawIcon(), where);
      quest.getTasks().forEach((task) => {
        if (task.getItemStack) note(task.getItemStack(), where);
        if (task.getRawIcon) note(task.getRawIcon(), where);
      });
      quest.getRewards().forEach((reward) => {
        if (reward.getItem) note(reward.getItem(), where);
      });
    });
    let pending = Object.keys(missing).filter((id) => questsTestPending.includes(id));
    if (pending.length > 0) console.info(`[PORT-TEST] INFO quests ${pending.length} pending ids: ${pending.join(" ")}`);
    let ids = Object.keys(missing).filter((id) => !questsTestPending.includes(id)).sort();
    console.info(`[PORT-TEST] quests: ${chapters} chapters, ${quests} quests, ${checked} items, ${ids.length} missing ids`);
    if (ids.length > 0) {
      let allIds = [];
      $QuestsTestItems.ITEM.keySet().forEach((key) => allIds.push(String(key)));
      ids.forEach((id) => {
        let path = id.split(":")[1];
        let namespace = id.split(":")[0];
        let words = path.split("_").filter((w) => w.length > 3);
        let like = allIds.filter((other) => {
          let [otherNamespace, otherPath] = other.split(":");
          if (otherPath === path) return true;
          let shared = words.filter((w) => otherPath.includes(w)).length;
          return otherNamespace === namespace ? shared > 0 : words.length > 0 && shared === words.length;
        });
        console.info(`[PORT-TEST] INFO quests missing ${id} ${missing[id].length}x (${missing[id].slice(0, 3).join(" ")}) like [${like.slice(0, 12).join(" ")}]`);
      });
      throw new Error(`${ids.length} missing item ids: ${ids.join(" ")}`);
    }
    console.info("[PORT-TEST] PASS quests");
  } catch (e) {
    console.error(`[PORT-TEST] FAIL quests: ${e}`);
  }
};
