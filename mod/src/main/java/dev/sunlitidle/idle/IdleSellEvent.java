package dev.sunlitidle.idle;

import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.eventbus.api.Event;
import net.minecraftforge.items.ItemStackHandler;

import java.util.ArrayList;
import java.util.List;

/**
 * Posted on the Forge event bus when the player sells from idle storage. The pack's KubeJS script prices the
 * items with the shipping bin rules, empties the slots it sold and adds the coins to {@link #payout()}.
 * Slots left untouched stay in storage.
 */
public class IdleSellEvent extends Event {
    private final ServerPlayer player;
    private final ItemStackHandler items;
    private final List<ItemStack> payout = new ArrayList<>();
    private long value;

    public IdleSellEvent(ServerPlayer player, ItemStackHandler items) {
        this.player = player;
        this.items = items;
    }

    public ServerPlayer getPlayer() {
        return player;
    }

    public ItemStackHandler getItems() {
        return items;
    }

    public List<ItemStack> payout() {
        return payout;
    }

    public void addPayout(ItemStack stack) {
        if (!stack.isEmpty()) {
            payout.add(stack);
        }
    }

    public long getValue() {
        return value;
    }

    public void setValue(long value) {
        this.value = value;
    }
}
