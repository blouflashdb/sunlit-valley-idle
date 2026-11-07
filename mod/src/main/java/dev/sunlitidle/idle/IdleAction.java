package dev.sunlitidle.idle;

import net.minecraft.resources.ResourceLocation;

import org.jetbrains.annotations.Nullable;

import java.util.List;

/**
 * One thing a skill can do idly, such as chopping oak.
 *
 * @param key      unique key, "skill/action"
 * @param skillId  owning skill
 * @param level    skill level needed
 * @param toolTier tool tier level needed (0 means any tool, or none if the tool is optional)
 * @param seconds  base seconds per completion
 * @param xp       skill XP per completion
 * @param dungeon  dungeon tier fought by the companion (Adventuring), 0 for gathering actions
 * @param recipe   the furnace recipe of a Smelting or Cooking action, or null
 */
public record IdleAction(String key, String skillId, String id, int level, int toolTier, double seconds, int xp,
                         ResourceLocation icon, List<IdleInput> inputs, List<IdleDrop> drops, int dungeon,
                         @Nullable RecipeRef recipe) {
    public boolean isCombat() {
        return dungeon > 0;
    }

    public boolean isRecipe() {
        return recipe != null;
    }

    public String translationKey() {
        return "sunlitidle.action." + skillId + "." + id;
    }
}
