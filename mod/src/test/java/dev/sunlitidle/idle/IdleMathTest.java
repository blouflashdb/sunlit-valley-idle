package dev.sunlitidle.idle;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class IdleMathTest {
    private static final int[] CURVE = {250, 500, 1000, 2000, 5000, 6000, 8000, 10000, 13000, 16000, 20000, 25000};

    @Test
    void betterToolsAndLevelsAreFaster() {
        double bare = IdleMath.actionSeconds(4.0, IdleMath.toolSpeed(false, 0, 0), 0, 0.0);
        double wood = IdleMath.actionSeconds(4.0, IdleMath.toolSpeed(true, 0, 0), 0, 0.0);
        double iron = IdleMath.actionSeconds(4.0, IdleMath.toolSpeed(true, 2, 0), 0, 0.0);
        double ironLevel12 = IdleMath.actionSeconds(4.0, IdleMath.toolSpeed(true, 2, 0), 12, 0.0);
        assertEquals(8.0, bare, 1e-9);
        assertEquals(4.0, wood, 1e-9);
        assertTrue(iron < wood);
        assertTrue(ironLevel12 < iron);
        assertTrue(IdleMath.actionSeconds(0.1, 100.0, 12, 5.0) >= IdleMath.MIN_SECONDS);
    }

    @Test
    void extraRollsAboveHundredPercentAreGuaranteed() {
        assertEquals(1, IdleMath.rolls(0.0, 0.0));
        assertEquals(2, IdleMath.rolls(0.36, 0.1));
        assertEquals(1, IdleMath.rolls(0.36, 0.5));
        assertEquals(2, IdleMath.rolls(1.0, 0.99));
        assertEquals(3, IdleMath.rolls(1.5, 0.2));
    }

    @Test
    void slotsUnlockWithTotalLevel() {
        assertEquals(1, IdleMath.slotsForTotalLevel(0));
        assertEquals(2, IdleMath.slotsForTotalLevel(5));
        assertEquals(3, IdleMath.slotsForTotalLevel(29));
        assertEquals(5, IdleMath.slotsForTotalLevel(72));
        assertEquals(30, IdleMath.totalLevelForSlot(3));
        assertEquals(-1, IdleMath.totalLevelForSlot(5));
    }

    @Test
    void levelsFollowTheCurve() {
        assertEquals(0, IdleMath.levelForXp(249, CURVE));
        assertEquals(1, IdleMath.levelForXp(250, CURVE));
        assertEquals(2, IdleMath.levelForXp(750, CURVE));
        assertEquals(100, IdleMath.xpIntoLevel(850, CURVE));
        assertEquals(12, IdleMath.levelForXp(10_000_000, CURVE));
        assertEquals(0, IdleMath.xpForNext(12, CURVE));
    }

    @Test
    void reachingMaxLevelTakesHoursNotMinutes() {
        long total = 0;
        for (int needed : CURVE) {
            total += needed;
        }
        // Best mining action without perks: 22 XP every 12 s, diamond pickaxe, level 12.
        double seconds = IdleMath.actionSeconds(12.0, IdleMath.toolSpeed(true, 3, 0), 12, 0.0);
        double hours = total / (22.0 / seconds) / 3600.0;
        assertTrue(hours > 5 && hours < 30, "hours to max: " + hours);
    }

    @Test
    void completionsCountWholeActions() {
        assertEquals(2, IdleMath.completions(1.0, 7.5, 4.0));
        assertEquals(0, IdleMath.completions(0.0, 3.9, 4.0));
    }
}
