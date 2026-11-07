package dev.sunlitidle.network;

import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.fml.DistExecutor;
import net.minecraftforge.network.NetworkEvent;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;

/** Snapshot of a player's idle state for the open window. */
public record IdleSyncPacket(int unlockedSlots, int totalLevel, List<Slot> slots, List<Skill> skills,
                             List<Entry> storage, int offlineSeconds) {
    /** Most storage entries sent; the window shows the first ones. */
    public static final int MAX_ENTRIES = 1024;

    public record Slot(String action, int status, float progress, float seconds) {
    }

    public record Skill(int level, int xp, int xpForNext) {
    }

    public record Entry(ItemStack item, long count) {
    }

    public static void encode(IdleSyncPacket p, FriendlyByteBuf buf) {
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
            buf.writeItem(p.storage.get(i).item);
            buf.writeVarLong(p.storage.get(i).count);
        }
        buf.writeVarInt(p.offlineSeconds);
    }

    public static IdleSyncPacket decode(FriendlyByteBuf buf) {
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
            storage.add(new Entry(buf.readItem(), buf.readVarLong()));
        }
        return new IdleSyncPacket(unlocked, total, slots, skills, storage, buf.readVarInt());
    }

    public static void handle(IdleSyncPacket p, Supplier<NetworkEvent.Context> ctx) {
        ctx.get().enqueueWork(() -> DistExecutor.unsafeRunWhenOn(Dist.CLIENT,
                () -> () -> dev.sunlitidle.client.ClientIdleData.set(p)));
        ctx.get().setPacketHandled(true);
    }
}
