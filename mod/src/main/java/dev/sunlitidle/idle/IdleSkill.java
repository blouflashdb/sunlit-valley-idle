package dev.sunlitidle.idle;

import net.minecraft.resources.ResourceLocation;

import java.util.List;

/**
 * An idle skill. Its level and skill tree are the Pufferfish's Skills category {@code category}, so
 * manual play and idle actions level the same thing.
 */
public record IdleSkill(int index, String id, ResourceLocation category, ResourceLocation icon, ToolKind tool,
                        boolean toolRequired, List<IdleAction> actions) {
    public String translationKey() {
        return "sunlitidle.skill." + id;
    }
}
