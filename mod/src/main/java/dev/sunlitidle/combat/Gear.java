package dev.sunlitidle.combat;

import dev.sunlitidle.SunlitIdle;
import net.minecraft.core.Holder;
import net.minecraft.core.component.TypedDataComponent;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.NbtOps;
import net.minecraft.nbt.NumericTag;
import net.minecraft.nbt.Tag;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.food.FoodProperties;
import net.minecraft.world.item.Equipable;
import net.minecraft.world.item.ItemStack;

/** Item checks for the Adventuring companion's gear and food. */
public final class Gear {
    /** Gear slot order: weapon, then armor from head to feet. */
    public static final EquipmentSlot[] GEAR_ORDER = {
            EquipmentSlot.MAINHAND, EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS, EquipmentSlot.FEET};
    private static final String QUALITY_FOOD = "quality_food";

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
        Equipable equipable = Equipable.get(stack);
        return equipable != null && equipable.getEquipmentSlot() == target
                && attributeSum(stack, target, Attributes.ARMOR) > 0.0;
    }

    /** Sum of the flat ("add value") modifiers of this attribute that the stack gives in this slot. */
    public static double attributeSum(ItemStack stack, EquipmentSlot slot, Holder<Attribute> attribute) {
        double[] sum = {0.0};
        stack.getAttributeModifiers().forEach(slot, (holder, modifier) -> {
            if (holder.is(attribute) && modifier.operation() == AttributeModifier.Operation.ADD_VALUE) {
                sum[0] += modifier.amount();
            }
        });
        return sum[0];
    }

    public static boolean isFood(ItemStack stack) {
        return !stack.isEmpty() && stack.getFoodProperties(null) != null;
    }

    /** Nutrition of one item, with the quality bonus used by the pack's quality_food mod. */
    public static double nutritionOf(ItemStack stack) {
        FoodProperties props = stack.getFoodProperties(null);
        if (props == null) {
            return 0.0;
        }
        double nutrition = props.nutrition();
        nutrition *= switch (quality(stack)) {
            case 1 -> 1.25;
            case 2 -> 1.5;
            case 3 -> 2.0;
            default -> 1.0;
        };
        return nutrition;
    }

    /**
     * Food quality from the quality_food mod (0 when the item has none), read without a compile dependency:
     * any data component of that mod that encodes to a number, or to a compound with a "quality" or "level".
     */
    public static int quality(ItemStack stack) {
        for (TypedDataComponent<?> component : stack.getComponents()) {
            ResourceLocation id = BuiltInRegistries.DATA_COMPONENT_TYPE.getKey(component.type());
            if (id == null || !id.getNamespace().equals(QUALITY_FOOD)) {
                continue;
            }
            try {
                Tag tag = component.encodeValue(NbtOps.INSTANCE).result().orElse(null);
                if (tag instanceof NumericTag number) {
                    return number.getAsInt();
                }
                if (tag instanceof CompoundTag compound) {
                    if (compound.contains("quality")) {
                        return compound.getInt("quality");
                    }
                    if (compound.contains("level")) {
                        return compound.getInt("level");
                    }
                }
            } catch (RuntimeException e) {
                SunlitIdle.LOGGER.debug("Could not read food quality from {}", id, e);
            }
        }
        return 0;
    }
}
