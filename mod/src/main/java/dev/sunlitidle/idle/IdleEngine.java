package dev.sunlitidle.idle;

import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.RandomSource;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.enchantment.EnchantmentHelper;
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
import net.minecraftforge.registries.ForgeRegistries;

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
        if (!tool.isDamageableItem()) {
            return;
        }
        ItemStack copy = tool.copy();
        if (copy.hurt(1, player.getRandom(), null)) {
            copy = ItemStack.EMPTY;
        }
        state.tools().setStackInSlot(skill.index(), copy);
    }

    private static long complete(ServerPlayer player, PlayerIdleState state, IdleSkill skill, IdleAction action,
                                 ItemStack tool, int level) {
        RandomSource random = player.getRandom();
        double extra = IdleMath.extraRollChance(level, IdleAttributes.yield(player, skill.id()));
        int rolls = IdleMath.rolls(extra, random.nextDouble());
        long items = 0;
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
                Block block = ForgeRegistries.BLOCKS.getValue(drop.id());
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
            case LOOT_TABLE: {
                LootTable table = level.getServer().getLootData().getLootTable(drop.id());
                float luck = player.getLuck() + drop.luck()
                        + EnchantmentHelper.getItemEnchantmentLevel(Enchantments.FISHING_LUCK, tool);
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
                return List.of(new ItemStack(ForgeRegistries.ITEMS.getValue(drop.id()), count));
            }
        }
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
        return ForgeRegistries.ITEMS.getKey(stack.getItem());
    }
}
