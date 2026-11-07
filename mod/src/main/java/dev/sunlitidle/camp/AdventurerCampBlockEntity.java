package dev.sunlitidle.camp;

import dev.sunlitidle.Config;
import dev.sunlitidle.ModRegistry;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.RandomSource;
import net.minecraft.world.Containers;
import net.minecraft.world.MenuProvider;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.food.FoodProperties;
import net.minecraft.world.inventory.AbstractContainerMenu;
import net.minecraft.world.inventory.ContainerData;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.enchantment.EnchantmentHelper;
import net.minecraft.world.item.enchantment.Enchantments;
import net.minecraft.world.entity.MobType;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.storage.loot.LootParams;
import net.minecraft.world.level.storage.loot.LootTable;
import net.minecraft.world.level.storage.loot.parameters.LootContextParamSets;
import net.minecraft.world.level.storage.loot.parameters.LootContextParams;
import net.minecraft.world.phys.Vec3;
import net.minecraftforge.common.capabilities.Capability;
import net.minecraftforge.common.capabilities.ForgeCapabilities;
import net.minecraftforge.common.util.LazyOptional;
import net.minecraftforge.fml.ModList;
import net.minecraftforge.items.IItemHandler;
import net.minecraftforge.items.ItemHandlerHelper;
import net.minecraftforge.items.ItemStackHandler;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.List;
import java.util.UUID;

/**
 * Holds one companion and simulates its dungeon fights while the chunk is loaded.
 */
public class AdventurerCampBlockEntity extends BlockEntity implements MenuProvider {
    public static final int GEAR_SLOTS = 5;
    public static final int SPARE_SLOTS = 9;
    public static final int FOOD_SLOTS = 9;
    public static final int LOOT_SLOTS = 27;
    /** Gear slot order: weapon, then armor from head to feet. */
    public static final EquipmentSlot[] GEAR_ORDER = {
            EquipmentSlot.MAINHAND, EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS, EquipmentSlot.FEET};
    private static final int MIN_FREE_LOOT_SLOTS = 3;
    private static final int SKILL_XP_FLUSH_TICKS = 600;
    private static final double BASE_HEALTH = 20.0;

    private final ItemStackHandler gear = new ItemStackHandler(GEAR_SLOTS) {
        @Override
        public boolean isItemValid(int slot, @NotNull ItemStack stack) {
            return fitsGearSlot(slot, stack);
        }

        @Override
        public int getSlotLimit(int slot) {
            return 1;
        }

        @Override
        protected void onContentsChanged(int slot) {
            setChanged();
        }
    };
    private final ItemStackHandler spare = new ItemStackHandler(SPARE_SLOTS) {
        @Override
        public boolean isItemValid(int slot, @NotNull ItemStack stack) {
            return isGear(stack);
        }

        @Override
        protected void onContentsChanged(int slot) {
            setChanged();
        }
    };
    private final ItemStackHandler food = new ItemStackHandler(FOOD_SLOTS) {
        @Override
        public boolean isItemValid(int slot, @NotNull ItemStack stack) {
            return stack.isEdible();
        }

        @Override
        protected void onContentsChanged(int slot) {
            setChanged();
        }
    };
    private final ItemStackHandler loot = new ItemStackHandler(LOOT_SLOTS) {
        @Override
        protected void onContentsChanged(int slot) {
            setChanged();
        }
    };
    private final LazyOptional<IItemHandler> automation =
            LazyOptional.of(() -> new CampItemHandler(food, spare, loot));

    // Companion state (kept on the item when the block is broken).
    private int companionLevel = 1;
    private int xp;
    private final int[] stats = new int[Stat.values().length];
    private int selectedTier = 1;
    // Fight state.
    private double foodBuffer;
    private int progress;
    private int killTicks;
    private int retreatTicks;
    private CampStatus status = CampStatus.NO_WEAPON;
    private double pendingSkillXp;
    private int skillXpTimer;
    @Nullable
    private UUID owner;

    private final ContainerData data = new ContainerData() {
        @Override
        public int get(int index) {
            return switch (index) {
                case CampMenu.DATA_LEVEL -> companionLevel;
                case CampMenu.DATA_XP -> xp;
                case CampMenu.DATA_XP_NEXT -> Combat.xpForNextLevel(companionLevel);
                case CampMenu.DATA_POINTS -> availablePoints();
                case CampMenu.DATA_TIER -> selectedTier;
                case CampMenu.DATA_MAX_TIER -> maxUnlockedTier();
                case CampMenu.DATA_MAX_HP -> (int) Math.round(maxHealth());
                case CampMenu.DATA_FOOD -> clampShort(Math.round(foodBuffer * 10));
                case CampMenu.DATA_STATUS -> status.ordinal();
                case CampMenu.DATA_PROGRESS -> progress;
                case CampMenu.DATA_KILL_TICKS -> killTicks;
                case CampMenu.DATA_POWER -> clampShort(Math.round(currentPower()));
                case CampMenu.DATA_TIER_POWER -> clampShort(Math.round(currentTier().enemy().power()));
                case CampMenu.DATA_RETREAT -> retreatTicks;
                default -> {
                    int s = index - CampMenu.DATA_STATS;
                    yield s >= 0 && s < stats.length ? stats[s] : 0;
                }
            };
        }

        @Override
        public void set(int index, int value) {
            // Server-authoritative; the client copy is a SimpleContainerData.
        }

        @Override
        public int getCount() {
            return CampMenu.DATA_COUNT;
        }
    };

    public AdventurerCampBlockEntity(BlockPos pos, BlockState state) {
        super(ModRegistry.ADVENTURERS_CAMP_BE.get(), pos, state);
    }

    // ---------------------------------------------------------------- ticking

    public static void serverTick(Level level, BlockPos pos, BlockState state, AdventurerCampBlockEntity camp) {
        if (level instanceof ServerLevel serverLevel) {
            camp.tick(serverLevel);
        }
    }

    private void tick(ServerLevel serverLevel) {
        flushSkillXp(serverLevel.getServer());
        if (retreatTicks > 0) {
            retreatTicks--;
            setStatus(CampStatus.RETREATING);
            return;
        }
        if (freeLootSlots() < MIN_FREE_LOOT_SLOTS && !hasOutputBelow(serverLevel)) {
            setStatus(CampStatus.LOOT_FULL);
            return;
        }
        equipFromSpares();
        if (!isWeapon(gear.getStackInSlot(0))) {
            progress = 0;
            setStatus(CampStatus.NO_WEAPON);
            return;
        }
        DungeonTier tier = currentTier();
        Combat.Loadout loadout = loadout();
        Combat.Enemy enemy = tier.enemy();
        if (progress == 0) {
            if (!ensureFood(enemy.baseFood())) {
                setStatus(CampStatus.NO_FOOD);
                return;
            }
            killTicks = Math.max(20, (int) Math.round(Combat.killSeconds(loadout, enemy) * 20.0));
        }
        setStatus(CampStatus.FIGHTING);
        progress++;
        if (progress >= killTicks) {
            progress = 0;
            resolveKill(serverLevel, tier, loadout, enemy);
        }
        setChanged();
    }

    private void resolveKill(ServerLevel serverLevel, DungeonTier tier, Combat.Loadout loadout, Combat.Enemy enemy) {
        RandomSource random = serverLevel.getRandom();
        double expectedHits = Combat.expectedHitsTaken(loadout, enemy);
        int hitsTaken = (int) Math.floor(expectedHits) + (random.nextDouble() < expectedHits % 1.0 ? 1 : 0);
        double damageTaken = hitsTaken * Combat.damagePerEnemyHit(loadout, enemy);
        boolean lost = damageTaken >= loadout.maxHealth();
        double foodCost = Combat.foodCost(loadout, enemy, Math.min(damageTaken, loadout.maxHealth()));
        ensureFood(foodCost);
        foodBuffer = Math.max(0.0, foodBuffer - foodCost);

        damageGear(0, 1, random);
        for (int i = 0; i < hitsTaken; i++) {
            int armorSlot = 1 + random.nextInt(GEAR_SLOTS - 1);
            damageGear(armorSlot, 1, random);
        }

        if (lost) {
            retreatTicks = Config.RETREAT_SECONDS.get() * 20;
            return;
        }

        int rolls = 1;
        double extraChance = stats[Stat.LUCK.ordinal()] * 0.02
                + EnchantmentHelper.getItemEnchantmentLevel(Enchantments.MOB_LOOTING, gear.getStackInSlot(0)) * 0.10;
        rolls += (int) Math.floor(extraChance);
        if (random.nextDouble() < extraChance % 1.0) {
            rolls++;
        }
        rollLoot(serverLevel, tier, rolls);

        int gained = tier.xpPerKill();
        addXp(gained);
        repairWithMending(gained);
        pendingSkillXp += enemy.health() * Config.SKILL_XP_FACTOR.get();
    }

    private void rollLoot(ServerLevel serverLevel, DungeonTier tier, int rolls) {
        LootTable table = serverLevel.getServer().getLootData().getLootTable(tier.lootTable());
        LootParams params = new LootParams.Builder(serverLevel)
                .withParameter(LootContextParams.ORIGIN, Vec3.atCenterOf(worldPosition))
                .create(LootContextParamSets.CHEST);
        for (int i = 0; i < rolls; i++) {
            List<ItemStack> drops = table.getRandomItems(params);
            for (ItemStack drop : drops) {
                output(serverLevel, drop);
            }
        }
    }

    private void output(ServerLevel serverLevel, ItemStack stack) {
        ItemStack remainder = stack;
        BlockEntity below = serverLevel.getBlockEntity(worldPosition.below());
        if (below != null) {
            IItemHandler handler = below.getCapability(ForgeCapabilities.ITEM_HANDLER, Direction.UP).orElse(null);
            if (handler != null) {
                remainder = ItemHandlerHelper.insertItemStacked(handler, remainder, false);
            }
        }
        if (!remainder.isEmpty()) {
            remainder = ItemHandlerHelper.insertItemStacked(loot, remainder, false);
        }
        // Anything left over is lost; the camp pauses before the loot inventory gets this full.
    }

    private boolean hasOutputBelow(ServerLevel serverLevel) {
        BlockEntity below = serverLevel.getBlockEntity(worldPosition.below());
        return below != null && below.getCapability(ForgeCapabilities.ITEM_HANDLER, Direction.UP).isPresent();
    }

    private void flushSkillXp(MinecraftServer server) {
        if (++skillXpTimer < SKILL_XP_FLUSH_TICKS) {
            return;
        }
        skillXpTimer = 0;
        int amount = (int) Math.floor(pendingSkillXp);
        if (amount <= 0 || owner == null || !ModList.get().isLoaded("puffish_skills")) {
            return;
        }
        ServerPlayer player = server.getPlayerList().getPlayer(owner);
        if (player == null) {
            return;
        }
        pendingSkillXp -= amount;
        server.getCommands().performPrefixedCommand(
                server.createCommandSourceStack().withSuppressedOutput().withPermission(4),
                "puffish_skills experience add " + player.getGameProfile().getName() + " society:adventuring " + amount);
    }

    // ---------------------------------------------------------------- food and gear

    private boolean ensureFood(double needed) {
        for (int slot = 0; slot < FOOD_SLOTS && foodBuffer < needed; slot++) {
            ItemStack stack = food.getStackInSlot(slot);
            while (!stack.isEmpty() && foodBuffer < needed) {
                foodBuffer += nutritionOf(stack);
                ItemStack remaining = stack.getCraftingRemainingItem();
                food.extractItem(slot, 1, false);
                if (!remaining.isEmpty() && level instanceof ServerLevel serverLevel) {
                    output(serverLevel, remaining);
                }
                stack = food.getStackInSlot(slot);
            }
        }
        return foodBuffer >= needed;
    }

    /** Nutrition of all food waiting in the food slots. */
    public double storedNutrition() {
        double total = 0.0;
        for (int slot = 0; slot < FOOD_SLOTS; slot++) {
            ItemStack stack = food.getStackInSlot(slot);
            total += nutritionOf(stack) * stack.getCount();
        }
        return total;
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

    private void damageGear(int slot, int amount, RandomSource random) {
        ItemStack stack = gear.getStackInSlot(slot);
        if (stack.isEmpty() || !stack.isDamageableItem()) {
            return;
        }
        if (stack.hurt(amount, random, null)) {
            gear.setStackInSlot(slot, ItemStack.EMPTY);
        } else {
            setChanged();
        }
    }

    private void repairWithMending(int xpGained) {
        for (int slot = 0; slot < GEAR_SLOTS; slot++) {
            ItemStack stack = gear.getStackInSlot(slot);
            if (stack.isDamaged() && EnchantmentHelper.getItemEnchantmentLevel(Enchantments.MENDING, stack) > 0) {
                // Vanilla repairs 2 durability per XP point; companions get half of that.
                stack.setDamageValue(Math.max(0, stack.getDamageValue() - xpGained));
            }
        }
    }

    private void equipFromSpares() {
        for (int slot = 0; slot < GEAR_SLOTS; slot++) {
            if (!gear.getStackInSlot(slot).isEmpty()) {
                continue;
            }
            for (int s = 0; s < SPARE_SLOTS; s++) {
                ItemStack candidate = spare.getStackInSlot(s);
                if (!candidate.isEmpty() && fitsGearSlot(slot, candidate)) {
                    gear.setStackInSlot(slot, spare.extractItem(s, 1, false));
                    break;
                }
            }
        }
    }

    public static boolean isWeapon(ItemStack stack) {
        return !stack.isEmpty() && attributeSum(stack, EquipmentSlot.MAINHAND, Attributes.ATTACK_DAMAGE) > 0.0;
    }

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

    public static boolean isGear(ItemStack stack) {
        for (int slot = 0; slot < GEAR_SLOTS; slot++) {
            if (fitsGearSlot(slot, stack)) {
                return true;
            }
        }
        return false;
    }

    private static double attributeSum(ItemStack stack, EquipmentSlot slot, Attribute attribute) {
        double sum = 0.0;
        for (AttributeModifier modifier : stack.getAttributeModifiers(slot).get(attribute)) {
            if (modifier.getOperation() == AttributeModifier.Operation.ADDITION) {
                sum += modifier.getAmount();
            }
        }
        return sum;
    }

    // ---------------------------------------------------------------- companion stats

    public Combat.Loadout loadout() {
        ItemStack weapon = gear.getStackInSlot(0);
        double damage = 0.0;
        double speed = 0.0;
        if (isWeapon(weapon)) {
            // Players hit for 1 base damage and 4 attacks per second before item modifiers.
            damage = 1.0 + attributeSum(weapon, EquipmentSlot.MAINHAND, Attributes.ATTACK_DAMAGE)
                    + EnchantmentHelper.getDamageBonus(weapon, MobType.UNDEFINED);
            speed = 4.0 + attributeSum(weapon, EquipmentSlot.MAINHAND, Attributes.ATTACK_SPEED);
        }
        damage += stats[Stat.ATTACK.ordinal()] * 0.5;
        speed = Math.max(0.25, speed) * (1.0 + stats[Stat.SPEED.ordinal()] * 0.03);

        double armor = stats[Stat.DEFENSE.ordinal()];
        double toughness = 0.0;
        int protection = 0;
        for (int slot = 1; slot < GEAR_SLOTS; slot++) {
            ItemStack piece = gear.getStackInSlot(slot);
            if (piece.isEmpty()) {
                continue;
            }
            armor += attributeSum(piece, GEAR_ORDER[slot], Attributes.ARMOR);
            toughness += attributeSum(piece, GEAR_ORDER[slot], Attributes.ARMOR_TOUGHNESS);
            protection += EnchantmentHelper.getItemEnchantmentLevel(Enchantments.ALL_DAMAGE_PROTECTION, piece);
        }
        return new Combat.Loadout(damage, speed, armor, toughness, protection, maxHealth());
    }

    private double maxHealth() {
        return BASE_HEALTH + stats[Stat.HEALTH.ordinal()] * 2.0;
    }

    private double currentPower() {
        if (!isWeapon(gear.getStackInSlot(0))) {
            return 0.0;
        }
        return Combat.power(loadout(), currentTier().enemy());
    }

    private DungeonTier currentTier() {
        return DungeonTier.byNumber(Math.min(selectedTier, maxUnlockedTier()));
    }

    public int maxUnlockedTier() {
        int max = 1;
        for (DungeonTier tier : DungeonTier.values()) {
            if (companionLevel >= tier.unlockLevel()) {
                max = Math.max(max, tier.number());
            }
        }
        return max;
    }

    private int availablePoints() {
        int spent = 0;
        for (int s : stats) {
            spent += s;
        }
        return Math.max(0, companionLevel - 1 - spent);
    }

    private void addXp(int amount) {
        xp += amount;
        int maxLevel = Config.MAX_LEVEL.get();
        while (companionLevel < maxLevel && xp >= Combat.xpForNextLevel(companionLevel)) {
            xp -= Combat.xpForNextLevel(companionLevel);
            companionLevel++;
        }
        if (companionLevel >= maxLevel) {
            xp = Math.min(xp, Combat.xpForNextLevel(companionLevel));
        }
    }

    /** Handles a GUI button. Returns true if anything changed. */
    public boolean handleButton(int id) {
        if (id == CampMenu.BUTTON_TIER_DOWN && selectedTier > 1) {
            selectedTier--;
        } else if (id == CampMenu.BUTTON_TIER_UP && selectedTier < maxUnlockedTier()) {
            selectedTier++;
        } else if (id >= CampMenu.BUTTON_STAT && id < CampMenu.BUTTON_STAT + stats.length && availablePoints() > 0) {
            stats[id - CampMenu.BUTTON_STAT]++;
        } else {
            return false;
        }
        progress = 0;
        setChanged();
        return true;
    }

    private void setStatus(CampStatus newStatus) {
        if (status != newStatus) {
            status = newStatus;
            setChanged();
        }
    }

    private int freeLootSlots() {
        int free = 0;
        for (int i = 0; i < LOOT_SLOTS; i++) {
            if (loot.getStackInSlot(i).isEmpty()) {
                free++;
            }
        }
        return free;
    }

    private static int clampShort(long value) {
        return (int) Math.max(0, Math.min(Short.MAX_VALUE, value));
    }

    public void setOwner(UUID owner) {
        this.owner = owner;
        setChanged();
    }

    public void dropContents() {
        if (level == null) {
            return;
        }
        for (ItemStackHandler handler : new ItemStackHandler[]{gear, spare, food, loot}) {
            for (int i = 0; i < handler.getSlots(); i++) {
                Containers.dropItemStack(level, worldPosition.getX(), worldPosition.getY(), worldPosition.getZ(),
                        handler.getStackInSlot(i));
            }
        }
    }

    // ---------------------------------------------------------------- menu

    public ItemStackHandler gear() {
        return gear;
    }

    public ItemStackHandler spare() {
        return spare;
    }

    public ItemStackHandler food() {
        return food;
    }

    public ItemStackHandler loot() {
        return loot;
    }

    public ContainerData data() {
        return data;
    }

    @Override
    public Component getDisplayName() {
        return Component.translatable("block.sunlitidle.adventurers_camp");
    }

    @Nullable
    @Override
    public AbstractContainerMenu createMenu(int windowId, Inventory inventory, Player player) {
        return new CampMenu(windowId, inventory, this);
    }

    // ---------------------------------------------------------------- capabilities and saving

    @Override
    public <T> @NotNull LazyOptional<T> getCapability(@NotNull Capability<T> cap, @Nullable Direction side) {
        if (cap == ForgeCapabilities.ITEM_HANDLER) {
            return automation.cast();
        }
        return super.getCapability(cap, side);
    }

    @Override
    public void invalidateCaps() {
        super.invalidateCaps();
        automation.invalidate();
    }

    @Override
    protected void saveAdditional(CompoundTag tag) {
        super.saveAdditional(tag);
        tag.put("Companion", saveCompanion());
        tag.put("Gear", gear.serializeNBT());
        tag.put("Spare", spare.serializeNBT());
        tag.put("Food", food.serializeNBT());
        tag.put("Loot", loot.serializeNBT());
        tag.putDouble("FoodBuffer", foodBuffer);
        tag.putInt("Progress", progress);
        tag.putInt("KillTicks", killTicks);
        tag.putInt("Retreat", retreatTicks);
        tag.putDouble("PendingSkillXp", pendingSkillXp);
        if (owner != null) {
            tag.putUUID("Owner", owner);
        }
    }

    @Override
    public void load(CompoundTag tag) {
        super.load(tag);
        if (tag.contains("Companion")) {
            loadCompanion(tag.getCompound("Companion"));
        }
        if (tag.contains("Gear")) {
            gear.deserializeNBT(tag.getCompound("Gear"));
        }
        if (tag.contains("Spare")) {
            spare.deserializeNBT(tag.getCompound("Spare"));
        }
        if (tag.contains("Food")) {
            food.deserializeNBT(tag.getCompound("Food"));
        }
        if (tag.contains("Loot")) {
            loot.deserializeNBT(tag.getCompound("Loot"));
        }
        foodBuffer = tag.getDouble("FoodBuffer");
        progress = tag.getInt("Progress");
        killTicks = tag.getInt("KillTicks");
        retreatTicks = tag.getInt("Retreat");
        pendingSkillXp = tag.getDouble("PendingSkillXp");
        owner = tag.hasUUID("Owner") ? tag.getUUID("Owner") : owner;
    }

    /** Companion progress; copied onto the dropped item by the block's loot table. */
    private CompoundTag saveCompanion() {
        CompoundTag c = new CompoundTag();
        c.putInt("Level", companionLevel);
        c.putInt("Xp", xp);
        c.putIntArray("Stats", stats);
        c.putInt("Tier", selectedTier);
        return c;
    }

    private void loadCompanion(CompoundTag c) {
        companionLevel = Math.max(1, c.getInt("Level"));
        xp = c.getInt("Xp");
        int[] saved = c.getIntArray("Stats");
        for (int i = 0; i < stats.length; i++) {
            stats[i] = i < saved.length ? saved[i] : 0;
        }
        selectedTier = Math.max(1, c.getInt("Tier"));
    }
}
