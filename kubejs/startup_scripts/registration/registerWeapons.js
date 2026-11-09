console.info("[SOCIETY] registerWeapons.js loaded");

// Prismatic weapons (#18): the 1.20.1 "prismatic" tool tier (1000 uses, +2 attack damage, enchantability 14,
// repaired with a Prismatic Shard), applied to a diamond tier per item. The repair ingredient is a tag
// (kubejs/data/society/tags/item/prismatic_shards.json): the shard item does not exist yet while items register.
// As on 1.20.1, speed() sets the tier's speed and the attack speed keeps the sword/axe baseline.
const prismaticTier = (tier) => {
  tier.setUses(1000);
  tier.setAttackDamageBonus(2.0);
  tier.setEnchantmentValue(14);
  tier.setRepairIngredient(Ingredient.of("#society:prismatic_shards"));
};

StartupEvents.registry("item", (e) => {
  [
    { id: "galaxy_sword", type: "sword", damage: 10.0, speed: 3.0, texture: "society:item/galaxy_sword" },
    { id: "dragontooth_axe", type: "axe", damage: 12.0, speed: 5.0, texture: "society:item/dragontooth_axe" },
    { id: "princess_hairbrush", type: "sword", damage: 6.0, speed: 3.0, texture: "society:item/artifacts/princess_hairbrush" },
    { id: "meowmageddon", type: "sword", damage: 11.0, speed: 4.0, texture: "society:item/meowmageddon" },
  ].forEach((weapon) => {
    let builder = e
      .create(`society:${weapon.id}`, weapon.type)
      .texture(weapon.texture)
      .rarity("epic")
      .tier("diamond")
      .modifyTier(prismaticTier)
      .attackDamageBaseline(weapon.damage)
      .speed(weapon.speed);
    if (weapon.type === "sword") builder.tag("minecraft:swords");
  });
});
