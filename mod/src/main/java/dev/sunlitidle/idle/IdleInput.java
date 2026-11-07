package dev.sunlitidle.idle;

import net.minecraft.resources.ResourceLocation;

/** Items an action takes from idle storage for each completion. */
public record IdleInput(ResourceLocation item, int count) {
}
