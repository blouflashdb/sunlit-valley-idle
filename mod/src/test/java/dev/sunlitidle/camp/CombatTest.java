package dev.sunlitidle.camp;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Checks the default tier numbers against the reference loadouts from the design doc. */
class CombatTest {
    // Default tier values, mirrored from Config.
    private static final Combat.Enemy T1 = new Combat.Enemy(10, 2, 1, 150);
    private static final Combat.Enemy T2 = new Combat.Enemy(25, 4, 2, 400);
    private static final Combat.Enemy T3 = new Combat.Enemy(60, 7, 3, 900);

    // Vanilla gear: damage includes the player's base 1, speed is attacks per second.
    private static final Combat.Loadout WOOD_LEATHER = new Combat.Loadout(4, 1.6, 7, 0, 0, 20);
    private static final Combat.Loadout IRON = new Combat.Loadout(6, 1.6, 15, 0, 0, 28);
    private static final Combat.Loadout DIAMOND = new Combat.Loadout(7, 1.6, 20, 8, 0, 38);

    @Test
    void vanillaArmorFormula() {
        // Full iron (15 armor) against a 4 damage hit: 4 * (1 - 13/25).
        assertEquals(1.92, Combat.afterArmor(4, 15, 0), 1e-9);
        assertEquals(4.0, Combat.afterArmor(4, 0, 0), 1e-9);
    }

    @Test
    void breadExampleLastsAboutThreeMinutes() {
        double killSeconds = Combat.killSeconds(WOOD_LEATHER, T1);
        assertEquals(4.875, killSeconds, 1e-9);
        double damage = Combat.expectedHitsTaken(WOOD_LEATHER, T1) * Combat.damagePerEnemyHit(WOOD_LEATHER, T1);
        double perKill = Combat.foodCost(WOOD_LEATHER, T1, damage);
        double kills = 50 / perKill; // 10 bread
        assertTrue(kills > 30 && kills < 37, "kills: " + kills);
        double minutes = kills * killSeconds / 60.0;
        assertTrue(minutes > 2.5 && minutes < 3.0, "minutes: " + minutes);
        // A wooden sword (59 durability, 1 per kill) lasts about five minutes.
        assertEquals(4.8, 59 * killSeconds / 60.0, 0.1);
    }

    @Test
    void referenceGearMatchesItsTier() {
        assertFalse(Combat.overpowers(WOOD_LEATHER, T1));
        assertFalse(Combat.overpowers(IRON, T2));
        assertFalse(Combat.overpowers(DIAMOND, T3));
        assertTrue(Combat.power(WOOD_LEATHER, T1) >= T1.power());
        assertTrue(Combat.power(IRON, T2) >= T2.power());
        assertTrue(Combat.power(DIAMOND, T3) >= T3.power());
    }

    @Test
    void killsPerMinuteFollowTheDesign() {
        assertEquals(12, 60 / Combat.killSeconds(WOOD_LEATHER, T1), 1.0);
        assertEquals(10, 60 / Combat.killSeconds(IRON, T2), 1.0);
        assertEquals(8, 60 / Combat.killSeconds(DIAMOND, T3), 1.5);
    }

    @Test
    void woodGearLosesInMagmaDepths() {
        double damage = Combat.expectedHitsTaken(WOOD_LEATHER, T3) * Combat.damagePerEnemyHit(WOOD_LEATHER, T3);
        assertTrue(damage >= WOOD_LEATHER.maxHealth(), "damage: " + damage);
    }

    @Test
    void strongCompanionFarmsLowTiersFaster() {
        assertTrue(Combat.overpowers(DIAMOND, T1));
        assertTrue(Combat.speedMultiplier(DIAMOND, T1) > 1.0);
        assertTrue(Combat.speedMultiplier(DIAMOND, T1) <= Combat.MAX_SPEED_MULTIPLIER);
        assertEquals(T1.baseFood(), Combat.foodCost(DIAMOND, T1, 5.0), 1e-9);
    }

    @Test
    void levelCurve() {
        assertEquals(20, Combat.xpForNextLevel(1));
        assertEquals(2000, Combat.xpForNextLevel(10));
    }
}
