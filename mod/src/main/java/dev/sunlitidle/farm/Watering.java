package dev.sunlitidle.farm;

import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.FarmBlock;
import net.minecraft.world.level.block.state.BlockState;

/** Reading and changing the water of farmland. Wet farmland has moisture 7, dry farmland 0. */
public final class Watering {
    private Watering() {
    }

    public static boolean isWaterable(BlockState state) {
        return state.is(FarmTags.WATERABLE) && state.hasProperty(FarmBlock.MOISTURE);
    }

    public static boolean isMoist(BlockState state) {
        return isWaterable(state) && state.getValue(FarmBlock.MOISTURE) > 0;
    }

    /**
     * The soil at {@code pos}, or below it when {@code pos} holds a plant, or {@code null}.
     */
    public static BlockPos soilAt(Level level, BlockPos pos) {
        if (isWaterable(level.getBlockState(pos))) {
            return pos;
        }
        BlockPos below = pos.below();
        return isWaterable(level.getBlockState(below)) ? below : null;
    }

    /** Waters the soil at {@code pos}. Returns whether it was dry before. */
    public static boolean setMoist(Level level, BlockPos pos) {
        BlockState state = level.getBlockState(pos);
        if (!isWaterable(state) || state.getValue(FarmBlock.MOISTURE) == FarmBlock.MAX_MOISTURE) {
            return false;
        }
        level.setBlock(pos, state.setValue(FarmBlock.MOISTURE, FarmBlock.MAX_MOISTURE), 2);
        return true;
    }

    public static void setDry(Level level, BlockPos pos) {
        BlockState state = level.getBlockState(pos);
        if (isWaterable(state) && state.getValue(FarmBlock.MOISTURE) != 0) {
            level.setBlock(pos, state.setValue(FarmBlock.MOISTURE, 0), 2);
        }
    }

    /** Waters the soil at or below {@code pos} and shows a splash. Returns whether anything was watered. */
    public static boolean water(Level level, BlockPos pos) {
        BlockPos soil = soilAt(level, pos);
        if (soil == null) {
            return false;
        }
        boolean changed = setMoist(level, soil);
        if (level instanceof ServerLevel server) {
            server.sendParticles(ParticleTypes.SPLASH, soil.getX() + 0.5, soil.getY() + 1.0, soil.getZ() + 0.5,
                    6, 0.3, 0.05, 0.3, 0.0);
        }
        return changed || isMoist(level.getBlockState(soil));
    }
}
