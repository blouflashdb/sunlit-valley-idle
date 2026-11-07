package dev.sunlitidle.idle;

import dev.sunlitidle.ModRegistry;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.inventory.AbstractContainerMenu;
import net.minecraft.world.inventory.Slot;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.items.IItemHandler;
import net.minecraftforge.items.ItemStackHandler;
import net.minecraftforge.items.SlotItemHandler;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * The idle skills window. Holds the tool slots (one per skill) and the player inventory; everything else
 * (levels, action slots, storage) is sent with {@link dev.sunlitidle.network.IdleSyncPacket}.
 */
public class IdleMenu extends AbstractContainerMenu {
    // Layout, shared with the screen.
    public static final int TAB_X = 6;
    public static final int TAB_Y = 18;
    public static final int TAB_STEP = 24;
    public static final int TOOL_X = 32;
    public static final int INV_X = 64;
    public static final int INV_Y = 166;
    public static final int HOTBAR_Y = 224;

    private final int toolCount;
    @Nullable
    private final PlayerIdleState state;

    public static IdleMenu fromNetwork(int windowId, Inventory inventory, FriendlyByteBuf buf) {
        return new IdleMenu(windowId, inventory, null);
    }

    public IdleMenu(int windowId, Inventory inventory, @Nullable PlayerIdleState state) {
        super(ModRegistry.IDLE_MENU.get(), windowId);
        this.state = state;
        IItemHandler tools = state != null ? state.tools() : new ItemStackHandler(Math.max(1, IdleCatalog.skills().size()));
        toolCount = tools.getSlots();
        for (int i = 0; i < toolCount; i++) {
            final IdleSkill skill = IdleCatalog.skill(i);
            addSlot(new SlotItemHandler(tools, i, TOOL_X, TAB_Y + 3 + i * TAB_STEP) {
                @Override
                public boolean mayPlace(@NotNull ItemStack stack) {
                    return skill != null && skill.tool().matches(stack);
                }

                @Override
                public int getMaxStackSize() {
                    return 1;
                }

                @Override
                public boolean isActive() {
                    return skill != null && skill.tool() != ToolKind.NONE;
                }
            });
        }
        for (int row = 0; row < 3; row++) {
            for (int col = 0; col < 9; col++) {
                addSlot(new Slot(inventory, col + row * 9 + 9, INV_X + col * 18, INV_Y + row * 18));
            }
        }
        for (int col = 0; col < 9; col++) {
            addSlot(new Slot(inventory, col, INV_X + col * 18, HOTBAR_Y));
        }
    }

    @Override
    public boolean stillValid(Player player) {
        return true;
    }

    /** Shift-click: tools go to their tool slot, everything else into idle storage. */
    @Override
    public ItemStack quickMoveStack(Player player, int index) {
        Slot slot = slots.get(index);
        if (!slot.hasItem()) {
            return ItemStack.EMPTY;
        }
        ItemStack stack = slot.getItem();
        ItemStack original = stack.copy();
        if (index < toolCount) {
            if (!moveItemStackTo(stack, toolCount, slots.size(), true)) {
                return ItemStack.EMPTY;
            }
        } else {
            boolean moved = false;
            for (int i = 0; i < toolCount && !moved; i++) {
                Slot toolSlot = slots.get(i);
                if (!toolSlot.hasItem() && toolSlot.mayPlace(stack)) {
                    moved = moveItemStackTo(stack, i, i + 1, false);
                }
            }
            if (!moved) {
                if (state != null && player instanceof ServerPlayer) {
                    state.store(stack.copy());
                }
                stack.setCount(0);
            }
        }
        if (stack.isEmpty()) {
            slot.setByPlayer(ItemStack.EMPTY);
        } else {
            slot.setChanged();
        }
        if (stack.getCount() == original.getCount()) {
            return ItemStack.EMPTY;
        }
        slot.onTake(player, stack);
        // Deposits empty the slot fully; returning EMPTY stops the vanilla shift-click loop from repeating.
        return stack.isEmpty() && index >= toolCount ? ItemStack.EMPTY : original;
    }
}
