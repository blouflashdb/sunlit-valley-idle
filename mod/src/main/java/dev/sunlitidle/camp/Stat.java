package dev.sunlitidle.camp;

public enum Stat {
    HEALTH,
    ATTACK,
    SPEED,
    DEFENSE,
    LUCK;

    public String translationKey() {
        return "sunlitidle.stat." + name().toLowerCase(java.util.Locale.ROOT);
    }
}
