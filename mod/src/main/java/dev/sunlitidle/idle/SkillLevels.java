package dev.sunlitidle.idle;

import dev.sunlitidle.SunlitIdle;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.neoforged.fml.ModList;

/**
 * Reads and adds skill levels. With Pufferfish's Skills installed (the pack) the level is the category level,
 * shared with manual play. Without it (tests, other packs) the idle system keeps its own XP on the same curve.
 */
public final class SkillLevels {
    /** Same curve as the pack's mining category. */
    public static final int[] FALLBACK_CURVE = {250, 500, 1000, 2000, 5000, 6000, 8000, 10000, 13000, 16000, 20000, 25000};
    private static final ResourceLocation MASTERY = ResourceLocation.fromNamespaceAndPath("society", "mastery");
    private static final String MASTERY_STAGE = "mastery_unlocked";
    private static Boolean puffish;

    private SkillLevels() {
    }

    /** Level, XP into the level, and XP needed for the next level (0 at max). */
    public record Progress(int level, int xp, int xpForNext) {
    }

    private static boolean puffish() {
        if (puffish == null) {
            puffish = ModList.get().isLoaded("puffish_skills");
        }
        return puffish;
    }

    public static Progress progress(ServerPlayer player, PlayerIdleState state, IdleSkill skill) {
        if (puffish()) {
            try {
                Progress p = PuffishBridge.progress(player, skill.category());
                if (p != null) {
                    return p;
                }
            } catch (Throwable t) {
                SunlitIdle.LOGGER.debug("Could not read skill level for {}", skill.category(), t);
            }
        }
        long xp = state.fallbackXp(skill.id());
        int level = IdleMath.levelForXp(xp, FALLBACK_CURVE);
        return new Progress(level, (int) IdleMath.xpIntoLevel(xp, FALLBACK_CURVE), IdleMath.xpForNext(level, FALLBACK_CURVE));
    }

    public static int level(ServerPlayer player, PlayerIdleState state, IdleSkill skill) {
        return progress(player, state, skill).level();
    }

    public static int totalLevel(ServerPlayer player, PlayerIdleState state) {
        int total = 0;
        for (IdleSkill skill : IdleCatalog.skills()) {
            total += level(player, state, skill);
        }
        return total;
    }

    public static void addXp(ServerPlayer player, PlayerIdleState state, IdleSkill skill, int amount) {
        if (amount <= 0) {
            return;
        }
        if (puffish()) {
            try {
                if (PuffishBridge.addXp(player, skill.category(), amount)) {
                    if (player.getTags().contains(MASTERY_STAGE)) {
                        PuffishBridge.addXp(player, MASTERY, amount);
                    }
                    return;
                }
            } catch (Throwable t) {
                SunlitIdle.LOGGER.debug("Could not add skill XP to {}", skill.category(), t);
            }
        }
        state.addFallbackXp(skill.id(), amount);
    }

    /** Opens the skill tree of this skill. Returns false when there is none. */
    public static boolean openTree(ServerPlayer player, IdleSkill skill) {
        if (!puffish()) {
            return false;
        }
        try {
            return PuffishBridge.openTree(player, skill.category());
        } catch (Throwable t) {
            SunlitIdle.LOGGER.debug("Could not open skill tree {}", skill.category(), t);
            return false;
        }
    }
}
