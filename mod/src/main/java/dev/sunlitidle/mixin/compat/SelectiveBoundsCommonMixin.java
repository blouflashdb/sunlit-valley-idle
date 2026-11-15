package dev.sunlitidle.mixin.compat;

import dev.sunlitidle.client.ClientConfig;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * The master switch of the block outline settings: while "always show" is on, Selective Bounds never hides the
 * block outline, whatever its own rules say.
 *
 * <p>{@code @Pseudo} and the optional mixin config keep this a no-op when Selective Bounds is not installed.
 */
@Pseudo
@Mixin(targets = "net.conczin.selectivebounds.Common", remap = false)
public abstract class SelectiveBoundsCommonMixin {
    @Inject(method = "shouldBlockOutline", at = @At("HEAD"), cancellable = true, remap = false)
    private static void sunlitidle$alwaysShow(CallbackInfoReturnable<Boolean> cir) {
        if (ClientConfig.alwaysShowBlockOutline()) {
            cir.setReturnValue(false);
        }
    }
}
