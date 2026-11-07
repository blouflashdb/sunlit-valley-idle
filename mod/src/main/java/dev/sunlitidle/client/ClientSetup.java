package dev.sunlitidle.client;

import com.mojang.blaze3d.platform.InputConstants;
import dev.sunlitidle.ModRegistry;
import dev.sunlitidle.idle.RecipeActions;
import dev.sunlitidle.network.IdleActionPacket;
import dev.sunlitidle.network.IdleNetwork;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.MenuScreens;
import net.minecraftforge.client.event.RegisterKeyMappingsEvent;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.fml.event.lifecycle.FMLClientSetupEvent;
import org.lwjgl.glfw.GLFW;

public final class ClientSetup {
    public static final KeyMapping OPEN_IDLE = new KeyMapping("key.sunlitidle.open_idle", InputConstants.Type.KEYSYM,
            GLFW.GLFW_KEY_I, "key.categories.sunlitidle");

    private ClientSetup() {
    }

    public static void init(IEventBus bus) {
        bus.addListener(ClientSetup::onClientSetup);
        bus.addListener(ClientSetup::onKeys);
        MinecraftForge.EVENT_BUS.addListener(ClientSetup::onClientTick);
    }

    private static void onClientSetup(FMLClientSetupEvent event) {
        event.enqueueWork(() -> {
            MenuScreens.register(ModRegistry.CAMP_MENU.get(), CampScreen::new);
            MenuScreens.register(ModRegistry.IDLE_MENU.get(), IdleScreen::new);
            RecipeActions.clientRecipes = () -> {
                Minecraft mc = Minecraft.getInstance();
                return mc.level != null ? mc.level.getRecipeManager() : null;
            };
            RecipeActions.clientRegistries = () -> {
                Minecraft mc = Minecraft.getInstance();
                return mc.level != null ? mc.level.registryAccess() : null;
            };
        });
    }

    private static void onKeys(RegisterKeyMappingsEvent event) {
        event.register(OPEN_IDLE);
    }

    private static void onClientTick(TickEvent.ClientTickEvent event) {
        if (event.phase != TickEvent.Phase.END) {
            return;
        }
        Minecraft mc = Minecraft.getInstance();
        while (OPEN_IDLE.consumeClick()) {
            if (mc.player != null && mc.screen == null) {
                IdleNetwork.sendToServer(IdleActionPacket.open());
            }
        }
    }
}
