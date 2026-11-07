package dev.sunlitidle.camp;

import dev.sunlitidle.Config;
import dev.sunlitidle.SunlitIdle;
import net.minecraft.resources.ResourceLocation;

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

    public int xpPerKill() {
        return Config.tier(number).xpPerKill.get();
    }

    public int unlockLevel() {
        return Config.tier(number).unlockLevel.get();
    }

    public ResourceLocation lootTable() {
        return new ResourceLocation(SunlitIdle.MOD_ID, "dungeon/tier_" + number);
    }

    public String translationKey() {
        return "sunlitidle.tier." + number;
    }

    public static DungeonTier byNumber(int number) {
        for (DungeonTier t : values()) {
            if (t.number == number) {
                return t;
            }
        }
        return T1;
    }

    public static int count() {
        return values().length;
    }
}
