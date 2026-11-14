package dev.sunlitidle.compat.jade;

import dev.sunlitidle.SunlitIdle;
import dev.sunlitidle.compat.BlockInfoEvent;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.ComponentSerialization;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import snownee.jade.api.BlockAccessor;
import snownee.jade.api.IBlockComponentProvider;
import snownee.jade.api.ITooltip;
import snownee.jade.api.StreamServerDataProvider;
import snownee.jade.api.config.IPluginConfig;

import java.util.List;

/** Sends the lines the {@link BlockInfoEvent} listeners add for a block entity and shows them under its name. */
enum BlockInfoProvider implements IBlockComponentProvider, StreamServerDataProvider<BlockAccessor, List<Component>> {
    INSTANCE;

    private static final ResourceLocation UID = SunlitIdle.id("block_info");
    private static final StreamCodec<RegistryFriendlyByteBuf, List<Component>> CODEC =
            ComponentSerialization.STREAM_CODEC.apply(ByteBufCodecs.list());

    @Override
    public void appendTooltip(ITooltip tooltip, BlockAccessor accessor, IPluginConfig config) {
        decodeFromData(accessor).ifPresent(lines -> lines.forEach(tooltip::add));
    }

    @Override
    public List<Component> streamData(BlockAccessor accessor) {
        if (!(accessor.getLevel() instanceof ServerLevel level) || accessor.getBlockEntity() == null) {
            return null;
        }
        List<Component> lines = BlockInfoEvent.collect(level, accessor.getPosition(), accessor.getBlockState(),
                accessor.getBlockEntity());
        return lines.isEmpty() ? null : List.copyOf(lines);
    }

    @Override
    public StreamCodec<RegistryFriendlyByteBuf, List<Component>> streamCodec() {
        return CODEC;
    }

    @Override
    public ResourceLocation getUid() {
        return UID;
    }
}
