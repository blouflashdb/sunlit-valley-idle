package dev.sunlitidle.client;

import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.Tooltip;
import net.minecraft.client.gui.screens.PauseScreen;
import net.minecraft.network.chat.Component;
import net.neoforged.neoforge.client.event.ScreenEvent;
import net.neoforged.neoforge.common.NeoForge;

/**
 * Adds a "Block Outline" button to the top left corner of the pause menu. It opens {@link OutlineSettingsScreen}.
 * The corner is free in the pack's FancyMenu pause layout, which moves only the vanilla buttons.
 */
public final class PauseMenuButton {
    private PauseMenuButton() {
    }

    public static void init() {
        NeoForge.EVENT_BUS.addListener(PauseMenuButton::onInit);
    }

    private static void onInit(ScreenEvent.Init.Post event) {
        if (!(event.getScreen() instanceof PauseScreen screen) || !screen.showsPauseMenu()) {
            return;
        }
        event.addListener(Button.builder(Component.translatable("sunlitidle.outline.button"),
                        b -> Minecraft.getInstance().setScreen(new OutlineSettingsScreen(screen)))
                .tooltip(Tooltip.create(Component.translatable("sunlitidle.outline.button.tooltip")))
                .bounds(4, 4, 100, 20).build());
    }
}
