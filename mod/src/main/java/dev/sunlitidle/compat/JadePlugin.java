package dev.sunlitidle.compat;

import dev.sunlitidle.camp.AdventurerCampBlock;
import dev.sunlitidle.camp.AdventurerCampBlockEntity;
import snownee.jade.api.IWailaClientRegistration;
import snownee.jade.api.IWailaCommonRegistration;
import snownee.jade.api.IWailaPlugin;
import snownee.jade.api.WailaPlugin;

/** Jade integration; Jade finds this class through the annotation, so it only loads when Jade is installed. */
@WailaPlugin
public class JadePlugin implements IWailaPlugin {
    @Override
    public void register(IWailaCommonRegistration registration) {
        registration.registerBlockDataProvider(CampJadeProvider.INSTANCE, AdventurerCampBlockEntity.class);
    }

    @Override
    public void registerClient(IWailaClientRegistration registration) {
        registration.registerBlockComponent(CampJadeProvider.INSTANCE, AdventurerCampBlock.class);
    }
}
