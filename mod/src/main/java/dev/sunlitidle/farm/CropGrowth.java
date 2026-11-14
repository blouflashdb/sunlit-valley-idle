package dev.sunlitidle.farm;

import net.minecraft.core.BlockPos;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.CropBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.IntegerProperty;

/**
 * How far a daily crop is, in farm days, for the Jade tooltip. A crop grows one stage each watered morning; speed
 * fertilizer under it adds stages on the first day, so the crop needs fewer days ({@link #boosted()}).
 *
 * @param day     days the crop has grown
 * @param days    days it needs in total
 * @param boosted whether speed fertilizer shortens the growth
 * @param fertile whether it can grow here now (season, greenhouse glass or a roofed garden pot)
 */
public record CropGrowth(int day, int days, boolean boosted, boolean fertile) {

    public boolean mature() {
        return day >= days;
    }

    /** The growth of the daily crop at {@code pos}, or null when the block is not a daily crop with an age. */
    public static CropGrowth of(Level level, BlockPos pos, BlockState state) {
        if (!state.is(FarmTags.DAILY_CROPS)) {
            return null;
        }
        IntegerProperty ageProperty = DailyFarm.ageProperty(state);
        if (ageProperty == null) {
            return null;
        }
        int age = state.getValue(ageProperty);
        int max = DailyFarm.maxOf(ageProperty);
        if (state.getBlock() instanceof CropBlock crop) {
            age = crop.getAge(state);
            max = crop.getMaxAge();
        }
        BlockState soil = level.getBlockState(pos.below());
        int speed = soil.getBlock() instanceof FertilizedFarmBlock farmland ? farmland.fertilizer().speedDays() : 0;
        boolean fertile = SeasonFertility.isFertile(level, pos, state)
                || soil.getBlock() instanceof GardenPotBlock && !level.canSeeSky(pos.above());
        return days(age, max, speed, fertile);
    }

    /** The growth of a crop at {@code age} of {@code max} stages whose soil adds {@code speed} stages on day one. */
    static CropGrowth days(int age, int max, int speed, boolean fertile) {
        if (speed <= 0 || max <= 1) {
            return new CropGrowth(Math.min(age, max), max, false, fertile);
        }
        int days = Math.max(1, max - speed);
        int day = age >= max ? days : age == 0 ? 0 : Math.max(0, Math.min(days - 1, age - speed));
        return new CropGrowth(day, days, true, fertile);
    }
}
