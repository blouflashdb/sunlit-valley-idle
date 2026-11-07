package dev.sunlitidle.idle;

import net.minecraft.resources.ResourceLocation;

/**
 * One entry of an action's output. A block rolls that block's loot table (fully grown for crops), an entity
 * rolls that mob's loot table as if the player killed it, a loot table is rolled as fishing loot (or as chest
 * loot with {@code chest}), and an item is a plain count.
 */
public record IdleDrop(Kind kind, ResourceLocation id, double chance, int min, int max, int luck, boolean chest) {
    public enum Kind {
        BLOCK,
        ENTITY,
        LOOT_TABLE,
        ITEM
    }
}
