console.info("[SOCIETY] registerSounds.js loaded");

// The pig racing song (kubejs/assets/society/sounds.json). The .ogg came from Society Tweaks and is not in the
// 1.21.1 pack yet, so the sound is silent until a resource pack adds it.
StartupEvents.registry("sound_event", (e) => {
  e.create("society:blazing_drift_fever_ex");
});
