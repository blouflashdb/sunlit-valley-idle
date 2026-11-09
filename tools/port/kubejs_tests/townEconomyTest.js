// CI only: server_boot_test.py copies this into kubejs/server_scripts/_ci/ and boots the server twice.
// Boot 1 checks hospital fees, debts, receipts and the leaderboard ranking, then places a Coin Leaderboard.
// Boot 2 checks its text displays are still there and removes it.
// Prints "[PORT-TEST] PHASE1 towneconomy", "[PORT-TEST] PASS towneconomy" or "[PORT-TEST] FAIL towneconomy: ...".

ServerEvents.loaded((event) => {
  let server = event.server;
  let level = server.overworld();
  let spawn = level.getSharedSpawnPos();
  let check = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  let stages = (list) => ({ has: (stage) => list.indexOf(String(stage)) !== -1 });
  let board = () => level.getBlock(spawn.x + 14, 300, spawn.z - 14);
  let displays = () => {
    let count = 0;
    let tag = `leaderboard-${board().x}-${board().y}-${board().z}`;
    level.getAllEntities().forEach((entity) => {
      if (String(entity.type) === "minecraft:text_display" && entity.getTags().contains(tag)) count++;
    });
    return count;
  };

  try {
    if (String(board().id) !== "society:coin_leaderboard") {
      check(global.getHospitalFee(100000, "death", stages([])) === 4096, "the death fee is not capped at 4096");
      check(global.getHospitalFee(100000, "death", stages(["first_aid_guide"])) === 2048, "the First Aid Guide does not halve the cap");
      check(global.getHospitalFee(1000, "death", stages([])) === 512, "the minimum fee is not 512");
      check(global.getHospitalFee(1000, "death", stages(["entered_skull_cavern"])) === 4096, "the Skull Cavern stage does not raise the fee");
      check(global.getHospitalFee(20000, "skull_cavern", stages([])) === 3000, `skull cavern fee ${global.getHospitalFee(20000, "skull_cavern", stages([]))}`);

      let uuid = "00000000-0000-0000-0000-00000000beef";
      global.setDebt(server, uuid, 0);
      global.addDebt(server, uuid, 512);
      global.addDebt(server, uuid, 1024);
      check(global.getDebt(server, uuid) === 1536, `debt ${global.getDebt(server, uuid)}`);
      global.setDebt(server, uuid, 0);

      let note = global.firstDeathNote();
      check(String(note.id) === "minecraft:written_book", `the hospital note is ${note.id}`);
      let content = String(note.getComponents());
      check(content.indexOf("society.hospital_receipt.first_death") !== -1, `the note has no text: ${content}`);

      let truncated = [String(global.formatPriceTruncated(1234567)), String(global.formatPriceTruncated(512))];
      check(truncated[0] === "1.2M" && truncated[1] === "512", `truncated prices ${truncated}`);
      let ranking = global.getLeaderboardRanking(server);
      check(Array.isArray(ranking), "no ranking");

      board().set("society:coin_leaderboard", { facing: "north" });
      global.coinLeaderboard.ranking = [["Alice", 1234567], ["Bob", 512]];
      global.updateLeaderboard(board(), level);
      check(displays() === 3, `${displays()} text displays instead of 3`);
      console.info("[PORT-TEST] PHASE1 towneconomy");
    } else {
      server.scheduleInTicks(100, () => {
        try {
          check(displays() === 3, `${displays()} text displays after the restart`);
          global.clearLeaderboard(board(), level);
          check(displays() === 0, "the displays were not cleared");
          board().set("minecraft:air");
          console.info("[PORT-TEST] PASS towneconomy");
        } catch (e) {
          console.error(`[PORT-TEST] FAIL towneconomy: ${e}`);
        }
      });
    }
  } catch (e) {
    console.error(`[PORT-TEST] FAIL towneconomy: ${e}`);
  }
});
