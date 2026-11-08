// Item tags of the Vintage Delight content rebuilt in KubeJS. The 1.20.1 recipes used forge: tags; on 1.21.1
// the common namespace is c:.
console.info("[SOCIETY] vintageDelightTags.js loaded");

ServerEvents.tags("item", (e) => {
  e.add("c:salt", "vintagedelight:salt");
  e.add("c:seeds", ["vintagedelight:cucumber_seeds", "vintagedelight:ghost_pepper_seeds"]);
  e.add("c:crops", ["vintagedelight:cucumber", "vintagedelight:ghost_pepper", "vintagedelight:peanut"]);
  e.add("c:crops/cucumber", "vintagedelight:cucumber");
  e.add("c:crops/peanut", "vintagedelight:peanut");
  e.add("c:crops/pepper", "vintagedelight:ghost_pepper");
  e.add("c:foods/vegetable", ["vintagedelight:cucumber", "vintagedelight:ghost_pepper"]);
  e.add("c:foods/berry", "vintagedelight:gearo_berry");
  e.add("c:foods/nut", "vintagedelight:peanut");
  e.add("vintagedelight:raw_fish", "#c:foods/raw_fish");
  e.add("minecraft:logs_that_burn", ["vintagedelight:magic_vine", "vintagedelight:stripped_magic_vine"]);
});
