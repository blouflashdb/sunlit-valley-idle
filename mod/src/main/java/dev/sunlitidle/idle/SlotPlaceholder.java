package dev.sunlitidle.idle;

import java.util.Locale;

/**
 * What belongs into an empty item slot of the idle skills window. Each kind has a faded silhouette sprite
 * ({@code assets/sunlitidle/textures/item/empty_slot/<name>.png}, made by {@code tools/gen_slot_placeholders.py})
 * and a tooltip name ({@code sunlitidle.slot_hint.<name>}). Kept free of Minecraft classes so unit tests can
 * check that every kind has its sprite and lang keys.
 */
public enum SlotPlaceholder {
    AXE,
    PICKAXE,
    SHOVEL,
    HOE,
    ROD,
    SHEARS,
    WEAPON,
    BRUSH,
    HELMET,
    CHESTPLATE,
    LEGGINGS,
    BOOTS,
    FOOD;

    public String id() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** Sprite path in the block atlas, without the namespace. */
    public String spritePath() {
        return "item/empty_slot/" + id();
    }

    public String translationKey() {
        return "sunlitidle.slot_hint." + id();
    }

    /** Whether this is the placeholder of a skill's tool slot (the rest are companion armor and food). */
    public boolean isTool() {
        return ordinal() <= BRUSH.ordinal();
    }

    /** Second tooltip line of companion slots; tool slots say whether the skill requires the tool instead. */
    public String descriptionKey() {
        return translationKey() + ".desc";
    }

    /** Placeholder of a skill's tool slot, or null for skills without a tool. */
    public static SlotPlaceholder forTool(ToolKind tool) {
        return switch (tool) {
            case NONE -> null;
            case AXE -> AXE;
            case PICKAXE -> PICKAXE;
            case SHOVEL -> SHOVEL;
            case HOE -> HOE;
            case ROD -> ROD;
            case SHEARS -> SHEARS;
            case WEAPON -> WEAPON;
            case BRUSH -> BRUSH;
        };
    }

    /** Placeholder of a companion armor slot, gear slot 1 to 4 from head to feet (see Gear.GEAR_ORDER). */
    public static SlotPlaceholder forArmor(int gearSlot) {
        return switch (gearSlot) {
            case 1 -> HELMET;
            case 2 -> CHESTPLATE;
            case 3 -> LEGGINGS;
            case 4 -> BOOTS;
            default -> throw new IllegalArgumentException("no armor gear slot: " + gearSlot);
        };
    }
}
