package dev.sunlitidle.farm;

import com.mojang.serialization.Codec;
import net.minecraft.util.StringRepresentable;

/**
 * Fertilizers from Dew Drop Farmland Growth Edition, rebuilt for 1.21.1 under the old ids.
 * Speed fertilizers make a crop mature {@link #speedDays()} days sooner. Quality and bountiful
 * fertilizers only mark the soil; the pack's KubeJS scripts read the block tags on harvest.
 */
public enum Fertilizer implements StringRepresentable {
    WEAK("weak_fertilizer", "weak_fertilized_farmland", 1, Hydration.NONE, 0xC8B48C),
    STRONG("strong_fertilizer", "strong_fertilized_farmland", 2, Hydration.NONE, 0x7FBF4F),
    HYPER("hyper_fertilizer", "hyper_fertilized_farmland", 3, Hydration.NONE, 0x4FD0A0),
    HYDRATING("hydrating_fertilizer", "hydrating_farmland", 0, Hydration.HALF_GROWN, 0x4F8FD8),
    DELUXE_HYDRATING("deluxe_hydrating_fertilizer", "deluxe_hydrating_farmland", 0, Hydration.ALWAYS, 0x2F4FC8),
    BOUNTIFUL("bountiful_fertilizer", "bountiful_fertilized_farmland", 0, Hydration.NONE, 0xE07FB0),
    LOW_QUALITY("low_quality_fertilizer", "low_quality_fertilized_farmland", 0, Hydration.NONE, 0xC0C0C0),
    HIGH_QUALITY("high_quality_fertilizer", "high_quality_fertilized_farmland", 0, Hydration.NONE, 0xF0C030),
    PRISTINE_QUALITY("pristine_quality_fertilizer", "pristine_quality_fertilized_farmland", 0, Hydration.NONE, 0x9F5FE0);

    public static final Codec<Fertilizer> CODEC = StringRepresentable.fromEnum(Fertilizer::values);

    private final String itemName;
    private final String farmlandName;
    private final int speedDays;
    private final Hydration hydration;
    private final int color;

    Fertilizer(String itemName, String farmlandName, int speedDays, Hydration hydration, int color) {
        this.itemName = itemName;
        this.farmlandName = farmlandName;
        this.speedDays = speedDays;
        this.hydration = hydration;
        this.color = color;
    }

    public String itemName() {
        return itemName;
    }

    public String farmlandName() {
        return farmlandName;
    }

    /** Days a crop on this soil matures sooner. */
    public int speedDays() {
        return speedDays;
    }

    public Hydration hydration() {
        return hydration;
    }

    public int color() {
        return color;
    }

    @Override
    public String getSerializedName() {
        return itemName;
    }

    /** How the soil keeps its water over night. */
    public enum Hydration {
        /** Dries every morning. */
        NONE,
        /** Stays watered until the crop on it is half grown (rounded down). */
        HALF_GROWN,
        /** Never dries. */
        ALWAYS
    }
}
