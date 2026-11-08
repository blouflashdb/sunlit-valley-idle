console.info("[SOCIETY] prizeMachineEvents.js loaded");

// A Prize Machine keeps its current prize when it is broken and placed again (1.20.1: item NBT, now custom data).
BlockEvents.placed("society:prize_machine", (e) => {
  if (!e.player) return;
  let item = e.player.getMainHandItem();
  if (String(item.id) !== "society:prize_machine") item = e.player.getOffHandItem();
  if (String(item.id) !== "society:prize_machine") return;
  global.setMachineData(e.block, { prize: global.getPrizeMachineItemPrize(item) });
});

BlockEvents.broken("society:prize_machine", (e) => {
  e.block.popItem(global.prizeMachineItem(global.getMachineInt(e.block, "prize")));
});
