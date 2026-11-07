package dev.sunlitidle.idle;

/**
 * Pure idle formulas. Free of Minecraft classes so they can be unit tested and tuned.
 */
public final class IdleMath {
    /** Speed bonus per skill level. */
    public static final double SPEED_PER_LEVEL = 0.03;
    /** Extra roll chance per skill level. */
    public static final double YIELD_PER_LEVEL = 0.03;
    /** Tool speed per tier level (wood and gold 0, stone 1, iron 2, diamond 3, netherite 4). */
    public static final double SPEED_PER_TIER = 0.25;
    /** Tool speed per Efficiency level. */
    public static final double SPEED_PER_EFFICIENCY = 0.05;
    /** Speed without a tool, for skills whose tool is optional. */
    public static final double NO_TOOL_SPEED = 0.5;
    /** Shortest possible action, so very fast setups do not spin the server. */
    public static final double MIN_SECONDS = 0.5;
    /** Total skill level needed for each action slot. */
    private static final int[] SLOT_THRESHOLDS = {0, 5, 15, 30, 50};

    private IdleMath() {
    }

    public static double toolSpeed(boolean hasTool, int tierLevel, int efficiency) {
        if (!hasTool) {
            return NO_TOOL_SPEED;
        }
        return 1.0 + SPEED_PER_TIER * Math.max(0, tierLevel) + SPEED_PER_EFFICIENCY * Math.max(0, efficiency);
    }

    public static double actionSeconds(double baseSeconds, double toolSpeed, int level, double speedAttribute) {
        double speed = toolSpeed * (1.0 + SPEED_PER_LEVEL * Math.max(0, level)) * (1.0 + Math.max(0.0, speedAttribute));
        return Math.max(MIN_SECONDS, baseSeconds / Math.max(0.01, speed));
    }

    public static double extraRollChance(int level, double yieldAttribute) {
        return Math.max(0.0, YIELD_PER_LEVEL * Math.max(0, level) + yieldAttribute);
    }

    /** Number of loot rolls for one completion: 1 plus the extra roll chance, where every full 100% is certain. */
    public static int rolls(double extraChance, double random01) {
        int guaranteed = (int) Math.floor(extraChance);
        double rest = extraChance - guaranteed;
        return 1 + guaranteed + (random01 < rest ? 1 : 0);
    }

    public static int maxSlots() {
        return SLOT_THRESHOLDS.length;
    }

    public static int slotsForTotalLevel(int totalLevel) {
        int slots = 0;
        for (int threshold : SLOT_THRESHOLDS) {
            if (totalLevel >= threshold) {
                slots++;
            }
        }
        return slots;
    }

    /** Total level needed to unlock the given slot (0-based), or -1 when there is no such slot. */
    public static int totalLevelForSlot(int slot) {
        return slot >= 0 && slot < SLOT_THRESHOLDS.length ? SLOT_THRESHOLDS[slot] : -1;
    }

    /** Level reached with the given total XP on a per-level XP curve. */
    public static int levelForXp(long totalXp, int[] curve) {
        int level = 0;
        long left = totalXp;
        while (level < curve.length && left >= curve[level]) {
            left -= curve[level];
            level++;
        }
        return level;
    }

    /** XP gathered towards the next level. */
    public static long xpIntoLevel(long totalXp, int[] curve) {
        long left = totalXp;
        for (int needed : curve) {
            if (left < needed) {
                return left;
            }
            left -= needed;
        }
        return 0;
    }

    /** XP needed for the next level, or 0 at max level. */
    public static int xpForNext(int level, int[] curve) {
        return level >= 0 && level < curve.length ? curve[level] : 0;
    }

    /** Completions that fit into the given time, starting from the current progress. */
    public static long completions(double progressSeconds, double elapsedSeconds, double actionSeconds) {
        if (actionSeconds <= 0) {
            return 0;
        }
        return (long) Math.floor((progressSeconds + elapsedSeconds) / actionSeconds);
    }
}
