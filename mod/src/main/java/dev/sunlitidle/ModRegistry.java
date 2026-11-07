package dev.sunlitidle;

import dev.sunlitidle.idle.IdleMenu;
import net.minecraft.world.inventory.MenuType;
import net.minecraftforge.common.extensions.IForgeMenuType;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public final class ModRegistry {
    private static final DeferredRegister<MenuType<?>> MENUS = DeferredRegister.create(ForgeRegistries.MENU_TYPES, SunlitIdle.MOD_ID);

    public static final RegistryObject<MenuType<IdleMenu>> IDLE_MENU = MENUS.register("idle_skills",
            () -> IForgeMenuType.create(IdleMenu::fromNetwork));

    private ModRegistry() {
    }

    public static void register(IEventBus bus) {
        MENUS.register(bus);
    }
}
