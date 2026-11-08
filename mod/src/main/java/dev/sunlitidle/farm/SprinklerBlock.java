package dev.sunlitidle.farm;

import com.mojang.serialization.Codec;
import com.mojang.serialization.MapCodec;
import com.mojang.serialization.codecs.RecordCodecBuilder;
import net.minecraft.core.BlockPos;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * Waters the farmland around it every morning: a square of radius {@link #radius()} on its own layer and the
 * layer below. {@link DailyFarm} finds sprinklers by the {@code dew_drop_farmland_growth:sprinkler_tier_N} tags,
 * so KubeJS blocks with such a tag water too.
 */
public class SprinklerBlock extends Block {
    public static final MapCodec<SprinklerBlock> CODEC = RecordCodecBuilder.mapCodec(i -> i.group(
            Codec.INT.fieldOf("radius").forGetter(SprinklerBlock::radius),
            propertiesCodec()).apply(i, SprinklerBlock::new));
    private static final VoxelShape SHAPE = Block.box(5.0, 0.0, 5.0, 11.0, 10.0, 11.0);

    private final int radius;

    public SprinklerBlock(int radius, Properties properties) {
        super(properties);
        this.radius = radius;
    }

    public int radius() {
        return radius;
    }

    @Override
    protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
        return SHAPE;
    }

    @Override
    public MapCodec<SprinklerBlock> codec() {
        return CODEC;
    }
}
