package dev.sunlitidle.compat;

import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.neoforged.bus.api.Event;

import java.util.ArrayList;
import java.util.List;

/**
 * Posted on the NeoForge event bus on the server when a player looks at a block entity with Jade installed.
 * The pack's KubeJS script ({@code kubejs/startup_scripts/jadeInfo.js}) adds the lines Jade shows under the block
 * name, such as an artisan machine's product and progress or a fish pond's population.
 */
public class BlockInfoEvent extends Event {
    private final ServerLevel level;
    private final BlockPos pos;
    private final BlockState state;
    private final BlockEntity blockEntity;
    private final List<Component> lines = new ArrayList<>();

    public BlockInfoEvent(ServerLevel level, BlockPos pos, BlockState state, BlockEntity blockEntity) {
        this.level = level;
        this.pos = pos;
        this.state = state;
        this.blockEntity = blockEntity;
    }

    public ServerLevel getLevel() {
        return level;
    }

    public BlockPos getPos() {
        return pos;
    }

    public BlockState getState() {
        return state;
    }

    public BlockEntity getBlockEntity() {
        return blockEntity;
    }

    public List<Component> getLines() {
        return lines;
    }

    public void add(Component line) {
        if (line != null) {
            lines.add(line);
        }
    }

    /** Posts the event and returns the lines the listeners added. */
    public static List<Component> collect(ServerLevel level, BlockPos pos, BlockState state, BlockEntity blockEntity) {
        BlockInfoEvent event = new BlockInfoEvent(level, pos, state, blockEntity);
        net.neoforged.neoforge.common.NeoForge.EVENT_BUS.post(event);
        return event.getLines();
    }
}
