package dev.sunlitidle.client;

import com.mojang.blaze3d.platform.InputConstants;
import dev.sunlitidle.ModRegistry;
import dev.sunlitidle.idle.RecipeActions;
import dev.sunlitidle.network.IdleActionPacket;
import dev.sunlitidle.network.IdleNetwork;
import dev.sunlitidle.slime.SlimeBreed;
import dev.sunlitidle.slime.SlimeRegistry;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.event.lifecycle.FMLClientSetupEvent;
import net.neoforged.neoforge.client.event.ClientTickEvent;
import net.neoforged.neoforge.client.event.RegisterColorHandlersEvent;
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
        bus.addListener(ClientSetup::onItemColors);
        NeoForge.EVENT_BUS.addListener(ClientSetup::onClientTick);
        TitleScreenButtonIds.init();
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

    /** Plorts and Slime Hearts share one white texture each and take the breed's color. */
    private static void onItemColors(RegisterColorHandlersEvent.Item event) {
        for (SlimeBreed breed : SlimeBreed.values()) {
            int argb = 0xFF000000 | breed.color();
            event.register((stack, tint) -> tint == 0 ? argb : -1,
                    SlimeRegistry.PLORTS.get(breed).get(), SlimeRegistry.HEARTS.get(breed).get());
        }
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
