package dev.sunlitidle.client;

import dev.sunlitidle.compat.selectivebounds.OutlineSettings;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.AbstractSliderButton;
import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.CycleButton;
import net.minecraft.client.gui.components.Tooltip;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.CommonComponents;
import net.minecraft.network.chat.Component;
import net.minecraft.util.Mth;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * In-game settings for the block outline: the master switch of this mod and the rules of Selective Bounds.
 * Changes work at once; the screen saves them when it closes.
 */
public final class OutlineSettingsScreen extends Screen {
    private static final int WIDTH = 260;
    private static final int ROW = 24;

    private final Screen parent;
    private boolean alwaysShow;
    private OutlineSettings.Values values;
    private final List<AbstractWidget> rules = new ArrayList<>();

    public OutlineSettingsScreen(Screen parent) {
        super(Component.translatable("sunlitidle.outline.title"));
        this.parent = parent;
    }

    @Override
    protected void init() {
        alwaysShow = ClientConfig.alwaysShowBlockOutline();
        values = OutlineSettings.read();
        rules.clear();
        int x = (width - WIDTH) / 2;
        int y = Math.max(32, height / 2 - 4 * ROW);

        addRenderableWidget(CycleButton.onOffBuilder(alwaysShow)
                .withTooltip(v -> Tooltip.create(Component.translatable("sunlitidle.outline.always_show.tooltip")))
                .create(x, y, WIDTH, 20, Component.translatable("sunlitidle.outline.always_show"), (b, v) -> {
                    alwaysShow = v;
                    ClientConfig.setAlwaysShowBlockOutline(v);
                    updateActive();
                }));
        y += ROW + 8;

        if (values != null) {
            rules.add(toggle(x, y, "show_on_sneak", values.showOnSneak(),
                    v -> values = new OutlineSettings.Values(v, values.showOnAction(), values.showOnActionTime(),
                            values.considerCanAttackBlock(), values.considerIsCorrectToolForDrops(),
                            values.considerCanBePlaced())));
            y += ROW;
            rules.add(toggle(x, y, "show_on_action", values.showOnAction(),
                    v -> values = new OutlineSettings.Values(values.showOnSneak(), v, values.showOnActionTime(),
                            values.considerCanAttackBlock(), values.considerIsCorrectToolForDrops(),
                            values.considerCanBePlaced())));
            y += ROW;
            rules.add(addRenderableWidget(new ActionTimeSlider(x, y)));
            y += ROW;
            rules.add(toggle(x, y, "correct_tool", values.considerIsCorrectToolForDrops(),
                    v -> values = new OutlineSettings.Values(values.showOnSneak(), values.showOnAction(),
                            values.showOnActionTime(), values.considerCanAttackBlock(), v,
                            values.considerCanBePlaced())));
            y += ROW;
            rules.add(toggle(x, y, "can_attack", values.considerCanAttackBlock(),
                    v -> values = new OutlineSettings.Values(values.showOnSneak(), values.showOnAction(),
                            values.showOnActionTime(), v, values.considerIsCorrectToolForDrops(),
                            values.considerCanBePlaced())));
            y += ROW;
            rules.add(toggle(x, y, "can_be_placed", values.considerCanBePlaced(),
                    v -> values = new OutlineSettings.Values(values.showOnSneak(), values.showOnAction(),
                            values.showOnActionTime(), values.considerCanAttackBlock(),
                            values.considerIsCorrectToolForDrops(), v)));
            y += ROW;
        }

        addRenderableWidget(Button.builder(CommonComponents.GUI_DONE, b -> onClose())
                .bounds(width / 2 - 100, Math.min(height - 28, y + 8), 200, 20).build());
        updateActive();
    }

    private AbstractWidget toggle(int x, int y, String key, boolean value, java.util.function.Consumer<Boolean> set) {
        return addRenderableWidget(CycleButton.onOffBuilder(value)
                .withTooltip(v -> Tooltip.create(Component.translatable("sunlitidle.outline." + key + ".tooltip")))
                .create(x, y, WIDTH, 20, Component.translatable("sunlitidle.outline." + key), (b, v) -> {
                    set.accept(v);
                    OutlineSettings.write(values);
                }));
    }

    /** The rules of Selective Bounds have no effect while the master switch is on. */
    private void updateActive() {
        for (AbstractWidget widget : rules) {
            widget.active = !alwaysShow;
        }
    }

    @Override
    public void render(GuiGraphics graphics, int mouseX, int mouseY, float partialTick) {
        super.render(graphics, mouseX, mouseY, partialTick);
        graphics.drawCenteredString(font, title, width / 2, 15, 0xFFFFFF);
        if (values == null) {
            graphics.drawCenteredString(font, Component.translatable("sunlitidle.outline.unavailable"), width / 2,
                    Math.max(32, height / 2 - 4 * ROW) + ROW + 8, 0xA0A0A0);
        } else if (alwaysShow) {
            graphics.drawCenteredString(font, Component.translatable("sunlitidle.outline.rules_off"), width / 2,
                    Math.max(32, height / 2 - 4 * ROW) + ROW - 1, 0xA0A0A0);
        }
    }

    @Override
    public void onClose() {
        if (values != null) {
            OutlineSettings.write(values);
        }
        minecraft.setScreen(parent);
    }

    private final class ActionTimeSlider extends AbstractSliderButton {
        ActionTimeSlider(int x, int y) {
            super(x, y, WIDTH, 20, Component.empty(), toSlider(values.showOnActionTime()));
            setTooltip(Tooltip.create(Component.translatable("sunlitidle.outline.action_time.tooltip")));
            updateMessage();
        }

        private float seconds() {
            float raw = OutlineSettings.MIN_ACTION_SECONDS
                    + (float) value * (OutlineSettings.MAX_ACTION_SECONDS - OutlineSettings.MIN_ACTION_SECONDS);
            return Math.round(raw * 2) / 2.0f;
        }

        @Override
        protected void updateMessage() {
            setMessage(Component.translatable("sunlitidle.outline.action_time",
                    String.format(Locale.ROOT, "%.1f", seconds())));
        }

        @Override
        protected void applyValue() {
            values = new OutlineSettings.Values(values.showOnSneak(), values.showOnAction(), seconds(),
                    values.considerCanAttackBlock(), values.considerIsCorrectToolForDrops(),
                    values.considerCanBePlaced());
        }

        @Override
        public void onRelease(double mouseX, double mouseY) {
            super.onRelease(mouseX, mouseY);
            OutlineSettings.write(values);
        }
    }

    private static double toSlider(float seconds) {
        return Mth.clamp((seconds - OutlineSettings.MIN_ACTION_SECONDS)
                / (OutlineSettings.MAX_ACTION_SECONDS - OutlineSettings.MIN_ACTION_SECONDS), 0.0, 1.0);
    }
}
