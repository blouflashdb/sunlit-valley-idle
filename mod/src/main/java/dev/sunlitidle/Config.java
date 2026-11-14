package dev.sunlitidle;

import net.neoforged.neoforge.common.ModConfigSpec;

public final class Config {
    public static final ModConfigSpec SPEC;
    private static final TierConfig[] TIERS = new TierConfig[5];
    public static final ModConfigSpec.IntValue RETREAT_SECONDS;
    public static final ModConfigSpec.DoubleValue SKILL_XP_FACTOR;
    public static final ModConfigSpec.DoubleValue MAX_OFFLINE_HOURS;
    public static final ModConfigSpec.IntValue CATCH_UP_SECONDS_PER_TICK;

    static {
        ModConfigSpec.Builder b = new ModConfigSpec.Builder();
        b.push("companion");
        RETREAT_SECONDS = b.comment("Seconds the companion rests after losing a fight")
                .defineInRange("retreatSeconds", 60, 0, 3600);
        SKILL_XP_FACTOR = b.comment("Adventuring skill XP per kill = enemy health * this factor (0 disables)")
                .defineInRange("skillXpFactor", 0.5, 0.0, 10.0);
        b.pop();
        b.push("idle");
        MAX_OFFLINE_HOURS = b.comment("Hours of offline time that idle skills catch up on login (0 disables)")
                .defineInRange("maxOfflineHours", 24.0, 0.0, 168.0);
        CATCH_UP_SECONDS_PER_TICK = b.comment("Offline seconds processed per second of play while catching up")
                .defineInRange("catchUpSecondsPerSecond", 900, 1, 86400);
        b.pop();
        TIERS[0] = new TierConfig(b, 1, 10, 2, 1, 150);
        TIERS[1] = new TierConfig(b, 2, 25, 4, 2, 400);
        TIERS[2] = new TierConfig(b, 3, 60, 7, 3, 900);
        TIERS[3] = new TierConfig(b, 4, 140, 11, 4, 2500);
        TIERS[4] = new TierConfig(b, 5, 300, 16, 5, 8000);
        SPEC = b.build();
    }

    private Config() {
    }

    public static TierConfig tier(int number) {
        return TIERS[Math.max(1, Math.min(TIERS.length, number)) - 1];
    }

    public static final class TierConfig {
        public final ModConfigSpec.DoubleValue enemyHealth;
        public final ModConfigSpec.DoubleValue enemyDamage;
        public final ModConfigSpec.DoubleValue baseFood;
        public final ModConfigSpec.DoubleValue power;

        TierConfig(ModConfigSpec.Builder b, int n, double hp, double dmg, double food, double power) {
            b.push("tier" + n);
            enemyHealth = b.defineInRange("enemyHealth", hp, 1.0, 100000.0);
            enemyDamage = b.defineInRange("enemyDamage", dmg, 0.0, 10000.0);
            baseFood = b.comment("Nutrition used per kill before damage").defineInRange("baseFood", food, 0.0, 100.0);
            this.power = b.comment("Reference power; above twice this the companion fights faster")
                    .defineInRange("power", power, 1.0, 1.0E7);
            b.pop();
        }
    }
}
