package dev.sunlitidle.idle;

import dev.sunlitidle.Config;
import dev.sunlitidle.SunlitIdle;
import dev.sunlitidle.network.IdleActionPacket;
import dev.sunlitidle.network.IdleNetwork;
import dev.sunlitidle.network.IdleSyncPacket;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.SimpleMenuProvider;
import net.minecraft.world.item.ItemStack;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.event.TickEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.items.ItemHandlerHelper;
import net.minecraftforge.network.NetworkHooks;

import java.util.ArrayList;
import java.util.List;

/** Server side of the idle system: ticking, offline catch-up, and the window's requests. */
public final class IdleService {
    private static final int TICKS_PER_STEP = 20;
    private static int tickCounter;

    private IdleService() {
    }

    public static void init() {
        MinecraftForge.EVENT_BUS.addListener(IdleService::onServerTick);
        MinecraftForge.EVENT_BUS.addListener(IdleService::onLogin);
        MinecraftForge.EVENT_BUS.addListener(IdleService::onLogout);
    }

    public static PlayerIdleState state(ServerPlayer player) {
        return IdleSavedData.get(player.server).state(player.getUUID());
    }

    // ---------------------------------------------------------------- events

    private static void onServerTick(TickEvent.ServerTickEvent event) {
        if (event.phase != TickEvent.Phase.END || ++tickCounter < TICKS_PER_STEP) {
            return;
        }
        tickCounter = 0;
        MinecraftServer server = net.minecraftforge.server.ServerLifecycleHooks.getCurrentServer();
        if (server == null) {
            return;
        }
        for (ServerPlayer player : server.getPlayerList().getPlayers()) {
            try {
                step(player, state(player), 1.0);
            } catch (RuntimeException e) {
                SunlitIdle.LOGGER.error("Idle step failed for {}", player.getGameProfile().getName(), e);
            }
        }
    }

    /** One second of play, plus a share of banked offline time. */
    public static void step(ServerPlayer player, PlayerIdleState state, double seconds) {
        double offline = state.drainOffline(Config.CATCH_UP_SECONDS_PER_TICK.get());
        long items = IdleEngine.advance(player, state, seconds + offline);
        state.setLastSeen(System.currentTimeMillis());
        if (offline > 0) {
            state.addCaughtUp(offline, items);
            if (state.offlineSeconds() <= 0) {
                player.sendSystemMessage(Component.translatable("sunlitidle.idle.caught_up",
                        formatDuration((long) state.caughtUpSeconds()), state.caughtUpItems()).withStyle(ChatFormatting.GOLD));
                state.resetCaughtUp();
            }
        }
        if (player.containerMenu instanceof IdleMenu) {
            sync(player, state);
        }
    }

    private static void onLogin(PlayerEvent.PlayerLoggedInEvent event) {
        if (!(event.getEntity() instanceof ServerPlayer player)) {
            return;
        }
        PlayerIdleState state = state(player);
        long now = System.currentTimeMillis();
        if (state.lastSeen() > 0 && now > state.lastSeen()) {
            double capSeconds = Config.MAX_OFFLINE_HOURS.get() * 3600.0;
            double away = Math.min(capSeconds, (now - state.lastSeen()) / 1000.0);
            if (away >= 60.0 && hasRunningSlot(state)) {
                state.addOfflineSeconds(away);
                player.sendSystemMessage(Component.translatable("sunlitidle.idle.catching_up",
                        formatDuration((long) away)).withStyle(ChatFormatting.GOLD));
            }
        }
        state.setLastSeen(now);
    }

    private static void onLogout(PlayerEvent.PlayerLoggedOutEvent event) {
        if (event.getEntity() instanceof ServerPlayer player) {
            state(player).setLastSeen(System.currentTimeMillis());
            state(player).markDirty();
        }
    }

    private static boolean hasRunningSlot(PlayerIdleState state) {
        for (int i = 0; i < IdleMath.maxSlots(); i++) {
            if (state.slotAction(i) != null) {
                return true;
            }
        }
        return false;
    }

    // ---------------------------------------------------------------- requests

    public static void handle(ServerPlayer player, IdleActionPacket packet) {
        PlayerIdleState state = state(player);
        switch (packet.type()) {
            case OPEN -> open(player);
            case ASSIGN -> assign(player, state, packet.index(), packet.text());
            case WITHDRAW -> withdraw(player, state, packet.index(), packet.flag());
            case OPEN_TREE -> {
                IdleSkill skill = IdleCatalog.skill(packet.index());
                if (skill != null && !SkillLevels.openTree(player, skill)) {
                    player.displayClientMessage(Component.translatable("sunlitidle.idle.no_tree"), true);
                }
            }
        }
        if (player.containerMenu instanceof IdleMenu) {
            sync(player, state);
        }
    }

    public static void open(ServerPlayer player) {
        PlayerIdleState state = state(player);
        NetworkHooks.openScreen(player, new SimpleMenuProvider(
                (id, inventory, p) -> new IdleMenu(id, inventory, state), Component.translatable("sunlitidle.idle.title")));
        sync(player, state);
    }

    private static void assign(ServerPlayer player, PlayerIdleState state, int slot, String key) {
        if (slot < 0 || slot >= IdleMath.maxSlots()) {
            return;
        }
        if (key == null || key.isEmpty()) {
            state.setSlotAction(slot, null);
            return;
        }
        IdleAction action = IdleCatalog.action(key);
        if (action == null || !IdleCatalog.isAvailable(action)) {
            return;
        }
        IdleSkill skill = IdleCatalog.skill(action.skillId());
        if (skill == null || SkillLevels.level(player, state, skill) < action.level()) {
            player.displayClientMessage(Component.translatable("sunlitidle.idle.needs_level", action.level()), true);
            return;
        }
        if (slot >= IdleMath.slotsForTotalLevel(SkillLevels.totalLevel(player, state))) {
            return;
        }
        // The same action in two slots would only split the same tool; move it instead.
        for (int i = 0; i < IdleMath.maxSlots(); i++) {
            if (i != slot && key.equals(state.slotAction(i))) {
                state.setSlotAction(i, null);
            }
        }
        state.setSlotAction(slot, key);
    }

    private static void withdraw(ServerPlayer player, PlayerIdleState state, int index, boolean all) {
        int stacks = all ? 36 : 1;
        for (int i = 0; i < stacks; i++) {
            if (index < 0 || index >= state.storage().size()) {
                return;
            }
            ItemStack proto = state.storage().get(index).prototype();
            int space = spaceFor(player, proto);
            if (space <= 0) {
                return;
            }
            ItemStack taken = state.withdraw(index, space);
            if (taken.isEmpty()) {
                return;
            }
            ItemHandlerHelper.giveItemToPlayer(player, taken);
            if (index >= state.storage().size() || !state.storage().get(index).matches(proto)) {
                return;
            }
        }
    }

    private static int spaceFor(ServerPlayer player, ItemStack proto) {
        int space = 0;
        var inventory = player.getInventory();
        for (int i = 0; i < inventory.items.size(); i++) {
            ItemStack s = inventory.items.get(i);
            if (s.isEmpty()) {
                space += proto.getMaxStackSize();
            } else if (ItemStack.isSameItemSameTags(s, proto)) {
                space += s.getMaxStackSize() - s.getCount();
            }
        }
        return Math.min(space, proto.getMaxStackSize());
    }

    // ---------------------------------------------------------------- sync

    public static void sync(ServerPlayer player, PlayerIdleState state) {
        int total = SkillLevels.totalLevel(player, state);
        List<IdleSyncPacket.Slot> slots = new ArrayList<>();
        for (int i = 0; i < IdleMath.maxSlots(); i++) {
            slots.add(new IdleSyncPacket.Slot(state.slotAction(i), state.slotStatus(i).ordinal(),
                    (float) state.slotProgress(i), (float) state.slotSeconds(i)));
        }
        List<IdleSyncPacket.Skill> skills = new ArrayList<>();
        for (IdleSkill skill : IdleCatalog.skills()) {
            SkillLevels.Progress p = SkillLevels.progress(player, state, skill);
            skills.add(new IdleSyncPacket.Skill(p.level(), p.xp(), p.xpForNext()));
        }
        List<IdleSyncPacket.Entry> storage = new ArrayList<>();
        for (StoredStack stored : state.storage()) {
            storage.add(new IdleSyncPacket.Entry(stored.prototype(), stored.count()));
        }
        IdleNetwork.sendTo(player, new IdleSyncPacket(IdleMath.slotsForTotalLevel(total), total, slots, skills, storage,
                (int) Math.min(Integer.MAX_VALUE, state.offlineSeconds())));
    }

    public static String formatDuration(long seconds) {
        long h = seconds / 3600;
        long m = (seconds % 3600) / 60;
        if (h > 0) {
            return h + "h " + m + "m";
        }
        return m > 0 ? m + "m" : seconds + "s";
    }
}
