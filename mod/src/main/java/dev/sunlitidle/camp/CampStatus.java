package dev.sunlitidle.camp;

public enum CampStatus {
    NO_WEAPON,
    NO_FOOD,
    FIGHTING,
    RETREATING,
    LOOT_FULL;

    public String translationKey() {
        return "sunlitidle.status." + name().toLowerCase(java.util.Locale.ROOT);
    }

    public static CampStatus byId(int id) {
        CampStatus[] v = values();
        return id >= 0 && id < v.length ? v[id] : NO_WEAPON;
    }
}
