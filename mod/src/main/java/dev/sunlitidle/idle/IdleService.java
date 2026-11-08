package dev.sunlitidle.idle;

import dev.sunlitidle.Config;
import dev.sunlitidle.SunlitIdle;
import dev.sunlitidle.network.IdleActionPacket;
import dev.sunlitidle.network.IdleNetwork;
import dev.sunlitidle.network.IdleSyncPacket;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.SimpleMenuProvider;
import net.minecraft.world.item.ItemStack;
import net.minecraft.core.registries.BuiltInRegistries;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.neoforged.neoforge.event.tick.ServerTickEvent;
import net.neoforged.neoforge.items.ItemStackHandler;

import java.util.ArrayList;
import java.util.List;

/** Server side of the idle system: ticking, offline catch-up, and the window's requests. */
public final class IdleService {
    private static final int TICKS_PER_STEP = 20;
    private static int tickCounter;

    private IdleService() {
    }

    public static void init() {
        NeoForge.EVENT_BUS.addListener(IdleService::onServerTick);
        NeoForge.EVENT_BUS.addListener(IdleService::onLogin);
        NeoForge.EVENT_BUS.addListener(IdleService::onLogout);
        NeoForge.EVENT_BUS.addListener(IdleService::onSmelted);
    }

    public static PlayerIdleState state(ServerPlayer player) {
        return IdleSavedData.get(player.server).state(player.getUUID());
    }

    // ---------------------------------------------------------------- events

    private static void onServerTick(ServerTickEvent.Post event) {
        if (++tickCounter < TICKS_PER_STEP) {
            return;
        }
        tickCounter = 0;
        MinecraftServer server = event.getServer();
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

    /** Taking items out of a furnace by hand levels Smelting, or Cooking for food. */
    private static void onSmelted(PlayerEvent.ItemSmeltedEvent event) {
        if (!(event.getEntity() instanceof ServerPlayer player) || event.getSmelting().isEmpty()) {
            return;
        }
        ItemStack result = event.getSmelting();
        IdleSkill skill = IdleCatalog.skill(dev.sunlitidle.combat.Gear.isFood(result) ? "cooking" : "smelting");
        if (skill != null) {
            SkillLevels.addXp(player, state(player), skill, Math.max(1, result.getCount() * 2));
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
        switch (packet.op()) {
            case OPEN -> open(player);
            case ASSIGN -> assign(player, state, packet.index(), packet.text());
            case WITHDRAW -> withdraw(player, state, packet.index(), packet.flag());
            case SELL -> sell(player, state, packet.index());
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
        player.openMenu(new SimpleMenuProvider(
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
            player.getInventory().placeItemBackInInventory(taken);
            if (index >= state.storage().size() || !state.storage().get(index).matches(proto)) {
                return;
            }
        }
    }

    /**
     * Sells one storage entry, or with index -1 everything except the inputs of running actions and the
     * companion's food. Pricing is done by the pack (see {@link IdleSellEvent}); the coins go into storage.
     */
    private static void sell(ServerPlayer player, PlayerIdleState state, int index) {
        List<StoredStack> chosen = new ArrayList<>();
        if (index >= 0) {
            if (index < state.storage().size()) {
                chosen.add(state.storage().get(index));
            }
        } else {
            java.util.Set<net.minecraft.world.item.Item> keep = keptItems(state);
            for (StoredStack stored : state.storage()) {
                if (!keep.contains(stored.prototype().getItem())) {
                    chosen.add(stored);
                }
            }
        }
        if (chosen.isEmpty()) {
            return;
        }
        // One handler slot per entry, capped at an int; the rest stays for the next sale.
        ItemStackHandler items = new ItemStackHandler(chosen.size()) {
            @Override
            public int getSlotLimit(int slot) {
                return Integer.MAX_VALUE;
            }

            @Override
            protected int getStackLimit(int slot, ItemStack stack) {
                return Integer.MAX_VALUE;
            }
        };
        for (int i = 0; i < chosen.size(); i++) {
            StoredStack stored = chosen.get(i);
            items.setStackInSlot(i, stored.prototype().copyWithCount((int) Math.min(Integer.MAX_VALUE, stored.count())));
        }
        IdleSellEvent event = new IdleSellEvent(player, items);
        NeoForge.EVENT_BUS.post(event);
        long soldItems = 0;
        for (int i = 0; i < chosen.size(); i++) {
            if (items.getStackInSlot(i).isEmpty()) {
                StoredStack stored = chosen.get(i);
                long amount = Math.min(Integer.MAX_VALUE, stored.count());
                soldItems += amount;
                removeExact(state, stored, amount);
            }
        }
        if (soldItems == 0) {
            player.displayClientMessage(Component.translatable("sunlitidle.idle.nothing_sold"), true);
            return;
        }
        for (ItemStack coin : event.payout()) {
            state.store(coin);
        }
        player.displayClientMessage(Component.translatable("sunlitidle.idle.sold", soldItems, event.getValue()), true);
    }

    private static void removeExact(PlayerIdleState state, StoredStack stored, long amount) {
        stored.add(-amount);
        if (stored.count() <= 0) {
            state.storage().remove(stored);
        }
        state.markDirty();
    }

    /** Items that "sell all" keeps: inputs of actions in slots and the companion's food. */
    private static java.util.Set<net.minecraft.world.item.Item> keptItems(PlayerIdleState state) {
        java.util.Set<net.minecraft.world.item.Item> keep = new java.util.HashSet<>();
        for (int i = 0; i < IdleMath.maxSlots(); i++) {
            IdleAction action = IdleCatalog.action(state.slotAction(i));
            if (action == null) {
                continue;
            }
            for (IdleInput input : action.inputs()) {
                BuiltInRegistries.ITEM.getOptional(input.item()).ifPresent(keep::add);
            }
            if (action.isRecipe()) {
                for (ItemStack s : action.recipe().input().getItems()) {
                    keep.add(s.getItem());
                }
            }
        }
        for (int i = 0; i < state.food().getSlots(); i++) {
            keep.add(state.food().getStackInSlot(i).getItem());
        }
        return keep;
    }

    private static int spaceFor(ServerPlayer player, ItemStack proto) {
        int space = 0;
        var inventory = player.getInventory();
        for (int i = 0; i < inventory.items.size(); i++) {
            ItemStack s = inventory.items.get(i);
            if (s.isEmpty()) {
                space += proto.getMaxStackSize();
            } else if (ItemStack.isSameItemSameComponents(s, proto)) {
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
