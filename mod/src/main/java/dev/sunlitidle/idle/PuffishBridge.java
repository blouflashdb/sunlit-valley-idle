package dev.sunlitidle.idle;

import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.puffish.skillsmod.api.Category;
import net.puffish.skillsmod.api.Experience;
import net.puffish.skillsmod.api.SkillsAPI;

import java.util.Optional;

/** Only loaded when Pufferfish's Skills is installed. */
final class PuffishBridge {
    private PuffishBridge() {
    }

    private static Optional<Experience> experience(ResourceLocation category) {
        return SkillsAPI.getCategory(category).flatMap(Category::getExperience);
    }

    static SkillLevels.Progress progress(ServerPlayer player, ResourceLocation category) {
        Optional<Experience> experience = experience(category);
        if (experience.isEmpty()) {
            return null;
        }
        Experience e = experience.get();
        int level = e.getLevel(player);
        int required;
        try {
            required = e.getRequired(player, level);
        } catch (RuntimeException atMax) {
            required = 0;
        }
        return new SkillLevels.Progress(level, e.getCurrent(player), Math.max(0, required));
    }

    static boolean addXp(ServerPlayer player, ResourceLocation category, int amount) {
        Optional<Experience> experience = experience(category);
        experience.ifPresent(e -> e.addTotal(player, amount));
        return experience.isPresent();
    }

    static boolean openTree(ServerPlayer player, ResourceLocation category) {
        Optional<Category> c = SkillsAPI.getCategory(category);
        c.ifPresent(cat -> cat.openScreen(player));
        return c.isPresent();
    }
}
