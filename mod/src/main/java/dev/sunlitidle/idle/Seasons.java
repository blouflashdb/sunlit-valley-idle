package dev.sunlitidle.idle;

import dev.sunlitidle.SunlitIdle;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.tags.TagKey;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;

import java.lang.reflect.Method;
import java.util.Locale;

/**
 * Serene Seasons support without a compile dependency. A crop that is tagged for some seasons only grows
 * idly in those seasons, exactly like a planted crop. Untagged crops and worlds without the mod grow always.
 */
public final class Seasons {
    private static final String[] SEASONS = {"spring", "summer", "autumn", "winter"};
    private static boolean looked;
    private static Method getSeasonState;
    private static Method getSeason;

    private Seasons() {
    }

    /** Current season name ("spring", ...), or null when Serene Seasons is not installed. */
    public static String current(Level level) {
        if (!looked) {
            looked = true;
            try {
                Class<?> helper = Class.forName("sereneseasons.api.season.SeasonHelper");
                getSeasonState = helper.getMethod("getSeasonState", Level.class);
                getSeason = Class.forName("sereneseasons.api.season.ISeasonState").getMethod("getSeason");
            } catch (ReflectiveOperationException | LinkageError e) {
                getSeasonState = null;
            }
        }
        if (getSeasonState == null) {
            return null;
        }
        try {
            Object state = getSeasonState.invoke(null, level);
            Object season = getSeason.invoke(state);
            return season.toString().toLowerCase(Locale.ROOT);
        } catch (ReflectiveOperationException | RuntimeException e) {
            SunlitIdle.LOGGER.debug("Could not read the season", e);
            return null;
        }
    }

    public static boolean inSeason(Level level, Block block) {
        String season = current(level);
        if (season == null) {
            return true;
        }
        BlockState state = block.defaultBlockState();
        boolean tagged = false;
        for (String s : SEASONS) {
            if (state.is(tag(s))) {
                tagged = true;
                if (s.equals(season)) {
                    return true;
                }
            }
        }
        return !tagged;
    }

    private static TagKey<Block> tag(String season) {
        return TagKey.create(Registries.BLOCK, new ResourceLocation("sereneseasons", season + "_crops"));
    }
}
