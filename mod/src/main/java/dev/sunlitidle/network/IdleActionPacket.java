package dev.sunlitidle.network;

import dev.sunlitidle.SunlitIdle;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;

/** Everything the client asks of the idle system. */
public record IdleActionPacket(Op op, int index, String text, boolean flag) implements CustomPacketPayload {
    public static final CustomPacketPayload.Type<IdleActionPacket> TYPE = new CustomPacketPayload.Type<>(SunlitIdle.id("action"));
    public static final StreamCodec<FriendlyByteBuf, IdleActionPacket> STREAM_CODEC =
            StreamCodec.of((buf, p) -> p.write(buf), IdleActionPacket::read);

    public enum Op {
        /** Open the idle window. */
        OPEN,
        /** Put action {@code text} into slot {@code index}; an empty text clears the slot. */
        ASSIGN,
        /** Take storage entry {@code index}; {@code flag} takes as much as fits. */
        WITHDRAW,
        /** Open the skill tree of skill {@code index}. */
        OPEN_TREE,
        /** Sell storage entry {@code index}, or everything sellable when {@code index} is -1. */
        SELL
    }

    public static IdleActionPacket open() {
        return new IdleActionPacket(Op.OPEN, 0, "", false);
    }

    public static IdleActionPacket assign(int slot, String actionKey) {
        return new IdleActionPacket(Op.ASSIGN, slot, actionKey == null ? "" : actionKey, false);
    }

    public static IdleActionPacket withdraw(int index, boolean all) {
        return new IdleActionPacket(Op.WITHDRAW, index, "", all);
    }

    public static IdleActionPacket openTree(int skill) {
        return new IdleActionPacket(Op.OPEN_TREE, skill, "", false);
    }

    public static IdleActionPacket sell(int index) {
        return new IdleActionPacket(Op.SELL, index, "", false);
    }

    private void write(FriendlyByteBuf buf) {
        buf.writeEnum(op);
        buf.writeInt(index);
        buf.writeUtf(text, 256);
        buf.writeBoolean(flag);
    }

    private static IdleActionPacket read(FriendlyByteBuf buf) {
        return new IdleActionPacket(buf.readEnum(Op.class), buf.readInt(), buf.readUtf(256), buf.readBoolean());
    }

    @Override
    public Type<IdleActionPacket> type() {
        return TYPE;
    }
}
