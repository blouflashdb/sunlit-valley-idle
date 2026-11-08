package dev.sunlitidle.farm;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.tags.FluidTags;
import net.minecraft.util.Mth;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.item.UseAnim;
import net.minecraft.world.item.context.UseOnContext;
import net.minecraft.world.level.ClipContext;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.HitResult;

import java.util.ArrayList;
import java.util.List;

/**
 * Waters farmland. A click waters one tile; holding the button charges the can (one level every
 * {@link #TICKS_PER_LEVEL} ticks, up to the tier's maximum) and waters a bigger area in front of the player.
 * Each watered tile uses one unit of water; using the can on a water source fills it.
 */
public class WateringCanItem extends Item {
    static final int TICKS_PER_LEVEL = 15;
    /** Area per charge level: tiles forward, back, left and right of the target. */
    private static final int[][] AREAS = {{0, 0, 0, 0}, {2, 0, 0, 0}, {2, 0, 1, 1}, {4, 0, 1, 1}, {4, 0, 2, 2}};

    private final Tier tier;

    public WateringCanItem(Tier tier, Properties properties) {
        super(properties);
        this.tier = tier;
    }

    public Tier tier() {
        return tier;
    }

    public static int water(ItemStack stack) {
        return stack.getOrDefault(FarmRegistry.WATER.get(), 0);
    }

    public static void setWater(ItemStack stack, int water) {
        stack.set(FarmRegistry.WATER.get(), Math.max(0, water));
    }

    @Override
    public InteractionResult useOn(UseOnContext context) {
        // Let use() handle it, so that holding the button can charge the can.
        return InteractionResult.PASS;
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        BlockHitResult fluidHit = getPlayerPOVHitResult(level, player, ClipContext.Fluid.SOURCE_ONLY);
        if (fluidHit.getType() == HitResult.Type.BLOCK
                && level.getFluidState(fluidHit.getBlockPos()).is(FluidTags.WATER)) {
            if (water(stack) < tier.capacity()) {
                if (!level.isClientSide) {
                    setWater(stack, tier.capacity());
                }
                level.playSound(player, player.blockPosition(), SoundEvents.BUCKET_FILL, SoundSource.PLAYERS, 1.0F, 1.0F);
                return InteractionResultHolder.sidedSuccess(stack, level.isClientSide);
            }
            return InteractionResultHolder.pass(stack);
        }
        player.startUsingItem(hand);
        return InteractionResultHolder.consume(stack);
    }

    @Override
    public int getUseDuration(ItemStack stack, LivingEntity entity) {
        return 72000;
    }

    @Override
    public UseAnim getUseAnimation(ItemStack stack) {
        return UseAnim.NONE;
    }

    @Override
    public void onUseTick(Level level, LivingEntity entity, ItemStack stack, int remaining) {
        int used = getUseDuration(stack, entity) - remaining;
        if (!level.isClientSide && entity instanceof ServerPlayer player && used > 0 && used % TICKS_PER_LEVEL == 0) {
            int charge = Math.min(tier.maxCharge(), used / TICKS_PER_LEVEL);
            if (used / TICKS_PER_LEVEL <= tier.maxCharge()) {
                player.displayClientMessage(Component.translatable("item.sunlitidle.watering_can.charge", charge), true);
                level.playSound(null, player.blockPosition(), SoundEvents.NOTE_BLOCK_HAT.value(), SoundSource.PLAYERS,
                        0.6F, 0.8F + 0.2F * charge);
            }
        }
    }

    @Override
    public void releaseUsing(ItemStack stack, Level level, LivingEntity entity, int remaining) {
        if (level.isClientSide || !(entity instanceof Player player)) {
            return;
        }
        int charge = Math.min(tier.maxCharge(), (getUseDuration(stack, entity) - remaining) / TICKS_PER_LEVEL);
        BlockHitResult hit = getPlayerPOVHitResult(level, player, ClipContext.Fluid.NONE);
        if (hit.getType() != HitResult.Type.BLOCK) {
            return;
        }
        if (level.dimensionType().ultraWarm() && tier != Tier.NETHERITE) {
            player.displayClientMessage(Component.translatable("item.sunlitidle.watering_can.too_hot"), true);
            return;
        }
        BlockPos target = hit.getBlockPos();
        if (extinguish(level, target)) {
            return;
        }
        int water = water(stack);
        boolean creative = player.getAbilities().instabuild;
        if (water <= 0 && !creative) {
            player.displayClientMessage(Component.translatable("item.sunlitidle.watering_can.empty"), true);
            return;
        }
        int used = 0;
        for (BlockPos pos : area(target, player.getDirection(), charge)) {
            if (!creative && used >= water) {
                break;
            }
            if (Watering.water(level, pos)) {
                used++;
            }
        }
        if (used > 0) {
            level.playSound(null, target, SoundEvents.BUCKET_EMPTY, SoundSource.PLAYERS, 0.5F, 1.4F);
            if (!creative) {
                setWater(stack, water - used);
            }
        }
    }

    private static boolean extinguish(Level level, BlockPos pos) {
        BlockState state = level.getBlockState(pos);
        BlockPos above = pos.above();
        if (level.getBlockState(above).is(Blocks.FIRE)) {
            level.removeBlock(above, false);
        } else if (state.hasProperty(BlockStateProperties.LIT) && state.getValue(BlockStateProperties.LIT)
                && state.is(net.minecraft.tags.BlockTags.CAMPFIRES)) {
            level.setBlock(pos, state.setValue(BlockStateProperties.LIT, false), 3);
        } else {
            return false;
        }
        level.playSound(null, pos, SoundEvents.FIRE_EXTINGUISH, SoundSource.BLOCKS, 0.5F, 1.0F);
        return true;
    }

    /** The tiles watered at a charge level, starting at the target and extending in the facing direction. */
    static List<BlockPos> area(BlockPos target, Direction facing, int charge) {
        int[] a = AREAS[Mth.clamp(charge, 0, AREAS.length - 1)];
        Direction right = facing.getClockWise();
        List<BlockPos> tiles = new ArrayList<>();
        for (int f = -a[1]; f <= a[0]; f++) {
            for (int s = -a[2]; s <= a[3]; s++) {
                tiles.add(target.relative(facing, f).relative(right, s));
            }
        }
        return tiles;
    }

    @Override
    public boolean isBarVisible(ItemStack stack) {
        return true;
    }

    @Override
    public int getBarWidth(ItemStack stack) {
        return Math.round(13.0F * Math.min(water(stack), tier.capacity()) / tier.capacity());
    }

    @Override
    public int getBarColor(ItemStack stack) {
        return 0x3F76E4;
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext context, List<Component> tooltip, TooltipFlag flag) {
        tooltip.add(Component.translatable("item.sunlitidle.watering_can.water", water(stack), tier.capacity())
                .withStyle(net.minecraft.ChatFormatting.AQUA));
        if (tier.maxCharge() > 0) {
            tooltip.add(Component.translatable("item.sunlitidle.watering_can.hold", tier.maxCharge())
                    .withStyle(net.minecraft.ChatFormatting.GRAY));
        }
    }

    /** Watering can tiers: more water and a higher charge level for each upgrade. */
    public enum Tier {
        COPPER("copper_watering_can", 40, 0),
        IRON("iron_watering_can", 55, 1),
        GOLD("gold_watering_can", 70, 2),
        DIAMOND("diamond_watering_can", 85, 3),
        NETHERITE("netherite_watering_can", 100, 4);

        private final String itemName;
        private final int capacity;
        private final int maxCharge;

        Tier(String itemName, int capacity, int maxCharge) {
            this.itemName = itemName;
            this.capacity = capacity;
            this.maxCharge = maxCharge;
        }

        public String itemName() {
            return itemName;
        }

        public int capacity() {
            return capacity;
        }

        public int maxCharge() {
            return maxCharge;
        }
    }
}
