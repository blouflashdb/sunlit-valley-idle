package dev.sunlitidle.idle;

import it.unimi.dsi.fastutil.objects.Object2IntMap;
import net.minecraft.core.Holder;
import net.minecraft.core.component.DataComponents;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.enchantment.Enchantment;
import net.minecraft.world.item.enchantment.ItemEnchantments;

/**
 * Enchantment levels by key. Enchantments are data driven since 1.21, so this reads the stack's enchantments
 * directly and works on both sides without a registry lookup.
 */
public final class Enchants {
    private Enchants() {
    }

    public static int level(ItemStack stack, ResourceKey<Enchantment> key) {
        if (stack.isEmpty()) {
            return 0;
        }
        ItemEnchantments enchantments = stack.getOrDefault(DataComponents.ENCHANTMENTS, ItemEnchantments.EMPTY);
        for (Object2IntMap.Entry<Holder<Enchantment>> entry : enchantments.entrySet()) {
            if (entry.getKey().is(key)) {
                return entry.getIntValue();
            }
        }
        return 0;
    }

    /** Extra melee damage from Sharpness, as vanilla computes it (0.5 per level plus 0.5). */
    public static double sharpnessBonus(ItemStack weapon) {
        int level = level(weapon, net.minecraft.world.item.enchantment.Enchantments.SHARPNESS);
        return level > 0 ? 0.5 * level + 0.5 : 0.0;
    }
}
