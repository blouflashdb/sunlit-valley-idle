package dev.sunlitidle.network;

import dev.sunlitidle.SunlitIdle;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.world.item.ItemStack;

import java.util.ArrayList;
import java.util.List;

/** Snapshot of a player's idle state for the open window. */
public record IdleSyncPacket(int unlockedSlots, int totalLevel, List<Slot> slots, List<Skill> skills,
                             List<Entry> storage, int offlineSeconds) implements CustomPacketPayload {
    public static final CustomPacketPayload.Type<IdleSyncPacket> TYPE = new CustomPacketPayload.Type<>(SunlitIdle.id("sync"));
    public static final StreamCodec<RegistryFriendlyByteBuf, IdleSyncPacket> STREAM_CODEC =
            StreamCodec.of(IdleSyncPacket::encode, IdleSyncPacket::decode);
    /** Most storage entries sent; the window shows the first ones. */
    public static final int MAX_ENTRIES = 1024;

    public record Slot(String action, int status, float progress, float seconds) {
    }

    public record Skill(int level, int xp, int xpForNext) {
    }

    public record Entry(ItemStack item, long count) {
    }

    private static void encode(RegistryFriendlyByteBuf buf, IdleSyncPacket p) {
        buf.writeVarInt(p.unlockedSlots);
        buf.writeVarInt(p.totalLevel);
        buf.writeVarInt(p.slots.size());
        for (Slot s : p.slots) {
            buf.writeUtf(s.action == null ? "" : s.action, 256);
            buf.writeVarInt(s.status);
            buf.writeFloat(s.progress);
            buf.writeFloat(s.seconds);
        }
        buf.writeVarInt(p.skills.size());
        for (Skill s : p.skills) {
            buf.writeVarInt(s.level);
            buf.writeVarInt(s.xp);
            buf.writeVarInt(s.xpForNext);
        }
        int entries = Math.min(MAX_ENTRIES, p.storage.size());
        buf.writeVarInt(entries);
        for (int i = 0; i < entries; i++) {
            ItemStack.OPTIONAL_STREAM_CODEC.encode(buf, p.storage.get(i).item);
            buf.writeVarLong(p.storage.get(i).count);
        }
        buf.writeVarInt(p.offlineSeconds);
    }

    private static IdleSyncPacket decode(RegistryFriendlyByteBuf buf) {
        int unlocked = buf.readVarInt();
        int total = buf.readVarInt();
        int slotCount = buf.readVarInt();
        List<Slot> slots = new ArrayList<>(slotCount);
        for (int i = 0; i < slotCount; i++) {
            String action = buf.readUtf(256);
            slots.add(new Slot(action.isEmpty() ? null : action, buf.readVarInt(), buf.readFloat(), buf.readFloat()));
        }
        int skillCount = buf.readVarInt();
        List<Skill> skills = new ArrayList<>(skillCount);
        for (int i = 0; i < skillCount; i++) {
            skills.add(new Skill(buf.readVarInt(), buf.readVarInt(), buf.readVarInt()));
        }
        int entries = buf.readVarInt();
        List<Entry> storage = new ArrayList<>(entries);
        for (int i = 0; i < entries; i++) {
            storage.add(new Entry(ItemStack.OPTIONAL_STREAM_CODEC.decode(buf), buf.readVarLong()));
        }
        return new IdleSyncPacket(unlocked, total, slots, skills, storage, buf.readVarInt());
    }

    @Override
    public Type<IdleSyncPacket> type() {
        return TYPE;
    }
}
