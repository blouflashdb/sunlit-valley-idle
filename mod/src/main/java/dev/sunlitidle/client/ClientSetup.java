package dev.sunlitidle.client;

import com.mojang.blaze3d.platform.InputConstants;
import dev.sunlitidle.ModRegistry;
import dev.sunlitidle.SunlitIdle;
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

    /**
     * CI only (client-boot job): seconds in the world after which the client opens the idle window on the
     * Adventuring tab, so the job can take a screenshot of it. Unset in normal play.
     */
    private static final String CI_SCREEN_ENV = "SUNLITIDLE_CI_IDLE_SCREEN";
    private static int ciScreenTicks = -1;
    private static String ciTab;

    private ClientSetup() {
    }

    /** The tab the idle window should open on once, set by the CI screenshot hook; null in normal play. */
    public static String consumeCiTab() {
        String tab = ciTab;
        ciTab = null;
        return tab;
    }

    public static void init(IEventBus bus) {
        bus.addListener(ClientSetup::onClientSetup);
        bus.addListener(ClientSetup::onKeys);
        bus.addListener(ClientSetup::onScreens);
        bus.addListener(ClientSetup::onItemColors);
        String ciScreen = System.getenv(CI_SCREEN_ENV);
        if (ciScreen != null && !ciScreen.isBlank()) {
            try {
                ciScreenTicks = Integer.parseInt(ciScreen.trim()) * 20;
            } catch (NumberFormatException e) {
                ciScreenTicks = -1;
            }
        }
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
        if (ciScreenTicks >= 0 && mc.player != null && mc.level != null && --ciScreenTicks < 0) {
            if (mc.screen != null) {
                mc.setScreen(null);
            }
            ciTab = "adventuring";
            SunlitIdle.LOGGER.info("CI: opening the idle skills window for the client-boot screenshot");
            IdleNetwork.sendToServer(IdleActionPacket.open());
        }
    }
}
