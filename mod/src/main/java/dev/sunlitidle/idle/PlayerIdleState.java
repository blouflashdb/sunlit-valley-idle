package dev.sunlitidle.idle;

import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.Tag;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.items.ItemStackHandler;
import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Everything the idle system remembers about one player. */
public final class PlayerIdleState {
    private final String[] slotActions = new String[IdleMath.maxSlots()];
    private final double[] slotProgress = new double[IdleMath.maxSlots()];
    private final SlotStatus[] slotStatus = new SlotStatus[IdleMath.maxSlots()];
    private final double[] slotSeconds = new double[IdleMath.maxSlots()];
    private final List<StoredStack> storage = new ArrayList<>();
    /** XP per skill, used only when Pufferfish's Skills is not installed. */
    private final Map<String, Long> fallbackXp = new HashMap<>();
    private final ItemStackHandler tools;
    /** Companion armor, head to feet (the weapon sits in the Adventuring tool slot). */
    private final ItemStackHandler armor;
    /** Companion food. Each slot refills itself from storage with the same item. */
    private final ItemStackHandler food;
    private double foodBuffer;
    private long lastSeen;
    private double offlineSeconds;
    private double caughtUpSeconds;
    private long caughtUpItems;
    private Runnable onChange = () -> {
    };

    public PlayerIdleState() {
        int skillCount = Math.max(1, IdleCatalog.skills().size());
        tools = new ItemStackHandler(skillCount) {
            @Override
            public boolean isItemValid(int slot, @NotNull ItemStack stack) {
                IdleSkill skill = IdleCatalog.skill(slot);
                return skill != null && skill.tool().matches(stack);
            }

            @Override
            public int getSlotLimit(int slot) {
                return 1;
            }

            @Override
            protected void onContentsChanged(int slot) {
                markDirty();
            }
        };
        armor = new ItemStackHandler(ARMOR_SLOTS) {
            @Override
            public boolean isItemValid(int slot, @NotNull ItemStack stack) {
                return dev.sunlitidle.combat.Gear.fitsGearSlot(slot + 1, stack);
            }

            @Override
            public int getSlotLimit(int slot) {
                return 1;
            }

            @Override
            protected void onContentsChanged(int slot) {
                markDirty();
            }
        };
        food = new ItemStackHandler(FOOD_SLOTS) {
            @Override
            public boolean isItemValid(int slot, @NotNull ItemStack stack) {
                return stack.isEdible();
            }

            @Override
            protected void onContentsChanged(int slot) {
                markDirty();
            }
        };
        for (int i = 0; i < slotStatus.length; i++) {
            slotStatus[i] = SlotStatus.EMPTY;
        }
    }

    public static final int ARMOR_SLOTS = 4;
    public static final int FOOD_SLOTS = 4;

    public ItemStackHandler armor() {
        return armor;
    }

    public ItemStackHandler food() {
        return food;
    }

    public double foodBuffer() {
        return foodBuffer;
    }

    void setFoodBuffer(double foodBuffer) {
        this.foodBuffer = foodBuffer;
    }

    void setOnChange(Runnable onChange) {
        this.onChange = onChange;
    }

    public void markDirty() {
        onChange.run();
    }

    // ---------------------------------------------------------------- slots

    public String slotAction(int slot) {
        return slotActions[slot];
    }

    public void setSlotAction(int slot, String actionKey) {
        if (actionKey == null || !actionKey.equals(slotActions[slot])) {
            slotProgress[slot] = 0.0;
        }
        slotActions[slot] = actionKey;
        slotStatus[slot] = actionKey == null ? SlotStatus.EMPTY : SlotStatus.RUNNING;
        markDirty();
    }

    public double slotProgress(int slot) {
        return slotProgress[slot];
    }

    void setSlotProgress(int slot, double seconds) {
        slotProgress[slot] = seconds;
    }

    public SlotStatus slotStatus(int slot) {
        return slotStatus[slot];
    }

    void setSlotStatus(int slot, SlotStatus status) {
        slotStatus[slot] = status;
    }

    /** Seconds one completion takes right now, for the progress bar. */
    public double slotSeconds(int slot) {
        return slotSeconds[slot];
    }

    void setSlotSeconds(int slot, double seconds) {
        slotSeconds[slot] = seconds;
    }

    // ---------------------------------------------------------------- tools

    public ItemStackHandler tools() {
        return tools;
    }

    // ---------------------------------------------------------------- storage

    public List<StoredStack> storage() {
        return storage;
    }

    public void store(ItemStack stack) {
        if (stack.isEmpty()) {
            return;
        }
        for (StoredStack stored : storage) {
            if (stored.matches(stack)) {
                stored.add(stack.getCount());
                markDirty();
                return;
            }
        }
        storage.add(new StoredStack(stack, stack.getCount()));
        markDirty();
    }

    public long countOf(ResourceLocation itemId) {
        long total = 0;
        for (StoredStack stored : storage) {
            if (itemId.equals(net.minecraftforge.registries.ForgeRegistries.ITEMS.getKey(stored.prototype().getItem()))) {
                total += stored.count();
            }
        }
        return total;
    }

    /** Removes items of this id, any NBT. Returns false and removes nothing when there are not enough. */
    public boolean take(ResourceLocation itemId, long amount) {
        if (countOf(itemId) < amount) {
            return false;
        }
        long left = amount;
        for (int i = storage.size() - 1; i >= 0 && left > 0; i--) {
            StoredStack stored = storage.get(i);
            if (itemId.equals(net.minecraftforge.registries.ForgeRegistries.ITEMS.getKey(stored.prototype().getItem()))) {
                long used = Math.min(left, stored.count());
                stored.add(-used);
                left -= used;
                if (stored.count() <= 0) {
                    storage.remove(i);
                }
            }
        }
        markDirty();
        return true;
    }

    /** Removes one item that matches the ingredient. */
    public boolean takeMatching(net.minecraft.world.item.crafting.Ingredient ingredient) {
        for (int i = 0; i < storage.size(); i++) {
            StoredStack stored = storage.get(i);
            if (stored.count() > 0 && ingredient.test(stored.prototype())) {
                stored.add(-1);
                if (stored.count() <= 0) {
                    storage.remove(i);
                }
                markDirty();
                return true;
            }
        }
        return false;
    }

    /** Takes up to one stack of the entry at {@code index} out of storage. */
    public ItemStack withdraw(int index, int max) {
        if (index < 0 || index >= storage.size()) {
            return ItemStack.EMPTY;
        }
        StoredStack stored = storage.get(index);
        int amount = (int) Math.min(Math.min(max, stored.prototype().getMaxStackSize()), stored.count());
        if (amount <= 0) {
            return ItemStack.EMPTY;
        }
        stored.add(-amount);
        if (stored.count() <= 0) {
            storage.remove(index);
        }
        markDirty();
        return stored.prototype().copyWithCount(amount);
    }

    // ---------------------------------------------------------------- offline time

    public long lastSeen() {
        return lastSeen;
    }

    public void setLastSeen(long lastSeen) {
        this.lastSeen = lastSeen;
    }

    public double offlineSeconds() {
        return offlineSeconds;
    }

    public void addOfflineSeconds(double seconds) {
        offlineSeconds += seconds;
        markDirty();
    }

    double drainOffline(double max) {
        double used = Math.min(max, offlineSeconds);
        offlineSeconds -= used;
        return used;
    }

    void addCaughtUp(double seconds, long items) {
        caughtUpSeconds += seconds;
        caughtUpItems += items;
    }

    double caughtUpSeconds() {
        return caughtUpSeconds;
    }

    long caughtUpItems() {
        return caughtUpItems;
    }

    void resetCaughtUp() {
        caughtUpSeconds = 0;
        caughtUpItems = 0;
    }

    // ---------------------------------------------------------------- fallback levels

    public long fallbackXp(String skillId) {
        return fallbackXp.getOrDefault(skillId, 0L);
    }

    public void addFallbackXp(String skillId, long amount) {
        fallbackXp.merge(skillId, amount, Long::sum);
        markDirty();
    }

    // ---------------------------------------------------------------- save

    public CompoundTag save() {
        CompoundTag tag = new CompoundTag();
        ListTag slots = new ListTag();
        for (int i = 0; i < slotActions.length; i++) {
            CompoundTag s = new CompoundTag();
            if (slotActions[i] != null) {
                s.putString("Action", slotActions[i]);
            }
            s.putDouble("Progress", slotProgress[i]);
            slots.add(s);
        }
        tag.put("Slots", slots);
        tag.put("Tools", tools.serializeNBT());
        tag.put("Armor", armor.serializeNBT());
        tag.put("Food", food.serializeNBT());
        tag.putDouble("FoodBuffer", foodBuffer);
        ListTag items = new ListTag();
        for (StoredStack stored : storage) {
            CompoundTag s = new CompoundTag();
            s.put("Item", stored.prototype().save(new CompoundTag()));
            s.putLong("Count", stored.count());
            items.add(s);
        }
        tag.put("Storage", items);
        CompoundTag xp = new CompoundTag();
        fallbackXp.forEach(xp::putLong);
        tag.put("FallbackXp", xp);
        tag.putLong("LastSeen", lastSeen);
        tag.putDouble("OfflineSeconds", offlineSeconds);
        return tag;
    }

    /** Skills can be added between versions, which shifts tool slots: move tools back to a matching slot. */
    private void fixMisplacedTools() {
        for (int i = 0; i < tools.getSlots(); i++) {
            ItemStack tool = tools.getStackInSlot(i);
            IdleSkill skill = IdleCatalog.skill(i);
            if (tool.isEmpty() || (skill != null && skill.tool().matches(tool))) {
                continue;
            }
            tools.setStackInSlot(i, ItemStack.EMPTY);
            boolean placed = false;
            for (int j = 0; j < tools.getSlots() && !placed; j++) {
                IdleSkill other = IdleCatalog.skill(j);
                if (tools.getStackInSlot(j).isEmpty() && other != null && other.tool().matches(tool)) {
                    tools.setStackInSlot(j, tool);
                    placed = true;
                }
            }
            if (!placed) {
                store(tool);
            }
        }
    }

    public static PlayerIdleState load(CompoundTag tag) {
        PlayerIdleState state = new PlayerIdleState();
        ListTag slots = tag.getList("Slots", Tag.TAG_COMPOUND);
        for (int i = 0; i < slots.size() && i < state.slotActions.length; i++) {
            CompoundTag s = slots.getCompound(i);
            state.slotActions[i] = s.contains("Action") ? s.getString("Action") : null;
            state.slotProgress[i] = s.getDouble("Progress");
            state.slotStatus[i] = state.slotActions[i] == null ? SlotStatus.EMPTY : SlotStatus.RUNNING;
        }
        CompoundTag tools = tag.getCompound("Tools");
        // Keep the handler size even if the number of skills changed between versions.
        tools.putInt("Size", state.tools.getSlots());
        state.tools.deserializeNBT(tools);
        if (tag.contains("Armor")) {
            CompoundTag armor = tag.getCompound("Armor");
            armor.putInt("Size", ARMOR_SLOTS);
            state.armor.deserializeNBT(armor);
        }
        if (tag.contains("Food")) {
            CompoundTag food = tag.getCompound("Food");
            food.putInt("Size", FOOD_SLOTS);
            state.food.deserializeNBT(food);
        }
        state.foodBuffer = tag.getDouble("FoodBuffer");
        ListTag items = tag.getList("Storage", Tag.TAG_COMPOUND);
        for (int i = 0; i < items.size(); i++) {
            CompoundTag s = items.getCompound(i);
            ItemStack proto = ItemStack.of(s.getCompound("Item"));
            long count = s.getLong("Count");
            if (!proto.isEmpty() && count > 0) {
                state.storage.add(new StoredStack(proto, count));
            }
        }
        CompoundTag xp = tag.getCompound("FallbackXp");
        for (String key : xp.getAllKeys()) {
            state.fallbackXp.put(key, xp.getLong(key));
        }
        state.lastSeen = tag.getLong("LastSeen");
        state.offlineSeconds = tag.getDouble("OfflineSeconds");
        state.fixMisplacedTools();
        return state;
    }
}
