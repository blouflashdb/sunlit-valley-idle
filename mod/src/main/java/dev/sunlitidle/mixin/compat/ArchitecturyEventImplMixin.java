package dev.sunlitidle.mixin.compat;

import java.util.ArrayList;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Pseudo;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Makes Architectury's event listener lists copy-on-write.
 *
 * <p>Architectury 13.0.11/13.0.12 keeps the listeners of an event in a plain {@code ArrayList} that the event's
 * invoker iterates. Several pack mods (Let's Do Farm &amp; Charm, Furniture and Vinery, Skill Exp Notifier) register
 * {@code ClientTickEvent} listeners in {@code FMLClientSetupEvent} on a mod loading worker thread while the render
 * thread already ticks behind the loading overlay, so the client can crash on start with a
 * {@code ConcurrentModificationException} in {@code EventFactory$1.handleInvocation}. With these injections a
 * registration replaces the list instead of changing it: a running iteration keeps its old list and the next call
 * builds the invoker from the new one.
 *
 * <p>{@code @Pseudo} and the optional mixin config keep this a no-op when Architectury is not installed.
 */
@Pseudo
@Mixin(targets = "dev.architectury.event.EventFactory$EventImpl", remap = false)
public abstract class ArchitecturyEventImplMixin {
    @Shadow
    private Object invoker;

    @Shadow
    private ArrayList<Object> listeners;

    @Inject(method = "register", at = @At("HEAD"), cancellable = true, remap = false)
    private void sunlitidle$register(Object listener, CallbackInfo ci) {
        synchronized (this) {
            ArrayList<Object> copy = new ArrayList<>(listeners);
            copy.add(listener);
            listeners = copy;
            invoker = null;
        }
        ci.cancel();
    }

    @Inject(method = "unregister", at = @At("HEAD"), cancellable = true, remap = false)
    private void sunlitidle$unregister(Object listener, CallbackInfo ci) {
        synchronized (this) {
            ArrayList<Object> copy = new ArrayList<>(listeners);
            copy.remove(listener);
            listeners = copy;
            invoker = null;
        }
        ci.cancel();
    }

    @Inject(method = "clearListeners", at = @At("HEAD"), cancellable = true, remap = false)
    private void sunlitidle$clearListeners(CallbackInfo ci) {
        synchronized (this) {
            listeners = new ArrayList<>();
            invoker = null;
        }
        ci.cancel();
    }
}
