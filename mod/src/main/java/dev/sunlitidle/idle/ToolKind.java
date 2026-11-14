package dev.sunlitidle.idle;

import net.minecraft.tags.BlockTags;
import net.minecraft.tags.TagKey;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Tier;
import net.minecraft.world.item.TieredItem;
import net.minecraft.world.item.enchantment.Enchantments;
import net.minecraft.world.level.block.Block;
import net.neoforged.neoforge.common.ItemAbilities;
import net.neoforged.neoforge.common.ItemAbility;

import java.util.Locale;

/** The tool a skill takes in its tool slot. Matched by NeoForge item abilities, so modded tools work too. */
public enum ToolKind {
    NONE(null),
    AXE(ItemAbilities.AXE_DIG),
    PICKAXE(ItemAbilities.PICKAXE_DIG),
    SHOVEL(ItemAbilities.SHOVEL_DIG),
    HOE(ItemAbilities.HOE_DIG),
    ROD(ItemAbilities.FISHING_ROD_CAST),
    SHEARS(ItemAbilities.SHEARS_DIG),
    /** Anything with attack damage; checked in {@link #matches}. */
    WEAPON(null),
    /** Archaeology brush; checked in {@link #matches}. */
    BRUSH(null);

    private final ItemAbility ability;

    ToolKind(ItemAbility ability) {
        this.ability = ability;
    }

    public boolean matches(ItemStack stack) {
        if (this == BRUSH) {
            return stack.getItem() instanceof net.minecraft.world.item.BrushItem;
        }
        if (this == WEAPON) {
            return dev.sunlitidle.combat.Gear.isWeapon(stack);
        }
        return ability != null && !stack.isEmpty() && stack.canPerformAction(ability);
    }

    /**
     * Harvest tier level of a tool: wood and gold 0, stone 1, iron 2, diamond 3, netherite 4. Tiers have no
     * level number since 1.20.5, so this goes by the tag of blocks the tier cannot harvest, which modded tiers
     * reuse from vanilla.
     */
    public static int tierLevel(ItemStack stack) {
        if (!(stack.getItem() instanceof TieredItem tiered)) {
            return 0;
        }
        Tier tier = tiered.getTier();
        TagKey<Block> incorrect = tier.getIncorrectBlocksForDrops();
        if (incorrect.equals(BlockTags.INCORRECT_FOR_NETHERITE_TOOL)) {
            return 4;
        }
        if (incorrect.equals(BlockTags.INCORRECT_FOR_DIAMOND_TOOL)) {
            return 3;
        }
        if (incorrect.equals(BlockTags.INCORRECT_FOR_IRON_TOOL)) {
            return 2;
        }
        if (incorrect.equals(BlockTags.INCORRECT_FOR_STONE_TOOL)) {
            return 1;
        }
        return 0;
    }

    public static int efficiency(ItemStack stack) {
        return Enchants.level(stack, Enchantments.EFFICIENCY);
    }

    public static ToolKind byName(String name) {
        try {
            return valueOf(name.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return NONE;
        }
    }

    public String translationKey() {
        return "sunlitidle.tool." + name().toLowerCase(Locale.ROOT);
    }
}
