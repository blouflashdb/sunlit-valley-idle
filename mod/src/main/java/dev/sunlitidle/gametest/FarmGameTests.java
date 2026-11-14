package dev.sunlitidle.gametest;

import dev.sunlitidle.SunlitIdle;
import dev.sunlitidle.farm.CropGrowth;
import dev.sunlitidle.farm.DailyFarm;
import dev.sunlitidle.farm.FarmRegistry;
import dev.sunlitidle.farm.Fertilizer;
import dev.sunlitidle.farm.FertilizerItem;
import dev.sunlitidle.farm.Watering;
import net.minecraft.core.BlockPos;
import net.minecraft.gametest.framework.GameTest;
import net.minecraft.gametest.framework.GameTestHelper;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.CropBlock;
import net.minecraft.world.level.block.FarmBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.neoforged.neoforge.gametest.GameTestHolder;
import net.neoforged.neoforge.gametest.PrefixGameTestTemplate;

import java.util.List;

/** In-game checks of the farm day (dev.sunlitidle.farm), run in CI with ./gradlew runGameTestServer. */
@GameTestHolder(SunlitIdle.MOD_ID)
@PrefixGameTestTemplate(false)
public final class FarmGameTests {
    private FarmGameTests() {
    }

    private static BlockState farmland(int moisture) {
        return Blocks.FARMLAND.defaultBlockState().setValue(FarmBlock.MOISTURE, moisture);
    }

    private static int age(GameTestHelper helper, BlockPos pos) {
        BlockState state = helper.getBlockState(pos);
        return ((CropBlock) state.getBlock()).getAge(state);
    }

    @GameTest(template = "empty")
    public static void wateredCropGrowsOneStageAndSoilDries(GameTestHelper helper) {
        BlockPos soil = new BlockPos(1, 1, 1);
        helper.setBlock(soil, farmland(7));
        helper.setBlock(soil.above(), Blocks.WHEAT.defaultBlockState());
        DailyFarm.runDay(helper.getLevel(), List.of(helper.absolutePos(soil)), List.of());
        helper.assertTrue(age(helper, soil.above()) == 1, "wheat should be age 1, is " + age(helper, soil.above()));
        helper.assertTrue(!Watering.isMoist(helper.getBlockState(soil)), "farmland did not dry");
        DailyFarm.runDay(helper.getLevel(), List.of(helper.absolutePos(soil)), List.of());
        helper.assertTrue(age(helper, soil.above()) == 1, "wheat grew on dry farmland");
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void weakFertilizerSkipsADay(GameTestHelper helper) {
        BlockPos soil = new BlockPos(1, 1, 1);
        helper.setBlock(soil, farmland(7));
        FertilizerItem.apply(helper.getLevel(), helper.absolutePos(soil), Fertilizer.WEAK);
        helper.assertBlockPresent(FarmRegistry.FARMLAND.get(Fertilizer.WEAK).get(), soil);
        helper.assertTrue(Watering.isMoist(helper.getBlockState(soil)), "fertilizing lost the water");
        helper.setBlock(soil.above(), Blocks.WHEAT.defaultBlockState());
        DailyFarm.runDay(helper.getLevel(), List.of(helper.absolutePos(soil)), List.of());
        helper.assertTrue(age(helper, soil.above()) == 2, "wheat should be age 2, is " + age(helper, soil.above()));
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void deluxeHydratingNeverDries(GameTestHelper helper) {
        BlockPos soil = new BlockPos(1, 1, 1);
        helper.setBlock(soil, FarmRegistry.FARMLAND.get(Fertilizer.DELUXE_HYDRATING).get().defaultBlockState()
                .setValue(FarmBlock.MOISTURE, 7));
        helper.setBlock(soil.above(), Blocks.CARROTS.defaultBlockState());
        for (int day = 0; day < 3; day++) {
            DailyFarm.runDay(helper.getLevel(), List.of(helper.absolutePos(soil)), List.of());
        }
        helper.assertTrue(age(helper, soil.above()) == 3, "carrots should be age 3, is " + age(helper, soil.above()));
        helper.assertTrue(Watering.isMoist(helper.getBlockState(soil)), "deluxe hydrating farmland dried");
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void sprinklerWatersItsArea(GameTestHelper helper) {
        BlockPos sprinkler = new BlockPos(1, 2, 1);
        helper.setBlock(sprinkler, FarmRegistry.IRON_SPRINKLER.get().defaultBlockState());
        BlockPos[] soil = {new BlockPos(0, 1, 0), new BlockPos(2, 1, 2), new BlockPos(1, 1, 1), new BlockPos(0, 2, 1)};
        for (BlockPos pos : soil) {
            helper.setBlock(pos, farmland(0));
        }
        DailyFarm.runDay(helper.getLevel(), List.of(), List.of(helper.absolutePos(sprinkler)));
        for (BlockPos pos : soil) {
            helper.assertTrue(Watering.isMoist(helper.getBlockState(pos)), "sprinkler missed " + pos);
        }
        helper.succeed();
    }

    @GameTest(template = "empty")
    public static void farmlandSurvivesABlockOnTop(GameTestHelper helper) {
        BlockPos soil = new BlockPos(1, 1, 1);
        helper.setBlock(soil, farmland(0));
        helper.setBlock(soil.above(), Blocks.STONE.defaultBlockState());
        helper.runAfterDelay(5, () -> {
            helper.assertBlockPresent(Blocks.FARMLAND, soil);
            helper.succeed();
        });
    }

    @GameTest(template = "empty")
    public static void cropGrowthCountsFarmDays(GameTestHelper helper) {
        BlockPos plain = new BlockPos(1, 1, 1);
        helper.setBlock(plain, farmland(7));
        helper.setBlock(plain.above(), ((CropBlock) Blocks.WHEAT).getStateForAge(3));
        CropGrowth growth = growth(helper, plain.above());
        helper.assertTrue(growth.day() == 3 && growth.days() == 7 && !growth.boosted() && !growth.mature(),
                "plain wheat at age 3 should be day 3/7, is " + growth);

        BlockPos boosted = new BlockPos(3, 1, 1);
        helper.setBlock(boosted, farmland(7));
        FertilizerItem.apply(helper.getLevel(), helper.absolutePos(boosted), Fertilizer.WEAK);
        helper.setBlock(boosted.above(), Blocks.WHEAT.defaultBlockState());
        growth = growth(helper, boosted.above());
        helper.assertTrue(growth.day() == 0 && growth.days() == 6 && growth.boosted(),
                "fresh wheat on weak fertilizer should be day 0/6, is " + growth);
        DailyFarm.runDay(helper.getLevel(), List.of(helper.absolutePos(boosted)), List.of());
        growth = growth(helper, boosted.above());
        helper.assertTrue(growth.day() == 1 && growth.days() == 6, "after one morning it should be day 1/6, is " + growth);

        helper.setBlock(plain.above(), ((CropBlock) Blocks.WHEAT).getStateForAge(7));
        helper.assertTrue(growth(helper, plain.above()).mature(), "full grown wheat is not mature");
        helper.assertTrue(CropGrowth.of(helper.getLevel(), helper.absolutePos(plain), helper.getBlockState(plain)) == null,
                "farmland has a crop growth");
        helper.succeed();
    }

    private static CropGrowth growth(GameTestHelper helper, BlockPos pos) {
        return CropGrowth.of(helper.getLevel(), helper.absolutePos(pos), helper.getBlockState(pos));
    }
}
