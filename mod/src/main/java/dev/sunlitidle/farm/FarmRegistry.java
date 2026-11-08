package dev.sunlitidle.farm;

import com.mojang.serialization.Codec;
import dev.sunlitidle.SunlitIdle;
import net.minecraft.core.component.DataComponentType;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.CreativeModeTabs;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.event.BuildCreativeModeTabContentsEvent;
import net.neoforged.neoforge.registries.DeferredBlock;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Blocks and items that replace Dew Drop Farmland Growth Edition and Dew Drop Watering Cans on 1.21.1.
 * They keep the old ids so recipes, quests and scripts of the pack still work.
 */
public final class FarmRegistry {
    public static final String FARMLAND_NAMESPACE = "dew_drop_farmland_growth";
    public static final String CANS_NAMESPACE = "dew_drop_watering_cans";

    private static final DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks(FARMLAND_NAMESPACE);
    private static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(FARMLAND_NAMESPACE);
    private static final DeferredRegister.Items CAN_ITEMS = DeferredRegister.createItems(CANS_NAMESPACE);
    private static final DeferredRegister.DataComponents COMPONENTS = DeferredRegister.createDataComponents(SunlitIdle.MOD_ID);

    /** Water left in a watering can. */
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<Integer>> WATER =
            COMPONENTS.registerComponentType("water", b -> b.persistent(Codec.intRange(0, 10000))
                    .networkSynchronized(ByteBufCodecs.VAR_INT));

    public static final Map<Fertilizer, DeferredBlock<FertilizedFarmBlock>> FARMLAND = new EnumMap<>(Fertilizer.class);
    public static final Map<Fertilizer, DeferredItem<BlockItem>> FARMLAND_ITEMS = new EnumMap<>(Fertilizer.class);
    public static final Map<Fertilizer, DeferredItem<FertilizerItem>> FERTILIZERS = new EnumMap<>(Fertilizer.class);

    public static final DeferredBlock<GardenPotBlock> GARDEN_POT = BLOCKS.registerBlock("garden_pot", GardenPotBlock::new,
            BlockBehaviour.Properties.ofFullCopy(Blocks.TERRACOTTA).strength(1.0F).noOcclusion());
    public static final DeferredItem<BlockItem> GARDEN_POT_ITEM = ITEMS.registerSimpleBlockItem(GARDEN_POT);

    public static final DeferredBlock<HyperSandBlock> HYPER_FERTILIZED_SAND = BLOCKS.registerBlock("hyper_fertilized_sand",
            HyperSandBlock::new, BlockBehaviour.Properties.ofFullCopy(Blocks.SAND));
    public static final DeferredItem<BlockItem> HYPER_FERTILIZED_SAND_ITEM = ITEMS.registerSimpleBlockItem(HYPER_FERTILIZED_SAND);

    public static final DeferredBlock<SprinklerBlock> IRON_SPRINKLER = sprinkler("iron_sprinkler", 1, Blocks.IRON_BLOCK);
    public static final DeferredBlock<SprinklerBlock> GOLD_SPRINKLER = sprinkler("gold_sprinkler", 2, Blocks.GOLD_BLOCK);
    public static final DeferredBlock<SprinklerBlock> DIAMOND_SPRINKLER = sprinkler("diamond_sprinkler", 3, Blocks.DIAMOND_BLOCK);
    public static final DeferredBlock<SprinklerBlock> NETHERITE_SPRINKLER = sprinkler("netherite_sprinkler", 4, Blocks.NETHERITE_BLOCK);
    public static final List<DeferredBlock<SprinklerBlock>> SPRINKLERS =
            List.of(IRON_SPRINKLER, GOLD_SPRINKLER, DIAMOND_SPRINKLER, NETHERITE_SPRINKLER);
    public static final List<DeferredItem<BlockItem>> SPRINKLER_ITEMS =
            SPRINKLERS.stream().map(ITEMS::registerSimpleBlockItem).toList();

    public static final List<DeferredItem<WateringCanItem>> WATERING_CANS = List.of(
            can(WateringCanItem.Tier.COPPER), can(WateringCanItem.Tier.IRON), can(WateringCanItem.Tier.GOLD),
            can(WateringCanItem.Tier.DIAMOND), can(WateringCanItem.Tier.NETHERITE));

    static {
        for (Fertilizer fertilizer : Fertilizer.values()) {
            DeferredBlock<FertilizedFarmBlock> block = BLOCKS.registerBlock(fertilizer.farmlandName(),
                    props -> new FertilizedFarmBlock(fertilizer, props), BlockBehaviour.Properties.ofFullCopy(Blocks.FARMLAND));
            FARMLAND.put(fertilizer, block);
            FARMLAND_ITEMS.put(fertilizer, ITEMS.registerSimpleBlockItem(block));
            FERTILIZERS.put(fertilizer, ITEMS.registerItem(fertilizer.itemName(),
                    props -> new FertilizerItem(fertilizer, props)));
        }
    }

    private FarmRegistry() {
    }

    private static DeferredBlock<SprinklerBlock> sprinkler(String name, int radius, net.minecraft.world.level.block.Block look) {
        return BLOCKS.registerBlock(name, props -> new SprinklerBlock(radius, props),
                BlockBehaviour.Properties.ofFullCopy(look).strength(2.0F, 6.0F).sound(SoundType.METAL).noOcclusion()
                        .requiresCorrectToolForDrops());
    }

    private static DeferredItem<WateringCanItem> can(WateringCanItem.Tier tier) {
        return CAN_ITEMS.registerItem(tier.itemName(), props -> new WateringCanItem(tier, props),
                new Item.Properties().stacksTo(1));
    }

    public static void register(IEventBus bus) {
        COMPONENTS.register(bus);
        BLOCKS.register(bus);
        ITEMS.register(bus);
        CAN_ITEMS.register(bus);
        bus.addListener(FarmRegistry::onCreativeTabs);
    }

    private static void onCreativeTabs(BuildCreativeModeTabContentsEvent event) {
        if (event.getTabKey() == CreativeModeTabs.TOOLS_AND_UTILITIES) {
            WATERING_CANS.forEach(event::accept);
        } else if (event.getTabKey() == CreativeModeTabs.FUNCTIONAL_BLOCKS) {
            SPRINKLER_ITEMS.forEach(event::accept);
            event.accept(GARDEN_POT_ITEM);
        } else if (event.getTabKey() == CreativeModeTabs.NATURAL_BLOCKS) {
            FARMLAND_ITEMS.values().forEach(event::accept);
            event.accept(HYPER_FERTILIZED_SAND_ITEM);
        } else if (event.getTabKey() == CreativeModeTabs.INGREDIENTS) {
            FERTILIZERS.values().forEach(event::accept);
        }
    }
}
