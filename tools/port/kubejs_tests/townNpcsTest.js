// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 checks gift tastes, invitations and the dialogs, then lets the Carpenter move into a Villager Home.
// Boot 2 checks (after 5 seconds) the Carpenter is still bound to the home and lets it move out.
// Prints "[PORT-TEST] PHASE1 townnpcs", "[PORT-TEST] PASS townnpcs" or "[PORT-TEST] FAIL townnpcs: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let home = () => level.getBlock(spawn.x + 12, 300, spawn.z + 12);

  try {
    if (String(home().id) !== "society:villager_home") {
      ["society:invitation", "society:villager", "society:villager_home", "society:tanuki_catalog", "society:modern_catalog"].forEach((id) =>
        check(global.itemExists(id), `${id} is not registered`)
      );
      let taste = (npc, id) => global.getVillagerGiftResult(npc, Item.of(id));
      // Universal love. Not the banker: the rabbit foot is a farmer product (society:farmer_product), which he dislikes.
      check(taste("carpenter", "minecraft:rabbit_foot") === "loved", `carpenter + rabbit foot: ${taste("carpenter", "minecraft:rabbit_foot")}`);
      check(taste("shepherd", "minecraft:rabbit_foot") === "hated", "the shepherd's own taste does not win");
      check(taste("banker", "minecraft:stick") === "neutral", "a stick is not neutral");
      check(taste("blacksmith", "minecraft:poppy") === "liked", "the blacksmith does not like flowers (tag)");
      check(global.isVillagerGift(Item.of("minecraft:stick")) && !global.isVillagerGift(Item.of("minecraft:iron_sword")), "gift filter");

      let invitation = global.townInvitation("market");
      check(global.getInvitationNpc(invitation) === "market", `the invitation is for "${global.getInvitationNpc(invitation)}"`);
      check(global.getVillagerHomeItemNpc(global.villagerHomeItem("fisher")) === "fisher", "the home item lost its villager");

      // Every dialog the villagers pick from is on disk.
      let $TownTestHashMap = Java.loadClass("java.util.HashMap");
      let files = {};
      new $TownTestHashMap(server.getResourceManager().listResources("dialogs", (p) => String(p).endsWith(".json")))
        .keySet()
        .forEach((loc) => (files[String(loc.getPath()).replace("dialogs/", "").replace(".json", "")] = true));
      let missing = [];
      Object.keys(global.townDialogLengths).forEach((npc) => {
        let lengths = global.townDialogLengths[npc];
        lengths.chatter.forEach((count, hearts) => {
          for (let i = 0; i < count; i++) if (!files[`${npc}_chatter_friendship${hearts}_${i}`]) missing.push(`${npc}_chatter_friendship${hearts}_${i}`);
        });
        Object.keys(lengths.gift).forEach((taste) => {
          for (let i = 0; i < lengths.gift[taste]; i++) if (!files[`${npc}_gift_${taste}_${i}`]) missing.push(`${npc}_gift_${taste}_${i}`);
        });
        if (npc !== "wise_oak" && !files[`${npc}_intro`]) missing.push(`${npc}_intro`);
      });
      check(missing.length === 0, `missing dialogs: ${missing.slice(0, 10).join(", ")}`);

      // The Carpenter moves in.
      home().set("society:villager_home");
      let npc = global.spawnTownNpc(level, "carpenter", home().x + 0.5, home().y + 0.25, home().z + 0.5);
      check(npc !== null, "the Carpenter NPC did not spawn from its preset");
      npc.setNoGravity(true);
      global.setMachineData(home(), { type: "carpenter", boundNpc: String(npc.getStringUuid()), placer: "-1" });
      check(global.getVillagerHomeBoundNpc(home()) !== null, "the home does not find its villager");
      console.info(`[PORT-TEST] townnpcs carpenter ${npc.type} ${npc.getCustomName().getString()}`);
      console.info("[PORT-TEST] PHASE1 townnpcs");
    } else {
      // Entities load after the chunk, so look for the villager a few seconds later.
      server.scheduleInTicks(100, () => {
        try {
          let npc = global.getVillagerHomeBoundNpc(home());
          check(npc !== null, "the Carpenter is gone after the restart");
          check(global.getTownNpcKey(npc) === "carpenter", `the bound villager is "${global.getTownNpcKey(npc)}"`);
          npc.discard();
          home().set("minecraft:air");
          console.info("[PORT-TEST] PASS townnpcs");
        } catch (e) {
          console.error(`[PORT-TEST] FAIL townnpcs: ${e}`);
        }
      });
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL townnpcs: ${e}`);
  }
});
