package dev.sunlitidle.idle;

import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TieredItem;
import net.minecraft.world.item.enchantment.EnchantmentHelper;
import net.minecraft.world.item.enchantment.Enchantments;
import net.minecraftforge.common.ToolAction;
import net.minecraftforge.common.ToolActions;

import java.util.Locale;

/** The tool a skill takes in its tool slot. Matched by Forge tool actions, so modded tools work too. */
public enum ToolKind {
    NONE(null),
    AXE(ToolActions.AXE_DIG),
    PICKAXE(ToolActions.PICKAXE_DIG),
    SHOVEL(ToolActions.SHOVEL_DIG),
    HOE(ToolActions.HOE_DIG),
    ROD(ToolActions.FISHING_ROD_CAST),
    SHEARS(ToolActions.SHEARS_DIG),
    /** Anything with attack damage; checked in {@link #matches}. */
    WEAPON(null),
    /** Archaeology brush; checked in {@link #matches}. */
    BRUSH(null);

    private final ToolAction action;

    ToolKind(ToolAction action) {
        this.action = action;
    }

    public boolean matches(ItemStack stack) {
        if (this == BRUSH) {
            return stack.getItem() instanceof net.minecraft.world.item.BrushItem;
        }
        if (this == WEAPON) {
            return dev.sunlitidle.combat.Gear.isWeapon(stack);
        }
        return action != null && !stack.isEmpty() && stack.canPerformAction(action);
    }

    /** Harvest tier level of a tool: wood and gold 0, stone 1, iron 2, diamond 3, netherite 4. */
    @SuppressWarnings("deprecation")
    public static int tierLevel(ItemStack stack) {
        if (stack.getItem() instanceof TieredItem tiered) {
            return tiered.getTier().getLevel();
        }
        return 0;
    }

    public static int efficiency(ItemStack stack) {
        return EnchantmentHelper.getItemEnchantmentLevel(Enchantments.BLOCK_EFFICIENCY, stack);
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
