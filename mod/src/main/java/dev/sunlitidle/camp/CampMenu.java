package dev.sunlitidle.camp;

import dev.sunlitidle.ModRegistry;
import net.minecraft.core.BlockPos;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.inventory.AbstractContainerMenu;
import net.minecraft.world.inventory.ContainerData;
import net.minecraft.world.inventory.ContainerLevelAccess;
import net.minecraft.world.inventory.SimpleContainerData;
import net.minecraft.world.inventory.Slot;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.items.IItemHandler;
import net.minecraftforge.items.ItemStackHandler;
import net.minecraftforge.items.SlotItemHandler;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

public class CampMenu extends AbstractContainerMenu {
    public static final int DATA_LEVEL = 0;
    public static final int DATA_XP = 1;
    public static final int DATA_XP_NEXT = 2;
    public static final int DATA_POINTS = 3;
    public static final int DATA_TIER = 4;
    public static final int DATA_MAX_TIER = 5;
    public static final int DATA_MAX_HP = 6;
    public static final int DATA_FOOD = 7;
    public static final int DATA_STATUS = 8;
    public static final int DATA_PROGRESS = 9;
    public static final int DATA_KILL_TICKS = 10;
    public static final int DATA_POWER = 11;
    public static final int DATA_TIER_POWER = 12;
    public static final int DATA_RETREAT = 13;
    public static final int DATA_STATS = 14;
    public static final int DATA_COUNT = DATA_STATS + Stat.values().length;

    public static final int BUTTON_TIER_DOWN = 0;
    public static final int BUTTON_TIER_UP = 1;
    public static final int BUTTON_STAT = 2;

    // Layout, shared with the screen.
    public static final int GRID_X = 30;
    public static final int GEAR_X = 8;
    public static final int GEAR_Y = 28;
    public static final int FOOD_Y = 28;
    public static final int SPARE_Y = 58;
    public static final int LOOT_Y = 88;
    public static final int INV_Y = 156;
    public static final int HOTBAR_Y = 214;

    private static final int GEAR_END = AdventurerCampBlockEntity.GEAR_SLOTS;
    private static final int SPARE_END = GEAR_END + AdventurerCampBlockEntity.SPARE_SLOTS;
    private static final int FOOD_END = SPARE_END + AdventurerCampBlockEntity.FOOD_SLOTS;
    private static final int LOOT_END = FOOD_END + AdventurerCampBlockEntity.LOOT_SLOTS;
    private static final int PLAYER_END = LOOT_END + 36;

    @Nullable
    private final AdventurerCampBlockEntity camp;
    private final ContainerLevelAccess access;
    private final ContainerData data;

    public static CampMenu fromNetwork(int windowId, Inventory inventory, FriendlyByteBuf buf) {
        BlockPos pos = buf.readBlockPos();
        AdventurerCampBlockEntity camp = inventory.player.level().getBlockEntity(pos) instanceof AdventurerCampBlockEntity c ? c : null;
        return new CampMenu(windowId, inventory, camp, new SimpleContainerData(DATA_COUNT),
                ContainerLevelAccess.create(inventory.player.level(), pos));
    }

    public CampMenu(int windowId, Inventory inventory, AdventurerCampBlockEntity camp) {
        this(windowId, inventory, camp, camp.data(), ContainerLevelAccess.create(camp.getLevel(), camp.getBlockPos()));
    }

    private CampMenu(int windowId, Inventory inventory, @Nullable AdventurerCampBlockEntity camp, ContainerData data,
                     ContainerLevelAccess access) {
        super(ModRegistry.CAMP_MENU.get(), windowId);
        this.camp = camp;
        this.access = access;
        this.data = data;

        IItemHandler gear = camp != null ? camp.gear() : new ItemStackHandler(AdventurerCampBlockEntity.GEAR_SLOTS);
        IItemHandler spare = camp != null ? camp.spare() : new ItemStackHandler(AdventurerCampBlockEntity.SPARE_SLOTS);
        IItemHandler food = camp != null ? camp.food() : new ItemStackHandler(AdventurerCampBlockEntity.FOOD_SLOTS);
        IItemHandler loot = camp != null ? camp.loot() : new ItemStackHandler(AdventurerCampBlockEntity.LOOT_SLOTS);

        for (int i = 0; i < AdventurerCampBlockEntity.GEAR_SLOTS; i++) {
            final int gearSlot = i;
            addSlot(new SlotItemHandler(gear, i, GEAR_X, GEAR_Y + i * 18) {
                @Override
                public boolean mayPlace(@NotNull ItemStack stack) {
                    return AdventurerCampBlockEntity.fitsGearSlot(gearSlot, stack);
                }

                @Override
                public int getMaxStackSize() {
                    return 1;
                }
            });
        }
        for (int i = 0; i < AdventurerCampBlockEntity.SPARE_SLOTS; i++) {
            addSlot(new SlotItemHandler(spare, i, GRID_X + i * 18, SPARE_Y) {
                @Override
                public boolean mayPlace(@NotNull ItemStack stack) {
                    return AdventurerCampBlockEntity.isGear(stack);
                }
            });
        }
        for (int i = 0; i < AdventurerCampBlockEntity.FOOD_SLOTS; i++) {
            addSlot(new SlotItemHandler(food, i, GRID_X + i * 18, FOOD_Y) {
                @Override
                public boolean mayPlace(@NotNull ItemStack stack) {
                    return stack.isEdible();
                }
            });
        }
        for (int i = 0; i < AdventurerCampBlockEntity.LOOT_SLOTS; i++) {
            addSlot(new SlotItemHandler(loot, i, GRID_X + (i % 9) * 18, LOOT_Y + (i / 9) * 18) {
                @Override
                public boolean mayPlace(@NotNull ItemStack stack) {
                    return false;
                }
            });
        }
        for (int row = 0; row < 3; row++) {
            for (int col = 0; col < 9; col++) {
                addSlot(new Slot(inventory, col + row * 9 + 9, GRID_X + col * 18, INV_Y + row * 18));
            }
        }
        for (int col = 0; col < 9; col++) {
            addSlot(new Slot(inventory, col, GRID_X + col * 18, HOTBAR_Y));
        }
        addDataSlots(data);
    }

    public int get(int index) {
        return data.get(index);
    }

    @Override
    public boolean clickMenuButton(Player player, int id) {
        return camp != null && camp.handleButton(id);
    }

    @Override
    public boolean stillValid(Player player) {
        return stillValid(access, player, ModRegistry.ADVENTURERS_CAMP.get());
    }

    @Override
    public ItemStack quickMoveStack(Player player, int index) {
        Slot slot = slots.get(index);
        if (!slot.hasItem()) {
            return ItemStack.EMPTY;
        }
        ItemStack stack = slot.getItem();
        ItemStack original = stack.copy();
        if (index < LOOT_END) {
            if (!moveItemStackTo(stack, LOOT_END, PLAYER_END, true)) {
                return ItemStack.EMPTY;
            }
        } else {
            boolean moved = false;
            if (stack.isEdible()) {
                moved = moveItemStackTo(stack, SPARE_END, FOOD_END, false);
            }
            if (!moved && AdventurerCampBlockEntity.isGear(stack)) {
                moved = moveItemStackTo(stack, 0, GEAR_END, false) || moveItemStackTo(stack, GEAR_END, SPARE_END, false);
            }
            if (!moved) {
                return ItemStack.EMPTY;
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
        return original;
    }
}
