package dev.sunlitidle.client;

import dev.sunlitidle.ModRegistry;
import net.minecraft.client.gui.screens.MenuScreens;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.fml.event.lifecycle.FMLClientSetupEvent;

public final class ClientSetup {
    private ClientSetup() {
    }

    public static void init(IEventBus bus) {
        bus.addListener(ClientSetup::onClientSetup);
    }

    private static void onClientSetup(FMLClientSetupEvent event) {
        event.enqueueWork(() -> MenuScreens.register(ModRegistry.CAMP_MENU.get(), CampScreen::new));
    }
}
