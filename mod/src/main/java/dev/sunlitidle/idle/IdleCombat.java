package dev.sunlitidle.idle;

import dev.sunlitidle.Config;
import dev.sunlitidle.camp.AdventurerCampBlockEntity;
import dev.sunlitidle.camp.Combat;
import dev.sunlitidle.camp.DungeonTier;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.MobType;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.enchantment.EnchantmentHelper;
import net.minecraft.world.item.enchantment.Enchantments;
import net.minecraft.world.level.storage.loot.LootParams;
import net.minecraft.world.level.storage.loot.LootTable;
import net.minecraft.world.level.storage.loot.parameters.LootContextParamSets;
import net.minecraft.world.level.storage.loot.parameters.LootContextParams;
import net.minecraftforge.items.IItemHandler;
import net.minecraftforge.registries.ForgeRegistries;

/**
 * The Adventuring companion: the same combat math as the Adventurer Camp, with stats from the Adventuring
 * level instead of camp stat points. Used by the server to fight and by the window to preview.
 */
public final class IdleCombat {
    private static final double BASE_HEALTH = 20.0;
    private static final EquipmentSlot[] ARMOR_ORDER = {
            EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS, EquipmentSlot.FEET};

    private IdleCombat() {
    }

    public static Combat.Loadout loadout(ItemStack weapon, IItemHandler armor, int level) {
        double damage = 0.0;
        double speed = 0.0;
        if (AdventurerCampBlockEntity.isWeapon(weapon)) {
            damage = 1.0 + AdventurerCampBlockEntity.attributeSum(weapon, EquipmentSlot.MAINHAND, Attributes.ATTACK_DAMAGE)
                    + EnchantmentHelper.getDamageBonus(weapon, MobType.UNDEFINED);
            speed = 4.0 + AdventurerCampBlockEntity.attributeSum(weapon, EquipmentSlot.MAINHAND, Attributes.ATTACK_SPEED);
        }
        damage += 0.5 * level;
        speed = Math.max(0.25, speed) * (1.0 + 0.03 * level);
        double armorPoints = level / 2.0;
        double toughness = 0.0;
        int protection = 0;
        for (int i = 0; i < armor.getSlots() && i < ARMOR_ORDER.length; i++) {
            ItemStack piece = armor.getStackInSlot(i);
            if (piece.isEmpty()) {
                continue;
            }
            armorPoints += AdventurerCampBlockEntity.attributeSum(piece, ARMOR_ORDER[i], Attributes.ARMOR);
            toughness += AdventurerCampBlockEntity.attributeSum(piece, ARMOR_ORDER[i], Attributes.ARMOR_TOUGHNESS);
            protection += EnchantmentHelper.getItemEnchantmentLevel(Enchantments.ALL_DAMAGE_PROTECTION, piece);
        }
        return new Combat.Loadout(damage, speed, armorPoints, toughness, protection, BASE_HEALTH + 2.0 * level);
    }

    public static Combat.Enemy enemy(IdleAction action) {
        return DungeonTier.byNumber(action.dungeon()).enemy();
    }

    public static double killSeconds(Combat.Loadout loadout, Combat.Enemy enemy, double speedAttribute) {
        return Math.max(IdleMath.MIN_SECONDS, Combat.killSeconds(loadout, enemy) / (1.0 + Math.max(0.0, speedAttribute)));
    }

    public static int xpPerKill(Combat.Enemy enemy) {
        return Math.max(1, (int) Math.round(enemy.health() * Config.SKILL_XP_FACTOR.get()));
    }

    /** Runs one Adventuring slot. Returns items produced. */
    static long advance(ServerPlayer player, PlayerIdleState state, int slot, IdleSkill skill, IdleAction action,
                        int level, double seconds, int[] xpBySkill, int maxKills) {
        double progress = state.slotProgress(slot) + seconds;
        if (progress < 0) {
            state.setSlotProgress(slot, progress);
            state.setSlotStatus(slot, SlotStatus.RESTING);
            return 0;
        }
        Combat.Enemy enemy = enemy(action);
        RandomSource random = player.getRandom();
        long items = 0;
        int kills = 0;
        while (true) {
            ItemStack weapon = state.tools().getStackInSlot(skill.index());
            if (!AdventurerCampBlockEntity.isWeapon(weapon)) {
                state.setSlotStatus(slot, SlotStatus.NO_TOOL);
                state.setSlotProgress(slot, 0.0);
                return items;
            }
            Combat.Loadout loadout = loadout(weapon, state.armor(), level);
            double killSeconds = killSeconds(loadout, enemy, IdleAttributes.speed(player, skill.id()));
            state.setSlotSeconds(slot, killSeconds);
            if (progress < killSeconds || kills >= maxKills) {
                state.setSlotProgress(slot, Math.min(progress, killSeconds));
                state.setSlotStatus(slot, SlotStatus.RUNNING);
                return items;
            }
            if (!ensureFood(state, enemy.baseFood())) {
                state.setSlotProgress(slot, killSeconds);
                state.setSlotStatus(slot, SlotStatus.NO_FOOD);
                return items;
            }
            progress -= killSeconds;
            kills++;
            double expectedHits = Combat.expectedHitsTaken(loadout, enemy);
            int hits = (int) Math.floor(expectedHits) + (random.nextDouble() < expectedHits % 1.0 ? 1 : 0);
            double damage = hits * Combat.damagePerEnemyHit(loadout, enemy);
            boolean lost = damage >= loadout.maxHealth();
            double foodCost = Combat.foodCost(loadout, enemy, Math.min(damage, loadout.maxHealth()));
            ensureFood(state, foodCost);
            state.setFoodBuffer(Math.max(0.0, state.foodBuffer() - foodCost));
            damage(state.tools(), skill.index(), random);
            for (int i = 0; i < hits; i++) {
                damage(state.armor(), random.nextInt(state.armor().getSlots()), random);
            }
            if (lost) {
                state.setSlotProgress(slot, -Config.RETREAT_SECONDS.get());
                state.setSlotStatus(slot, SlotStatus.RESTING);
                return items;
            }
            double extra = IdleMath.extraRollChance(level, IdleAttributes.yield(player, skill.id()))
                    + EnchantmentHelper.getItemEnchantmentLevel(Enchantments.MOB_LOOTING, weapon) * 0.10;
            int rolls = IdleMath.rolls(extra, random.nextDouble());
            LootTable table = player.server.getLootData().getLootTable(DungeonTier.byNumber(action.dungeon()).lootTable());
            LootParams params = new LootParams.Builder(player.serverLevel())
                    .withParameter(LootContextParams.ORIGIN, player.position())
                    .withOptionalParameter(LootContextParams.THIS_ENTITY, player)
                    .withLuck(player.getLuck())
                    .create(LootContextParamSets.CHEST);
            for (int r = 0; r < rolls; r++) {
                for (ItemStack drop : table.getRandomItems(params)) {
                    items += drop.getCount();
                    state.store(drop);
                }
            }
            xpBySkill[skill.index()] += xpPerKill(enemy);
        }
    }

    private static void damage(net.minecraftforge.items.ItemStackHandler handler, int slot, RandomSource random) {
        ItemStack stack = handler.getStackInSlot(slot);
        if (stack.isEmpty() || !stack.isDamageableItem()) {
            return;
        }
        ItemStack copy = stack.copy();
        if (copy.hurt(1, random, null)) {
            copy = ItemStack.EMPTY;
        }
        handler.setStackInSlot(slot, copy);
    }

    /** Eats from the food slots until the buffer holds {@code needed}; slots refill from storage. */
    static boolean ensureFood(PlayerIdleState state, double needed) {
        for (int slot = 0; slot < state.food().getSlots() && state.foodBuffer() < needed; slot++) {
            while (state.foodBuffer() < needed) {
                ItemStack stack = state.food().getStackInSlot(slot);
                if (stack.isEmpty()) {
                    break;
                }
                if (stack.getCount() == 1) {
                    refill(state, slot, stack);
                    stack = state.food().getStackInSlot(slot);
                }
                double nutrition = AdventurerCampBlockEntity.nutritionOf(stack);
                if (nutrition <= 0) {
                    break;
                }
                ItemStack remainder = stack.getCraftingRemainingItem();
                state.food().extractItem(slot, 1, false);
                state.setFoodBuffer(state.foodBuffer() + nutrition);
                if (!remainder.isEmpty()) {
                    state.store(remainder);
                }
            }
        }
        return state.foodBuffer() >= needed;
    }

    private static void refill(PlayerIdleState state, int slot, ItemStack stack) {
        ResourceLocation id = ForgeRegistries.ITEMS.getKey(stack.getItem());
        if (id == null) {
            return;
        }
        int want = stack.getMaxStackSize() - stack.getCount();
        int available = (int) Math.min(want, state.countOf(id));
        if (available > 0 && state.take(id, available)) {
            state.food().setStackInSlot(slot, stack.copyWithCount(stack.getCount() + available));
        }
    }
}
