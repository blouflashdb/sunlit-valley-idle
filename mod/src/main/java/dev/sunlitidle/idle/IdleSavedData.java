package dev.sunlitidle.idle;

import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.level.saveddata.SavedData;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** Idle state of every player, saved with the overworld. */
public final class IdleSavedData extends SavedData {
    private static final String NAME = "sunlitidle_idle";
    private final Map<UUID, PlayerIdleState> players = new HashMap<>();

    public static IdleSavedData get(MinecraftServer server) {
        return server.overworld().getDataStorage().computeIfAbsent(IdleSavedData::load, IdleSavedData::new, NAME);
    }

    public PlayerIdleState state(UUID player) {
        return players.computeIfAbsent(player, id -> attach(new PlayerIdleState()));
    }

    private PlayerIdleState attach(PlayerIdleState state) {
        state.setOnChange(this::setDirty);
        return state;
    }

    private static IdleSavedData load(CompoundTag tag) {
        IdleSavedData data = new IdleSavedData();
        CompoundTag players = tag.getCompound("Players");
        for (String key : players.getAllKeys()) {
            try {
                data.players.put(UUID.fromString(key), data.attach(PlayerIdleState.load(players.getCompound(key))));
            } catch (IllegalArgumentException ignored) {
                // Skip entries with a broken key.
            }
        }
        return data;
    }

    @Override
    public CompoundTag save(CompoundTag tag) {
        CompoundTag players = new CompoundTag();
        this.players.forEach((id, state) -> players.put(id.toString(), state.save()));
        tag.put("Players", players);
        return tag;
    }
}
