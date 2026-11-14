package dev.sunlitidle.client;

import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.client.gui.components.events.GuiEventListener;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.contents.TranslatableContents;
import net.neoforged.bus.api.EventPriority;
import net.neoforged.neoforge.client.event.ScreenEvent;
import net.neoforged.neoforge.common.NeoForge;

import java.util.Map;

/**
 * Lets FancyMenu find the language and accessibility icon buttons of the 1.21.1 title screen.
 *
 * <p>FancyMenu identifies these two buttons by the message keys they had on 1.20.1
 * ({@code narrator.button.language}, {@code narrator.button.accessibility}). On 1.21.1 the buttons carry
 * {@code options.language} and {@code options.accessibility}, so FancyMenu never matches them, the pack's
 * title screen layouts cannot move them, and they stay at their vanilla place on top of the moved menu
 * buttons. This listener gives the buttons the old keys right after the screen creates them (before FancyMenu
 * reads the widgets). Both keys translate to the same text ("Language", "Accessibility"), and the tooltip is
 * already set, so nothing changes for the player.
 */
public final class TitleScreenButtonIds {
    static final Map<String, String> KEYS = Map.of(
            "options.language", "narrator.button.language",
            "options.accessibility", "narrator.button.accessibility");

    private TitleScreenButtonIds() {
    }

    public static void init() {
        NeoForge.EVENT_BUS.addListener(EventPriority.HIGHEST, TitleScreenButtonIds::onInit);
    }

    private static void onInit(ScreenEvent.Init.Post event) {
        if (!(event.getScreen() instanceof TitleScreen)) {
            return;
        }
        for (GuiEventListener listener : event.getListenersList()) {
            if (listener instanceof AbstractWidget widget
                    && widget.getMessage().getContents() instanceof TranslatableContents contents) {
                String key = KEYS.get(contents.getKey());
                if (key != null) {
                    widget.setMessage(Component.translatable(key));
                }
            }
        }
    }
}
