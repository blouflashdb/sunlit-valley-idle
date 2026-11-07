package dev.sunlitidle.camp;

/**
 * Pure combat math for the virtual dungeon fights. Kept free of Minecraft
 * classes so it can be unit tested and tuned without a game instance.
 */
public final class Combat {
    /** Seconds between two enemy attacks. */
    public static final double ENEMY_ATTACK_INTERVAL = 1.5;
    /** Seconds the companion spends finding the next enemy. */
    public static final double SEARCH_SECONDS = 3.0;
    /** Power ratio above which the companion overpowers a tier. */
    public static final double OVERPOWER_RATIO = 2.0;
    /** Maximum speed multiplier from overpowering a tier. */
    public static final double MAX_SPEED_MULTIPLIER = 3.0;

    private Combat() {
    }

    /**
     * What the companion brings into a fight.
     *
     * @param damage     damage per hit, including attack stat and sharpness
     * @param attackSpeed attacks per second, including the speed stat
     * @param armor      armor points
     * @param toughness  armor toughness
     * @param protection summed protection enchantment levels (EPF)
     * @param maxHealth  maximum health
     */
    public record Loadout(double damage, double attackSpeed, double armor, double toughness, int protection,
                          double maxHealth) {
    }

    /** One dungeon tier's enemy. */
    public record Enemy(double health, double damage, double baseFood, double power) {
    }

    /** Vanilla armor formula (CombatRules#getDamageAfterAbsorb). */
    public static double afterArmor(double damage, double armor, double toughness) {
        double t = 2.0 + toughness / 4.0;
        double effective = clamp(armor - damage / t, armor * 0.2, 20.0);
        return damage * (1.0 - effective / 25.0);
    }

    /** Vanilla enchantment protection formula (CombatRules#getDamageAfterMagicAbsorb). */
    public static double afterProtection(double damage, int protection) {
        double f = clamp(protection, 0.0, 20.0);
        return damage * (1.0 - f / 25.0);
    }

    public static double damagePerEnemyHit(Loadout loadout, Enemy enemy) {
        return afterProtection(afterArmor(enemy.damage(), loadout.armor(), loadout.toughness()), loadout.protection());
    }

    public static int hitsToKill(Loadout loadout, Enemy enemy) {
        if (loadout.damage() <= 0) {
            return Integer.MAX_VALUE;
        }
        return (int) Math.ceil(enemy.health() / loadout.damage());
    }

    public static double fightSeconds(Loadout loadout, Enemy enemy) {
        return hitsToKill(loadout, enemy) / Math.max(0.1, loadout.attackSpeed());
    }

    public static double expectedHitsTaken(Loadout loadout, Enemy enemy) {
        return fightSeconds(loadout, enemy) / ENEMY_ATTACK_INTERVAL;
    }

    /** Damage per second times effective health against this enemy. */
    public static double power(Loadout loadout, Enemy enemy) {
        double dps = loadout.damage() * loadout.attackSpeed();
        double perHit = Math.max(0.01, damagePerEnemyHit(loadout, enemy));
        double effectiveHealth = loadout.maxHealth() * enemy.damage() / perHit;
        return dps * effectiveHealth;
    }

    public static boolean overpowers(Loadout loadout, Enemy enemy) {
        return power(loadout, enemy) > enemy.power() * OVERPOWER_RATIO;
    }

    public static double speedMultiplier(Loadout loadout, Enemy enemy) {
        double ratio = power(loadout, enemy) / enemy.power();
        if (ratio <= OVERPOWER_RATIO) {
            return 1.0;
        }
        return Math.min(MAX_SPEED_MULTIPLIER, ratio / OVERPOWER_RATIO);
    }

    public static double killSeconds(Loadout loadout, Enemy enemy) {
        return (fightSeconds(loadout, enemy) + SEARCH_SECONDS) / speedMultiplier(loadout, enemy);
    }

    /** Nutrition used for one kill, given the damage the companion took. */
    public static double foodCost(Loadout loadout, Enemy enemy, double damageTaken) {
        if (overpowers(loadout, enemy)) {
            return enemy.baseFood();
        }
        return enemy.baseFood() + damageTaken / 4.0;
    }

    public static int xpForNextLevel(int level) {
        return 20 * level * level;
    }

    private static double clamp(double v, double lo, double hi) {
        return Math.max(lo, Math.min(hi, v));
    }
}
