package dev.sunlitidle.combat;

import dev.sunlitidle.Config;
import dev.sunlitidle.SunlitIdle;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.level.storage.loot.LootTable;

/** Dungeon tiers. Numbers are read from the common config so they can be tuned in the pack. */
public enum DungeonTier {
    T1(1),
    T2(2),
    T3(3),
    T4(4),
    T5(5);

    private final int number;

    DungeonTier(int number) {
        this.number = number;
    }

    public int number() {
        return number;
    }

    public Combat.Enemy enemy() {
        Config.TierConfig c = Config.tier(number);
        return new Combat.Enemy(c.enemyHealth.get(), c.enemyDamage.get(), c.baseFood.get(), c.power.get());
    }

    public ResourceKey<LootTable> lootTable() {
        return ResourceKey.create(Registries.LOOT_TABLE, SunlitIdle.id("dungeon/tier_" + number));
    }

    public static DungeonTier byNumber(int number) {
        for (DungeonTier t : values()) {
            if (t.number == number) {
                return t;
            }
        }
        return T1;
    }
}
