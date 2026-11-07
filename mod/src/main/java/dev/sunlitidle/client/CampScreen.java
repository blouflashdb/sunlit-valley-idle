package dev.sunlitidle.client;

import dev.sunlitidle.camp.AdventurerCampBlockEntity;
import dev.sunlitidle.camp.CampMenu;
import dev.sunlitidle.camp.CampStatus;
import dev.sunlitidle.camp.DungeonTier;
import dev.sunlitidle.camp.Stat;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.inventory.AbstractContainerScreen;
import net.minecraft.network.chat.Component;
import net.minecraft.world.entity.player.Inventory;

import java.util.ArrayList;
import java.util.List;

/** Texture-free GUI: panels and slot frames are drawn with plain fills. */
public class CampScreen extends AbstractContainerScreen<CampMenu> {
    private static final int PANEL_X = 204;
    private static final int PANEL_W = 134;
    private static final int STATS_Y = 120;
    private static final int STAT_ROW = 14;

    private static final int BG = 0xFFC6C6C6;
    private static final int BORDER_LIGHT = 0xFFFFFFFF;
    private static final int BORDER_DARK = 0xFF555555;
    private static final int SLOT_BG = 0xFF8B8B8B;
    private static final int TEXT = 0xFF404040;

    private Button tierDown;
    private Button tierUp;
    private final List<Button> statButtons = new ArrayList<>();

    public CampScreen(CampMenu menu, Inventory inventory, Component title) {
        super(menu, inventory, title);
        imageWidth = PANEL_X + PANEL_W + 6;
        imageHeight = CampMenu.HOTBAR_Y + 24;
        inventoryLabelX = CampMenu.GRID_X;
        inventoryLabelY = CampMenu.INV_Y - 11;
    }

    @Override
    protected void init() {
        super.init();
        statButtons.clear();
        tierDown = addRenderableWidget(Button.builder(Component.literal("<"), b -> press(CampMenu.BUTTON_TIER_DOWN))
                .bounds(leftPos + PANEL_X, topPos + 26, 14, 14).build());
        tierUp = addRenderableWidget(Button.builder(Component.literal(">"), b -> press(CampMenu.BUTTON_TIER_UP))
                .bounds(leftPos + PANEL_X + PANEL_W - 14, topPos + 26, 14, 14).build());
        for (int i = 0; i < Stat.values().length; i++) {
            final int id = CampMenu.BUTTON_STAT + i;
            statButtons.add(addRenderableWidget(Button.builder(Component.literal("+"), b -> press(id))
                    .bounds(leftPos + PANEL_X + PANEL_W - 14, topPos + STATS_Y + 10 + i * STAT_ROW - 2, 14, 12).build()));
        }
    }

    private void press(int id) {
        if (minecraft != null && minecraft.gameMode != null) {
            minecraft.gameMode.handleInventoryButtonClick(menu.containerId, id);
        }
    }

    @Override
    protected void containerTick() {
        super.containerTick();
        int tier = menu.get(CampMenu.DATA_TIER);
        tierDown.active = tier > 1;
        tierUp.active = tier < menu.get(CampMenu.DATA_MAX_TIER);
        boolean hasPoints = menu.get(CampMenu.DATA_POINTS) > 0;
        for (Button b : statButtons) {
            b.active = hasPoints;
        }
    }

    @Override
    public void render(GuiGraphics g, int mouseX, int mouseY, float partialTick) {
        renderBackground(g);
        super.render(g, mouseX, mouseY, partialTick);
        renderTooltip(g, mouseX, mouseY);
    }

    @Override
    protected void renderBg(GuiGraphics g, float partialTick, int mouseX, int mouseY) {
        int x = leftPos;
        int y = topPos;
        panel(g, x, y, imageWidth, imageHeight);
        for (int i = 0; i < AdventurerCampBlockEntity.GEAR_SLOTS; i++) {
            slot(g, x + CampMenu.GEAR_X, y + CampMenu.GEAR_Y + i * 18);
        }
        for (int i = 0; i < 9; i++) {
            slot(g, x + CampMenu.GRID_X + i * 18, y + CampMenu.FOOD_Y);
            slot(g, x + CampMenu.GRID_X + i * 18, y + CampMenu.SPARE_Y);
            for (int row = 0; row < 3; row++) {
                slot(g, x + CampMenu.GRID_X + i * 18, y + CampMenu.LOOT_Y + row * 18);
                slot(g, x + CampMenu.GRID_X + i * 18, y + CampMenu.INV_Y + row * 18);
            }
            slot(g, x + CampMenu.GRID_X + i * 18, y + CampMenu.HOTBAR_Y);
        }
        // Stats panel and progress bar.
        int px = x + PANEL_X;
        g.fill(px - 3, y + 16, px + PANEL_W + 3, y + CampMenu.HOTBAR_Y + 18, 0xFFB0B0B0);
        int barY = y + 98;
        g.fill(px, barY, px + PANEL_W, barY + 6, BORDER_DARK);
        int killTicks = Math.max(1, menu.get(CampMenu.DATA_KILL_TICKS));
        int filled = (int) ((long) PANEL_W * menu.get(CampMenu.DATA_PROGRESS) / killTicks);
        if (CampStatus.byId(menu.get(CampMenu.DATA_STATUS)) == CampStatus.FIGHTING) {
            g.fill(px, barY, px + Math.min(PANEL_W, filled), barY + 6, 0xFF4CAF50);
        }
    }

    @Override
    protected void renderLabels(GuiGraphics g, int mouseX, int mouseY) {
        g.drawString(font, title, 8, 6, TEXT, false);
        g.drawString(font, playerInventoryTitle, inventoryLabelX, inventoryLabelY, TEXT, false);
        g.drawString(font, Component.translatable("sunlitidle.gui.gear"), CampMenu.GEAR_X, CampMenu.GEAR_Y - 10, TEXT, false);
        g.drawString(font, Component.translatable("sunlitidle.gui.food"), CampMenu.GRID_X, CampMenu.FOOD_Y - 10, TEXT, false);
        g.drawString(font, Component.translatable("sunlitidle.gui.spare"), CampMenu.GRID_X, CampMenu.SPARE_Y - 10, TEXT, false);
        g.drawString(font, Component.translatable("sunlitidle.gui.loot"), CampMenu.GRID_X, CampMenu.LOOT_Y - 10, TEXT, false);

        int px = PANEL_X;
        int tier = menu.get(CampMenu.DATA_TIER);
        g.drawString(font, Component.translatable("sunlitidle.gui.dungeon"), px, 18, TEXT, false);
        Component tierName = Component.translatable(DungeonTier.byNumber(tier).translationKey());
        g.drawCenteredString(font, tierName, px + PANEL_W / 2, 30, 0xFFFFFFFF);

        g.drawString(font, Component.translatable("sunlitidle.gui.level", menu.get(CampMenu.DATA_LEVEL),
                menu.get(CampMenu.DATA_XP), menu.get(CampMenu.DATA_XP_NEXT)), px, 46, TEXT, false);
        g.drawString(font, Component.translatable("sunlitidle.gui.health", menu.get(CampMenu.DATA_MAX_HP)), px, 58, TEXT, false);
        g.drawString(font, Component.translatable("sunlitidle.gui.food_buffer",
                String.format("%.1f", menu.get(CampMenu.DATA_FOOD) / 10.0)), px, 70, TEXT, false);
        g.drawString(font, Component.translatable("sunlitidle.gui.power", menu.get(CampMenu.DATA_POWER),
                menu.get(CampMenu.DATA_TIER_POWER)), px, 82, TEXT, false);

        CampStatus status = CampStatus.byId(menu.get(CampMenu.DATA_STATUS));
        Component statusText = status == CampStatus.RETREATING
                ? Component.translatable(status.translationKey(), (menu.get(CampMenu.DATA_RETREAT) + 19) / 20)
                : Component.translatable(status.translationKey());
        int color = status == CampStatus.FIGHTING ? 0xFF2E7D32 : 0xFFB71C1C;
        g.drawString(font, statusText, px, 108, color, false);

        g.drawString(font, Component.translatable("sunlitidle.gui.stats", menu.get(CampMenu.DATA_POINTS)), px, STATS_Y, TEXT, false);
        Stat[] stats = Stat.values();
        for (int i = 0; i < stats.length; i++) {
            int rowY = STATS_Y + 10 + i * STAT_ROW;
            g.drawString(font, Component.translatable(stats[i].translationKey()), px, rowY, TEXT, false);
            g.drawString(font, String.valueOf(menu.get(CampMenu.DATA_STATS + i)), px + 80, rowY, TEXT, false);
        }
    }

    private static void panel(GuiGraphics g, int x, int y, int w, int h) {
        g.fill(x, y, x + w, y + h, BG);
        g.fill(x, y, x + w - 1, y + 1, BORDER_LIGHT);
        g.fill(x, y, x + 1, y + h - 1, BORDER_LIGHT);
        g.fill(x + 1, y + h - 1, x + w, y + h, BORDER_DARK);
        g.fill(x + w - 1, y + 1, x + w, y + h, BORDER_DARK);
    }

    private static void slot(GuiGraphics g, int x, int y) {
        g.fill(x - 1, y - 1, x + 17, y + 17, BORDER_DARK);
        g.fill(x, y, x + 17, y + 17, BORDER_LIGHT);
        g.fill(x, y, x + 16, y + 16, SLOT_BG);
    }
}
