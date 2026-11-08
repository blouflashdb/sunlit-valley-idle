package dev.sunlitidle.client;

import com.mojang.blaze3d.platform.InputConstants;
import dev.sunlitidle.ModRegistry;
import dev.sunlitidle.idle.RecipeActions;
import dev.sunlitidle.network.IdleActionPacket;
import dev.sunlitidle.network.IdleNetwork;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.event.lifecycle.FMLClientSetupEvent;
import net.neoforged.neoforge.client.event.ClientTickEvent;
import net.neoforged.neoforge.client.event.RegisterKeyMappingsEvent;
import net.neoforged.neoforge.client.event.RegisterMenuScreensEvent;
import net.neoforged.neoforge.common.NeoForge;
import org.lwjgl.glfw.GLFW;

public final class ClientSetup {
    public static final KeyMapping OPEN_IDLE = new KeyMapping("key.sunlitidle.open_idle", InputConstants.Type.KEYSYM,
            GLFW.GLFW_KEY_I, "key.categories.sunlitidle");

    private ClientSetup() {
    }

    public static void init(IEventBus bus) {
        bus.addListener(ClientSetup::onClientSetup);
        bus.addListener(ClientSetup::onKeys);
        bus.addListener(ClientSetup::onScreens);
        NeoForge.EVENT_BUS.addListener(ClientSetup::onClientTick);
    }

    private static void onClientSetup(FMLClientSetupEvent event) {
        event.enqueueWork(() -> {
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

    private static void onScreens(RegisterMenuScreensEvent event) {
        event.register(ModRegistry.IDLE_MENU.get(), IdleScreen::new);
    }

    private static void onKeys(RegisterKeyMappingsEvent event) {
        event.register(OPEN_IDLE);
    }

    private static void onClientTick(ClientTickEvent.Post event) {
        Minecraft mc = Minecraft.getInstance();
        while (OPEN_IDLE.consumeClick()) {
            if (mc.player != null && mc.screen == null) {
                IdleNetwork.sendToServer(IdleActionPacket.open());
            }
        }
    }
}
