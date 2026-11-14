// priority: 1000
// General helpers, ported from kubejs/_unported/startup_scripts/globalGeneralUtils.js one by one.
console.info("[SOCIETY] globalGeneralUtils.js loaded");

global.getDay = (level) => Math.floor(Number(level.dayTime()) / 24000) + 1;

/**
 * True when `amount` days have passed since checkedDay, or when checkedDay is in the future (time commands).
 *  day: 11 | checkedDay: 10 | amount: 1 = true
 *  day: 10 | checkedDay: 11 | amount: 1 = true
 */
global.compareDay = (day, checkedDay, amount) =>
  Number(day) < Number(checkedDay) || Number(day) - Number(checkedDay) >= amount;

/** The day a player last used something once-a-day (player.persistentData.days.<key>), or -1. */
global.getPlayerDay = (player, key) => {
  const days = player.persistentData.getCompound("days");
  return days.contains(key) ? days.getInt(key) : -1;
};

global.setPlayerDay = (player, key, day) => {
  const days = player.persistentData.getCompound("days");
  days.putInt(key, Number(day));
  player.persistentData.put("days", days);
};

/** True (and the day is stored) when the player has not used `key` today. */
global.claimPlayerDay = (player, level, key) => {
  const day = global.getDay(level);
  const last = global.getPlayerDay(player, key);
  if (last !== -1 && !global.compareDay(day, last, 1)) return false;
  global.setPlayerDay(player, key, day);
  return true;
};
