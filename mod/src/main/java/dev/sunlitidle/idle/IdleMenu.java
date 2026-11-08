package dev.sunlitidle.idle;

import dev.sunlitidle.ModRegistry;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.inventory.AbstractContainerMenu;
import net.minecraft.world.inventory.Slot;
import net.minecraft.world.item.ItemStack;
import net.neoforged.neoforge.items.IItemHandler;
import net.neoforged.neoforge.items.ItemStackHandler;
import net.neoforged.neoforge.items.SlotItemHandler;
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
    public static final int TAB_STEP = 19;
    public static final int TAB_SIZE = 18;
    public static final int TOOL_X = 28;
    public static final int MID_X = 50;
    public static final int INV_X = 58;
    public static final int INV_Y = 174;
    public static final int HOTBAR_Y = 232;
    /** Companion loadout row, shown on the Adventuring tab. */
    public static final int GEAR_Y = 67;
    public static final int FOOD_X = MID_X + 4 * 18 + 12;

    private final int toolCount;
    private final int armorEnd;
    private final int foodEnd;
    /** Client only: whether the Adventuring tab is open, which shows the armor and food slots. */
    public boolean showCompanion;
    @Nullable
    private final PlayerIdleState state;

    public static IdleMenu fromNetwork(int windowId, Inventory inventory, RegistryFriendlyByteBuf buf) {
        return new IdleMenu(windowId, inventory, null);
    }

    public IdleMenu(int windowId, Inventory inventory, @Nullable PlayerIdleState state) {
        super(ModRegistry.IDLE_MENU.get(), windowId);
        this.state = state;
        IItemHandler tools = state != null ? state.tools() : new ItemStackHandler(Math.max(1, IdleCatalog.skills().size()));
        toolCount = tools.getSlots();
        for (int i = 0; i < toolCount; i++) {
            final IdleSkill skill = IdleCatalog.skill(i);
            addSlot(new SlotItemHandler(tools, i, TOOL_X, TAB_Y + 1 + i * TAB_STEP) {
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
        IItemHandler armor = state != null ? state.armor() : new ItemStackHandler(PlayerIdleState.ARMOR_SLOTS);
        IItemHandler food = state != null ? state.food() : new ItemStackHandler(PlayerIdleState.FOOD_SLOTS);
        for (int i = 0; i < armor.getSlots(); i++) {
            final int gearSlot = i + 1;
            addSlot(new SlotItemHandler(armor, i, MID_X + 1 + i * 18, GEAR_Y) {
                @Override
                public boolean mayPlace(@NotNull ItemStack stack) {
                    return dev.sunlitidle.combat.Gear.fitsGearSlot(gearSlot, stack);
                }

                @Override
                public int getMaxStackSize() {
                    return 1;
                }

                @Override
                public boolean isActive() {
                    return showCompanion;
                }
            });
        }
        armorEnd = slots.size();
        for (int i = 0; i < food.getSlots(); i++) {
            addSlot(new SlotItemHandler(food, i, FOOD_X + i * 18, GEAR_Y) {
                @Override
                public boolean mayPlace(@NotNull ItemStack stack) {
                    return dev.sunlitidle.combat.Gear.isFood(stack);
                }

                @Override
                public boolean isActive() {
                    return showCompanion;
                }
            });
        }
        foodEnd = slots.size();
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

    /**
     * Shift-click: tools go to their tool slot, armor to the companion, food to a food slot that already holds
     * the same item, everything else into idle storage.
     */
    @Override
    public ItemStack quickMoveStack(Player player, int index) {
        Slot slot = slots.get(index);
        if (!slot.hasItem()) {
            return ItemStack.EMPTY;
        }
        ItemStack stack = slot.getItem();
        ItemStack original = stack.copy();
        if (index < foodEnd) {
            if (!moveItemStackTo(stack, foodEnd, slots.size(), true)) {
                return ItemStack.EMPTY;
            }
        } else {
            boolean moved = false;
            for (int i = 0; i < armorEnd && !moved; i++) {
                Slot target = slots.get(i);
                if (!target.hasItem() && target.mayPlace(stack)) {
                    moved = moveItemStackTo(stack, i, i + 1, false);
                }
            }
            for (int i = armorEnd; i < foodEnd && !moved; i++) {
                Slot target = slots.get(i);
                if (target.hasItem() && ItemStack.isSameItemSameComponents(target.getItem(), stack)) {
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
        return stack.isEmpty() && index >= foodEnd ? ItemStack.EMPTY : original;
    }
}
