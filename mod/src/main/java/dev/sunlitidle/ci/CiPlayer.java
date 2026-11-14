package dev.sunlitidle.ci;

import com.mojang.authlib.GameProfile;
import dev.sunlitidle.idle.IdleSavedData;
import dev.sunlitidle.idle.PlayerIdleState;
import io.netty.channel.embedded.EmbeddedChannel;
import net.minecraft.network.Connection;
import net.minecraft.network.protocol.PacketFlow;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.server.network.CommonListenerCookie;
import net.minecraft.world.level.GameType;
import net.neoforged.neoforge.network.registration.NetworkRegistry;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * A player without a client for the CI year simulation: a real ServerPlayer in the player list (so player ticks,
 * login events, Serene Seasons and the idle service see a player online) on an in-memory connection, like the
 * mock player of vanilla GameTests. The connection acts as a NeoForge client with every channel.
 */
final class CiPlayer {
    static final GameProfile PROFILE =
            new GameProfile(UUID.nameUUIDFromBytes("sunlitidle-ci-player".getBytes(StandardCharsets.UTF_8)), "CiPlayer");
    /** Offline time seeded before the first login, to check the catch-up on login. */
    static final long OFFLINE_MILLIS = 2L * 3600L * 1000L;
    static final String OFFLINE_ACTION = "woodcutting/oak";

    private static EmbeddedChannel channel;

    private CiPlayer() {
    }

    static ServerPlayer get(MinecraftServer server) {
        return server.getPlayerList().getPlayer(PROFILE.getId());
    }

    /** Logs the CI player in (once). Before its first login it gets an idle slot and 2 hours of offline time. */
    static ServerPlayer join(MinecraftServer server) {
        ServerPlayer existing = get(server);
        if (existing != null) {
            return existing;
        }
        PlayerIdleState state = IdleSavedData.get(server).state(PROFILE.getId());
        if (state.lastSeen() == 0) {
            state.setSlotAction(0, OFFLINE_ACTION);
            state.setLastSeen(System.currentTimeMillis() - OFFLINE_MILLIS);
            state.markDirty();
        }
        CommonListenerCookie cookie = CommonListenerCookie.createInitial(PROFILE, false);
        ServerPlayer player = new ServerPlayer(server, server.overworld(), PROFILE, cookie.clientInformation());
        Connection connection = new Connection(PacketFlow.SERVERBOUND);
        channel = new EmbeddedChannel(connection);
        NetworkRegistry.configureMockConnection(connection);
        server.getPlayerList().placeNewPlayer(connection, player, cookie);
        player.setGameMode(GameType.CREATIVE);
        return player;
    }

    /** Drops the packets sent to the CI player; nothing reads them. Called every server tick. */
    static void drain() {
        if (channel != null) {
            channel.releaseOutbound();
            channel.runPendingTasks();
        }
    }
}
