package dev.sunlitidle;

import dev.sunlitidle.idle.IdleMenu;
import net.minecraft.core.registries.Registries;
import net.minecraft.world.inventory.MenuType;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.common.extensions.IMenuTypeExtension;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredRegister;

public final class ModRegistry {
    private static final DeferredRegister<MenuType<?>> MENUS = DeferredRegister.create(Registries.MENU, SunlitIdle.MOD_ID);

    public static final DeferredHolder<MenuType<?>, MenuType<IdleMenu>> IDLE_MENU = MENUS.register("idle_skills",
            () -> IMenuTypeExtension.create(IdleMenu::fromNetwork));

    private ModRegistry() {
    }

    public static void register(IEventBus bus) {
        MENUS.register(bus);
    }
}
