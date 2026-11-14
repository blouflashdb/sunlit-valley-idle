console.info("[SOCIETY] nerfHero.js loaded");

// Players cannot get the trading discount effects (the shops set the prices). Grandma's and Farmer's Blessing are
// refused while the player is stunned, and the stun is renewed.

const $MobEffectApplicable = Java.loadClass("net.neoforged.neoforge.event.entity.living.MobEffectEvent$Applicable");

const blockedTradingEffects = ["minecraft:hero_of_the_village", "vinery:trading", "brewery:pintcharisma"];
const stunBlockedEffects = ["farm_and_charm:grandmas_blessing", "farm_and_charm:farmers_blessing", "brewery:pintcharisma"];

const hasActiveEffect = (entity, id) => {
  let found = false;
  entity.getActiveEffects().forEach((instance) => {
    if (String(instance.getEffect().getRegisteredName()) === id) found = true;
  });
  return found;
};

global.runFixGrandma = (event, effectId) => {
  const entity = event.getEntity();
  if (!stunBlockedEffects.includes(effectId) || !hasActiveEffect(entity, "oreganized:stunning")) return;
  entity.potionEffects.add("oreganized:stunning", 1, 1, true, false);
  event.setResult($MobEffectApplicable.Result.DO_NOT_APPLY);
};

NativeEvents.onEvent($MobEffectApplicable, (event) => {
  if (!event.getEntity().isPlayer()) return;
  const effectId = String(event.getEffectInstance().getEffect().getRegisteredName());
  global.runFixGrandma(event, effectId);
  if (blockedTradingEffects.includes(effectId)) {
    event.setResult($MobEffectApplicable.Result.DO_NOT_APPLY);
  }
});
