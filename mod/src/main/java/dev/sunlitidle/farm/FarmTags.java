package dev.sunlitidle.farm;

import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.tags.TagKey;
import net.minecraft.world.level.block.Block;

/** Block tags of the farming rebuild. The ids are the ones the 1.20.1 pack scripts already use. */
public final class FarmTags {
    /** Soil that can be watered and on which crops grow once a day. */
    public static final TagKey<Block> WATERABLE = block("dewdrop", "waterable");
    /** Plants that only grow in the morning on watered soil instead of on random ticks. */
    public static final TagKey<Block> DAILY_CROPS = block(FarmRegistry.FARMLAND_NAMESPACE, "cancel_random_tick");
    /** Sprinkler tags by radius: tier 1 waters 3x3, tier 4 waters 9x9. */
    private static final TagKey<Block>[] SPRINKLERS = sprinklerTags();

    private FarmTags() {
    }

    public static TagKey<Block> sprinkler(int tier) {
        return SPRINKLERS[tier - 1];
    }

    public static int sprinklerTiers() {
        return SPRINKLERS.length;
    }

    @SuppressWarnings("unchecked")
    private static TagKey<Block>[] sprinklerTags() {
        TagKey<Block>[] tags = new TagKey[4];
        for (int i = 0; i < tags.length; i++) {
            tags[i] = block(FarmRegistry.FARMLAND_NAMESPACE, "sprinkler_tier_" + (i + 1));
        }
        return tags;
    }

    private static TagKey<Block> block(String namespace, String path) {
        return TagKey.create(Registries.BLOCK, ResourceLocation.fromNamespaceAndPath(namespace, path));
    }
}
