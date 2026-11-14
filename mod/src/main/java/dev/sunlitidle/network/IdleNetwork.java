package dev.sunlitidle.network;

import dev.sunlitidle.client.ClientIdleData;
import dev.sunlitidle.idle.IdleService;
import net.minecraft.server.level.ServerPlayer;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.network.PacketDistributor;
import net.neoforged.neoforge.network.event.RegisterPayloadHandlersEvent;
import net.neoforged.neoforge.network.registration.PayloadRegistrar;

public final class IdleNetwork {
    private static final String VERSION = "2";

    private IdleNetwork() {
    }

    public static void register(IEventBus bus) {
        bus.addListener(IdleNetwork::onRegister);
    }

    private static void onRegister(RegisterPayloadHandlersEvent event) {
        PayloadRegistrar registrar = event.registrar(VERSION);
        registrar.playToServer(IdleActionPacket.TYPE, IdleActionPacket.STREAM_CODEC, (packet, context) ->
                context.enqueueWork(() -> {
                    if (context.player() instanceof ServerPlayer player) {
                        IdleService.handle(player, packet);
                    }
                }));
        // ClientIdleData only stores the packet, so this handler loads no client-only classes on a server.
        registrar.playToClient(IdleSyncPacket.TYPE, IdleSyncPacket.STREAM_CODEC, (packet, context) ->
                context.enqueueWork(() -> ClientIdleData.set(packet)));
    }

    public static void sendToServer(IdleActionPacket packet) {
        PacketDistributor.sendToServer(packet);
    }

    public static void sendTo(ServerPlayer player, IdleSyncPacket packet) {
        PacketDistributor.sendToPlayer(player, packet);
    }
}
