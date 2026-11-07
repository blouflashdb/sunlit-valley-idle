package dev.sunlitidle.camp;

import net.minecraft.world.item.ItemStack;
import net.minecraftforge.items.IItemHandler;
import net.minecraftforge.items.ItemStackHandler;
import org.jetbrains.annotations.NotNull;

/**
 * The face shown to hoppers and pipes: food and spare gear can be inserted, loot can be extracted.
 * Slots 0-8 are food, 9-17 spare gear, 18-44 loot.
 */
public final class CampItemHandler implements IItemHandler {
    private final ItemStackHandler food;
    private final ItemStackHandler spare;
    private final ItemStackHandler loot;

    public CampItemHandler(ItemStackHandler food, ItemStackHandler spare, ItemStackHandler loot) {
        this.food = food;
        this.spare = spare;
        this.loot = loot;
    }

    private record Target(ItemStackHandler handler, int slot) {
    }

    private Target target(int slot) {
        if (slot < food.getSlots()) {
            return new Target(food, slot);
        }
        slot -= food.getSlots();
        if (slot < spare.getSlots()) {
            return new Target(spare, slot);
        }
        return new Target(loot, slot - spare.getSlots());
    }

    @Override
    public int getSlots() {
        return food.getSlots() + spare.getSlots() + loot.getSlots();
    }

    @Override
    public @NotNull ItemStack getStackInSlot(int slot) {
        Target t = target(slot);
        return t.handler().getStackInSlot(t.slot());
    }

    @Override
    public @NotNull ItemStack insertItem(int slot, @NotNull ItemStack stack, boolean simulate) {
        Target t = target(slot);
        if (t.handler() == loot) {
            return stack;
        }
        return t.handler().insertItem(t.slot(), stack, simulate);
    }

    @Override
    public @NotNull ItemStack extractItem(int slot, int amount, boolean simulate) {
        Target t = target(slot);
        if (t.handler() != loot) {
            return ItemStack.EMPTY;
        }
        return loot.extractItem(t.slot(), amount, simulate);
    }

    @Override
    public int getSlotLimit(int slot) {
        Target t = target(slot);
        return t.handler().getSlotLimit(t.slot());
    }

    @Override
    public boolean isItemValid(int slot, @NotNull ItemStack stack) {
        Target t = target(slot);
        return t.handler() != loot && t.handler().isItemValid(t.slot(), stack);
    }
}
