package dev.sunlitidle.client;

import dev.sunlitidle.network.IdleSyncPacket;
import net.minecraft.Util;

/** Last idle snapshot from the server, read by the idle window. */
public final class ClientIdleData {
    private static IdleSyncPacket data;
    private static long receivedAt;

    private ClientIdleData() {
    }

    public static void set(IdleSyncPacket packet) {
        data = packet;
        receivedAt = Util.getMillis();
    }

    public static IdleSyncPacket get() {
        return data;
    }

    /** Seconds since the last snapshot, for smooth progress bars. */
    public static double age() {
        return (Util.getMillis() - receivedAt) / 1000.0;
    }
}
