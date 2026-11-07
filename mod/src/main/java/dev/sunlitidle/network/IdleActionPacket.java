package dev.sunlitidle.network;

import dev.sunlitidle.idle.IdleService;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.network.NetworkEvent;

import java.util.function.Supplier;

/** Everything the client asks of the idle system. */
public record IdleActionPacket(Type type, int index, String text, boolean flag) {
    public enum Type {
        /** Open the idle window. */
        OPEN,
        /** Put action {@code text} into slot {@code index}; an empty text clears the slot. */
        ASSIGN,
        /** Take storage entry {@code index}; {@code flag} takes as much as fits. */
        WITHDRAW,
        /** Open the skill tree of skill {@code index}. */
        OPEN_TREE
    }

    public static IdleActionPacket open() {
        return new IdleActionPacket(Type.OPEN, 0, "", false);
    }

    public static IdleActionPacket assign(int slot, String actionKey) {
        return new IdleActionPacket(Type.ASSIGN, slot, actionKey == null ? "" : actionKey, false);
    }

    public static IdleActionPacket withdraw(int index, boolean all) {
        return new IdleActionPacket(Type.WITHDRAW, index, "", all);
    }

    public static IdleActionPacket openTree(int skill) {
        return new IdleActionPacket(Type.OPEN_TREE, skill, "", false);
    }

    public static void encode(IdleActionPacket p, FriendlyByteBuf buf) {
        buf.writeEnum(p.type);
        buf.writeVarInt(p.index);
        buf.writeUtf(p.text, 256);
        buf.writeBoolean(p.flag);
    }

    public static IdleActionPacket decode(FriendlyByteBuf buf) {
        return new IdleActionPacket(buf.readEnum(Type.class), buf.readVarInt(), buf.readUtf(256), buf.readBoolean());
    }

    public static void handle(IdleActionPacket p, Supplier<NetworkEvent.Context> ctx) {
        NetworkEvent.Context context = ctx.get();
        ServerPlayer player = context.getSender();
        context.enqueueWork(() -> {
            if (player != null) {
                IdleService.handle(player, p);
            }
        });
        context.setPacketHandled(true);
    }
}
