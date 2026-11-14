package dev.sunlitidle.ci;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.context.CommandContext;
import dev.sunlitidle.SunlitIdle;
import dev.sunlitidle.idle.Seasons;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.RegisterCommandsEvent;
import net.neoforged.neoforge.event.tick.ServerTickEvent;

/**
 * CI-only commands for tools/port/server_boot_test.py --simulate-year. Only registered when the server runs with
 * -Dsunlitidle.ci=true, which the pack never sets. Every result is a log line "[CI-CHECK] PASS|FAIL|INFO ..."
 * and every command ends with "[CI-CHECK] END <command>", so the script can wait for it on the console.
 */
public final class CiHarness {
    public static final String PROPERTY = "sunlitidle.ci";
    static final String TAG = "[CI-CHECK]";
    private static final int MORNING_EVE = 23800;

    private CiHarness() {
    }

    public static boolean enabled() {
        return Boolean.getBoolean(PROPERTY);
    }

    public static void init() {
        SunlitIdle.LOGGER.warn("{} CI harness enabled ({}=true); not for play", TAG, PROPERTY);
        NeoForge.EVENT_BUS.addListener(CiHarness::onRegisterCommands);
        NeoForge.EVENT_BUS.addListener((ServerTickEvent.Post event) -> CiPlayer.drain());
    }

    static void log(String status, String name, String message) {
        SunlitIdle.LOGGER.info("{} {} {}{}", TAG, status, name, message == null || message.isEmpty() ? "" : ": " + message);
    }

    private static void onRegisterCommands(RegisterCommandsEvent event) {
        CommandDispatcher<CommandSourceStack> dispatcher = event.getDispatcher();
        dispatcher.register(Commands.literal("sunlitidle_ci")
                .requires(source -> source.hasPermission(4))
                .then(Commands.literal("join").executes(ctx -> run(ctx, "join", () -> {
                    CiPlayer.join(ctx.getSource().getServer());
                    log("INFO", "join", CiPlayer.PROFILE.getName() + " is online");
                })))
                .then(Commands.literal("nextday").executes(ctx -> run(ctx, "nextday", () -> nextDay(ctx.getSource().getServer()))))
                .then(Commands.literal("season").executes(ctx -> run(ctx, "season", () -> PackChecks.recordSeason(ctx.getSource().getServer()))))
                .then(Commands.literal("check")
                        .then(Commands.literal("idle").executes(ctx -> run(ctx, "check idle", () -> PackChecks.idle(ctx.getSource().getServer()))))
                        .then(Commands.literal("year").executes(ctx -> run(ctx, "check year", () -> PackChecks.year(ctx.getSource().getServer()))))));
    }

    private static int run(CommandContext<CommandSourceStack> ctx, String name, Runnable body) {
        try {
            body.run();
        } catch (Throwable t) {
            SunlitIdle.LOGGER.error("{} FAIL {}: {}", TAG, name.replace(' ', '_'), t, t);
        }
        SunlitIdle.LOGGER.info("{} END {}", TAG, name);
        return 1;
    }

    /**
     * Jumps every level to 200 ticks before the next morning (dayTime 23800 of the current day). The script then
     * runs "tick sprint" across the morning, so every daily handler (shipping bins, artisan machines, the farm day)
     * runs once per simulated day. Serene Seasons counts the jump as elapsed time.
     */
    private static void nextDay(MinecraftServer server) {
        for (ServerLevel level : server.getAllLevels()) {
            long time = level.getDayTime();
            long target = time - Math.floorMod(time, 24000L) + MORNING_EVE;
            if (target <= time) {
                target += 24000L;
            }
            level.setDayTime(target);
        }
        ServerLevel overworld = server.overworld();
        log("INFO", "day", "day " + (overworld.getDayTime() / 24000L + 1) + ", season " + Seasons.current(overworld));
    }
}
