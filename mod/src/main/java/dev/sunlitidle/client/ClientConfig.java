package dev.sunlitidle.client;

import net.neoforged.neoforge.common.ModConfigSpec;

/** Client-only settings of the mod, stored in {@code config/sunlitidle-client.toml}. */
public final class ClientConfig {
    public static final ModConfigSpec SPEC;
    public static final ModConfigSpec.BooleanValue ALWAYS_SHOW_BLOCK_OUTLINE;

    static {
        ModConfigSpec.Builder b = new ModConfigSpec.Builder();
        b.push("blockOutline");
        ALWAYS_SHOW_BLOCK_OUTLINE = b.comment(
                        "Always draw the block outline, as in vanilla. When true, the rules of Selective Bounds",
                        "(config/selectivebounds.json) never hide it. Also in the game: pause menu > Block Outline.")
                .define("alwaysShow", false);
        b.pop();
        SPEC = b.build();
    }

    private ClientConfig() {
    }

    /** Whether the outline must always show; false while the config file is not loaded yet. */
    public static boolean alwaysShowBlockOutline() {
        return SPEC.isLoaded() && ALWAYS_SHOW_BLOCK_OUTLINE.get();
    }

    public static void setAlwaysShowBlockOutline(boolean value) {
        ALWAYS_SHOW_BLOCK_OUTLINE.set(value);
        ALWAYS_SHOW_BLOCK_OUTLINE.save();
    }
}
