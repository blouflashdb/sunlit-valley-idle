package dev.sunlitidle;

import com.mojang.logging.LogUtils;
import dev.sunlitidle.client.ClientSetup;
import dev.sunlitidle.farm.DailyFarm;
import dev.sunlitidle.farm.FarmEvents;
import dev.sunlitidle.farm.FarmRegistry;
import dev.sunlitidle.idle.IdleAttributes;
import dev.sunlitidle.idle.IdleService;
import dev.sunlitidle.network.IdleNetwork;
import dev.sunlitidle.slime.SlimeRegistry;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.ModContainer;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.config.ModConfig;
import net.neoforged.fml.loading.FMLEnvironment;
import org.slf4j.Logger;

@Mod(SunlitIdle.MOD_ID)
public final class SunlitIdle {
    public static final String MOD_ID = "sunlitidle";
    public static final Logger LOGGER = LogUtils.getLogger();

    public SunlitIdle(IEventBus bus, ModContainer container) {
        ModRegistry.register(bus);
        FarmRegistry.register(bus);
        SlimeRegistry.register(bus);
        DailyFarm.init();
        FarmEvents.init();
        IdleAttributes.register(bus);
        IdleNetwork.register(bus);
        IdleService.init();
        container.registerConfig(ModConfig.Type.COMMON, Config.SPEC);
        if (FMLEnvironment.dist == Dist.CLIENT) {
            ClientSetup.init(bus);
        }
    }

    public static ResourceLocation id(String path) {
        return ResourceLocation.fromNamespaceAndPath(MOD_ID, path);
    }
}
