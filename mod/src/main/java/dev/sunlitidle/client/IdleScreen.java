package dev.sunlitidle.client;

import dev.sunlitidle.combat.Combat;
import dev.sunlitidle.idle.IdleAction;
import dev.sunlitidle.idle.IdleCombat;
import dev.sunlitidle.idle.PlayerIdleState;
import dev.sunlitidle.idle.IdleCatalog;
import dev.sunlitidle.idle.IdleDrop;
import dev.sunlitidle.idle.IdleInput;
import dev.sunlitidle.idle.IdleMath;
import dev.sunlitidle.idle.IdleMenu;
import dev.sunlitidle.idle.IdleSkill;
import dev.sunlitidle.idle.SlotStatus;
import dev.sunlitidle.idle.ToolKind;
import dev.sunlitidle.network.IdleActionPacket;
import dev.sunlitidle.network.IdleNetwork;
import dev.sunlitidle.network.IdleSyncPacket;
import net.minecraft.ChatFormatting;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.inventory.AbstractContainerScreen;
import net.minecraft.client.resources.language.I18n;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.item.ItemStack;
import net.minecraft.core.registries.BuiltInRegistries;
import net.neoforged.neoforge.items.IItemHandler;
import net.neoforged.neoforge.items.ItemStackHandler;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Texture-free idle skills window: skill tabs, action slots, action list and storage. */
public class IdleScreen extends AbstractContainerScreen<IdleMenu> {
    private static final int MID_X = IdleMenu.MID_X;
    private static final int MID_W = 178;
    private static final int TAB = IdleMenu.TAB_SIZE;
    private static final int SLOT_Y = 38;
    private static final int SLOT_W = 34;
    private static final int SLOT_H = 24;
    private static final int LIST_Y = 66;
    private static final int ROW_H = 18;
    private static final int ROWS = 5;
    private static final int COMPANION_LIST_Y = 88;
    private static final int COMPANION_ROWS = 4;
    private static final int STORE_X = 236;
    private static final int STORE_Y = 28;
    private static final int STORE_COLS = 5;
    private static final int STORE_ROWS = 11;

    private static final int BG = 0xFFC6C6C6;
    private static final int BORDER_LIGHT = 0xFFFFFFFF;
    private static final int BORDER_DARK = 0xFF555555;
    private static final int SLOT_BG = 0xFF8B8B8B;
    private static final int PANEL = 0xFFB0B0B0;
    private static final int TEXT = 0xFF404040;
    private static final int GREEN = 0xFF4CAF50;
    private static final int RED = 0xFFC62828;

    private int selectedSkill;
    private int selectedSlot;
    private int actionScroll;
    private int storageScroll;

    public IdleScreen(IdleMenu menu, Inventory inventory, Component title) {
        super(menu, inventory, title);
        imageWidth = STORE_X + STORE_COLS * 18 + 6;
        imageHeight = IdleMenu.HOTBAR_Y + 24;
    }

    @Override
    protected void init() {
        super.init();
        addRenderableWidget(Button.builder(Component.translatable("sunlitidle.idle.tree"),
                        b -> IdleNetwork.sendToServer(IdleActionPacket.openTree(selectedSkill)))
                .bounds(leftPos + MID_X + MID_W - 46, topPos + 15, 46, 13).build());
        addRenderableWidget(Button.builder(Component.translatable("sunlitidle.idle.sell_all"),
                        b -> IdleNetwork.sendToServer(IdleActionPacket.sell(-1)))
                .bounds(leftPos + STORE_X - 2, topPos + STORE_Y + STORE_ROWS * 18 + 3, STORE_COLS * 18 + 2, 14)
                .tooltip(net.minecraft.client.gui.components.Tooltip.create(Component.translatable("sunlitidle.idle.sell_all_hint")))
                .build());
    }

    private boolean companion() {
        IdleSkill skill = skill();
        return skill != null && skill.actions().stream().anyMatch(IdleAction::isCombat);
    }

    private int listY() {
        return companion() ? COMPANION_LIST_Y : LIST_Y;
    }

    private int rows() {
        return companion() ? COMPANION_ROWS : ROWS;
    }

    @Override
    protected void containerTick() {
        super.containerTick();
        menu.showCompanion = companion();
    }

    private IdleSkill skill() {
        IdleSkill skill = IdleCatalog.skill(selectedSkill);
        return skill != null ? skill : IdleCatalog.skill(0);
    }

    private List<IdleAction> actions() {
        IdleSkill skill = skill();
        return skill == null ? List.of() : IdleCatalog.availableActions(skill);
    }

    private int level(IdleSkill skill) {
        IdleSyncPacket data = ClientIdleData.get();
        if (data == null || skill.index() >= data.skills().size()) {
            return 0;
        }
        return data.skills().get(skill.index()).level();
    }

    // ---------------------------------------------------------------- drawing

    @Override
    public void render(GuiGraphics g, int mouseX, int mouseY, float partialTick) {
        // Screen.render draws the background (and blur) itself since 1.20.2.
        super.render(g, mouseX, mouseY, partialTick);
        renderTooltip(g, mouseX, mouseY);
        renderOwnTooltips(g, mouseX, mouseY);
    }

    @Override
    protected void renderLabels(GuiGraphics g, int mouseX, int mouseY) {
        g.drawString(font, title, 8, 6, TEXT, false);
    }

    @Override
    protected void renderBg(GuiGraphics g, float partialTick, int mouseX, int mouseY) {
        int x = leftPos;
        int y = topPos;
        panel(g, x, y, imageWidth, imageHeight);
        IdleSyncPacket data = ClientIdleData.get();
        drawTabs(g, x, y);
        IdleSkill skill = skill();
        if (skill == null) {
            return;
        }
        // Header with level and XP bar.
        int lvl = level(skill);
        g.drawString(font, Component.translatable(skill.translationKey()).append(" ")
                .append(Component.translatable("sunlitidle.idle.level", lvl)), x + MID_X, y + 18, TEXT, false);
        int barX = x + MID_X;
        int barY = y + 30;
        g.fill(barX, barY, barX + MID_W, barY + 4, BORDER_DARK);
        if (data != null && skill.index() < data.skills().size()) {
            IdleSyncPacket.Skill s = data.skills().get(skill.index());
            int filled = s.xpForNext() <= 0 ? MID_W : (int) ((long) MID_W * s.xp() / Math.max(1, s.xpForNext()));
            g.fill(barX, barY, barX + Math.min(MID_W, filled), barY + 4, 0xFF7E57C2);
        }
        drawSlots(g, x, y, data);
        drawActions(g, x, y, skill, lvl);
        drawStorage(g, x, y, data);
        for (int row = 0; row < 3; row++) {
            for (int col = 0; col < 9; col++) {
                slot(g, x + IdleMenu.INV_X + col * 18, y + IdleMenu.INV_Y + row * 18);
            }
        }
        for (int col = 0; col < 9; col++) {
            slot(g, x + IdleMenu.INV_X + col * 18, y + IdleMenu.HOTBAR_Y);
        }
        if (data == null) {
            g.drawCenteredString(font, Component.translatable("sunlitidle.idle.loading"), x + MID_X + MID_W / 2,
                    y + LIST_Y + 40, 0xFFFFFFFF);
        } else if (data.offlineSeconds() > 0) {
            g.drawString(font, Component.translatable("sunlitidle.idle.catching_up_short",
                    dev.sunlitidle.idle.IdleService.formatDuration(data.offlineSeconds())), x + MID_X + 70, y + 6,
                    0xFF8D6E00, false);
        }
    }

    private void drawTabs(GuiGraphics g, int x, int y) {
        for (IdleSkill s : IdleCatalog.skills()) {
            int tx = x + IdleMenu.TAB_X;
            int ty = y + IdleMenu.TAB_Y + s.index() * IdleMenu.TAB_STEP;
            boolean selected = s.index() == selectedSkill;
            g.fill(tx, ty, tx + TAB, ty + TAB, selected ? 0xFFFFFFFF : BORDER_DARK);
            g.fill(tx + 1, ty + 1, tx + TAB - 1, ty + TAB - 1, selected ? 0xFFE0E0E0 : SLOT_BG);
            ItemStack icon = stackOf(s.icon());
            g.renderItem(icon, tx + 1, ty + 1);
            g.renderItemDecorations(font, icon, tx + 1, ty + 1, String.valueOf(level(s)));
            if (s.tool() != ToolKind.NONE) {
                slot(g, x + IdleMenu.TOOL_X, ty + 1);
            }
        }
    }

    private void drawSlots(GuiGraphics g, int x, int y, IdleSyncPacket data) {
        int unlocked = data == null ? 1 : data.unlockedSlots();
        for (int i = 0; i < IdleMath.maxSlots(); i++) {
            int sx = x + MID_X + i * (SLOT_W + 2);
            int sy = y + SLOT_Y;
            boolean open = i < unlocked;
            boolean selected = i == selectedSlot;
            g.fill(sx, sy, sx + SLOT_W, sy + SLOT_H, selected ? 0xFFFFFFFF : BORDER_DARK);
            g.fill(sx + 1, sy + 1, sx + SLOT_W - 1, sy + SLOT_H - 1, open ? SLOT_BG : 0xFF6B6B6B);
            if (!open) {
                g.drawCenteredString(font, String.valueOf(IdleMath.totalLevelForSlot(i)), sx + SLOT_W / 2, sy + 8, 0xFFAAAAAA);
                continue;
            }
            IdleSyncPacket.Slot slot = data == null || i >= data.slots().size() ? null : data.slots().get(i);
            IdleAction action = slot == null ? null : IdleCatalog.action(slot.action());
            if (action == null) {
                continue;
            }
            g.renderItem(stackOf(action.icon()), sx + (SLOT_W - 16) / 2, sy + 2);
            SlotStatus status = SlotStatus.byId(slot.status());
            int barY = sy + SLOT_H - 4;
            g.fill(sx + 2, barY, sx + SLOT_W - 2, barY + 2, BORDER_DARK);
            if (status == SlotStatus.RUNNING) {
                double seconds = Math.max(0.05, slot.seconds());
                double fraction = Math.min(1.0, (slot.progress() + ClientIdleData.age()) / seconds);
                g.fill(sx + 2, barY, sx + 2 + (int) ((SLOT_W - 4) * fraction), barY + 2, GREEN);
            } else {
                g.fill(sx + 2, barY, sx + SLOT_W - 2, barY + 2, RED);
            }
        }
    }

    private void drawActions(GuiGraphics g, int x, int y, IdleSkill skill, int lvl) {
        List<IdleAction> list = actions();
        int rows = rows();
        int listY = listY();
        actionScroll = Math.max(0, Math.min(actionScroll, Math.max(0, list.size() - rows)));
        int lx = x + MID_X;
        if (companion()) {
            for (int i = 0; i < PlayerIdleState.ARMOR_SLOTS; i++) {
                slot(g, lx + 1 + i * 18, y + IdleMenu.GEAR_Y);
            }
            for (int i = 0; i < PlayerIdleState.FOOD_SLOTS; i++) {
                slot(g, x + IdleMenu.FOOD_X + i * 18, y + IdleMenu.GEAR_Y);
            }
        }
        g.fill(lx - 1, y + listY - 1, lx + MID_W + 1, y + listY + rows * ROW_H + 1, PANEL);
        for (int r = 0; r < rows && actionScroll + r < list.size(); r++) {
            IdleAction a = list.get(actionScroll + r);
            int ry = y + listY + r * ROW_H;
            boolean unlocked = lvl >= a.level();
            g.fill(lx, ry, lx + MID_W, ry + ROW_H - 1, unlocked ? 0xFFD6D6D6 : 0xFF9E9E9E);
            g.renderItem(stackOf(a.icon()), lx + 1, ry);
            String name = font.plainSubstrByWidth(actionName(a).getString(), MID_W - 72);
            g.drawString(font, name, lx + 20, ry + 5, unlocked ? TEXT : 0xFF5A5A5A, false);
            String info = unlocked
                    ? String.format(Locale.ROOT, "%.1fs %dxp", a.seconds(), a.xp())
                    : I18n.get("sunlitidle.idle.level", a.level());
            g.drawString(font, info, lx + MID_W - 2 - font.width(info), ry + 5, unlocked ? 0xFF2E7D32 : RED, false);
        }
        if (list.isEmpty()) {
            g.drawCenteredString(font, Component.translatable("sunlitidle.idle.no_actions"), lx + MID_W / 2,
                    y + listY + 20, 0xFFFFFFFF);
        }
        if (list.size() > rows) {
            int trackH = rows * ROW_H;
            int thumbH = Math.max(8, trackH * rows / list.size());
            int thumbY = (trackH - thumbH) * actionScroll / Math.max(1, list.size() - rows);
            g.fill(lx + MID_W + 1, y + listY + thumbY, lx + MID_W + 3, y + listY + thumbY + thumbH, BORDER_DARK);
        }
    }

    private void drawStorage(GuiGraphics g, int x, int y, IdleSyncPacket data) {
        g.drawString(font, Component.translatable("sunlitidle.idle.storage"), x + STORE_X, y + 18, TEXT, false);
        g.fill(x + STORE_X - 2, y + STORE_Y - 2, x + STORE_X + STORE_COLS * 18, y + STORE_Y + STORE_ROWS * 18, PANEL);
        List<IdleSyncPacket.Entry> entries = data == null ? List.of() : data.storage();
        int maxScroll = Math.max(0, (entries.size() + STORE_COLS - 1) / STORE_COLS - STORE_ROWS);
        storageScroll = Math.max(0, Math.min(storageScroll, maxScroll));
        for (int r = 0; r < STORE_ROWS; r++) {
            for (int c = 0; c < STORE_COLS; c++) {
                int sx = x + STORE_X + c * 18;
                int sy = y + STORE_Y + r * 18;
                slot(g, sx, sy);
                int index = (storageScroll + r) * STORE_COLS + c;
                if (index < entries.size()) {
                    IdleSyncPacket.Entry e = entries.get(index);
                    g.renderItem(e.item(), sx, sy);
                    g.renderItemDecorations(font, e.item(), sx, sy, shortCount(e.count()));
                }
            }
        }
    }

    // ---------------------------------------------------------------- tooltips

    private void renderOwnTooltips(GuiGraphics g, int mouseX, int mouseY) {
        IdleSyncPacket data = ClientIdleData.get();
        int mx = mouseX - leftPos;
        int my = mouseY - topPos;
        for (IdleSkill s : IdleCatalog.skills()) {
            int ty = IdleMenu.TAB_Y + s.index() * IdleMenu.TAB_STEP;
            if (in(mx, my, IdleMenu.TAB_X, ty, TAB, TAB)) {
                List<Component> lines = new ArrayList<>();
                lines.add(Component.translatable(s.translationKey()).withStyle(ChatFormatting.YELLOW));
                if (data != null && s.index() < data.skills().size()) {
                    IdleSyncPacket.Skill p = data.skills().get(s.index());
                    lines.add(Component.translatable("sunlitidle.idle.level", p.level()));
                    if (p.xpForNext() > 0) {
                        lines.add(Component.translatable("sunlitidle.idle.xp", p.xp(), p.xpForNext()).withStyle(ChatFormatting.GRAY));
                    }
                }
                if (s.tool() != ToolKind.NONE) {
                    lines.add(Component.translatable(s.toolRequired() ? "sunlitidle.idle.tool_required" : "sunlitidle.idle.tool_optional",
                            Component.translatable(s.tool().translationKey())).withStyle(ChatFormatting.GRAY));
                }
                g.renderComponentTooltip(font, lines, mouseX, mouseY);
                return;
            }
        }
        if (in(mx, my, MID_X, 30, MID_W, 5) && data != null && skill() != null && skill().index() < data.skills().size()) {
            IdleSyncPacket.Skill p = data.skills().get(skill().index());
            g.renderTooltip(font, Component.translatable("sunlitidle.idle.xp", p.xp(), p.xpForNext()), mouseX, mouseY);
            return;
        }
        for (int i = 0; i < IdleMath.maxSlots(); i++) {
            if (in(mx, my, MID_X + i * (SLOT_W + 2), SLOT_Y, SLOT_W, SLOT_H)) {
                g.renderComponentTooltip(font, slotTooltip(data, i), mouseX, mouseY);
                return;
            }
        }
        List<IdleAction> list = actions();
        for (int r = 0; r < rows() && actionScroll + r < list.size(); r++) {
            if (in(mx, my, MID_X, listY() + r * ROW_H, MID_W, ROW_H)) {
                g.renderComponentTooltip(font, actionTooltip(list.get(actionScroll + r)), mouseX, mouseY);
                return;
            }
        }
        if (companion() && in(mx, my, MID_X, IdleMenu.GEAR_Y, MID_W, 18) && hoveredSlot == null) {
            g.renderComponentTooltip(font, List.of(Component.translatable("sunlitidle.idle.companion_hint")), mouseX, mouseY);
            return;
        }
        int index = storageIndexAt(mx, my);
        if (data != null && index >= 0 && index < data.storage().size()) {
            IdleSyncPacket.Entry e = data.storage().get(index);
            List<Component> lines = new ArrayList<>(getTooltipFromItem(minecraft, e.item()));
            lines.add(Component.translatable("sunlitidle.idle.stored", String.format(Locale.ROOT, "%,d", e.count()))
                    .withStyle(ChatFormatting.GOLD));
            lines.add(Component.translatable("sunlitidle.idle.withdraw_hint").withStyle(ChatFormatting.DARK_GRAY));
            lines.add(Component.translatable("sunlitidle.idle.sell_hint").withStyle(ChatFormatting.DARK_GRAY));
            g.renderComponentTooltip(font, lines, mouseX, mouseY);
        }
    }

    private List<Component> slotTooltip(IdleSyncPacket data, int i) {
        List<Component> lines = new ArrayList<>();
        int unlocked = data == null ? 1 : data.unlockedSlots();
        if (i >= unlocked) {
            lines.add(Component.translatable("sunlitidle.idle.slot_locked", IdleMath.totalLevelForSlot(i),
                    data == null ? 0 : data.totalLevel()));
            return lines;
        }
        IdleSyncPacket.Slot slot = data == null || i >= data.slots().size() ? null : data.slots().get(i);
        IdleAction action = slot == null ? null : IdleCatalog.action(slot.action());
        if (action == null) {
            lines.add(Component.translatable("sunlitidle.idle.slot_empty", i + 1));
            lines.add(Component.translatable("sunlitidle.idle.slot_hint").withStyle(ChatFormatting.DARK_GRAY));
            return lines;
        }
        lines.add(actionName(action).copy().withStyle(ChatFormatting.YELLOW));
        SlotStatus status = SlotStatus.byId(slot.status());
        lines.add(Component.translatable(status.translationKey())
                .withStyle(status == SlotStatus.RUNNING ? ChatFormatting.GREEN : ChatFormatting.RED));
        if (status == SlotStatus.RUNNING) {
            lines.add(Component.translatable("sunlitidle.idle.seconds", String.format(Locale.ROOT, "%.1f", slot.seconds()))
                    .withStyle(ChatFormatting.GRAY));
        }
        lines.add(Component.translatable("sunlitidle.idle.slot_stop_hint").withStyle(ChatFormatting.DARK_GRAY));
        return lines;
    }

    private List<Component> actionTooltip(IdleAction a) {
        List<Component> lines = new ArrayList<>();
        lines.add(actionName(a).copy().withStyle(ChatFormatting.YELLOW));
        lines.add(Component.translatable("sunlitidle.idle.needs_level", a.level())
                .withStyle(level(skill()) >= a.level() ? ChatFormatting.GREEN : ChatFormatting.RED));
        if (a.toolTier() > 0) {
            lines.add(Component.translatable("sunlitidle.idle.needs_tier",
                    Component.translatable("sunlitidle.tier_name." + a.toolTier())).withStyle(ChatFormatting.GRAY));
        }
        if (a.isCombat()) {
            combatLines(a, lines);
            lines.add(Component.translatable("sunlitidle.idle.assign_hint", selectedSlot + 1).withStyle(ChatFormatting.DARK_GRAY));
            return lines;
        }
        lines.add(Component.translatable("sunlitidle.idle.base", String.format(Locale.ROOT, "%.1f", a.seconds()), a.xp())
                .withStyle(ChatFormatting.GRAY));
        if (a.isRecipe()) {
            ItemStack[] inputs = a.recipe().input().getItems();
            if (inputs.length > 0) {
                lines.add(Component.translatable("sunlitidle.idle.input", 1, inputs[0].getHoverName()).withStyle(ChatFormatting.AQUA));
            }
            lines.add(Component.translatable("sunlitidle.idle.drops", a.recipe().output().getHoverName().getString())
                    .withStyle(ChatFormatting.GRAY));
            lines.add(Component.translatable("sunlitidle.idle.assign_hint", selectedSlot + 1).withStyle(ChatFormatting.DARK_GRAY));
            return lines;
        }
        for (IdleInput input : a.inputs()) {
            lines.add(Component.translatable("sunlitidle.idle.input", input.count(), stackOf(input.item()).getHoverName())
                    .withStyle(ChatFormatting.AQUA));
        }
        Set<String> names = new LinkedHashSet<>();
        for (IdleDrop drop : a.drops()) {
            if (!IdleCatalog.dropExists(drop)) {
                continue;
            }
            switch (drop.kind()) {
                case BLOCK -> {
                    BuiltInRegistries.BLOCK.getOptional(drop.id())
                            .ifPresent(block -> names.add(block.getName().getString()));
                }
                case ITEM -> names.add(stackOf(drop.id()).getHoverName().getString());
                case LOOT_TABLE -> names.add(I18n.get(drop.chest() ? "sunlitidle.idle.chest_loot" : "sunlitidle.idle.fishing_loot"));
                case ENTITY -> {
                    BuiltInRegistries.ENTITY_TYPE.getOptional(drop.id()).ifPresent(type ->
                            names.add(I18n.get("sunlitidle.idle.mob_loot", type.getDescription().getString())));
                }
            }
        }
        lines.add(Component.translatable("sunlitidle.idle.drops", String.join(", ", names)).withStyle(ChatFormatting.GRAY));
        lines.add(Component.translatable("sunlitidle.idle.assign_hint", selectedSlot + 1).withStyle(ChatFormatting.DARK_GRAY));
        return lines;
    }

    private void combatLines(IdleAction a, List<Component> lines) {
        IdleSkill skill = skill();
        int lvl = level(skill);
        ItemStack weapon = menu.getSlot(skill.index()).getItem();
        IItemHandler armor = new ItemStackHandler(PlayerIdleState.ARMOR_SLOTS);
        for (int i = 0; i < PlayerIdleState.ARMOR_SLOTS; i++) {
            ((ItemStackHandler) armor).setStackInSlot(i, menu.getSlot(IdleCatalog.skills().size() + i).getItem());
        }
        Combat.Enemy enemy = IdleCombat.enemy(a);
        if (!dev.sunlitidle.combat.Gear.isWeapon(weapon)) {
            lines.add(Component.translatable("sunlitidle.slot_status.no_tool").withStyle(ChatFormatting.RED));
            return;
        }
        Combat.Loadout loadout = IdleCombat.loadout(weapon, armor, lvl);
        double power = Combat.power(loadout, enemy);
        double damage = Combat.expectedHitsTaken(loadout, enemy) * Combat.damagePerEnemyHit(loadout, enemy);
        boolean wins = damage < loadout.maxHealth();
        lines.add(Component.translatable("sunlitidle.idle.power", Math.round(power), Math.round(enemy.power()))
                .withStyle(power >= enemy.power() ? ChatFormatting.GREEN : ChatFormatting.GOLD));
        lines.add(Component.translatable("sunlitidle.idle.kill_time",
                String.format(Locale.ROOT, "%.1f", Combat.killSeconds(loadout, enemy)), IdleCombat.xpPerKill(enemy))
                .withStyle(ChatFormatting.GRAY));
        lines.add(Component.translatable("sunlitidle.idle.food_per_kill", String.format(Locale.ROOT, "%.1f",
                Combat.foodCost(loadout, enemy, Math.min(damage, loadout.maxHealth())))).withStyle(ChatFormatting.GRAY));
        lines.add(Component.translatable(wins ? "sunlitidle.idle.wins" : "sunlitidle.idle.loses")
                .withStyle(wins ? ChatFormatting.GREEN : ChatFormatting.RED));
    }

    // ---------------------------------------------------------------- input

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        int mx = (int) mouseX - leftPos;
        int my = (int) mouseY - topPos;
        IdleSyncPacket data = ClientIdleData.get();
        for (IdleSkill s : IdleCatalog.skills()) {
            if (in(mx, my, IdleMenu.TAB_X, IdleMenu.TAB_Y + s.index() * IdleMenu.TAB_STEP, TAB, TAB)) {
                selectedSkill = s.index();
                actionScroll = 0;
                return true;
            }
        }
        int unlocked = data == null ? 1 : data.unlockedSlots();
        for (int i = 0; i < IdleMath.maxSlots(); i++) {
            if (in(mx, my, MID_X + i * (SLOT_W + 2), SLOT_Y, SLOT_W, SLOT_H)) {
                if (i < unlocked) {
                    if (button == 1) {
                        IdleNetwork.sendToServer(IdleActionPacket.assign(i, null));
                    } else {
                        selectedSlot = i;
                        // Jump to the skill of the action in this slot.
                        IdleSyncPacket.Slot slot = data == null || i >= data.slots().size() ? null : data.slots().get(i);
                        IdleAction action = slot == null ? null : IdleCatalog.action(slot.action());
                        IdleSkill owner = action == null ? null : IdleCatalog.skill(action.skillId());
                        if (owner != null && owner.index() != selectedSkill) {
                            selectedSkill = owner.index();
                            actionScroll = 0;
                        }
                    }
                }
                return true;
            }
        }
        List<IdleAction> list = actions();
        for (int r = 0; r < rows() && actionScroll + r < list.size(); r++) {
            if (in(mx, my, MID_X, listY() + r * ROW_H, MID_W, ROW_H)) {
                IdleAction a = list.get(actionScroll + r);
                if (level(skill()) >= a.level()) {
                    IdleNetwork.sendToServer(IdleActionPacket.assign(selectedSlot, a.key()));
                }
                return true;
            }
        }
        int index = storageIndexAt(mx, my);
        if (index >= 0) {
            if (data != null && index < data.storage().size()) {
                IdleNetwork.sendToServer(hasControlDown() ? IdleActionPacket.sell(index)
                        : IdleActionPacket.withdraw(index, hasShiftDown()));
            }
            return true;
        }
        return super.mouseClicked(mouseX, mouseY, button);
    }

    @Override
    public boolean mouseScrolled(double mouseX, double mouseY, double scrollX, double delta) {
        int mx = (int) mouseX - leftPos;
        int my = (int) mouseY - topPos;
        int step = delta > 0 ? -1 : 1;
        if (in(mx, my, MID_X, listY(), MID_W + 4, rows() * ROW_H)) {
            actionScroll += step;
            return true;
        }
        if (in(mx, my, STORE_X, STORE_Y, STORE_COLS * 18, STORE_ROWS * 18)) {
            storageScroll += step;
            return true;
        }
        return super.mouseScrolled(mouseX, mouseY, scrollX, delta);
    }

    private int storageIndexAt(int mx, int my) {
        if (!in(mx, my, STORE_X, STORE_Y, STORE_COLS * 18, STORE_ROWS * 18)) {
            return -1;
        }
        int c = (mx - STORE_X) / 18;
        int r = (my - STORE_Y) / 18;
        return (storageScroll + r) * STORE_COLS + c;
    }

    // ---------------------------------------------------------------- helpers

    private static Component actionName(IdleAction a) {
        if (I18n.exists(a.translationKey())) {
            return Component.translatable(a.translationKey());
        }
        return stackOf(a.icon()).getHoverName();
    }

    private static ItemStack stackOf(ResourceLocation id) {
        return BuiltInRegistries.ITEM.getOptional(id).map(ItemStack::new).orElse(ItemStack.EMPTY);
    }

    static String shortCount(long count) {
        if (count < 1000) {
            return String.valueOf(count);
        }
        if (count < 1_000_000) {
            return String.format(Locale.ROOT, count < 10_000 ? "%.1fk" : "%.0fk", count / 1000.0);
        }
        return String.format(Locale.ROOT, "%.1fM", count / 1_000_000.0);
    }

    private static boolean in(int mx, int my, int x, int y, int w, int h) {
        return mx >= x && mx < x + w && my >= y && my < y + h;
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
