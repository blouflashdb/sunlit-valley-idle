package dev.sunlitidle.compat.jade;

import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.entity.BlockEntity;
import snownee.jade.api.IWailaClientRegistration;
import snownee.jade.api.IWailaCommonRegistration;
import snownee.jade.api.IWailaPlugin;
import snownee.jade.api.WailaPlugin;

/**
 * Jade integration, loaded by Jade only when it is installed. Replaces the 1.20.1 KubeJS Jade scripts: Jade for
 * 1.21.1 has no KubeJS events, so block entity lines come from {@link dev.sunlitidle.compat.BlockInfoEvent} and the
 * crop growth line is computed here.
 */
@WailaPlugin
public final class SunlitJadePlugin implements IWailaPlugin {
    @Override
    public void register(IWailaCommonRegistration registration) {
        registration.registerBlockDataProvider(BlockInfoProvider.INSTANCE, BlockEntity.class);
    }

    @Override
    public void registerClient(IWailaClientRegistration registration) {
        registration.registerBlockComponent(BlockInfoProvider.INSTANCE, Block.class);
        registration.registerBlockComponent(CropGrowthProvider.INSTANCE, Block.class);
    }
}
