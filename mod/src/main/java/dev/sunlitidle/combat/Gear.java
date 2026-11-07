package dev.sunlitidle.combat;

import net.minecraft.nbt.CompoundTag;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.food.FoodProperties;
import net.minecraft.world.item.ItemStack;

/** Item checks for the Adventuring companion's gear and food. */
public final class Gear {
    /** Gear slot order: weapon, then armor from head to feet. */
    public static final EquipmentSlot[] GEAR_ORDER = {
            EquipmentSlot.MAINHAND, EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS, EquipmentSlot.FEET};

    private Gear() {
    }

    public static boolean isWeapon(ItemStack stack) {
        return !stack.isEmpty() && attributeSum(stack, EquipmentSlot.MAINHAND, Attributes.ATTACK_DAMAGE) > 0.0;
    }

    /** Whether the stack fits gear slot {@code slot} (0 = weapon, 1-4 = armor from head to feet). */
    public static boolean fitsGearSlot(int slot, ItemStack stack) {
        if (stack.isEmpty()) {
            return false;
        }
        if (slot == 0) {
            return isWeapon(stack);
        }
        EquipmentSlot target = GEAR_ORDER[slot];
        return Mob.getEquipmentSlotForItem(stack) == target
                && attributeSum(stack, target, Attributes.ARMOR) > 0.0;
    }

    public static double attributeSum(ItemStack stack, EquipmentSlot slot, Attribute attribute) {
        double sum = 0.0;
        for (AttributeModifier modifier : stack.getAttributeModifiers(slot).get(attribute)) {
            if (modifier.getOperation() == AttributeModifier.Operation.ADDITION) {
                sum += modifier.getAmount();
            }
        }
        return sum;
    }

    /** Nutrition of one item, with the quality bonus used by the pack's quality_food mod. */
    public static double nutritionOf(ItemStack stack) {
        FoodProperties props = stack.getFoodProperties(null);
        if (props == null) {
            return 0.0;
        }
        double nutrition = props.getNutrition();
        CompoundTag tag = stack.getTag();
        if (tag != null && tag.contains("quality_food")) {
            int quality = tag.getCompound("quality_food").getInt("quality");
            nutrition *= switch (quality) {
                case 1 -> 1.25;
                case 2 -> 1.5;
                case 3 -> 2.0;
                default -> 1.0;
            };
        }
        return nutrition;
    }
}
