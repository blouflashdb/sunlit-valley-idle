package dev.sunlitidle.network;

import dev.sunlitidle.SunlitIdle;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.network.NetworkDirection;
import net.minecraftforge.network.NetworkRegistry;
import net.minecraftforge.network.PacketDistributor;
import net.minecraftforge.network.simple.SimpleChannel;

import java.util.Optional;

public final class IdleNetwork {
    private static final String VERSION = "1";
    public static final SimpleChannel CHANNEL = NetworkRegistry.newSimpleChannel(
            new ResourceLocation(SunlitIdle.MOD_ID, "idle"), () -> VERSION, VERSION::equals, VERSION::equals);

    private IdleNetwork() {
    }

    public static void register() {
        int id = 0;
        CHANNEL.registerMessage(id++, IdleActionPacket.class, IdleActionPacket::encode, IdleActionPacket::decode,
                IdleActionPacket::handle, Optional.of(NetworkDirection.PLAY_TO_SERVER));
        CHANNEL.registerMessage(id++, IdleSyncPacket.class, IdleSyncPacket::encode, IdleSyncPacket::decode,
                IdleSyncPacket::handle, Optional.of(NetworkDirection.PLAY_TO_CLIENT));
    }

    public static void sendToServer(IdleActionPacket packet) {
        CHANNEL.sendToServer(packet);
    }

    public static void sendTo(ServerPlayer player, IdleSyncPacket packet) {
        CHANNEL.send(PacketDistributor.PLAYER.with(() -> player), packet);
    }
}
