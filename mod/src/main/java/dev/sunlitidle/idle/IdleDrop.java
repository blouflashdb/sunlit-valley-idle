package dev.sunlitidle.idle;

import net.minecraft.resources.ResourceLocation;

/**
 * One entry of an action's output. A block rolls that block's loot table (fully grown for crops), a loot
 * table is rolled as fishing loot, and an item is a plain count.
 */
public record IdleDrop(Kind kind, ResourceLocation id, double chance, int min, int max, int luck) {
    public enum Kind {
        BLOCK,
        LOOT_TABLE,
        ITEM
    }
}
