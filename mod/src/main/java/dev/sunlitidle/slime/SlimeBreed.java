package dev.sunlitidle.slime;

/** The slime breeds of Splendid Slimes as the pack used them, with their color (tints the plort and heart). */
public enum SlimeBreed {
    ALL_SEEING("all_seeing", 0x65062B),
    BEAR("bear", 0xE79A3F),
    BITWISE("bitwise", 0xAA0F01),
    BLAZING("blazing", 0xC96C03),
    BONY("bony", 0xE8E5D2),
    BOOMCAT("boomcat", 0x8A8A8A),
    DUSTY("dusty", 0xC2B280),
    ENDER("ender", 0x0B4D42),
    GOLD("gold", 0xE9B115),
    JUICY("juicy", 0x7D2ED8),
    LUMINOUS("luminous", 0xFFBC5E),
    MECHANIC("mechanic", 0x7A5A34),
    MINTY("minty", 0xCD75A4),
    ORBY("orby", 0xB8E45A),
    PHANTOM("phantom", 0xDCD9C0),
    PRISMA("prisma", 0xA4D1C2),
    PUDDLE("puddle", 0x68C9FF),
    ROTTING("rotting", 0x6F4D1B),
    SHULKING("shulking", 0x976997),
    SLIMY("slimy", 0xFF7D9D),
    SPARKCAT("sparkcat", 0xC11A91),
    SWEET("sweet", 0xEAEAEA),
    WEBBY("webby", 0xBEBFD2),
    WEEPING("weeping", 0xCFF1F1);

    private final String id;
    private final int color;

    SlimeBreed(String id, int color) {
        this.id = id;
        this.color = color;
    }

    public String id() {
        return id;
    }

    /** RGB, without alpha. */
    public int color() {
        return color;
    }
}
