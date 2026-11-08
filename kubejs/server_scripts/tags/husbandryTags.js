console.info("[SOCIETY] husbandryTags.js loaded");

// Entity tags for husbandry (ported from the 1.20.1 handleEntityTags.js). Animals from mods that are not in the
// 1.21.1 pack are left out. The item and block tags came from Society Tweaks on 1.20.1.
ServerEvents.tags("entity_type", (e) => {
  const addExisting = (tag, ids) => ids.filter((id) => global.entityExists(id)).forEach((id) => e.add(tag, id));
  addExisting("society:husbandry_animal", global.husbandryAnimals);
  addExisting("society:milkable_animal", global.milkableAnimals);
  addExisting("society:coopmaster_bird", global.coopMasterAnimals);
  addExisting("society:pet_animal", [
    "buzzier_bees:grizzly_bear",
    "minecraft:wolf",
    "minecraft:cat",
    "quark:foxhound",
    "quark:shiba",
    "minecraft:allay",
    "minecraft:horse",
    "minecraft:polar_bear",
    "wildernature:red_wolf",
    "wildernature:owl",
    "wildernature:dog",
    "minecraft:axolotl",
    "wildernature:hedgehog",
    "crittersandcompanions:ferret",
  ]);
  addExisting("society:infertile", ["wildernature:flamingo"]);
  addExisting("society:longwing", ["longwings:moth", "longwings:butterfly"]);
  addExisting("society:cannot_wicked_mask", ["botania:doppleganger", "untitledduckmod:goose", "untitledduckmod:duck"]);
});

ServerEvents.tags("item", (e) => {
  e.add("society:animal_feed", ["society:animal_feed", "society:candied_animal_feed", "society:mana_feed"]);
});

ServerEvents.tags("block", (e) => {
  e.add("society:cold_blocks", [
    "minecraft:snow",
    "minecraft:snow_block",
    "minecraft:powder_snow",
    "minecraft:ice",
    "minecraft:packed_ice",
    "minecraft:blue_ice",
  ]);
});
