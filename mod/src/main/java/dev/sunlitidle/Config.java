package dev.sunlitidle;

import net.minecraftforge.common.ForgeConfigSpec;

public final class Config {
    public static final ForgeConfigSpec SPEC;
    private static final TierConfig[] TIERS = new TierConfig[3];
    public static final ForgeConfigSpec.IntValue MAX_LEVEL;
    public static final ForgeConfigSpec.IntValue RETREAT_SECONDS;
    public static final ForgeConfigSpec.DoubleValue SKILL_XP_FACTOR;

    static {
        ForgeConfigSpec.Builder b = new ForgeConfigSpec.Builder();
        b.push("companion");
        MAX_LEVEL = b.comment("Maximum companion level").defineInRange("maxLevel", 30, 1, 100);
        RETREAT_SECONDS = b.comment("Seconds the companion rests after losing a fight")
                .defineInRange("retreatSeconds", 60, 0, 3600);
        SKILL_XP_FACTOR = b.comment("Adventuring skill XP per kill = enemy health * this factor (0 disables)")
                .defineInRange("skillXpFactor", 0.5, 0.0, 10.0);
        b.pop();
        TIERS[0] = new TierConfig(b, 1, 10, 2, 1, 150, 1, 1);
        TIERS[1] = new TierConfig(b, 2, 25, 4, 2, 400, 3, 5);
        TIERS[2] = new TierConfig(b, 3, 60, 7, 3, 900, 8, 10);
        SPEC = b.build();
    }

    private Config() {
    }

    public static TierConfig tier(int number) {
        return TIERS[Math.max(1, Math.min(TIERS.length, number)) - 1];
    }

    public static final class TierConfig {
        public final ForgeConfigSpec.DoubleValue enemyHealth;
        public final ForgeConfigSpec.DoubleValue enemyDamage;
        public final ForgeConfigSpec.DoubleValue baseFood;
        public final ForgeConfigSpec.DoubleValue power;
        public final ForgeConfigSpec.IntValue xpPerKill;
        public final ForgeConfigSpec.IntValue unlockLevel;

        TierConfig(ForgeConfigSpec.Builder b, int n, double hp, double dmg, double food, double power, int xp,
                   int unlock) {
            b.push("tier" + n);
            enemyHealth = b.defineInRange("enemyHealth", hp, 1.0, 100000.0);
            enemyDamage = b.defineInRange("enemyDamage", dmg, 0.0, 10000.0);
            baseFood = b.comment("Nutrition used per kill before damage").defineInRange("baseFood", food, 0.0, 100.0);
            this.power = b.comment("Reference power; above twice this the companion fights faster")
                    .defineInRange("power", power, 1.0, 1.0E7);
            xpPerKill = b.defineInRange("xpPerKill", xp, 0, 10000);
            unlockLevel = b.defineInRange("unlockLevel", unlock, 1, 100);
            b.pop();
        }
    }
}
