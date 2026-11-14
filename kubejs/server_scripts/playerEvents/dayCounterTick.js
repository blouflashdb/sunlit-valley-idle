console.info("[SOCIETY] dayCounterTick.js loaded");

// Checked every 10 seconds early in the morning: Master Cultivator (after a year or four hours of play time)
// and the Mastery skill tree (one capstone skill in each of the five trees).
// Every 20 seconds: the Moon Statue buffs end when the day changes.
const dayCounterTickRate = 200;
const dayCounterMorningTick = 20;
const dayCounterDayTicks = 24000;
const dayCounterMaxPlayTime = 20 * 60 * 30 * 4;

const moonStatueBuffs = ["moon_extra_ore", "moon_geode_roll", "moon_rope_reveal", "moon_remains", "moon_damage"];

const masteryCapstones = [
  ["farmers_blessing", "crop_collector", "artful_tycoon", "ancient_aging"],
  ["prismatic_prospector", "high_roller", "gem_tycoon", "star_blessing"],
  ["clockwork", "bff", "triple_truffle", "heretic"],
  ["fence_2", "looting_tycoon", "prismatic_realm", "stuffed"],
  ["school_fisher", "prismatic_bounty", "scum_collector", "mitosis"],
];

PlayerEvents.tick((e) => {
  const { player, level, server } = e;
  const age = player.age;
  if (age % dayCounterTickRate === 0) {
    const morning = level.dayTime() % dayCounterDayTicks;
    if (morning >= dayCounterMorningTick && morning < dayCounterMorningTick + dayCounterTickRate) {
      const playTime = player.stats.playTime;
      // Sleeping cuts the number of possible days in half.
      const years = playTime / dayCounterDayTicks / ((global.subSeasonDuration * 3 * 4) / 2);
      if (
        !player.stages.has("master_cultivator_unlocked") &&
        (playTime > dayCounterMaxPlayTime ||
          (years > 1 && ["spring", "summer"].includes(global.getSeasonFromLevel(level))))
      ) {
        player.stages.add("master_cultivator_unlocked");
      }
      if (
        !player.stages.has("mastery_unlocked") &&
        masteryCapstones.every((tree) => tree.some((skill) => player.stages.has(skill)))
      ) {
        player.stages.add("mastery_unlocked");
        server.runCommandSilent(`puffish_skills category unlock ${player.username} society:mastery`);
      }
    }
  }
  if (age % 400 === 0 && player.stages.has("mining_mastery")) {
    const statueDay = global.getPlayerDay(player, "moonStatueDay");
    if (statueDay !== -1 && global.getDay(level) !== statueDay) {
      moonStatueBuffs.forEach((buff) => player.stages.remove(buff));
      global.setPlayerDay(player, "moonStatueDay", -1);
    }
  }
});
