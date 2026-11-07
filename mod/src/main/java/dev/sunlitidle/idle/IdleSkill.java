package dev.sunlitidle.idle;

import net.minecraft.resources.ResourceLocation;

import java.util.List;

/**
 * An idle skill. Its level and skill tree are the Pufferfish's Skills category {@code category}, so
 * manual play and idle actions level the same thing. A seasonal skill (Farming) only grows crops that are
 * in season. A skill with recipe types (Smelting, Cooking) gets one action per furnace recipe of those types.
 */
public record IdleSkill(int index, String id, ResourceLocation category, ResourceLocation icon, ToolKind tool,
                        boolean toolRequired, boolean seasonal, List<ResourceLocation> recipeTypes,
                        List<IdleAction> actions) {
    public boolean usesRecipes() {
        return !recipeTypes.isEmpty();
    }

    public String translationKey() {
        return "sunlitidle.skill." + id;
    }
}
