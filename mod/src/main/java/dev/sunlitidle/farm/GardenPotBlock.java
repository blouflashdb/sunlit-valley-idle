package dev.sunlitidle.farm;

import net.minecraft.core.BlockPos;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.FarmBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BooleanProperty;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * A pot that crops can be planted in. Sprinklers do not reach it, but an indoor pot ignores the season.
 * Deluxe Hydrating Fertilizer upgrades it so it never dries.
 */
public class GardenPotBlock extends FarmBlock {
    public static final BooleanProperty DELUXE = BooleanProperty.create("deluxe");
    private static final VoxelShape SHAPE = Block.box(1.0, 0.0, 1.0, 15.0, 15.0, 15.0);

    public GardenPotBlock(Properties properties) {
        super(properties);
        registerDefaultState(defaultBlockState().setValue(DELUXE, false));
    }

    @Override
    protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
        super.createBlockStateDefinition(builder);
        builder.add(DELUXE);
    }

    @Override
    protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
        return SHAPE;
    }
}

