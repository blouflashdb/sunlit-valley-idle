package dev.sunlitidle.idle;

import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.RandomSource;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.enchantment.Enchantments;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.BooleanProperty;
import net.minecraft.world.level.block.state.properties.IntegerProperty;
import net.minecraft.world.level.block.state.properties.Property;
import net.minecraft.world.level.storage.loot.LootParams;
import net.minecraft.world.level.storage.loot.LootTable;
import net.minecraft.world.level.storage.loot.parameters.LootContextParamSets;
import net.minecraft.world.level.storage.loot.parameters.LootContextParams;
import net.minecraft.world.phys.Vec3;

import java.util.List;

/** Runs the idle actions of one player for a stretch of time. */
public final class IdleEngine {
    /** Upper bound per slot and call, so a huge catch-up cannot freeze the server. */
    private static final int MAX_COMPLETIONS_PER_CALL = 4000;

    private IdleEngine() {
    }

    /**
     * Advances every slot by {@code seconds}.
     *
     * @return number of items produced
     */
    public static long advance(ServerPlayer player, PlayerIdleState state, double seconds) {
        int unlocked = IdleMath.slotsForTotalLevel(SkillLevels.totalLevel(player, state));
        long items = 0;
        int[] xpBySkill = new int[IdleCatalog.skills().size()];
        for (int slot = 0; slot < IdleMath.maxSlots(); slot++) {
            if (slot >= unlocked) {
                if (state.slotAction(slot) != null) {
                    state.setSlotStatus(slot, SlotStatus.LOCKED);
                }
                continue;
            }
            items += advanceSlot(player, state, slot, seconds, xpBySkill);
        }
        for (int i = 0; i < xpBySkill.length; i++) {
            if (xpBySkill[i] > 0) {
                SkillLevels.addXp(player, state, IdleCatalog.skill(i), xpBySkill[i]);
            }
        }
        if (items > 0) {
            state.markDirty();
        }
        return items;
    }

    private static long advanceSlot(ServerPlayer player, PlayerIdleState state, int slot, double seconds, int[] xpBySkill) {
        String key = state.slotAction(slot);
        if (key == null) {
            state.setSlotStatus(slot, SlotStatus.EMPTY);
            return 0;
        }
        IdleAction action = IdleCatalog.action(key);
        IdleSkill skill = action == null ? null : IdleCatalog.skill(action.skillId());
        if (skill == null || !IdleCatalog.isAvailable(action)) {
            state.setSlotStatus(slot, SlotStatus.UNKNOWN);
            return 0;
        }
        int level = SkillLevels.level(player, state, skill);
        if (level < action.level()) {
            state.setSlotStatus(slot, SlotStatus.LOCKED);
            return 0;
        }
        if (action.isCombat()) {
            return IdleCombat.advance(player, state, slot, skill, action, level, seconds, xpBySkill, MAX_COMPLETIONS_PER_CALL);
        }
        if (skill.seasonal() && !inSeason(player, action)) {
            state.setSlotStatus(slot, SlotStatus.OUT_OF_SEASON);
            return 0;
        }
        long items = 0;
        double progress = state.slotProgress(slot) + seconds;
        int completions = 0;
        while (true) {
            ItemStack tool = state.tools().getStackInSlot(skill.index());
            SlotStatus blocked = toolProblem(skill, action, tool);
            if (blocked != null) {
                state.setSlotStatus(slot, blocked);
                state.setSlotProgress(slot, 0.0);
                return items;
            }
            boolean hasTool = skill.tool().matches(tool);
            double actionSeconds = secondsFor(player, skill, action, tool, level);
            state.setSlotSeconds(slot, actionSeconds);
            if (progress < actionSeconds || completions >= MAX_COMPLETIONS_PER_CALL) {
                state.setSlotProgress(slot, Math.min(progress, actionSeconds));
                state.setSlotStatus(slot, SlotStatus.RUNNING);
                return items;
            }
            if (!takeInputs(state, action)) {
                state.setSlotStatus(slot, SlotStatus.NO_INPUT);
                state.setSlotProgress(slot, actionSeconds);
                return items;
            }
            progress -= actionSeconds;
            completions++;
            items += complete(player, state, skill, action, hasTool ? tool : ItemStack.EMPTY, level);
            xpBySkill[skill.index()] += action.xp();
            if (hasTool) {
                damageTool(player, state, skill, tool);
            }
        }
    }

    /** Whether the crop of a seasonal action grows now. Looks at the action's first block drop. */
    public static boolean inSeason(ServerPlayer player, IdleAction action) {
        for (IdleDrop drop : action.drops()) {
            if (drop.kind() == IdleDrop.Kind.BLOCK) {
                return BuiltInRegistries.BLOCK.getOptional(drop.id())
                        .map(block -> Seasons.inSeason(player.level(), block)).orElse(true);
            }
        }
        return true;
    }

    /** Why the tool in the slot cannot do this action, or null when it can. */
    public static SlotStatus toolProblem(IdleSkill skill, IdleAction action, ItemStack tool) {
        boolean hasTool = skill.tool().matches(tool);
        if (skill.toolRequired() && !hasTool) {
            return SlotStatus.NO_TOOL;
        }
        if (action.toolTier() > 0 && (!hasTool || ToolKind.tierLevel(tool) < action.toolTier())) {
            return SlotStatus.WEAK_TOOL;
        }
        return null;
    }

    public static double secondsFor(ServerPlayer player, IdleSkill skill, IdleAction action, ItemStack tool, int level) {
        boolean hasTool = skill.tool().matches(tool);
        double toolSpeed = IdleMath.toolSpeed(hasTool, hasTool ? ToolKind.tierLevel(tool) : 0,
                hasTool ? ToolKind.efficiency(tool) : 0);
        return IdleMath.actionSeconds(action.seconds(), toolSpeed, level, IdleAttributes.speed(player, skill.id()));
    }

    private static boolean takeInputs(PlayerIdleState state, IdleAction action) {
        if (action.isRecipe()) {
            return state.takeMatching(action.recipe().input());
        }
        for (IdleInput input : action.inputs()) {
            if (state.countOf(input.item()) < input.count()) {
                return false;
            }
        }
        for (IdleInput input : action.inputs()) {
            state.take(input.item(), input.count());
        }
        return true;
    }

    private static void damageTool(ServerPlayer player, PlayerIdleState state, IdleSkill skill, ItemStack tool) {
        if (tool.isDamageableItem()) {
            state.tools().setStackInSlot(skill.index(), wear(player.serverLevel(), tool));
        }
    }

    /** A copy of the stack with one point of wear (Unbreaking applies), or EMPTY when it broke. */
    static ItemStack wear(ServerLevel level, ItemStack stack) {
        if (stack.isEmpty() || !stack.isDamageableItem()) {
            return stack;
        }
        ItemStack copy = stack.copy();
        // No player, so creative mode does not stop the wear, like the idle tools on 1.20.1.
        copy.hurtAndBreak(1, level, null, item -> {
        });
        return copy.isEmpty() ? ItemStack.EMPTY : copy;
    }

    private static long complete(ServerPlayer player, PlayerIdleState state, IdleSkill skill, IdleAction action,
                                 ItemStack tool, int level) {
        RandomSource random = player.getRandom();
        double extra = IdleMath.extraRollChance(level, IdleAttributes.yield(player, skill.id()));
        int rolls = IdleMath.rolls(extra, random.nextDouble());
        long items = 0;
        if (action.isRecipe()) {
            for (int r = 0; r < rolls; r++) {
                ItemStack out = action.recipe().output().copy();
                items += out.getCount();
                state.store(out);
            }
            return items;
        }
        for (int r = 0; r < rolls; r++) {
            for (IdleDrop drop : action.drops()) {
                if (drop.chance() < 1.0 && random.nextDouble() >= drop.chance()) {
                    continue;
                }
                if (!IdleCatalog.dropExists(drop)) {
                    continue;
                }
                for (ItemStack stack : roll(player, drop, tool, random)) {
                    items += stack.getCount();
                    state.store(stack);
                }
            }
        }
        return items;
    }

    private static List<ItemStack> roll(ServerPlayer player, IdleDrop drop, ItemStack tool, RandomSource random) {
        ServerLevel level = player.serverLevel();
        Vec3 origin = player.position();
        switch (drop.kind()) {
            case BLOCK: {
                Block block = BuiltInRegistries.BLOCK.getOptional(drop.id()).orElse(null);
                if (block == null) {
                    return List.of();
                }
                BlockState state = grown(block.defaultBlockState());
                LootParams.Builder params = new LootParams.Builder(level)
                        .withParameter(LootContextParams.ORIGIN, origin)
                        .withParameter(LootContextParams.TOOL, tool)
                        .withOptionalParameter(LootContextParams.THIS_ENTITY, player)
                        .withLuck(player.getLuck() + drop.luck());
                return state.getDrops(params);
            }
            case ENTITY: {
                return entityLoot(player, drop, tool);
            }
            case LOOT_TABLE: {
                LootTable table = level.getServer().reloadableRegistries().getLootTable(ResourceKey.create(Registries.LOOT_TABLE, drop.id()));
                if (drop.chest()) {
                    LootParams chest = new LootParams.Builder(level)
                            .withParameter(LootContextParams.ORIGIN, origin)
                            .withOptionalParameter(LootContextParams.THIS_ENTITY, player)
                            .withLuck(player.getLuck() + drop.luck())
                            .create(LootContextParamSets.CHEST);
                    return table.getRandomItems(chest);
                }
                float luck = player.getLuck() + drop.luck()
                        + Enchants.level(tool, Enchantments.LUCK_OF_THE_SEA);
                LootParams params = new LootParams.Builder(level)
                        .withParameter(LootContextParams.ORIGIN, origin)
                        .withParameter(LootContextParams.TOOL, tool)
                        .withOptionalParameter(LootContextParams.THIS_ENTITY, player)
                        .withLuck(luck)
                        .create(LootContextParamSets.FISHING);
                return table.getRandomItems(params);
            }
            case ITEM:
            default: {
                int count = drop.min() + (drop.max() > drop.min() ? random.nextInt(drop.max() - drop.min() + 1) : 0);
                if (count <= 0) {
                    return List.of();
                }
                return BuiltInRegistries.ITEM.getOptional(drop.id())
                        .map(item -> List.of(new ItemStack(item, count))).orElse(List.of());
            }
        }
    }

    private static final java.util.Map<ResourceLocation, net.minecraft.world.entity.LivingEntity> MOBS = new java.util.HashMap<>();

    /** Rolls a mob's loot table as if the player had killed it. The mob is never added to the world. */
    private static List<ItemStack> entityLoot(ServerPlayer player, IdleDrop drop, ItemStack weapon) {
        ServerLevel level = player.serverLevel();
        net.minecraft.world.entity.LivingEntity mob = MOBS.get(drop.id());
        if (mob == null || mob.level() != level) {
            net.minecraft.world.entity.EntityType<?> type = BuiltInRegistries.ENTITY_TYPE.getOptional(drop.id()).orElse(null);
            if (type == null || !(type.create(level) instanceof net.minecraft.world.entity.LivingEntity created)) {
                return List.of();
            }
            mob = created;
            MOBS.put(drop.id(), mob);
        }
        mob.setPos(player.position());
        LootTable table = level.getServer().reloadableRegistries().getLootTable(mob.getLootTable());
        LootParams params = new LootParams.Builder(level)
                .withParameter(LootContextParams.THIS_ENTITY, mob)
                .withParameter(LootContextParams.ORIGIN, player.position())
                .withParameter(LootContextParams.DAMAGE_SOURCE, player.damageSources().playerAttack(player))
                .withOptionalParameter(LootContextParams.ATTACKING_ENTITY, player)
                .withOptionalParameter(LootContextParams.DIRECT_ATTACKING_ENTITY, player)
                .withOptionalParameter(LootContextParams.LAST_DAMAGE_PLAYER, player)
                .withLuck(player.getLuck() + drop.luck())
                .create(LootContextParamSets.ENTITY);
        List<ItemStack> drops = new java.util.ArrayList<>(table.getRandomItems(params));
        // The weapon sits in the tool slot, not in the player's hand, so Looting is applied here.
        int looting = Enchants.level(weapon, Enchantments.LOOTING);
        if (looting > 0 && player.getRandom().nextDouble() < looting * 0.15) {
            drops.addAll(table.getRandomItems(params));
        }
        return drops;
    }

    /** The block as if fully grown: crops at max age, cave vines with berries. */
    static BlockState grown(BlockState state) {
        for (Property<?> property : state.getProperties()) {
            if (property instanceof IntegerProperty age && property.getName().equals("age")) {
                int max = age.getPossibleValues().stream().max(Integer::compare).orElse(0);
                state = state.setValue(age, max);
            } else if (property instanceof BooleanProperty berries && property.getName().equals("berries")) {
                state = state.setValue(berries, true);
            }
        }
        return state;
    }

    /** Item id helper for the screen and messages. */
    public static ResourceLocation idOf(ItemStack stack) {
        return BuiltInRegistries.ITEM.getKey(stack.getItem());
    }
}
