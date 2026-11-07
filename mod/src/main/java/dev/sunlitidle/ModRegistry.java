package dev.sunlitidle;

import dev.sunlitidle.camp.AdventurerCampBlock;
import dev.sunlitidle.camp.AdventurerCampBlockEntity;
import dev.sunlitidle.camp.CampMenu;
import dev.sunlitidle.idle.IdleMenu;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.inventory.MenuType;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.MapColor;
import net.minecraftforge.common.extensions.IForgeMenuType;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public final class ModRegistry {
    private static final DeferredRegister<Block> BLOCKS = DeferredRegister.create(ForgeRegistries.BLOCKS, SunlitIdle.MOD_ID);
    private static final DeferredRegister<Item> ITEMS = DeferredRegister.create(ForgeRegistries.ITEMS, SunlitIdle.MOD_ID);
    private static final DeferredRegister<BlockEntityType<?>> BLOCK_ENTITIES =
            DeferredRegister.create(ForgeRegistries.BLOCK_ENTITY_TYPES, SunlitIdle.MOD_ID);
    private static final DeferredRegister<MenuType<?>> MENUS = DeferredRegister.create(ForgeRegistries.MENU_TYPES, SunlitIdle.MOD_ID);
    private static final DeferredRegister<CreativeModeTab> TABS = DeferredRegister.create(Registries.CREATIVE_MODE_TAB, SunlitIdle.MOD_ID);

    public static final RegistryObject<Block> ADVENTURERS_CAMP = BLOCKS.register("adventurers_camp",
            () -> new AdventurerCampBlock(BlockBehaviour.Properties.of()
                    .mapColor(MapColor.WOOD)
                    .strength(2.5f)
                    .sound(SoundType.WOOD)
                    .noOcclusion()));

    public static final RegistryObject<Item> ADVENTURERS_CAMP_ITEM = ITEMS.register("adventurers_camp",
            () -> new BlockItem(ADVENTURERS_CAMP.get(), new Item.Properties()));

    @SuppressWarnings("DataFlowIssue")
    public static final RegistryObject<BlockEntityType<AdventurerCampBlockEntity>> ADVENTURERS_CAMP_BE =
            BLOCK_ENTITIES.register("adventurers_camp",
                    () -> BlockEntityType.Builder.of(AdventurerCampBlockEntity::new, ADVENTURERS_CAMP.get()).build(null));

    public static final RegistryObject<MenuType<CampMenu>> CAMP_MENU = MENUS.register("adventurers_camp",
            () -> IForgeMenuType.create(CampMenu::fromNetwork));

    public static final RegistryObject<MenuType<IdleMenu>> IDLE_MENU = MENUS.register("idle_skills",
            () -> IForgeMenuType.create(IdleMenu::fromNetwork));

    public static final RegistryObject<CreativeModeTab> TAB = TABS.register("main", () -> CreativeModeTab.builder()
            .title(Component.translatable("itemGroup.sunlitidle"))
            .icon(() -> ADVENTURERS_CAMP_ITEM.get().getDefaultInstance())
            .displayItems((params, output) -> output.accept(ADVENTURERS_CAMP_ITEM.get()))
            .build());

    private ModRegistry() {
    }

    public static void register(IEventBus bus) {
        BLOCKS.register(bus);
        ITEMS.register(bus);
        BLOCK_ENTITIES.register(bus);
        MENUS.register(bus);
        TABS.register(bus);
    }
}
