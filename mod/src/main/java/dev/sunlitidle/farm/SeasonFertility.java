package dev.sunlitidle.farm;

import dev.sunlitidle.SunlitIdle;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.tags.TagKey;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.neoforged.fml.ModList;

import java.lang.reflect.Method;

/**
 * Serene Seasons blocks out-of-season growth in a random tick mixin, which the farm morning does not go through,
 * so the farm day asks its fertility API directly (by reflection, the mod is optional). A crop is fertile when
 * Serene Seasons says so or greenhouse glass is above it, unless watered soil lies in between (strict greenhouses).
 */
final class SeasonFertility {
    private static final TagKey<Block> GREENHOUSE_GLASS =
            TagKey.create(Registries.BLOCK, ResourceLocation.fromNamespaceAndPath("sereneseasons", "greenhouse_glass"));
    private static Method isCrop;
    private static Method isCropFertile;
    private static boolean resolved;

    private SeasonFertility() {
    }

    static boolean isFertile(Level level, BlockPos pos, BlockState state) {
        if (!resolve()) {
            return true;
        }
        try {
            if (!(boolean) isCrop.invoke(null, state)) {
                return true;
            }
            String id = BuiltInRegistries.BLOCK.getKey(state.getBlock()).toString();
            if ((boolean) isCropFertile.invoke(null, id, level, pos)) {
                return true;
            }
        } catch (ReflectiveOperationException | RuntimeException e) {
            SunlitIdle.LOGGER.warn("Serene Seasons fertility check failed, letting {} grow", state, e);
            isCrop = null;
            return true;
        }
        for (int i = 1; i <= 16; i++) {
            BlockState above = level.getBlockState(pos.above(i));
            if (Watering.isWaterable(above)) {
                return false;
            }
            if (above.is(GREENHOUSE_GLASS)) {
                return true;
            }
        }
        return false;
    }

    private static boolean resolve() {
        if (!resolved) {
            resolved = true;
            if (ModList.get().isLoaded("sereneseasons")) {
                try {
                    Class<?> fertility = Class.forName("sereneseasons.init.ModFertility");
                    isCrop = fertility.getMethod("isCrop", BlockState.class);
                    isCropFertile = fertility.getMethod("isCropFertile", String.class, Level.class, BlockPos.class);
                } catch (ReflectiveOperationException e) {
                    SunlitIdle.LOGGER.warn("Serene Seasons fertility API not found; crops grow in every season", e);
                }
            }
        }
        return isCrop != null && isCropFertile != null;
    }
}
