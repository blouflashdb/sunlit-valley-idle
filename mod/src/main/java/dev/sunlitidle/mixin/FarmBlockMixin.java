package dev.sunlitidle.mixin;

import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.LevelReader;
import net.minecraft.world.level.block.FarmBlock;
import net.minecraft.world.level.block.state.BlockState;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * Sturdy farmland: farmland keeps its water until the farm morning ({@code dev.sunlitidle.farm.DailyFarm})
 * instead of drying or turning to dirt on random ticks, and a block on top does not turn it into dirt.
 */
@Mixin(FarmBlock.class)
public abstract class FarmBlockMixin {
    @Inject(method = "randomTick", at = @At("HEAD"), cancellable = true)
    private void sunlitidle$noRandomTick(BlockState state, ServerLevel level, BlockPos pos, RandomSource random,
                                         CallbackInfo ci) {
        ci.cancel();
    }

    @Inject(method = "canSurvive", at = @At("HEAD"), cancellable = true)
    private void sunlitidle$sturdy(BlockState state, LevelReader level, BlockPos pos, CallbackInfoReturnable<Boolean> cir) {
        cir.setReturnValue(true);
    }
}
