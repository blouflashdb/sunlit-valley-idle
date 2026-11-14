console.info("[SOCIETY] blueprintsBlock.js loaded");

// The Let's Do Furniture blueprints open the building shop dialog.
if (global.itemExists("furniture:blueprints")) {
  BlockEvents.rightClicked("furniture:blueprints", (e) => {
    let { player, server, block } = e;
    server.runCommandSilent(`playsound minecraft:item.book.page_turn block @a ${block.x} ${block.y} ${block.z}`);
    global.showTownDialog(server, player, "blueprints_choice_dialog_prompt");
    e.cancel();
  });
}
