package dev.sunlitidle.farm;

import com.mojang.serialization.MapCodec;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.CactusBlock;
import net.minecraft.world.level.block.SugarCaneBlock;
import net.minecraft.world.level.block.state.BlockState;

/** Sand with Hyper Fertilizer: sugar cane and cactus on it grow three times as fast. */
public class HyperSandBlock extends Block {
    public static final MapCodec<HyperSandBlock> CODEC = simpleCodec(HyperSandBlock::new);
    private static final int EXTRA_TICKS = 2;

    public HyperSandBlock(Properties properties) {
        super(properties);
    }

    @Override
    protected boolean isRandomlyTicking(BlockState state) {
        return true;
    }

    @Override
    protected void randomTick(BlockState state, ServerLevel level, BlockPos pos, RandomSource random) {
        BlockPos plantPos = pos.above();
        for (int i = 0; i < EXTRA_TICKS; i++) {
            BlockState plant = level.getBlockState(plantPos);
            if (!(plant.getBlock() instanceof SugarCaneBlock) && !(plant.getBlock() instanceof CactusBlock)) {
                return;
            }
            plant.randomTick(level, plantPos, random);
        }
    }

    @Override
    public MapCodec<HyperSandBlock> codec() {
        return CODEC;
    }
}
