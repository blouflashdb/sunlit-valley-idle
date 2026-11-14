console.info("[SOCIETY] modifyItems.js loaded");

// Item balance: every tool and armor lasts three times longer, gold gear is a real tier, netherite and Botania
// endgame gear is stronger, and some items get a rarity colour.
// 1.21.1 keeps these values in data components: durability is max_damage, attack damage and armor are attribute
// modifiers, mining speed comes from the tool tier.

const $ModifyDataComponents = Java.loadClass("net.minecraft.core.component.DataComponents");
const $ModifyRarity = Java.loadClass("net.minecraft.world.item.Rarity");
const $ModifyAttributes = Java.loadClass("net.minecraft.world.entity.ai.attributes.Attributes");
const $ModifyAttributeModifier = Java.loadClass("net.minecraft.world.entity.ai.attributes.AttributeModifier");
const $ModifyItemAttributeModifiers = Java.loadClass("net.minecraft.world.item.component.ItemAttributeModifiers");
const $ModifyArrayList = Java.loadClass("java.util.ArrayList");

const getMaxDamage = (item) => {
  const value = item.get($ModifyDataComponents.MAX_DAMAGE);
  return value ? Number(value) : 0;
};

const multiplyMaxDamage = (item, factor) => {
  const maxDamage = getMaxDamage(item);
  if (maxDamage > 0) item.maxDamage = Math.max(1, Math.floor(maxDamage * factor));
};

/** Replaces the armor points of an armor item. ArmorItem keeps them in its default modifiers, not in a component. */
const setArmorProtection = (item, armor) => {
  const modifiers = item.item().getDefaultInstance().getAttributeModifiers();
  const list = new $ModifyArrayList();
  let found = false;
  modifiers.modifiers().forEach((entry) => {
    if (entry.attribute().equals($ModifyAttributes.ARMOR)) {
      found = true;
      const old = entry.modifier();
      list.add(
        new $ModifyItemAttributeModifiers.Entry(
          entry.attribute(),
          new $ModifyAttributeModifier(old.id(), armor, old.operation()),
          entry.slot()
        )
      );
    } else {
      list.add(entry);
    }
  });
  if (!found) {
    console.warn(`[SOCIETY] modifyItems.js: ${item.item()} has no armor modifier`);
    return;
  }
  // setAttributeModifiers is overloaded (a list or ItemAttributeModifiers), so it has no property setter.
  item.setAttributeModifiers(new $ModifyItemAttributeModifiers(list, modifiers.showInTooltip()));
};

const setRarity = (item, rarity) => item.set($ModifyDataComponents.RARITY, rarity);

ItemEvents.modification((e) => {
  /** Like e.modify, but skips (and logs) ids that are not registered, for example from dropped mods. */
  const modify = (ids, fn) => {
    (Array.isArray(ids) ? ids : [ids]).forEach((id) => {
      if (!Item.exists(id)) {
        console.warn(`[SOCIETY] modifyItems.js: ${id} does not exist`);
        return;
      }
      e.modify(id, (item) => {
        try {
          fn(item);
        } catch (err) {
          console.warn(`[SOCIETY] modifyItems.js: could not modify ${id}: ${err}`);
        }
      });
    });
  };

  // Tool tiers first: setting a tier resets the durability to the tier's uses.
  // Gold mines as fast as and as much as diamond.
  modify(
    [
      "minecraft:golden_hoe",
      "minecraft:golden_axe",
      "minecraft:golden_pickaxe",
      "minecraft:golden_shovel",
      "justhammers:gold_reinforced_impact_hammer",
      "justhammers:gold_hammer",
      "justhammers:gold_destructor_hammer",
      "justhammers:gold_impact_hammer",
      "justhammers:gold_reinforced_hammer",
    ],
    (item) => {
      item.tier = (tier) => {
        tier.speed = 7;
        tier.incorrectBlocksForDropsTag = "minecraft:incorrect_for_diamond_tool";
      };
    }
  );
  modify(["minecraft:netherite_axe", "minecraft:netherite_hoe", "minecraft:netherite_pickaxe", "minecraft:netherite_shovel"], (item) => {
    item.tier = (tier) => {
      tier.speed = tier.speed + 1;
    };
    item.attackDamage = item.attackDamage + 2;
  });

  e.modify("*", (item) => multiplyMaxDamage(item, 3));
  modify(["gag:energized_hearthstone", "gag:hearthstone"], (item) => {
    item.maxDamage = 2;
  });
  modify("gag:escape_rope", (item) => {
    item.maxDamage = 1024;
  });

  global.geodeList.forEach((geodeItem) => modify(geodeItem.item, (item) => setRarity(item, $ModifyRarity.UNCOMMON)));
  global.frozenGeodeList.forEach((geodeItem) => modify(geodeItem.item, (item) => setRarity(item, $ModifyRarity.RARE)));
  global.magmaGeodeList.forEach((geodeItem) => modify(geodeItem.item, (item) => setRarity(item, $ModifyRarity.EPIC)));
  modify(
    [
      "society:sparkstone",
      "numismatics:ancient_coin",
      "numismatics:prismatic_coin",
      "society:ancient_fruit_seeds",
      "society:ancient_fruit",
      "society:sunlit_crystal",
      "society:plushie_wand",
      "society:treasure_totem",
      "society:recycled_core",
      "society:bubble_totem",
      "society:mystic_syrup",
      "society:net_bobber",
      "society:needle_bobber",
      "society:sparkpod",
      "society:sparkpod_seeds",
      "cluttered:willow_sapling",
      "cluttered:willow_log",
      "cluttered:flowering_willow_log",
      "cluttered:flowering_willow_leaves",
      "cluttered:willow_leaves",
      "cluttered:willow_vines",
      "society:women_who_run_with_the_plushies",
      "society:the_spark_also_rises",
      "society:the_red_and_the_black",
      "society:the_quality_of_the_earth",
      "society:pond_house_five",
      "society:animal_cracker",
      "society:moon_statue",
      "society:roe_recycler",
      "minecraft:enchanting_table",
      "society:spinel",
      "quark:diamond_heart",
      "society:jade",
      "society:prismatic_shard",
      "society:prismatic_shard_block",
      "society:golden_clock",
    ],
    (item) => setRarity(item, $ModifyRarity.EPIC)
  );
  modify(
    ["numismatics:neptunium_coin", "society:ruby", "society:topaz", "society:magic_rope", "society:magic_tunnel"],
    (item) => setRarity(item, $ModifyRarity.RARE)
  );
  modify(["society:aquamarine", "society:amethyst_chunk"], (item) => setRarity(item, $ModifyRarity.UNCOMMON));
  modify(["society:milk_pail", "society:magic_shears", "society:mood_scanner"], (item) => {
    item.maxStackSize = 1;
  });

  // Gold gear
  modify("minecraft:golden_sword", (item) => {
    item.attackDamage = 5.5;
  });
  modify("minecraft:golden_axe", (item) => {
    item.attackDamage = 8;
  });
  const goldTools = [
    "farmersdelight:golden_knife",
    "aquaculture:gold_fishing_rod",
    "aquaculture:gold_fillet_knife",
    "sewingkit:gold_sewing_needle",
    "minecraft:golden_sword",
    "minecraft:golden_hoe",
    "minecraft:golden_axe",
    "minecraft:golden_pickaxe",
    "minecraft:golden_shovel",
    "justhammers:gold_reinforced_impact_hammer",
    "justhammers:gold_destructor_hammer",
    "justhammers:gold_impact_hammer",
    "justhammers:gold_reinforced_hammer",
    "justhammers:gold_hammer",
  ];
  goldTools.forEach((tool) => modify(tool, (item) => multiplyMaxDamage(item, tool.namespace === "justhammers" ? 2 : 16)));
  [
    ["minecraft:golden_helmet", 2.5],
    ["minecraft:golden_chestplate", 7],
    ["minecraft:golden_leggings", 5.5],
    ["minecraft:golden_boots", 2.5],
  ].forEach(([id, armor]) =>
    modify(id, (item) => {
      multiplyMaxDamage(item, 3);
      setArmorProtection(item, armor);
    })
  );

  modify("twigs:twig", (item) => {
    item.burnTime = 200;
  });

  // Netherite and Botania endgame gear
  modify("minecraft:netherite_sword", (item) => {
    item.attackDamage = 10;
  });
  [
    ["minecraft:netherite_helmet", 4],
    ["minecraft:netherite_chestplate", 9],
    ["minecraft:netherite_leggings", 7],
    ["minecraft:netherite_boots", 3],
    ["botania:terrasteel_helmet", 4],
    ["botania:terrasteel_chestplate", 9],
    ["botania:terrasteel_leggings", 7],
    ["botania:terrasteel_boots", 3],
  ].forEach(([id, armor]) =>
    modify(id, (item) => {
      multiplyMaxDamage(item, 1.5);
      setArmorProtection(item, armor);
    })
  );
  [
    ["botania:manasteel_sword", 7],
    ["botania:elementium_sword", 8],
    ["oreganized:electrum_sword", 8],
    ["botania:terra_sword", 10],
    ["botania:star_sword", 10],
    ["botania:thunder_sword", 10],
  ].forEach(([id, damage]) =>
    modify(id, (item) => {
      item.attackDamage = damage;
    })
  );
});
