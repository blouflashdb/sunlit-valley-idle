console.info("[SOCIETY] geodeCracking.js loaded");

// The geode buster cracks the geode in the off hand: junk, a bonus or a treasure from the geode's item tags.
const $GeodeRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries");
const $GeodeKeys = Java.loadClass("net.minecraft.core.registries.Registries");
const $GeodeTagKey = Java.loadClass("net.minecraft.tags.TagKey");
const $GeodeRL = Java.loadClass("net.minecraft.resources.ResourceLocation");

const geodeTypes = ["society:geode", "society:frozen_geode", "society:magma_geode", "society:omni_geode"];

const geodeTagItems = (tag) => {
  let ids = [];
  $GeodeRegistries.ITEM.getTagOrEmpty($GeodeTagKey.create($GeodeKeys.ITEM, $GeodeRL.parse(tag))).forEach((holder) => {
    ids.push(String(holder.unwrapKey().get().location()));
  });
  return ids;
};

const pickGeodeItem = (tag) => {
  let ids = geodeTagItems(tag);
  return ids.length > 0 ? ids[Math.floor(Math.random() * ids.length)] : null;
};

// The item a cracked geode gives, or null for nothing; the first geode of a player always gives a treasure.
const crackGeode = (geode, firstGeode, roll) => {
  let omni = geode === "society:omni_geode";
  let bonusOdds = omni ? 0.4 : 0.3;
  let treasureOdds = omni ? 0.6 : 0.2;
  let reward = null;
  if (roll <= 0.9) reward = omni && roll <= 0.03 ? "society:prismatic_shard" : pickGeodeItem("society:geode_junk");
  if (roll <= bonusOdds) reward = pickGeodeItem(`${geode}_bonus`) || reward;
  if (roll <= treasureOdds || firstGeode) reward = pickGeodeItem(`${geode}_treasure`) || reward;
  return reward;
};

ItemEvents.rightClicked("society:geode_buster", (e) => {
  let { player, server, item } = e;
  let offHand = player.getOffhandItem();
  let geode = String(offHand.id);
  if (geodeTypes.indexOf(geode) === -1) return;
  server.runCommandSilent(`playsound minecraft:ui.stonecutter.take_result block @a ${player.x} ${player.y} ${player.z}`);

  let firstGeode = !player.stages.has("first_geode");
  let reward = crackGeode(geode, firstGeode, Math.random());
  item.shrink(1);
  offHand.shrink(1);
  if (!reward) {
    server.runCommandSilent(`playsound stardew_fishing:fish_escape block @a ${player.x} ${player.y} ${player.z}`);
  } else {
    if (firstGeode) player.stages.add("first_geode");
    player.block.popItem(Item.of(reward));
    server.runCommandSilent(`playsound stardew_fishing:complete block @a ${player.x} ${player.y} ${player.z}`);
  }
  global.addItemCooldown(player, "society:geode_buster", 2);
});
