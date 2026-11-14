package dev.sunlitidle.farm;

import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.state.BlockState;

/**
 * Entry points for the pack's KubeJS scripts ({@code Java.loadClass("dev.sunlitidle.farm.FarmApi")}).
 * They replace {@code cool.bot.dewdropfarmland.utils.CropHandlerUtils} from 1.20.1.
 */
public final class FarmApi {
    private FarmApi() {
    }

    /** Stages a crop at {@code age} grows in one day on {@code soil}, fertilizer included. */
    public static int getFertilizerIncrease(int age, int maxAge, BlockState soil) {
        return DailyFarm.growthStages(age, maxAge, soil, 1);
    }

    /** Grows every daily crop within {@code radius} (one layer up and down) by one day. Returns how many grew. */
    public static int growCropsInRadius(ServerLevel level, BlockPos center, RandomSource random, int radius) {
        int grown = 0;
        for (BlockPos pos : BlockPos.betweenClosed(center.offset(-radius, -1, -radius), center.offset(radius, 1, radius))) {
            BlockPos crop = pos.immutable();
            BlockState soil = level.getBlockState(crop.below());
            if (Watering.isWaterable(soil) && DailyFarm.growCrop(level, crop, soil, random, 1)) {
                grown++;
            }
        }
        return grown;
    }

    public static boolean isWaterable(BlockState state) {
        return Watering.isWaterable(state);
    }

    public static boolean isMoist(BlockState state) {
        return Watering.isMoist(state);
    }

    /** Waters the soil at or below {@code pos}. */
    public static boolean water(Level level, BlockPos pos) {
        return Watering.water(level, pos);
    }

    /** Fertilizes the plain farmland at {@code pos}; see {@link Fertilizer} for the names (e.g. "weak_fertilizer"). */
    public static boolean fertilize(Level level, BlockPos pos, String fertilizer) {
        for (Fertilizer f : Fertilizer.values()) {
            if (f.itemName().equals(fertilizer)) {
                return FertilizerItem.apply(level, pos, f);
            }
        }
        return false;
    }
}
