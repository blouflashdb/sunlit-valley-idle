package dev.sunlitidle.compat.selectivebounds;

import dev.sunlitidle.SunlitIdle;
import net.minecraft.client.gui.screens.Screen;
import net.neoforged.fml.ModList;
import net.neoforged.neoforge.client.gui.IConfigScreenFactory;

import java.util.function.Function;

/**
 * Reads and writes the settings of the client mod Selective Bounds, which hides the block outline when it is not
 * relevant and has no config screen of its own.
 *
 * <p>Selective Bounds reads the public fields of its {@code Config} instance on every frame, so a change here works
 * at once; {@code save()} writes them to {@code config/selectivebounds.json}. All access to its classes goes
 * through {@link Access}, which loads only when the mod is installed. If a later version renames a field, the
 * first access fails with a {@link LinkageError}; the settings then count as unavailable and the game goes on.
 */
public final class OutlineSettings {
    public static final String MOD_ID = "selectivebounds";
    public static final float MIN_ACTION_SECONDS = 0.5f;
    public static final float MAX_ACTION_SECONDS = 10.0f;

    private static Boolean available;

    private OutlineSettings() {
    }

    /** The values of Selective Bounds that the settings screen edits. */
    public record Values(boolean showOnSneak, boolean showOnAction, float showOnActionTime,
                         boolean considerCanAttackBlock, boolean considerIsCorrectToolForDrops,
                         boolean considerCanBePlaced) {
    }

    /** True when Selective Bounds is installed and its config has the fields this class expects. */
    public static boolean available() {
        if (available == null) {
            available = ModList.get().isLoaded(MOD_ID) && probe();
        }
        return available;
    }

    private static boolean probe() {
        try {
            Access.read();
            return true;
        } catch (LinkageError | RuntimeException e) {
            SunlitIdle.LOGGER.warn("Selective Bounds is installed, but its config is not readable; "
                    + "the block outline settings are disabled", e);
            return false;
        }
    }

    /** The current values, or null when Selective Bounds is not available. */
    public static Values read() {
        return available() ? Access.read() : null;
    }

    /** Applies the values at once and saves them to {@code config/selectivebounds.json}. */
    public static void write(Values values) {
        if (!available()) {
            return;
        }
        try {
            Access.write(values);
        } catch (LinkageError | RuntimeException e) {
            SunlitIdle.LOGGER.error("Could not save the Selective Bounds settings", e);
        }
    }

    /** Opens the settings screen from the "Config" button of Selective Bounds in the mod list. */
    public static void registerConfigScreen(Function<Screen, Screen> factory) {
        if (!available()) {
            return;
        }
        ModList.get().getModContainerById(MOD_ID).ifPresent(container -> container.registerExtensionPoint(
                IConfigScreenFactory.class, (IConfigScreenFactory) (mod, parent) -> factory.apply(parent)));
    }

    private static final class Access {
        private Access() {
        }

        static Values read() {
            net.conczin.selectivebounds.config.Config c = net.conczin.selectivebounds.config.Config.getInstance();
            return new Values(c.showOnSneak, c.showOnAction, c.showOnActionTime, c.considerCanAttackBlock,
                    c.considerIsCorrectToolForDrops, c.considerCanBePlaced);
        }

        static void write(Values v) {
            net.conczin.selectivebounds.config.Config c = net.conczin.selectivebounds.config.Config.getInstance();
            c.showOnSneak = v.showOnSneak();
            c.showOnAction = v.showOnAction();
            c.showOnActionTime = v.showOnActionTime();
            c.considerCanAttackBlock = v.considerCanAttackBlock();
            c.considerIsCorrectToolForDrops = v.considerIsCorrectToolForDrops();
            c.considerCanBePlaced = v.considerCanBePlaced();
            c.save();
        }
    }
}
