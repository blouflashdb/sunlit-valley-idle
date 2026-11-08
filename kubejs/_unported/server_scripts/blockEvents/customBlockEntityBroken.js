console.info("[SOCIETY] customBlockEntityBroken.js loaded");

// The artisan machine drops (handleBrokenMachine) are ported: kubejs/server_scripts/blockEvents/artisanMachineBroken.js

BlockEvents.broken("society:fish_pond", (e) => {
  const { block } = e;
  const nbt = block.getEntityData();
  if (nbt.data.type !== "") {
    block.popItem(
      Item.of(
        "society:fish_pond",
        `{type:"${nbt.data.type}",population:${Number(nbt.data.population)},max_population:${Number(
          nbt.data.max_population
        )},quest:${block.properties.get("quest")},quest_id:${Number(nbt.data.quest_id)}}`
      )
    );
  } else {
    block.popItem(Item.of("society:fish_pond"));
  }
  if (block.properties.get("upgraded").toLowerCase() == "true") {
    block.popItem(Item.of("society:sea_biscut"));
  }
});

// society:prize_machine is ported: kubejs/server_scripts/blockEvents/prizeMachineEvents.js

BlockEvents.broken("society:coin_leaderboard", (e) => {
  global.clearOldTextDisplay(e.block, e.level, "leaderboard");
});

BlockEvents.broken("society:shipping_bin_monitor", (e) => {
  global.clearOldTextDisplay(e.block, e.level, "shipping_bin_monitor");
});

BlockEvents.broken("society:fish_pond_basket", (e) => {
  const { block } = e;
  if (block.properties.get("upgraded").toLowerCase() == "true") {
    block.popItem(Item.of("minecraft:bucket"));
  }
});
BlockEvents.broken("society:auto_grabber", (e) => {
  const { block } = e;
  if (block.properties.get("upgraded").toLowerCase() == "true") {
    block.popItem(Item.of("society:magic_shears"));
  }
});
