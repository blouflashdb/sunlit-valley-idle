package dev.sunlitidle.idle;

import net.minecraft.world.item.ItemStack;

/** One kind of item in idle storage. {@code prototype} has count 1 and carries the item's data components. */
public final class StoredStack {
    private final ItemStack prototype;
    private long count;

    public StoredStack(ItemStack prototype, long count) {
        this.prototype = prototype.copyWithCount(1);
        this.count = count;
    }

    public ItemStack prototype() {
        return prototype;
    }

    public long count() {
        return count;
    }

    public void add(long amount) {
        count += amount;
    }

    public boolean matches(ItemStack stack) {
        return ItemStack.isSameItemSameComponents(prototype, stack);
    }
}
