package dev.sunlitidle.idle;

import java.util.Locale;

/** Why an action slot is or is not making progress. */
public enum SlotStatus {
    EMPTY,
    RUNNING,
    LOCKED,
    NO_TOOL,
    WEAK_TOOL,
    NO_INPUT,
    UNKNOWN;

    public static SlotStatus byId(int id) {
        SlotStatus[] all = values();
        return id >= 0 && id < all.length ? all[id] : UNKNOWN;
    }

    public String translationKey() {
        return "sunlitidle.slot_status." + name().toLowerCase(Locale.ROOT);
    }
}
