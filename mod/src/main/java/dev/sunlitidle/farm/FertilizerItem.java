package dev.sunlitidle.farm;

import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.context.UseOnContext;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.FarmBlock;
import net.minecraft.world.level.block.state.BlockState;

/**
 * Worked into plain farmland (or the farmland under a crop) on right click, which turns it into the matching
 * fertilized farmland and keeps its water. Deluxe Hydrating Fertilizer also upgrades a garden pot.
 */
public class FertilizerItem extends Item {
    private final Fertilizer fertilizer;

    public FertilizerItem(Fertilizer fertilizer, Properties properties) {
        super(properties);
        this.fertilizer = fertilizer;
    }

    public Fertilizer fertilizer() {
        return fertilizer;
    }

    @Override
    public InteractionResult useOn(UseOnContext context) {
        Level level = context.getLevel();
        BlockPos pos = context.getClickedPos();
        if (!canFertilize(level.getBlockState(pos))) {
            pos = pos.below();
            if (!canFertilize(level.getBlockState(pos))) {
                return InteractionResult.PASS;
            }
        }
        if (!level.isClientSide) {
            apply(level, pos, fertilizer);
            Player player = context.getPlayer();
            if (player == null || !player.getAbilities().instabuild) {
                context.getItemInHand().shrink(1);
            }
        }
        return InteractionResult.sidedSuccess(level.isClientSide);
    }

    private boolean canFertilize(BlockState state) {
        if (state.is(Blocks.FARMLAND)) {
            return true;
        }
        return fertilizer == Fertilizer.DELUXE_HYDRATING && state.getBlock() instanceof GardenPotBlock
                && !state.getValue(GardenPotBlock.DELUXE);
    }

    /** Fertilizes plain farmland or upgrades a garden pot. Returns whether the soil changed. */
    public static boolean apply(Level level, BlockPos pos, Fertilizer fertilizer) {
        BlockState state = level.getBlockState(pos);
        BlockState result;
        if (state.getBlock() instanceof GardenPotBlock) {
            if (fertilizer != Fertilizer.DELUXE_HYDRATING || state.getValue(GardenPotBlock.DELUXE)) {
                return false;
            }
            result = state.setValue(GardenPotBlock.DELUXE, true).setValue(FarmBlock.MOISTURE, FarmBlock.MAX_MOISTURE);
        } else if (state.is(Blocks.FARMLAND)) {
            result = FarmRegistry.FARMLAND.get(fertilizer).get().defaultBlockState()
                    .setValue(FarmBlock.MOISTURE, state.getValue(FarmBlock.MOISTURE));
        } else {
            return false;
        }
        level.setBlock(pos, result, 3);
        level.playSound(null, pos, SoundEvents.BONE_MEAL_USE, SoundSource.BLOCKS, 1.0F, 1.0F);
        if (level instanceof ServerLevel server) {
            server.sendParticles(ParticleTypes.HAPPY_VILLAGER, pos.getX() + 0.5, pos.getY() + 1.0, pos.getZ() + 0.5,
                    8, 0.3, 0.1, 0.3, 0.0);
        }
        return true;
    }
}
