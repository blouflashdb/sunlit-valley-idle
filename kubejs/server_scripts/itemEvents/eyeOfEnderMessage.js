console.info("[SOCIETY] eyeOfEnderMessage.js loaded");

// The pack has no End; an eye of ender says so (at most every 20 seconds).
const eyeOfEnderThrottle = societyThrottle();

ItemEvents.rightClicked("minecraft:ender_eye", (e) => {
  if (eyeOfEnderThrottle(e.player, 400, "eye_of_ender")) return;
  e.player.tell(Text.translatable("society.ender_eye.no_end").red());
});
