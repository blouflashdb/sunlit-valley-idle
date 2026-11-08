console.info("[SOCIETY] placeNbtMachine.js loaded");

// society:prize_machine is ported: kubejs/server_scripts/blockEvents/prizeMachineEvents.js

BlockEvents.placed("society:fish_pond", (e) => {
  const { block, player } = e;
  let item = player.getHeldItem("main_hand");
  let pondNbt;
  if (item.id !== "society:fish_pond") item = player.getHeldItem("off_hand");
  if (item.id !== "society:fish_pond") return;
  pondNbt = item.getNbt();
  if (pondNbt && !pondNbt.isEmpty()) {
    block.set(block.id, {
      facing: block.getProperties().get("facing"),
      valid: true,
      mature: false,
      upgraded: false,
      quest: Boolean(pondNbt.getBoolean("quest")),
    });
    let nbt = block.getEntityData();
    nbt.merge({
      data: {
        type: pondNbt.get("type"),
        quest_id: Number(pondNbt.get("quest_id")),
        population: Number(pondNbt.get("population")),
        max_population: Number(pondNbt.get("max_population")),
      },
    });
    global.setBlockEntityData(block, nbt)
  }
});

BlockEvents.placed(
  // The two artisan hoppers and the auto grabber are ported: kubejs/server_scripts/blockEvents/machineOwner.js
  [
    "society:fish_pond_basket",
    "society:fish_pond_manager",
    "society:fish_pond_hatchery",
  ],
  (e) => {
    const playerUUID = e.player.getUuid().toString();
    let nbt = e.block.entityData;
    nbt.merge({ data: { owner: playerUUID } });
    global.setBlockEntityData(e.block, nbt)
  }
);
